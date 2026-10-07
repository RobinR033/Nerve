"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { ActionSuggestion, MeetingCategory, MeetingFolder, MeetingWithSuggestions } from "@/types/database";
import type { SuggestionEdits } from "@/lib/supabase/meetings";
import { useMeetingProject } from "@/hooks/useMeetingProject";
import { FolderSelect } from "./FolderSelect";
import { ProjectSelect } from "./ProjectSelect";
import { SuggestionList } from "./SuggestionList";
import { MeetingSummary } from "./MeetingSummary";
import { FindActionsButton } from "./FindActionsButton";

type Props = {
  meeting: MeetingWithSuggestions;
  folders: MeetingFolder[];
  categories: MeetingCategory[];
  onAccept: (s: ActionSuggestion, edits: SuggestionEdits, project: string | null) => Promise<void>;
  onReject: (s: ActionSuggestion) => void;
  onUndoReject: (s: ActionSuggestion) => void;
  onUndoAccept: (s: ActionSuggestion) => void;
  onAcceptAll: (meeting: MeetingWithSuggestions, project: string | null) => Promise<void>;
  onRejectAll: (meeting: MeetingWithSuggestions) => void;
  onFinish: (meetingId: string, folderId: string | null) => void;
  onCreateFolder: (name: string, categoryId: string | null, parentId: string | null) => Promise<MeetingFolder>;
  onFindActions: (meetingId: string) => Promise<void>;
  onChangeProject: (meetingId: string, project: string | null) => void;
};

export function formatMeetingDate(iso: string) {
  return new Date(iso).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/**
 * Eén beoordelingsmoment per overleg: map bevestigen + acties scheiden (kaf/koren).
 * Niets gebeurt automatisch — AI is assistent, niet baas.
 */
export function MeetingReviewCard({
  meeting,
  folders,
  categories,
  onAccept,
  onReject,
  onUndoReject,
  onUndoAccept,
  onAcceptAll,
  onRejectAll,
  onFinish,
  onCreateFolder,
  onFindActions,
  onChangeProject,
}: Props) {
  const [folderId, setFolderId] = useState<string | null>(meeting.folder_id ?? meeting.suggested_folder_id);
  const [showSummary, setShowSummary] = useState(false);

  const open = meeting.action_suggestions.filter((s) => s.status === "suggested");
  const isSuggested = folderId !== null && folderId === meeting.suggested_folder_id && !meeting.folder_id;
  const [project, setProject] = useMeetingProject(meeting.id, folders, folderId);

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
            {showSummary ? "Verberg verslag" : "Lees verslag"}
          </button>
        )}
      </div>

      {meeting.summary &&
        (showSummary ? (
          <div className="mt-3 max-h-72 overflow-y-auto rounded-xl p-3" style={{ background: "rgba(255,255,255,0.7)" }}>
            <MeetingSummary text={meeting.summary} />
          </div>
        ) : (
          // Voorproefje: eerste regels als platte tekst, tik om het hele verslag te lezen
          <button onClick={() => setShowSummary(true)} className="mt-2 w-full text-left">
            <p className="text-[13px] leading-snug line-clamp-3" style={{ color: "#6B6157" }}>
              {meeting.summary.replace(/[#*_>`]/g, "").replace(/^\s*[-•]\s+/gm, "• ").replace(/\s+/g, " ").trim()}
            </p>
          </button>
        ))}

      {/* Map */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#9A8F84" }}>Map</span>
        <FolderSelect folders={folders} categories={categories} value={folderId} onChange={setFolderId} onCreate={onCreateFolder} highlight={isSuggested} />
        {isSuggested && meeting.folder_reason && (
          <span className="text-[11px]" style={{ color: "#FF7A45" }}>voorstel: {meeting.folder_reason}</span>
        )}
      </div>

      {/* Project: taken uit dit overleg komen onder dit project */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#9A8F84" }}>Project</span>
        <ProjectSelect
          value={project}
          onChange={(p) => {
            setProject(p);
            onChangeProject(meeting.id, p);
          }}
        />
      </div>

      {/* Acties */}
      {meeting.action_suggestions.length > 0 ? (
        <div className="mt-3">
          <SuggestionList
            suggestions={meeting.action_suggestions}
            onAccept={(s, edits) => onAccept(s, edits, project)}
            onReject={onReject}
            onUndoReject={onUndoReject}
            onUndoAccept={onUndoAccept}
            onAcceptAll={() => onAcceptAll(meeting, project)}
            onRejectAll={() => onRejectAll(meeting)}
          />
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
            {open.length} nog open — blijven bewaard bij het overleg
          </span>
        )}
        <button
          // Open suggesties blijven open: later terug te vinden in Overleggen
          onClick={() => onFinish(meeting.id, folderId)}
          className="h-8 px-3.5 rounded-lg text-[12.5px] font-semibold text-white active:scale-95 transition-transform"
          style={{ background: "linear-gradient(135deg, #FF7A45 0%, #FF5A1F 60%, #FF3D8B 110%)" }}
        >
          {folderId ? "Opbergen" : "Afronden"}
        </button>
      </div>
    </motion.div>
  );
}
