"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import type { GameState } from "@/lib/types";

export function Results({ state }: { state: GameState }) {
  const [copied, setCopied] = useState(false);
  const stats = state.stats;
  const maxDistribution = Math.max(1, ...(stats?.distribution ?? []));

  async function copyResult() {
    if (!state.shareText) return;
    await navigator.clipboard.writeText(state.shareText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section className="result-panel" aria-live="polite">
      <div className="result-answer">
        <p>{state.status === "won" ? "You got it" : "Today’s company"}</p>
        <h2>{state.answer?.name}</h2>
        <div className="answer-meta">
          <span>Founded {state.answer?.foundingYear}</span>
          {state.answer?.domains.map((domain) => <span key={domain}>{domain}</span>)}
        </div>
      </div>
      <div className="solver-note">
        <strong>{state.solverCount?.toLocaleString()}</strong>
        <span>{state.solverCount === 1 ? "player has" : "players have"} solved today’s company</span>
      </div>
      {stats && (
        <div className="stats-grid">
          <div><strong>{stats.played}</strong><span>Played</span></div>
          <div><strong>{stats.winRate}%</strong><span>Win rate</span></div>
          <div><strong>{stats.currentStreak}</strong><span>Streak</span></div>
          <div><strong>{stats.maxStreak}</strong><span>Best</span></div>
        </div>
      )}
      {stats && (
        <div className="distribution" aria-label="Guess distribution">
          {stats.distribution.map((count, index) => (
            <div key={index}>
              <span>{index + 1}</span>
              <i style={{ width: `${Math.max(8, (count / maxDistribution) * 100)}%` }}>{count}</i>
            </div>
          ))}
        </div>
      )}
      <div className="result-actions">
        <button type="button" className="primary-button" onClick={() => void copyResult()}>
          {copied ? <Check size={18} /> : <Copy size={18} />}{copied ? "Copied" : "Copy result"}
        </button>
        <span>{state.nextPuzzleLabel}</span>
      </div>
    </section>
  );
}
