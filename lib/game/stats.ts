import type { PlayerStats } from "@/lib/types";

export interface CompletedRun {
  puzzleDate: string;
  status: "won" | "lost";
  attemptCount: number;
}

function previousUtcDate(date: string) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() - 1);
  return value.toISOString().slice(0, 10);
}

export function computePlayerStats(runs: CompletedRun[]): PlayerStats {
  const ordered = [...runs].sort((a, b) => a.puzzleDate.localeCompare(b.puzzleDate));
  const distribution = [0, 0, 0, 0, 0];
  let maxStreak = 0;
  let rollingStreak = 0;
  let previousDate: string | undefined;

  for (const run of ordered) {
    if (run.status === "won") {
      if (run.attemptCount >= 1 && run.attemptCount <= 5) distribution[run.attemptCount - 1] += 1;
      rollingStreak = previousDate && previousUtcDate(run.puzzleDate) === previousDate ? rollingStreak + 1 : 1;
      maxStreak = Math.max(maxStreak, rollingStreak);
      previousDate = run.puzzleDate;
    } else {
      rollingStreak = 0;
      previousDate = run.puzzleDate;
    }
  }

  const latest = ordered.at(-1);
  const currentStreak = latest?.status === "won" ? rollingStreak : 0;
  const won = ordered.filter((run) => run.status === "won").length;
  return {
    played: ordered.length,
    won,
    winRate: ordered.length ? Math.round((won / ordered.length) * 100) : 0,
    currentStreak,
    maxStreak,
    distribution,
  };
}
