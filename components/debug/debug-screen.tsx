"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Dices, LockKeyhole, Search, X } from "lucide-react";
import Link from "next/link";

import type { SearchCompany } from "@/lib/types";

interface AdminState {
  puzzle: {
    date: string;
    revision: number;
    source: string;
    solverCount: number;
    updatedAt: string;
    company: SearchCompany;
  };
}

type PendingAction = { mode: "random" } | { mode: "specific"; company: SearchCompany };

export function DebugScreen() {
  const [admin, setAdmin] = useState<AdminState | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [password, setPassword] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchCompany[]>([]);
  const [selected, setSelected] = useState<SearchCompany | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const requestNumber = useRef(0);

  async function loadState() {
    const response = await fetch("/api/admin/state", { cache: "no-store" });
    if (response.status === 401) {
      setNeedsAuth(true);
      return;
    }
    if (!response.ok) {
      setMessage("Control state is unavailable.");
      return;
    }
    setAdmin(await response.json());
    setNeedsAuth(false);
  }

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadState(), 0);
    return () => window.clearTimeout(initialLoad);
  }, []);

  useEffect(() => {
    const clean = query.trim();
    if (!clean) return;
    const current = ++requestNumber.current;
    const timer = window.setTimeout(async () => {
      const response = await fetch(`/api/companies?q=${encodeURIComponent(clean)}`);
      const body = response.ok ? await response.json() : [];
      if (current === requestNumber.current) setResults(body);
    }, 140);
    return () => window.clearTimeout(timer);
  }, [query]);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const response = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const body = await response.json();
    if (!response.ok) setMessage(body.error ?? "Sign-in failed.");
    else { setPassword(""); await loadState(); }
    setBusy(false);
  }

  async function confirmChange() {
    if (!pending) return;
    setBusy(true);
    setMessage("");
    const payload = pending.mode === "random" ? { mode: "random" } : { mode: "specific", slug: pending.company.slug };
    const response = await fetch("/api/admin/puzzle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json();
    if (!response.ok) setMessage(body.error ?? "The company could not be changed.");
    else {
      setAdmin(body);
      setMessage(`Live company changed to ${body.puzzle.company.name}.`);
      setQuery("");
      setSelected(null);
    }
    setPending(null);
    setBusy(false);
  }

  if (needsAuth) {
    return (
      <main className="debug-shell debug-auth">
        <form className="auth-card" onSubmit={signIn}>
          <LockKeyhole size={23} strokeWidth={1.6} />
          <div><p>Preview control</p><h1>Admin access</h1></div>
          <label htmlFor="admin-password">Passphrase</label>
          <input id="admin-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoFocus />
          {message && <p className="debug-error">{message}</p>}
          <button className="debug-primary" disabled={busy}>Unlock</button>
        </form>
      </main>
    );
  }

  return (
    <main className="debug-shell">
      <header className="debug-header">
        <div><p>Swedle / Preview</p><h1>Daily company control</h1></div>
        <Link href="/"><ArrowLeft size={15} /> Back to game</Link>
      </header>

      {!admin ? <div className="debug-loading">Resolving the active UTC puzzle…</div> : (
        <div className="debug-grid">
          <section className="current-card">
            <p className="debug-label">Live company</p>
            <h2>{admin.puzzle.company.name}</h2>
            <dl>
              <div><dt>UTC date</dt><dd>{admin.puzzle.date}</dd></div>
              <div><dt>Revision</dt><dd>{admin.puzzle.revision}</dd></div>
              <div><dt>Selected by</dt><dd>{admin.puzzle.source.replace("-", " ")}</dd></div>
              <div><dt>Correct solvers</dt><dd>{admin.puzzle.solverCount.toLocaleString()}</dd></div>
              <div><dt>Updated</dt><dd>{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(admin.puzzle.updatedAt))}</dd></div>
            </dl>
          </section>

          <section className="control-card">
            <div className="control-heading"><p className="debug-label">Replace live puzzle</p><span>Writes to production data</span></div>
            <label htmlFor="debug-company">Specific company</label>
            <div className="debug-search">
              <Search size={17} />
              <input id="debug-company" value={query} onChange={(event) => { const value = event.target.value; setQuery(value); setSelected(null); if (!value.trim()) setResults([]); }} placeholder="Search catalog" />
              {results.length > 0 && !selected && (
                <ul>
                  {results.map((company) => (
                    <li key={company.slug}><button onClick={() => { setSelected(company); setQuery(company.name); setResults([]); }} type="button"><span>{company.name}</span><small>{company.dailyEligible ? "Daily pool" : "Guess only"}</small></button></li>
                  ))}
                </ul>
              )}
            </div>
            <button className="debug-primary" disabled={!selected || busy} onClick={() => selected && setPending({ mode: "specific", company: selected })} type="button">
              <Check size={16} /> Set as today’s company
            </button>
            <div className="or-rule"><span>or</span></div>
            <button className="debug-secondary" disabled={busy} onClick={() => setPending({ mode: "random" })} type="button">
              <Dices size={17} /> Randomize today
            </button>
          </section>
        </div>
      )}

      {message && <div className="debug-message" role="status">{message}<button onClick={() => setMessage("")}><X size={14} /></button></div>}

      {pending && (
        <div className="confirm-layer" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
          <div className="confirm-card">
            <p className="debug-label">Confirm live change</p>
            <h2 id="confirm-title">{pending.mode === "random" ? "Choose a new company at random?" : `Switch to ${pending.company.name}?`}</h2>
            <p>The current game will be replaced immediately. Existing players will receive a fresh run and the solver count will reset.</p>
            <div><button className="debug-secondary" onClick={() => setPending(null)} disabled={busy}>Cancel</button><button className="debug-danger" onClick={() => void confirmChange()} disabled={busy}>{busy ? "Changing…" : "Confirm change"}</button></div>
          </div>
        </div>
      )}
    </main>
  );
}
