import { SIZE_LABELS, type CompanyFacts, type ComparisonCell, type GuessResult, type MatchTone } from "@/lib/types";

function normalizeSet(values: string[]) {
  return [...new Set(values.map((value) => value.trim().toLowerCase()))].sort();
}

export function compareSets(guess: string[], answer: string[]): MatchTone {
  const left = normalizeSet(guess);
  const right = normalizeSet(answer);
  if (left.length === right.length && left.every((value, index) => value === right[index])) {
    return "exact";
  }
  return left.some((value) => right.includes(value)) ? "partial" : "miss";
}

function numericCell(label: string, guess: number, answer: number, display: string): ComparisonCell {
  return {
    label,
    display,
    tone: guess === answer ? "exact" : "miss",
    ...(guess === answer ? {} : { direction: guess < answer ? "higher" as const : "lower" as const }),
  };
}

export function compareCompanies(guess: CompanyFacts, answer: CompanyFacts, position: number): GuessResult {
  const domainTone = compareSets(guess.domains, answer.domains);
  const officeTone = compareSets(guess.sweOffices, answer.sweOffices);

  return {
    company: guess.name,
    slug: guess.slug,
    position,
    cells: {
      founded: numericCell("Founded", guess.foundingYear, answer.foundingYear, String(guess.foundingYear)),
      compensation: numericCell(
        "New-grad TC",
        guess.newGradTcUsd,
        answer.newGradTcUsd,
        `$${Math.round(guess.newGradTcUsd / 1000)}k`,
      ),
      size: numericCell("Company size", guess.sizeBand, answer.sizeBand, SIZE_LABELS[guess.sizeBand] ?? "Unknown"),
      domains: {
        label: "Domains",
        display: guess.domains.join(", "),
        values: guess.domains,
        tone: domainTone,
      },
      offices: {
        label: "SWE offices",
        display: guess.sweOffices.join(", "),
        values: guess.sweOffices,
        tone: officeTone,
      },
    },
  };
}

export function toShareSquare(tone: MatchTone) {
  if (tone === "exact") return "🟩";
  if (tone === "partial") return "🟧";
  return "⬛";
}

export function buildShareText(puzzleLabel: string, status: "won" | "lost", guesses: GuessResult[]) {
  const score = status === "won" ? `${guesses.length}/${5}` : "X/5";
  const rows = guesses.map((guess) =>
    [guess.cells.founded, guess.cells.compensation, guess.cells.size, guess.cells.domains, guess.cells.offices]
      .map((cell) => toShareSquare(cell.tone))
      .join(""),
  );
  return [`Swedle ${puzzleLabel} ${score}`, "", ...rows].join("\n");
}
