import { ArrowDown, ArrowUp, Check, Minus } from "lucide-react";

import type { ComparisonCell, GuessResult } from "@/lib/types";

function Cell({ cell }: { cell: ComparisonCell }) {
  const DirectionIcon = cell.direction === "higher" ? ArrowUp : cell.direction === "lower" ? ArrowDown : cell.tone === "exact" ? Check : Minus;
  return (
    <div className={`comparison-cell ${cell.tone}`} data-label={cell.label}>
      <div className="cell-value">
        {cell.values ? (
          <div className="value-list">{cell.values.map((value) => <span key={value}>{value}</span>)}</div>
        ) : (
          <strong>{cell.display}</strong>
        )}
        <DirectionIcon className="cell-icon" size={17} strokeWidth={2.2} aria-hidden="true" />
      </div>
      <span className="sr-only">
        {cell.tone === "exact" ? "Exact match" : cell.tone === "partial" ? "Partial match" : "No match"}
        {cell.direction ? `, answer is ${cell.direction}` : ""}
      </span>
    </div>
  );
}

export function GuessBoard({ guesses }: { guesses: GuessResult[] }) {
  return (
    <section className="board-section" aria-label="Your guesses">
      <div className="board-scroll">
        <div className="board-header" aria-hidden="true">
          <span>Company</span><span>Founded</span><span>New-grad TC</span><span>Size</span><span>Domains</span><span>SWE offices</span>
        </div>
        <div className="guess-list">
          {guesses.map((guess, index) => (
            <article className="guess-row" key={`${guess.slug}-${guess.position}`} style={{ "--delay": `${index * 55}ms` } as React.CSSProperties}>
              <div className="company-cell"><small>{String(guess.position).padStart(2, "0")}</small><strong>{guess.company}</strong></div>
              <Cell cell={guess.cells.founded} />
              <Cell cell={guess.cells.compensation} />
              <Cell cell={guess.cells.size} />
              <Cell cell={guess.cells.domains} />
              <Cell cell={guess.cells.offices} />
            </article>
          ))}
          {guesses.length === 0 && (
            <div className="empty-board">
              <span>Your comparisons will appear here.</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
