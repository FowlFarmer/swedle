import { describe, expect, it } from "vitest";

import { computePlayerStats } from "@/lib/game/stats";

describe("player statistics", () => {
  it("computes wins, distribution, and consecutive UTC streaks", () => {
    const stats = computePlayerStats([
      { puzzleDate: "2026-08-10", status: "won", attemptCount: 3 },
      { puzzleDate: "2026-08-11", status: "won", attemptCount: 1 },
      { puzzleDate: "2026-08-12", status: "lost", attemptCount: 5 },
      { puzzleDate: "2026-08-13", status: "won", attemptCount: 2 },
    ]);

    expect(stats).toEqual({
      played: 4,
      won: 3,
      winRate: 75,
      currentStreak: 1,
      maxStreak: 2,
      distribution: [1, 1, 1, 0, 0],
    });
  });

  it("returns a stable empty shape", () => {
    expect(computePlayerStats([])).toEqual({
      played: 0,
      won: 0,
      winRate: 0,
      currentStreak: 0,
      maxStreak: 0,
      distribution: [0, 0, 0, 0, 0],
    });
  });
});
