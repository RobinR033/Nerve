"use client";

import { useState } from "react";
import { formatMeetingDate } from "./MeetingReviewCard";

/** ISO → "YYYY-MM-DDTHH:MM" in lokale tijd (voor <input type="datetime-local">) */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Datum van het overleg tonen, met de mogelijkheid hem aan te passen. */
export function MeetingDateEdit({ heldAt, onChange }: { heldAt: string; onChange: (iso: string) => void }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <input
        type="datetime-local"
        autoFocus
        defaultValue={toLocalInput(heldAt)}
        onBlur={() => setEditing(false)}
        onChange={(e) => {
          if (!e.target.value) return;
          onChange(new Date(e.target.value).toISOString());
        }}
        className="h-8 px-2 rounded-lg text-[13px]"
        style={{ background: "#fff", border: "0.5px solid rgba(0,0,0,0.15)", color: "#1A1410" }}
      />
    );
  }

  return (
    <button onClick={() => setEditing(true)} title="Datum aanpassen" className="underline decoration-dotted underline-offset-2">
      {formatMeetingDate(heldAt)}
    </button>
  );
}
