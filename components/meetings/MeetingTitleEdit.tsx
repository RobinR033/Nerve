"use client";

import { useState } from "react";

/** Titel van het overleg tonen; klik om hem aan te passen (Enter/wegklikken = opslaan, Esc = annuleren). */
export function MeetingTitleEdit({ title, onChange }: { title: string; onChange: (title: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);

  function commit() {
    setEditing(false);
    if (draft.trim() && draft.trim() !== title) onChange(draft.trim());
  }

  const style: React.CSSProperties = { color: "#1A1410", letterSpacing: "-.025em" };

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => e.target.select()}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setDraft(title);
            setEditing(false);
          }
        }}
        className="w-full font-display text-[24px] font-semibold leading-tight bg-transparent outline-none rounded-lg px-1 -mx-1"
        style={{ ...style, boxShadow: "0 0 0 1.5px rgba(124,58,237,0.35)" }}
      />
    );
  }

  return (
    <h2
      onClick={() => {
        setDraft(title);
        setEditing(true);
      }}
      title="Titel aanpassen"
      className="font-display text-[24px] font-semibold leading-tight cursor-text rounded-lg px-1 -mx-1 hover:bg-black/[0.03] transition-colors"
      style={style}
    >
      {title}
    </h2>
  );
}
