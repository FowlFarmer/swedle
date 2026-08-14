"use client";

import { useCallback, useEffect, useState } from "react";
import { CircleHelp, RotateCw } from "lucide-react";
import Link from "next/link";

import { CompanySearch } from "@/components/game/company-search";
import { GuessBoard } from "@/components/game/guess-board";
import { Results } from "@/components/game/results";
import type { GameState, SearchCompany } from "@/lib/types";

function LoadingGame() {
  return (
    <div className="loading-state" aria-label="Loading today’s game">
      <div className="loading-line loading-line-short" />
      <div className="loading-line" />
      <div className="loading-board" />
    </div>
  );
}

export function Game() {
  const [state, setState] = useState<GameState | null>(null);
  const [error, setError] = useState("");
  const [guessError, setGuessError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);

  const loadGame = useCallback(async () => {
    try {
      const response = await fetch("/api/game", { cache: "no-store" });
      if (!response.ok) throw new Error();
      setState(await response.json());
      setError("");
    } catch {
      setError("Today’s game is unavailable.");
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadGame(), 0);
    const handleFocus = () => void loadGame();
    window.addEventListener("focus", handleFocus);
    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadGame]);

  async function submitGuess(company: SearchCompany) {
    if (!state || submitting) return;
    setSubmitting(true);
    setGuessError("");
    try {
      const response = await fetch("/api/game/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runToken: state.runToken, slug: company.slug }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Your guess could not be recorded.");
      setState(body);
    } catch (caught) {
      setGuessError(caught instanceof Error ? caught.message : "Your guess could not be recorded.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="game-frame">
      <header className="site-header">
        <Link className="wordmark" href="/" aria-label="Swedle home">
          <span>Swedle</span><i>.</i>
        </Link>
        <button className="icon-button" type="button" onClick={() => setRulesOpen((value) => !value)} aria-expanded={rulesOpen}>
          <CircleHelp size={19} strokeWidth={1.8} />
          <span>How to play</span>
        </button>
      </header>

      {rulesOpen && (
        <aside className="rules-panel">
          <p>Find the daily software company in five guesses.</p>
          <div className="rule-key">
            <span><i className="key-square exact" />Exact</span>
            <span><i className="key-square partial" />Overlap</span>
            <span><i className="key-square miss" />No match</span>
          </div>
          <p>Arrows point toward the answer. Domains and offices turn orange when at least one value overlaps.</p>
        </aside>
      )}

      {error ? (
        <section className="error-state">
          <p>{error}</p>
          <button className="text-button" onClick={() => void loadGame()} type="button">
            <RotateCw size={15} /> Try again
          </button>
        </section>
      ) : !state ? (
        <LoadingGame />
      ) : (
        <>
          <section className="game-intro">
            <div>
              <p className="eyebrow">{state.dateLabel} · {state.puzzleLabel}</p>
              <h1>Guess the company.</h1>
            </div>
            <div className="attempts" aria-label={`${state.attemptsRemaining} guesses remaining`}>
              <strong>{state.attemptsRemaining}</strong>
              <span>{state.attemptsRemaining === 1 ? "guess" : "guesses"}<br />remaining</span>
            </div>
          </section>

          {state.event === "puzzle_changed" && (
            <div className="notice" role="status">Today’s company was updated. Your new game is ready.</div>
          )}

          {state.status === "playing" ? (
            <CompanySearch onChoose={submitGuess} disabled={submitting} error={guessError} />
          ) : (
            <Results state={state} />
          )}

          <GuessBoard guesses={state.guesses} />
        </>
      )}
    </div>
  );
}
