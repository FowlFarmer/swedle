import "server-only";

import { randomUUID } from "node:crypto";

import { COMPANY_BY_SLUG, COMPANIES, DAILY_COMPANIES } from "@/lib/data/companies";
import { buildShareText, compareCompanies } from "@/lib/game/comparison";
import { computePlayerStats, type CompletedRun } from "@/lib/game/stats";
import { getRedis, REDIS_PREFIX } from "@/lib/server/redis";
import { MAX_GUESSES, type GameState, type GuessResult } from "@/lib/types";

interface Puzzle {
  id: string;
  puzzleDate: string;
  revision: number;
  companySlug: string;
  selectionSource: "automatic" | "random-admin" | "manual-admin";
  createdAt: string;
  updatedAt: string;
}

interface Run {
  id: string;
  puzzleId: string;
  puzzleDate: string;
  status: "playing" | "won" | "lost";
  guesses: GuessResult[];
  guessedSlugs: string[];
  attemptCount: number;
  completedAt?: string;
}

interface GuessScriptResult {
  code: "accepted" | "puzzle_changed" | "duplicate" | "complete";
}

const activePuzzleKey = (date: string) => `${REDIS_PREFIX}:puzzle:active:${date}`;
const puzzleKey = (id: string) => `${REDIS_PREFIX}:puzzle:${id}`;
const solverKey = (id: string) => `${REDIS_PREFIX}:puzzle:${id}:solvers`;
const runKey = (puzzleId: string, playerId: string) => `${REDIS_PREFIX}:run:${puzzleId}:${playerId}`;
const completedKey = (playerId: string) => `${REDIS_PREFIX}:player:${playerId}:completed`;
const usageKey = `${REDIS_PREFIX}:company-usage`;

function utcDate() {
  return new Date().toISOString().slice(0, 10);
}

function epochDay(date: string) {
  return Math.floor(new Date(`${date}T00:00:00.000Z`).getTime() / 86_400_000);
}

function chooseCompany(excluded: Set<string>, currentSlug?: string) {
  const candidates = DAILY_COMPANIES.filter((company) => !excluded.has(company.slug) && company.slug !== currentSlug);
  const pool = candidates.length ? candidates : DAILY_COMPANIES.filter((company) => company.slug !== currentSlug);
  if (!pool.length) throw new Error("No company is available.");
  return pool[crypto.getRandomValues(new Uint32Array(1))[0] % pool.length];
}

export async function getOrCreateCurrentPuzzle(): Promise<Puzzle> {
  const redis = getRedis();
  const date = utcDate();
  const key = activePuzzleKey(date);
  const existing = await redis.get<Puzzle>(key);
  if (existing) return existing;

  const day = epochDay(date);
  const recentMembers = await redis.zrange<string[]>(usageKey, day - 30, day, { byScore: true });
  const excluded = new Set(recentMembers.map((member) => member.split(":").at(-1) ?? ""));
  const company = chooseCompany(excluded);
  const now = new Date().toISOString();
  const candidate: Puzzle = {
    id: randomUUID(),
    puzzleDate: date,
    revision: 1,
    companySlug: company.slug,
    selectionSource: "automatic",
    createdAt: now,
    updatedAt: now,
  };

  const created = await redis.set(key, candidate, { nx: true });
  if (created) {
    const transaction = redis.multi();
    transaction.set(puzzleKey(candidate.id), candidate);
    transaction.set(solverKey(candidate.id), 0);
    transaction.zadd(usageKey, { score: day, member: `${date}:1:${company.slug}` });
    transaction.zremrangebyscore(usageKey, 0, day - 90);
    await transaction.exec();
    return candidate;
  }

  const winner = await redis.get<Puzzle>(key);
  if (!winner) throw new Error("The current puzzle could not be resolved.");
  return winner;
}

