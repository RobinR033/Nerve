"use client";

import { useState } from "react";
import type { ActionOwner, ActionSuggestion } from "@/types/database";
import type { SuggestionEdits } from "@/lib/supabase/meetings";
import { SuggestionRow } from "./SuggestionRow";

type Props = {
  suggestions: ActionSuggestion[];
  onAccept: (s: ActionSuggestion, edits: SuggestionEdits) => Promise<void>;
  onReject: (s: ActionSuggestion) => void;
  onUndoReject: (s: ActionSuggestion) => void;
  onUndoAccept: (s: ActionSuggestion) => void;
  onAcceptAll: () => Promise<void>;
  onRejectAll: () => void;
  onChangeOwner?: (s: ActionSuggestion, owner: ActionOwner, person: string | null) => void;
};

/**
 * Actiesuggesties van één overleg: open + geaccepteerd zichtbaar, verworpen ingeklapt
 * (maar altijd terug te halen). Bij 2+ open suggesties: alles in één keer verwerken.
 */
export function SuggestionList({ suggestions, onAccept, onReject, onUndoReject, onUndoAccept, onAcceptAll, onRejectAll, onChangeOwner }: Props) {
  const [showRejected, setShowRejected] = useState(false);
  const [busyAll, setBusyAll] = useState(false);

  const open = suggestions.filter((s) => s.status === "suggested");
  const rejected = suggestions.filter((s) => s.status === "rejected");
  const visible = suggestions.filter((s) => s.status !== "rejected");

  return (
    <div>
      {open.length >= 2 && (
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <button
            onClick={async () => {
              setBusyAll(true);
              try {
                await onAcceptAll();
              } finally {
                setBusyAll(false);
              }
            }}
            disabled={busyAll}
            className="h-8 px-3 rounded-lg text-[12.5px] font-semibold text-white disabled:opacity-60 active:scale-95 transition-transform"
            style={{ background: "#1F9D55" }}
          >
            {busyAll ? "Bezig…" : `Alles accepteren (${open.length})`}
          </button>
          <button
            onClick={onRejectAll}
            disabled={busyAll}
            className="h-8 px-3 rounded-lg text-[12.5px] font-semibold disabled:opacity-60"
            style={{ color: "#6B6157", background: "rgba(0,0,0,0.05)" }}
          >
            Alles verwerpen
          </button>
        </div>
      )}

      <div className="divide-y" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
        {visible.map((s) => (
          <SuggestionRow
            key={s.id}
            suggestion={s}
            onAccept={(edits) => onAccept(s, edits)}
            onReject={() => onReject(s)}
            onUndoReject={() => onUndoReject(s)}
            onUndoAccept={() => onUndoAccept(s)}
            onChangeOwner={onChangeOwner ? (owner, person) => onChangeOwner(s, owner, person) : undefined}
          />
        ))}
      </div>

      {rejected.length > 0 && (
        <div className="mt-1">
          <button onClick={() => setShowRejected((v) => !v)} className="text-[11.5px] font-semibold py-1" style={{ color: "#9A8F84" }}>
            Verworpen ({rejected.length}) — {showRejected ? "verbergen" : "tonen"}
          </button>
          {showRejected &&
            rejected.map((s) => (
              <SuggestionRow
                key={s.id}
                suggestion={s}
                onAccept={(edits) => onAccept(s, edits)}
                onReject={() => onReject(s)}
                onUndoReject={() => onUndoReject(s)}
              />
            ))}
        </div>
      )}
    </div>
  );
}
