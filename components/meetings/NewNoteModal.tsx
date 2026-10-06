"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { MeetingFolder, MeetingFolderType } from "@/types/database";
import { FolderSelect } from "./FolderSelect";

type Props = {
  open: boolean;
  folders: MeetingFolder[];
  defaultFolderId: string | null;
  onClose: () => void;
  onCreateFolder: (name: string, type: MeetingFolderType, parentId: string | null) => Promise<MeetingFolder>;
  onSaved: () => void;
};

/**
 * Handmatig verslag/aantekening toevoegen (bijv. plakken uit OneNote of Word).
 * Nerve haalt er via AI actiesuggesties uit; die beoordeel je daarna zoals altijd.
 */
export function NewNoteModal({ open, folders, defaultFolderId, onClose, onCreateFolder, onSaved }: Props) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [participants, setParticipants] = useState("");
  const [text, setText] = useState("");
  const [folderId, setFolderId] = useState<string | null>(defaultFolderId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!title.trim() || !text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const folderName = folders.find((f) => f.id === folderId)?.name ?? null;
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          held_at: new Date(`${date}T12:00:00`).toISOString(),
          participants: participants.split(",").map((p) => p.trim()).filter(Boolean),
          summary: text,
          // Gekozen map gaat als hint mee → staat bovenaan als voorstel
          folder_hint: folderName,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setTitle("");
      setParticipants("");
      setText("");
      onSaved();
      onClose();
    } catch (err) {
      console.error("Aantekening opslaan mislukt:", err);
      setError("Opslaan mislukt — probeer het opnieuw.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6"
          style={{ background: "rgba(26,20,16,0.28)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full md:max-w-xl rounded-t-2xl md:rounded-2xl p-5 space-y-3 max-h-[92vh] overflow-y-auto"
            style={{ background: "#FFFDFA", boxShadow: "0 24px 64px -16px rgba(60,40,30,0.35)" }}
          >
            <h2 className="font-display text-[20px] font-semibold" style={{ color: "#1A1410", letterSpacing: "-.02em" }}>
              Aantekening toevoegen
            </h2>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titel, bijv. Bila Jan" className="w-full h-10 px-3 rounded-xl text-[14px]" style={field} />
            <div className="flex flex-wrap gap-2">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-10 px-3 rounded-xl text-[14px]" style={field} />
              <input value={participants} onChange={(e) => setParticipants(e.target.value)} placeholder="Deelnemers, komma-gescheiden" className="flex-1 min-w-[12rem] h-10 px-3 rounded-xl text-[14px]" style={field} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#9A8F84" }}>Map</span>
              <FolderSelect folders={folders} value={folderId} onChange={setFolderId} onCreate={onCreateFolder} />
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Plak hier je verslag of aantekeningen…"
              rows={10}
              className="w-full px-3 py-2.5 rounded-xl text-[14px] leading-relaxed"
              style={field}
            />
            <p className="text-[12px]" style={{ color: "#9A8F84" }}>
              Nerve zoekt er actiepunten in. Die verschijnen als suggestie — jij beslist.
            </p>
            {error && <p className="text-[12.5px]" style={{ color: "#E5484D" }}>{error}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="h-10 px-4 rounded-xl text-[14px]" style={{ color: "#6B6157" }}>Annuleer</button>
              <button
                onClick={save}
                disabled={busy || !title.trim() || !text.trim()}
                className="h-10 px-5 rounded-xl text-[14px] font-semibold text-white disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #FF7A45 0%, #FF5A1F 60%, #FF3D8B 110%)" }}
              >
                {busy ? "Acties zoeken…" : "Opslaan"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const field: React.CSSProperties = {
  background: "#fff",
  border: "0.5px solid rgba(0,0,0,0.12)",
  color: "#1A1410",
  outline: "none",
};