async function getOrCreateCurrentRun(playerId: string) {
  const redis = getRedis();
  const puzzle = await getOrCreateCurrentPuzzle();
  const key = runKey(puzzle.id, playerId);
  const existing = await redis.get<Run>(key);
  if (existing) return { puzzle, run: existing };

  const candidate: Run = {
    id: randomUUID(),
    puzzleId: puzzle.id,
    puzzleDate: puzzle.puzzleDate,
    status: "playing",
    guesses: [],
    guessedSlugs: [],
    attemptCount: 0,
  };
  await redis.set(key, candidate, { nx: true, ex: 60 * 60 * 24 * 400 });
  return { puzzle, run: (await redis.get<Run>(key)) ?? candidate };
}

async function getStats(playerId: string, currentPuzzle: Puzzle) {
  const values = await getRedis().hvals(completedKey(playerId)) as Array<CompletedRun & { puzzleId: string }>;
  const completed = values.filter((run) => run.puzzleDate !== currentPuzzle.puzzleDate || run.puzzleId === currentPuzzle.id);
  return computePlayerStats(completed);
}

export async function getGameState(playerId: string, event?: "puzzle_changed"): Promise<GameState> {
  const redis = getRedis();
  const { puzzle, run } = await getOrCreateCurrentRun(playerId);
  const answer = COMPANY_BY_SLUG.get(puzzle.companySlug);
  if (!answer) throw new Error("The current puzzle references an unknown company.");

  const completed = run.status !== "playing";
  const puzzleLabel = `#${puzzle.puzzleDate.replaceAll("-", "")}`;
  const dateLabel = new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${puzzle.puzzleDate}T00:00:00Z`));

  return {
    runToken: run.id,
    puzzleLabel,
    dateLabel,
    status: run.status,
    guesses: run.guesses,
    attemptsRemaining: Math.max(0, MAX_GUESSES - run.attemptCount),
    ...(event ? { event } : {}),
    ...(completed
      ? {
          answer: { name: answer.name, domains: answer.domains, foundingYear: answer.foundingYear },
          solverCount: Number((await redis.get<number>(solverKey(puzzle.id))) ?? 0),
          stats: await getStats(playerId, puzzle),
          shareText: buildShareText(puzzleLabel, run.status as "won" | "lost", run.guesses),
          nextPuzzleLabel: "Next company at 00:00 UTC",
        }
      : {}),
  };
}

const RECORD_GUESS_SCRIPT = `
local current = redis.call('GET', KEYS[1])
if not current then return cjson.encode({code='puzzle_changed'}) end
local puzzle = cjson.decode(current)
if puzzle.id ~= ARGV[1] then return cjson.encode({code='puzzle_changed'}) end
local runRaw = redis.call('GET', KEYS[2])
if not runRaw then return cjson.encode({code='puzzle_changed'}) end
local run = cjson.decode(runRaw)
if run.id ~= ARGV[2] then return cjson.encode({code='puzzle_changed'}) end
if run.status ~= 'playing' then return cjson.encode({code='complete'}) end
for _, slug in ipairs(run.guessedSlugs) do
  if slug == ARGV[3] then return cjson.encode({code='duplicate'}) end
end
run.attemptCount = run.attemptCount + 1
table.insert(run.guessedSlugs, ARGV[3])
table.insert(run.guesses, cjson.decode(ARGV[4]))
local completed = false
if ARGV[5] == '1' then
  run.status = 'won'
  run.completedAt = ARGV[6]
  redis.call('INCR', KEYS[3])
  completed = true
elseif run.attemptCount >= 5 then
  run.status = 'lost'
  run.completedAt = ARGV[6]
  completed = true
end
redis.call('SET', KEYS[2], cjson.encode(run), 'EX', 34560000)
if completed then
  local summary = cjson.encode({puzzleId=run.puzzleId, puzzleDate=run.puzzleDate, status=run.status, attemptCount=run.attemptCount})
  redis.call('HSET', KEYS[4], run.puzzleDate, summary)
  redis.call('EXPIRE', KEYS[4], 63072000)
end
return cjson.encode({code='accepted'})
`;

export async function submitGuess(playerId: string, runToken: string, slug: string) {
  const company = COMPANY_BY_SLUG.get(slug);
  if (!company) throw new GameInputError("That company is not available.");

  const { puzzle, run } = await getOrCreateCurrentRun(playerId);
  if (run.id !== runToken) return getGameState(playerId, "puzzle_changed");
  const answer = COMPANY_BY_SLUG.get(puzzle.companySlug);
  if (!answer) throw new Error("The current puzzle references an unknown company.");
  const comparison = compareCompanies(company, answer, run.attemptCount + 1);

  const raw = await getRedis().eval<string[], GuessScriptResult | string>(
    RECORD_GUESS_SCRIPT,
    [activePuzzleKey(puzzle.puzzleDate), runKey(puzzle.id, playerId), solverKey(puzzle.id), completedKey(playerId)],
    [puzzle.id, runToken, slug, JSON.stringify(comparison), slug === puzzle.companySlug ? "1" : "0", new Date().toISOString()],
  );
  const result = typeof raw === "string" ? JSON.parse(raw) as GuessScriptResult : raw;
  if (result.code === "puzzle_changed") return getGameState(playerId, "puzzle_changed");
  if (result.code === "duplicate") throw new GameInputError("You already guessed that company.");
  if (result.code === "complete") throw new GameInputError("This game is already complete.");
  return getGameState(playerId);
}

export class GameInputError extends Error {}

export async function searchCompanies(query: string) {
  const clean = query.trim().toLocaleLowerCase();
  if (!clean) return [];
  return COMPANIES
    .filter((company) => company.name.toLocaleLowerCase().includes(clean))
    .slice(0, 8)
    .map(({ slug, name, dailyEligible }) => ({ slug, name, dailyEligible }));
}

export async function getAdminState() {
  const puzzle = await getOrCreateCurrentPuzzle();
  const company = COMPANY_BY_SLUG.get(puzzle.companySlug);
  if (!company) throw new Error("The current puzzle references an unknown company.");
  return {
    puzzle: {
      date: puzzle.puzzleDate,
      revision: puzzle.revision,
      source: puzzle.selectionSource,
      solverCount: Number((await getRedis().get<number>(solverKey(puzzle.id))) ?? 0),
      updatedAt: puzzle.updatedAt,
      company: { slug: company.slug, name: company.name, dailyEligible: company.dailyEligible },
    },
  };
}

const REPLACE_PUZZLE_SCRIPT = `
local current = redis.call('GET', KEYS[1])
local revision = 1
if current then revision = cjson.decode(current).revision + 1 end
local puzzle = cjson.decode(ARGV[1])
puzzle.revision = revision
redis.call('SET', KEYS[1], cjson.encode(puzzle))
redis.call('SET', KEYS[2], cjson.encode(puzzle))
redis.call('SET', KEYS[3], 0)
redis.call('ZADD', KEYS[4], ARGV[2], puzzle.puzzleDate .. ':' .. revision .. ':' .. puzzle.companySlug)
redis.call('ZREMRANGEBYSCORE', KEYS[4], 0, tonumber(ARGV[2]) - 90)
return cjson.encode(puzzle)
`;

export async function replacePuzzle(mode: "random" | "specific", slug?: string) {
  const current = await getOrCreateCurrentPuzzle();
  let company = mode === "specific" ? COMPANY_BY_SLUG.get(slug ?? "") : undefined;
  if (mode === "specific" && !company) throw new GameInputError("Choose an active company.");
  if (company?.slug === current.companySlug) throw new GameInputError("That company is already active.");
  if (!company) company = chooseCompany(new Set(), current.companySlug);

  const now = new Date().toISOString();
  const next: Puzzle = {
    id: randomUUID(),
    puzzleDate: current.puzzleDate,
    revision: current.revision + 1,
    companySlug: company.slug,
    selectionSource: mode === "random" ? "random-admin" : "manual-admin",
    createdAt: now,
    updatedAt: now,
  };
  await getRedis().eval(
    REPLACE_PUZZLE_SCRIPT,
    [activePuzzleKey(current.puzzleDate), puzzleKey(next.id), solverKey(next.id), usageKey],
    [JSON.stringify(next), epochDay(current.puzzleDate)],
  );
  return getAdminState();
}
