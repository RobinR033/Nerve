"use client";

import { useState } from "react";

type SingleAnswer = { answer: string; verdict: "ja" | "nee" | "deels" | "onbekend"; quotes: { text: string; verified: boolean }[] };
type CrossAnswer = { answer: string; sources: { meetingId: string; quote: string | null }[] };
type Entry = { question: string; result: SingleAnswer | CrossAnswer | { error: string } };

type Props = {
  title: string;
  placeholder: string;
  // "single": één overleg (POST /api/meetings/[id]/ask); "cross": meerdere (POST /api/meetings/ask)
  mode: { kind: "single"; meetingId: string } | { kind: "cross"; meetingIds?: string[] };
  // Bij "cross": titels/datums om bronnen te tonen, en een overleg openen
  meetingLabel?: (id: string) => string | null;
  onOpenMeeting?: (id: string) => void;
  hint?: string;
};

const verdictStyle: Record<SingleAnswer["verdict"], { label: string; color: string } | null> = {
  ja: { label: "Ja", color: "#1F9D55" },
  nee: { label: "Nee", color: "#E5484D" },
  deels: { label: "Deels", color: "#E0A100" },
  onbekend: null,
};

/** Vraag stellen aan je overleg(gen). Antwoord altijd met bron, zodat je het zelf kunt nagaan. */
export function AskBox({ title, placeholder, mode, meetingLabel, onOpenMeeting, hint }: Props) {
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);

  async function ask() {
    const q = question.trim();
    if (q.length < 3 || busy) return;
    setBusy(true);
    try {
      const res =
        mode.kind === "single"
          ? await fetch(`/api/meetings/${mode.meetingId}/ask`, post({ question: q }))
          : await fetch("/api/meetings/ask", post({ question: q, meetingIds: mode.meetingIds }));
      const body = await res.json().catch(() => ({}));
      setEntries((es) => [{ question: q, result: res.ok ? body : { error: body.error ?? `Fout ${res.status}` } }, ...es]);
      if (res.ok) setQuestion("");
    } catch {
      setEntries((es) => [{ question: q, result: { error: "Geen verbinding" } }, ...es]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "#2E6BFF" }}>{title}</p>
      <div className="flex gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
          placeholder={placeholder}
          className="flex-1 min-w-0 h-10 px-3 rounded-xl text-[14px]"
          style={{ background: "#fff", border: "0.5px solid rgba(0,0,0,0.12)", color: "#1A1410", outline: "none" }}
        />
        <button
          onClick={ask}
          disabled={busy || question.trim().length < 3}
          className="h-10 px-4 rounded-xl text-[13px] font-semibold text-white shrink-0 disabled:opacity-50"
          style={{ background: "#2E6BFF" }}
        >
          {busy ? "Zoeken…" : "Vraag"}
        </button>
      </div>
      {hint && entries.length === 0 && <p className="text-[12px] mt-1.5" style={{ color: "#9A8F84" }}>{hint}</p>}

      <div className="mt-3 space-y-3">
        {entries.map((e, i) => (
          <div key={entries.length - i} className="rounded-xl p-3" style={{ background: "rgba(46,107,255,0.06)" }}>
            <p className="text-[12.5px] font-semibold mb-1" style={{ color: "#2E6BFF" }}>{e.question}</p>
            {"error" in e.result ? (
              <p className="text-[13px]" style={{ color: "#E5484D" }}>{e.result.error}</p>
            ) : "verdict" in e.result ? (
              <Single answer={e.result} />
            ) : (
              <Cross answer={e.result} meetingLabel={meetingLabel} onOpenMeeting={onOpenMeeting} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Single({ answer }: { answer: SingleAnswer }) {
  const v = verdictStyle[answer.verdict];
  return (
    <div>
      <p className="text-[13.5px] leading-snug" style={{ color: "#1A1410" }}>
        {v && (
          <span className="inline-block mr-1.5 px-1.5 rounded text-[11px] font-bold text-white align-middle" style={{ background: v.color }}>
            {v.label}
          </span>
        )}
        {answer.answer}
      </p>
      {answer.quotes.map((q, i) => (
        <p key={i} className="mt-1.5 text-[12.5px] italic pl-2" style={{ color: "#6B6157", borderLeft: `2px solid ${q.verified ? "#9DB8FF" : "#E0A100"}` }}>
          “{q.text}”
          {!q.verified && (
            <span className="not-italic text-[11px] ml-1" style={{ color: "#B07D00" }} title="Dit citaat staat niet letterlijk in de tekst — controleer het">
              (niet letterlijk teruggevonden)
            </span>
          )}
        </p>
      ))}
    </div>
  );
}

function Cross({ answer, meetingLabel, onOpenMeeting }: { answer: CrossAnswer; meetingLabel?: (id: string) => string | null; onOpenMeeting?: (id: string) => void }) {
  return (
    <div>
      <p className="text-[13.5px] leading-snug whitespace-pre-line" style={{ color: "#1A1410" }}>{answer.answer}</p>
      {answer.sources.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {answer.sources.map((s) => (
            <button
              key={s.meetingId}
              onClick={() => onOpenMeeting?.(s.meetingId)}
              className="block w-full text-left rounded-lg px-2.5 py-1.5"
              style={{ background: "rgba(255,255,255,0.75)" }}
            >
              <span className="text-[12px] font-semibold" style={{ color: "#2E6BFF" }}>↳ {meetingLabel?.(s.meetingId) ?? "Overleg"}</span>
              {s.quote && <span className="block text-[12px] italic mt-0.5" style={{ color: "#6B6157" }}>“{s.quote}”</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function post(body: unknown): RequestInit {
  return { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}
