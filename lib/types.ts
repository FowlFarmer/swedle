export const MAX_GUESSES = 5;

export const SIZE_LABELS = [
  "<10",
  "10–49",
  "50–249",
  "250–999",
  "1,000–2,499",
  "2,500–9,999",
  "10,000+",
] as const;

export type MatchTone = "exact" | "partial" | "miss";
export type Direction = "higher" | "lower";
export type GameStatus = "playing" | "won" | "lost";

export interface CompanyFacts {
  id: string;
  slug: string;
  name: string;
  foundingYear: number;
  newGradTcUsd: number;
  sizeBand: number;
  domains: string[];
  sweOffices: string[];
}

export interface ComparisonCell {
  label: string;
  display: string;
  tone: MatchTone;
  direction?: Direction;
  values?: string[];
}

export interface GuessResult {
  company: string;
  slug: string;
  position: number;
  cells: {
    founded: ComparisonCell;
    compensation: ComparisonCell;
    size: ComparisonCell;
    domains: ComparisonCell;
    offices: ComparisonCell;
  };
}

export interface PlayerStats {
  played: number;
  won: number;
  winRate: number;
  currentStreak: number;
  maxStreak: number;
  distribution: number[];
}

export interface GameState {
  runToken: string;
  puzzleLabel: string;
  dateLabel: string;
  status: GameStatus;
  guesses: GuessResult[];
  attemptsRemaining: number;
  event?: "puzzle_changed";
  answer?: {
    name: string;
    domains: string[];
    foundingYear: number;
  };
  solverCount?: number;
  stats?: PlayerStats;
  shareText?: string;
  nextPuzzleLabel?: string;
}

export interface SearchCompany {
  slug: string;
  name: string;
}
