"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, Search } from "lucide-react";

import type { SearchCompany } from "@/lib/types";

interface Props {
  onChoose: (company: SearchCompany) => Promise<void>;
  disabled: boolean;
  error: string;
}

export function CompanySearch({ onChoose, disabled, error }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchCompany[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [searching, setSearching] = useState(false);
  const requestNumber = useRef(0);
  const listId = useId();

  useEffect(() => {
    const clean = query.trim();
    if (!clean) return;
    const currentRequest = ++requestNumber.current;
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/companies?q=${encodeURIComponent(clean)}`);
        const body = response.ok ? await response.json() : [];
        if (currentRequest === requestNumber.current) {
          setResults(body);
          setActiveIndex(0);
        }
      } finally {
        if (currentRequest === requestNumber.current) setSearching(false);
      }
    }, 160);
    return () => window.clearTimeout(timer);
  }, [query]);

  async function choose(company: SearchCompany) {
    setQuery("");
    setResults([]);
    await onChoose(company);
  }

  return (
    <section className="search-section">
      <label htmlFor="company-search">Company</label>
      <div className="search-wrap">
        <Search className="search-icon" size={20} strokeWidth={1.8} aria-hidden="true" />
        <input
          id="company-search"
          value={query}
          onChange={(event) => {
            const value = event.target.value;
            setQuery(value);
            setSearching(Boolean(value.trim()));
            if (!value.trim()) setResults([]);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActiveIndex((index) => Math.min(index + 1, results.length - 1));
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((index) => Math.max(index - 1, 0));
            }
            if (event.key === "Enter" && results[activeIndex]) {
              event.preventDefault();
              void choose(results[activeIndex]);
            }
            if (event.key === "Escape") setResults([]);
          }}
          placeholder="Search a software company"
          autoComplete="off"
          disabled={disabled}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={results.length > 0}
          aria-controls={listId}
          aria-activedescendant={results[activeIndex] ? `${listId}-${activeIndex}` : undefined}
        />
        <span className="search-status">{disabled ? "Checking…" : searching ? "Searching…" : ""}</span>
        {results.length > 0 && (
          <ul className="search-results" id={listId} role="listbox">
            {results.map((company, index) => (
              <li key={company.slug} id={`${listId}-${index}`} role="option" aria-selected={index === activeIndex}>
                <button
                  type="button"
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => void choose(company)}
                >
                  <span>{company.name}</span>
                  <ArrowRight size={17} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && <p className="field-error" role="alert">{error}</p>}
    </section>
  );
}
