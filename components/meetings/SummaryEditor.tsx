"use client";

import { useState } from "react";
import { MeetingSummary } from "./MeetingSummary";

type Props = {
  summary: string | null;
  // Opslaan; daarna zoekt Nerve automatisch (opnieuw) naar acties
  onSave: (text: string) => Promise<void>;
};

/** Verslag van een overleg: lezen, zelf schrijven of aanpassen. */
export function SummaryEditor({ summary, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(summary ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await onSave(text);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <div className="space-y-2">
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={Math.min(24, Math.max(8, text.split("\n").length + 2))}
          placeholder={"Typ je verslag of aantekeningen…\n\nTip: '## Kopje' voor een kopje, '- ' voor een opsomming."}
          className="w-full px-3 py-2.5 rounded-xl text-[14px] leading-relaxed"
          style={{ background: "#fff", border: "0.5px solid rgba(0,0,0,0.12)", color: "#1A1410", outline: "none" }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[12px] mr-auto" style={{ color: "#9A8F84" }}>
            Na opslaan zoekt Nerve naar nieuwe acties — jij beslist wat een taak wordt.
          </p>
          <button
            onClick={() => {
              setText(summary ?? "");
              setEditing(false);
            }}
            className="h-9 px-3 text-[13px]"
            style={{ color: "#6B6157" }}
          >
            Annuleer
          </button>
          <button
            onClick={save}
            disabled={busy}
            className="h-9 px-4 rounded-xl text-[13px] font-semibold text-white disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #FF7A45 0%, #FF5A1F 60%, #FF3D8B 110%)" }}
          >
            {busy ? "Opslaan & acties zoeken…" : "Opslaan"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#FF5A1F" }}>Verslag</p>
        <button
          onClick={() => {
            setText(summary ?? "");
            setEditing(true);
          }}
          className="text-[12.5px] font-semibold"
          style={{ color: "#FF5A1F" }}
        >
          {summary ? "Bewerken" : "Schrijf verslag"}
        </button>
      </div>
      {summary ? (
        <MeetingSummary text={summary} />
      ) : (
        <p className="text-[13px]" style={{ color: "#9A8F84" }}>Nog geen verslag. Schrijf er zelf een; Nerve haalt er daarna de acties uit.</p>
      )}
    </div>
  );
}
