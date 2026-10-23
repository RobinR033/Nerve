"use client";

import { useState } from "react";
import type { MeetingCategory, MeetingFolder } from "@/types/database";
import { FolderSelect } from "./FolderSelect";
import { useToastStore } from "@/stores/toastStore";

type Props = {
  folders: MeetingFolder[];
  categories: MeetingCategory[];
  defaultFolderId: string | null;
  onBack: () => void;
  onCreateFolder: (name: string, categoryId: string | null, parentId: string | null) => Promise<MeetingFolder>;
  // Opgeslagen; makeSummary = verslag nog laten maken uit het transcript
  onSaved: (meetingId: string, makeSummary: boolean) => void;
};

/**
 * Handmatig overleg toevoegen in de rechterkolom (zelfde opbouw als een bestaand overleg).
 * Verslag/aantekeningen en/of een ruw transcript uit een andere bron; Nerve haalt
 * er via AI actiesuggesties uit, die beoordeel je daarna zoals altijd.
 */
export function NewMeetingForm({ folders, categories, defaultFolderId, onBack, onCreateFolder, onSaved }: Props) {
  const folder = folders.find((f) => f.id === defaultFolderId) ?? null;
  const [title, setTitle] = useState(() => (folder ? (folder.type === "person" && !/^bila\b/i.test(folder.name) ? `Bila ${folder.name}` : folder.name) : ""));
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  // Persoonsmap → die persoon staat alvast als deelnemer
  const [participants, setParticipants] = useState(() => (folder?.type === "person" ? folder.name : ""));
  const [text, setText] = useState("");
  const [transcript, setTranscript] = useState("");
  const [showTranscript, setShowTranscript] = useState(false);
  const [makeSummary, setMakeSummary] = useState(true);
  const [folderId, setFolderId] = useState<string | null>(defaultFolderId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasText = Boolean(text.trim() || transcript.trim());
  const transcriptOnly = !text.trim() && Boolean(transcript.trim());

  async function save() {
    if (!title.trim() || !hasText) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          held_at: new Date(`${date}T12:00:00`).toISOString(),
          participants: participants.split(",").map((p) => p.trim()).filter(Boolean),
          summary: text.trim() || null,
          transcript: transcript.trim() || null,
          // Gekozen map wordt direct ingevuld (op id, niet op naam)
          folder_id: folderId,
          folder_hint: folders.find((f) => f.id === folderId)?.name ?? null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const body = (await res.json().catch(() => ({}))) as { meetingId?: string; actionsError?: string };
      if (body.actionsError) {
        // Overleg staat erin; acties kun je later opnieuw laten zoeken
        useToastStore.getState().show("Opgeslagen, maar acties zoeken mislukte — klik op 'Acties zoeken'");
      }
      onSaved(body.meetingId ?? "", transcriptOnly && makeSummary);
    } catch (err) {
      console.error("Overleg opslaan mislukt:", err);
      setError("Opslaan mislukt — probeer het opnieuw.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="space-y-4">
      <button onClick={onBack} className="text-[13px] font-semibold" style={{ color: "#FF5A1F" }}>
        ← Terug
      </button>

      <header className="space-y-2">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titel, bijv. Bila Jan"
          className="w-full bg-transparent font-display text-[24px] font-semibold leading-tight"
          style={{ color: "#1A1410", letterSpacing: "-.025em", outline: "none" }}
        />
        <div className="flex flex-wrap gap-2">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 px-3 rounded-xl text-[13.5px]" style={field} />
          <input
            value={participants}
            onChange={(e) => setParticipants(e.target.value)}
            placeholder="Deelnemers, komma-gescheiden"
            className="flex-1 min-w-[12rem] h-9 px-3 rounded-xl text-[13.5px]"
            style={field}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#9A8F84" }}>Map</span>
          <FolderSelect folders={folders} categories={categories} value={folderId} onChange={setFolderId} onCreate={onCreateFolder} />
        </div>
      </header>

      <section className="rounded-2xl p-4 space-y-2" style={card}>
        <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#FF5A1F" }}>Verslag</p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Typ of plak hier je verslag of aantekeningen…"
          rows={Math.min(24, Math.max(8, text.split("\n").length + 2))}
          className="w-full px-3 py-2.5 rounded-xl text-[14px] leading-relaxed"
          style={field}
        />
      </section>

      <section className="rounded-2xl p-4 space-y-2" style={card}>
        {showTranscript ? (
          <>
            <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#6B6157" }}>Ruwe transcriptie</p>
            <textarea
              autoFocus
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Plak hier de transcriptie uit een andere bron…"
              rows={10}
              className="w-full px-3 py-2.5 rounded-xl text-[13px] leading-relaxed"
              style={field}
            />
            {transcriptOnly && (
              <label className="flex items-center gap-2 text-[12.5px]" style={{ color: "#6B6157" }}>
                <input type="checkbox" checked={makeSummary} onChange={(e) => setMakeSummary(e.target.checked)} />
                Verslag laten maken uit de transcriptie
              </label>
            )}
          </>
        ) : (
          <button onClick={() => setShowTranscript(true)} className="text-[13px] font-semibold" style={{ color: "#6B6157" }}>
            + Ruwe transcriptie plakken
          </button>
        )}
      </section>

      <p className="text-[12px]" style={{ color: "#9A8F84" }}>
        Nerve zoekt er actiepunten in. Die verschijnen als suggestie bij Te beoordelen — jij beslist.
      </p>
      {error && <p className="text-[12.5px]" style={{ color: "#E5484D" }}>{error}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={onBack} className="h-10 px-4 rounded-xl text-[14px]" style={{ color: "#6B6157" }}>Annuleer</button>
        <button
          onClick={save}
          disabled={busy || !title.trim() || !hasText}
          className="h-10 px-5 rounded-xl text-[14px] font-semibold text-white disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #FF7A45 0%, #FF5A1F 60%, #FF3D8B 110%)" }}
        >
          {busy ? "Acties zoeken…" : "Opslaan"}
        </button>
      </div>
    </article>
  );
}

const field: React.CSSProperties = {
  background: "#fff",
  border: "0.5px solid rgba(0,0,0,0.12)",
  color: "#1A1410",
  outline: "none",
};

const card: React.CSSProperties = {
  background: "rgba(255,253,250,0.78)",
  backdropFilter: "var(--backdrop-blur)",
  WebkitBackdropFilter: "var(--backdrop-blur)",
  border: "0.5px solid rgba(255,255,255,0.65)",
  boxShadow: "0 1px 0 rgba(255,255,255,.7) inset, 0 6px 24px -10px rgba(60,40,30,0.15)",
};
