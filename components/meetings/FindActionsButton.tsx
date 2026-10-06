"use client";

import { useState } from "react";

/** "Acties zoeken": laat Claude (opnieuw) actiepunten uit het verslag halen. */
export function FindActionsButton({ onClick }: { onClick: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      onClick={async () => {
        setBusy(true);
        try {
          await onClick();
        } finally {
          setBusy(false);
        }
      }}
      disabled={busy}
      className="h-8 px-3 rounded-lg text-[12.5px] font-semibold disabled:opacity-60"
      style={{ color: "#7C3AED", background: "rgba(124,58,237,0.08)" }}
    >
      {busy ? "Acties zoeken…" : "Acties zoeken"}
    </button>
  );
}
