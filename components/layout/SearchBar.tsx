"use client";

import { useRef } from "react";
import { useSearchStore } from "@/stores/searchStore";

export function SearchBar() {
  const { query, setQuery, clear } = useSearchStore();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className="flex items-center gap-2 flex-1 mr-3"
      style={{ maxWidth: 280 }}
    >
      <div
        className="flex items-center gap-2 flex-1 rounded-xl px-3"
        style={{
          height: 34,
          background: "rgba(255,255,255,0.6)",
          backdropFilter: "var(--backdrop-blur-sm)",
          WebkitBackdropFilter: "var(--backdrop-blur-sm)",
          border: "0.5px solid rgba(255,255,255,0.7)",
          boxShadow: "0 1px 0 rgba(255,255,255,.6) inset, 0 1px 6px -2px rgba(60,40,30,.08)",
        }}
      >
        <svg
          className="shrink-0"
          style={{ width: 13, height: 13, color: "#9A8F84" }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.2}
        >
          <circle cx="11" cy="11" r="8" />
          <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
        </svg>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Zoeken…"
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            fontSize: 13,
            color: "#1A1410",
            letterSpacing: "-.01em",
          }}
        />
        {query && (
          <button
            onClick={() => { clear(); inputRef.current?.focus(); }}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "#9A8F84",
              lineHeight: 1,
              fontSize: 16,
              padding: 0,
            }}
            aria-label="Zoekopdracht wissen"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
