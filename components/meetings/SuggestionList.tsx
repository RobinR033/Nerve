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
  // Een paar eigen acties samenvoegen tot één taak met subtaken
  onBundle?: (picked: ActionSuggestion[], title: string) => Promise<void>;
  // Na het opbergen staan geaccepteerde acties als taken in het overleg; hier dan niet nog eens
  hideAccepted?: boolean;
};

/**
 * Actiesuggesties van één overleg: open + geaccepteerd zichtbaar, verworpen ingeklapt
 * (maar altijd terug te halen). Bij 2+ open suggesties: alles in één keer verwerken.
 */
export function SuggestionList({
  suggestions,
  onAccept,
  onReject,
  onUndoReject,
  onUndoAccept,
  onAcceptAll,
  onRejectAll,
  onChangeOwner,
  onBundle,
  hideAccepted = false,
}: Props) {
  const [showRejected, setShowRejected] = useState(false);
  const [busyAll, setBusyAll] = useState(false);
  // Bundelmodus: acties aanvinken en samen één taak maken
  const [bundling, setBundling] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [bundleTitle, setBundleTitle] = useState("");
  const [busyBundle, setBusyBundle] = useState(false);

  const open = suggestions.filter((s) => s.status === "suggested");
  const ownOpen = open.filter((s) => s.owner === "me");
  const rejected = suggestions.filter((s) => s.status === "rejected");
  const visible = suggestions.filter((s) => s.status !== "rejected" && !(hideAccepted && s.status === "accepted"));

  function togglePick(s: ActionSuggestion) {
    const next = picked.includes(s.id) ? picked.filter((id) => id !== s.id) : [...picked, s.id];
    setPicked(next);
    // Eerste gekozen actie als voorzet voor de naam, zolang je er zelf niets van hebt gemaakt
    if (next.length === 1 && !bundleTitle.trim()) setBundleTitle(s.text);
    if (next.length === 0) setBundleTitle("");
  }

  function stopBundling() {
    setBundling(false);
    setPicked([]);
    setBundleTitle("");
  }

  async function confirmBundle() {
    if (!onBundle || picked.length < 2 || !bundleTitle.trim()) return;
    setBusyBundle(true);
    try {
      await onBundle(ownOpen.filter((s) => picked.includes(s.id)), bundleTitle.trim());
      stopBundling();
    } finally {
      setBusyBundle(false);
    }
  }

  if (bundling) {
    return (
      <div>
        <p className="text-[12px] mb-1.5" style={{ color: "#6B6157" }}>
          Vink de acties aan die bij elkaar horen. Ze worden één taak met subtaken.
        </p>
        <div className="divide-y" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
          {open.map((s) => {
            const selectable = s.owner === "me";
            const on = picked.includes(s.id);
            return (
              <label
                key={s.id}
                className="flex items-start gap-2.5 py-2"
                style={{ cursor: selectable ? "pointer" : "default", opacity: selectable ? 1 : 0.45 }}
                title={selectable ? undefined : "Naja's blijven los (ze liggen bij iemand anders)"}
              >
                <input
                  type="checkbox"
                  checked={on}
                  disabled={!selectable}
                  onChange={() => togglePick(s)}
                  className="mt-0.5 w-4 h-4 shrink-0 accent-[#FF5A1F]"
                />
                <span className="flex-1 min-w-0 text-[13.5px] leading-snug" style={{ color: "#1A1410" }}>
                  {s.text}
                  {!selectable && <span className="ml-1.5 text-[11px] font-semibold" style={{ color: "#2E6BFF" }}>naja</span>}
                </span>
                {s.deadline && (
                  <span className="text-[11px] font-semibold shrink-0" style={{ color: "#6B6157" }}>
                    {new Date(s.deadline).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
                  </span>
                )}
              </label>
            );
          })}
        </div>
        <div className="mt-2 rounded-xl p-2.5 space-y-2" style={{ background: "rgba(255,246,238,0.9)", border: "0.5px solid rgba(255,138,92,0.4)" }}>
          <input
            value={bundleTitle}
            onChange={(e) => setBundleTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && confirmBundle()}
            placeholder="Naam van de bundel, bijv. Testplan afronden"
            className="w-full h-8 px-2.5 rounded-lg text-[13px]"
            style={{ background: "#fff", border: "0.5px solid rgba(0,0,0,0.12)", color: "#1A1410", outline: "none" }}
          />
          <div className="flex items-center gap-2">
            <span className="text-[12px] flex-1" style={{ color: "#9A8F84" }}>
              {picked.length < 2 ? "Kies minstens 2 acties" : `${picked.length} acties`}
            </span>
            <button onClick={stopBundling} className="h-8 px-2 text-[12.5px]" style={{ color: "#9A8F84" }}>
              Annuleer
            </button>
            <button
              onClick={confirmBundle}
              disabled={busyBundle || picked.length < 2 || !bundleTitle.trim()}
              className="h-8 px-3 rounded-lg text-[12.5px] font-semibold text-white disabled:opacity-50"
              style={{ background: "#FF5A1F" }}
            >
              {busyBundle ? "Bezig…" : "Bundelen"}
            </button>
          </div>
        </div>
      </div>
    );
  }

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
          {onBundle && ownOpen.length >= 2 && (
            <button
              onClick={() => setBundling(true)}
              disabled={busyAll}
              className="h-8 px-3 rounded-lg text-[12.5px] font-semibold disabled:opacity-60"
              style={{ color: "#FF5A1F", background: "rgba(255,90,31,0.1)" }}
              title="Een paar samenhangende acties samenvoegen tot één taak"
            >
              Bundelen…
            </button>
          )}
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
