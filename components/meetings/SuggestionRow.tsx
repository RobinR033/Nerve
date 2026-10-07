"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { ActionOwner, ActionSuggestion } from "@/types/database";
import type { SuggestionEdits } from "@/lib/supabase/meetings";

type Props = {
  suggestion: ActionSuggestion;
  onAccept: (edits: SuggestionEdits) => Promise<void> | void;
  onReject: () => void;
  onUndoReject: () => void;
  // Geaccepteerd terugdraaien (taak naar archief, suggestie weer open)
  onUndoAccept?: () => void;
};

const toDateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

/** "2026-10-09" → middernacht lokale tijd als ISO (zelfde conventie als de rest van Nerve) */
const fromDateInput = (d: string) => (d ? new Date(`${d}T00:00:00`).toISOString() : null);

function formatShort(iso: string) {
  return new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

export function SuggestionRow({ suggestion: s, onAccept, onReject, onUndoReject, onUndoAccept }: Props) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showQuote, setShowQuote] = useState(false);
  const [text, setText] = useState(s.text);
  const [owner, setOwner] = useState<ActionOwner>(s.owner);
  const [person, setPerson] = useState(s.person ?? "");
  const [date, setDate] = useState(toDateInput(s.deadline));

  async function accept(useEdits: boolean) {
    setBusy(true);
    try {
      await onAccept(
        useEdits
          ? { text: text.trim() || s.text, owner, person: owner === "other" ? person.trim() || null : null, deadline: fromDateInput(date) }
          : { text: s.text, owner: s.owner, person: s.person, deadline: s.deadline },
      );
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  if (s.status === "accepted") {
    return (
      <motion.div initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} className="flex items-center gap-2 py-1.5 text-[13px]" style={{ color: "#1F9D55" }}>
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <span className="flex-1 min-w-0 truncate">{s.text}</span>
        {s.owner === "other" && s.person && <span className="text-[11px] font-semibold shrink-0">naja → {s.person}</span>}
        {onUndoAccept && (
          <button onClick={onUndoAccept} className="text-[11px] font-semibold shrink-0" style={{ color: "#9A8F84" }} title="Taak naar archief, suggestie weer open">
            Terugdraaien
          </button>
        )}
      </motion.div>
    );
  }

  if (s.status === "rejected") {
    return (
      <div className="flex items-center gap-2 py-1.5 text-[13px]" style={{ color: "#C7C0B8" }}>
        <span className="flex-1 min-w-0 truncate line-through">{s.text}</span>
        <button onClick={onUndoReject} className="text-[11px] font-semibold shrink-0" style={{ color: "#9A8F84" }}>
          Terugzetten
        </button>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="rounded-xl p-2.5 space-y-2" style={{ background: "rgba(255,246,238,0.9)", border: "0.5px solid rgba(255,138,92,0.4)" }}>
        <input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && accept(true)}
          className="w-full h-8 px-2.5 rounded-lg text-[13px]"
          style={fieldStyle}
        />
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex rounded-lg overflow-hidden text-[12px] font-semibold" style={{ border: "0.5px solid rgba(0,0,0,0.12)" }}>
            {(["me", "other"] as const).map((o) => (
              <button
                key={o}
                onClick={() => setOwner(o)}
                className="h-8 px-2.5"
                style={owner === o ? { background: "#1A1410", color: "#fff" } : { background: "#fff", color: "#6B6157" }}
              >
                {o === "me" ? "Ik doe het" : "Ligt bij ander"}
              </button>
            ))}
          </div>
          {owner === "other" && (
            <input value={person} onChange={(e) => setPerson(e.target.value)} placeholder="Wie?" className="h-8 px-2.5 rounded-lg text-[13px] w-28" style={fieldStyle} />
          )}
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-8 px-2 rounded-lg text-[13px]" style={fieldStyle} />
          <div className="flex-1" />
          <button onClick={() => setEditing(false)} className="h-8 px-2 text-[12.5px]" style={{ color: "#9A8F84" }}>
            Annuleer
          </button>
          <button onClick={() => accept(true)} disabled={busy} className="h-8 px-3 rounded-lg text-[12.5px] font-semibold text-white disabled:opacity-50" style={{ background: "#1F9D55" }}>
            Opslaan als taak
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group py-1.5">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[13.5px] leading-snug" style={{ color: "#1A1410" }}>
            {s.text}
          </p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[11px] font-semibold">
            {s.owner === "other" ? (
              <span style={{ color: "#2E6BFF" }}>naja → {s.person ?? "iemand anders"}</span>
            ) : (
              <span style={{ color: "#FF5A1F" }}>voor jou</span>
            )}
            {s.deadline && <span style={{ color: "#6B6157" }}>{formatShort(s.deadline)}</span>}
            {s.quote && (
              <button onClick={() => setShowQuote((v) => !v)} style={{ color: "#9A8F84" }}>
                {showQuote ? "verberg bron" : "bron"}
              </button>
            )}
          </div>
          {showQuote && s.quote && (
            <p className="mt-1 text-[12px] italic pl-2" style={{ color: "#6B6157", borderLeft: "2px solid #FFC9B0" }}>
              “{s.quote}”
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <IconButton title="Accepteren als taak" color="#1F9D55" disabled={busy} onClick={() => accept(false)}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </IconButton>
          <IconButton title="Aanpassen" color="#6B6157" onClick={() => setEditing(true)}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.2 5.2l3.6 3.6M4 20l4.2-.9L19 8.3a1.5 1.5 0 000-2.1l-1.2-1.2a1.5 1.5 0 00-2.1 0L4.9 15.8 4 20z" />
          </IconButton>
          <IconButton title="Weg (kaf)" color="#C7C0B8" onClick={onReject}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
          </IconButton>
        </div>
      </div>
    </div>
  );
}

function IconButton({ title, color, onClick, disabled, children }: { title: string; color: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors active:scale-95 disabled:opacity-50"
      style={{ color, background: "rgba(255,255,255,0.7)", border: "0.5px solid rgba(0,0,0,0.06)" }}
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
        {children}
      </svg>
    </button>
  );
}

const fieldStyle: React.CSSProperties = {
  background: "#fff",
  border: "0.5px solid rgba(0,0,0,0.12)",
  color: "#1A1410",
  outline: "none",
};
