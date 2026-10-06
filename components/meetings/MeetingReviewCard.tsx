"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { ActionSuggestion, MeetingFolder, MeetingFolderType, MeetingWithSuggestions } from "@/types/database";
import type { SuggestionEdits } from "@/lib/supabase/meetings";
import { useProjectStore } from "@/stores/projectStore";
import { projectForFolder } from "@/lib/utils/folderTree";
import { FolderSelect } from "./FolderSelect";
import { SuggestionRow } from "./SuggestionRow";
import { MeetingSummary } from "./MeetingSummary";
import { FindActionsButton } from "./FindActionsButton";

type Props = {
  meeting: MeetingWithSuggestions;
  folders: MeetingFolder[];
  onAccept: (s: ActionSuggestion, edits: SuggestionEdits, project: string | null) => Promise<void>;
  onReject: (s: ActionSuggestion) => void;
  onUndoReject: (s: ActionSuggestion) => void;
  onFinish: (meetingId: string, folderId: string | null) => void;
  onCreateFolder: (name: string, type: MeetingFolderType, parentId: string | null) => Promise<MeetingFolder>;
  onFindActions: (meetingId: string) => Promise<void>;
};

export function formatMeetingDate(iso: string) {
  return new Date(iso).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/**
 * Eén beoordelingsmoment per overleg: map bevestigen + acties scheiden (kaf/koren).
 * Niets gebeurt automatisch — AI is assistent, niet baas.
 */
export function MeetingReviewCard({ meeting, folders, onAccept, onReject, onUndoReject, onFinish, onCreateFolder, onFindActions }: Props) {
  const projects = useProjectStore((s) => s.projects);
  const [folderId, setFolderId] = useState<string | null>(meeting.folder_id ?? meeting.suggested_folder_id);
  const [showSummary, setShowSummary] = useState(false);

  const open = meeting.action_suggestions.filter((s) => s.status === "suggested");
  const isSuggested = folderId !== null && folderId === meeting.suggested_folder_id && !meeting.folder_id;
  const project = projectForFolder(folders, projects, folderId);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 24, transition: { duration: 0.2 } }}
      className="rounded-2xl p-4"
      style={{
        background: "rgba(255,253,250,0.78)",
        backdropFilter: "var(--backdrop-blur)",
        WebkitBackdropFilter: "var(--backdrop-blur)",
        border: "0.5px solid rgba(255,255,255,0.65)",
        boxShadow: "0 1px 0 rgba(255,255,255,.7) inset, 0 6px 24px -10px rgba(60,40,30,0.18)",
      }}
    >
      {/* Kop */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-[16px] font-semibold leading-tight truncate" style={{ color: "#1A1410", letterSpacing: "-.015em" }}>
            {meeting.title}
          </p>
          <p className="text-[12px] mt-0.5 truncate" style={{ color: "#9A8F84" }}>
            {formatMeetingDate(meeting.held_at)}
            {meeting.participants.length > 0 && ` · ${meeting.participants.join(", ")}`}
          </p>
        </div>
        {meeting.summary && (
          <button onClick={() => setShowSummary((v) => !v)} className="text-[12px] font-semibold shrink-0" style={{ color: "#FF5A1F" }}>
            {showSummary ? "Verberg verslag" : "Verslag"}
          </button>
        )}
      </div>

      {showSummary && meeting.summary && (
        <div className="mt-3 max-h-72 overflow-y-auto rounded-xl p-3" style={{ background: "rgba(255,255,255,0.7)" }}>
          <MeetingSummary text={meeting.summary} />
        </div>
      )}

      {/* Map */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#9A8F84" }}>Map</span>
        <FolderSelect folders={folders} value={folderId} onChange={setFolderId} onCreate={onCreateFolder} highlight={isSuggested} />
        {isSuggested && meeting.folder_reason && (
          <span className="text-[11px]" style={{ color: "#FF7A45" }}>voorstel: {meeting.folder_reason}</span>
        )}
      </div>

      {/* Acties */}
      {meeting.action_suggestions.length > 0 ? (
        <div className="mt-3 divide-y" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
          {meeting.action_suggestions.map((s) => (
            <SuggestionRow
              key={s.id}
              suggestion={s}
              onAccept={(edits) => onAccept(s, edits, project)}
              onReject={() => onReject(s)}
              onUndoReject={() => onUndoReject(s)}
            />
          ))}
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-3">
          <p className="text-[12.5px]" style={{ color: "#9A8F84" }}>Nog geen acties in dit overleg.</p>
          <FindActionsButton onClick={() => onFindActions(meeting.id)} />
        </div>
      )}

      {/* Afronden */}
      <div className="mt-3 flex items-center justify-end gap-2">
        {open.length > 0 && (
          <span className="text-[11.5px] mr-auto" style={{ color: "#9A8F84" }}>
            {open.length} nog te beoordelen — open suggesties vervallen bij afronden
          </span>
        )}
        <button
          onClick={() => {
            // Openstaande suggesties tellen als kaf: bewust niet gekozen
            open.forEach((s) => onReject(s));
            onFinish(meeting.id, folderId);
          }}
          className="h-8 px-3.5 rounded-lg text-[12.5px] font-semibold text-white active:scale-95 transition-transform"
          style={{ background: "linear-gradient(135deg, #FF7A45 0%, #FF5A1F 60%, #FF3D8B 110%)" }}
        >
          {folderId ? "Opbergen" : "Afronden"}
        </button>
      </div>
    </motion.div>
  );
}
