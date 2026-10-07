"use client";

import { useState } from "react";
import type { ActionSuggestion, MeetingCategory, MeetingFolder, MeetingWithSuggestions } from "@/types/database";
import type { SuggestionEdits } from "@/lib/supabase/meetings";
import { fetchTranscript } from "@/lib/supabase/meetings";
import { useMeetingProject } from "@/hooks/useMeetingProject";
import { FolderSelect } from "./FolderSelect";
import { ProjectSelect } from "./ProjectSelect";
import { SuggestionList } from "./SuggestionList";
import { SummaryEditor } from "./SummaryEditor";
import { FindActionsButton } from "./FindActionsButton";
import { MeetingDateEdit } from "./MeetingDateEdit";

type Props = {
  meeting: MeetingWithSuggestions;
  folders: MeetingFolder[];
  categories: MeetingCategory[];
  onBack: () => void;
  onMove: (folderId: string | null) => void;
  onDelete: () => void;
  onAccept: (s: ActionSuggestion, edits: SuggestionEdits, project: string | null) => Promise<void>;
  onReject: (s: ActionSuggestion) => void;
  onUndoReject: (s: ActionSuggestion) => void;
  onUndoAccept: (s: ActionSuggestion) => void;
  onAcceptAll: (meeting: MeetingWithSuggestions, project: string | null) => Promise<void>;
  onRejectAll: (meeting: MeetingWithSuggestions) => void;
  onCreateFolder: (name: string, categoryId: string | null, parentId: string | null) => Promise<MeetingFolder>;
  onFindActions: () => Promise<void>;
  onSaveSummary: (text: string) => Promise<void>;
  onGenerateSummary: () => Promise<void>;
  onChangeDate: (heldAt: string) => void;
  onChangeProject: (project: string | null) => void;
};

/** Volledig overleg: verslag, acties (ook achteraf nog te accepteren) en transcript op aanvraag. */
export function MeetingDetail({
  meeting,
  folders,
  categories,
  onBack,
  onMove,
  onDelete,
  onAccept,
  onReject,
  onUndoReject,
  onUndoAccept,
  onAcceptAll,
  onRejectAll,
  onCreateFolder,
  onFindActions,
  onSaveSummary,
  onGenerateSummary,
  onChangeDate,
  onChangeProject,
}: Props) {
  const [transcript, setTranscript] = useState<string | null | undefined>(undefined);
  const [loadingTranscript, setLoadingTranscript] = useState(false);
  const [project, setProject] = useMeetingProject(meeting.id, folders, meeting.folder_id);

  async function toggleTranscript() {
    if (transcript !== undefined) {
      setTranscript(undefined);
      return;
    }
    setLoadingTranscript(true);
    try {
      setTranscript(await fetchTranscript(meeting.id));
    } finally {
      setLoadingTranscript(false);
    }
  }

  return (
    <article className="space-y-4">
      <button onClick={onBack} className="text-[13px] font-semibold" style={{ color: "#FF5A1F" }}>
        ← Terug
      </button>

      <header>
        <h2 className="font-display text-[24px] font-semibold leading-tight" style={{ color: "#1A1410", letterSpacing: "-.025em" }}>
          {meeting.title}
        </h2>
        <p className="text-[13px] mt-1" style={{ color: "#9A8F84" }}>
          <MeetingDateEdit heldAt={meeting.held_at} onChange={onChangeDate} />
          {meeting.participants.length > 0 && ` · ${meeting.participants.join(", ")}`}
          {` · bron: ${meeting.source}`}
        </p>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#9A8F84" }}>Map</span>
          <FolderSelect folders={folders} categories={categories} value={meeting.folder_id} onChange={onMove} onCreate={onCreateFolder} />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#9A8F84" }}>Project</span>
          <ProjectSelect
            value={project}
            onChange={(p) => {
              setProject(p);
              onChangeProject(p);
            }}
          />
        </div>
      </header>

      {/* Verslag bovenaan: lezen, zelf schrijven of aanpassen */}
      <section className="rounded-2xl p-4" style={card}>
        <SummaryEditor key={meeting.id} summary={meeting.summary} onSave={onSaveSummary} onGenerate={onGenerateSummary} />
      </section>

      {meeting.action_suggestions.length === 0 && (
        <section className="rounded-2xl p-4 flex items-center gap-3" style={card}>
          <p className="text-[13px] flex-1" style={{ color: "#6B6157" }}>Nog geen acties uit dit overleg.</p>
          <FindActionsButton onClick={onFindActions} />
        </section>
      )}

      {meeting.action_suggestions.length > 0 && (
        <section className="rounded-2xl p-4" style={card}>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: "#7C3AED" }}>Acties</p>
          <SuggestionList
            suggestions={meeting.action_suggestions}
            onAccept={(s, edits) => onAccept(s, edits, project)}
            onReject={onReject}
            onUndoReject={onUndoReject}
            onUndoAccept={onUndoAccept}
            onAcceptAll={() => onAcceptAll(meeting, project)}
            onRejectAll={() => onRejectAll(meeting)}
          />
        </section>
      )}

      <div className="flex items-center gap-3">
        <button onClick={toggleTranscript} className="text-[13px] font-semibold" style={{ color: "#6B6157" }}>
          {loadingTranscript ? "Laden…" : transcript !== undefined ? "Verberg transcript" : "Toon transcript"}
        </button>
        <button
          onClick={() => {
            if (window.confirm(`"${meeting.title}" definitief verwijderen? Taken die eruit zijn ontstaan blijven bestaan.`)) onDelete();
          }}
          className="ml-auto text-[12.5px]"
          style={{ color: "#E5484D" }}
        >
          Verwijderen
        </button>
      </div>

      {transcript !== undefined && (
        <section className="rounded-2xl p-4 text-[13px] leading-relaxed whitespace-pre-wrap max-h-[60vh] overflow-y-auto" style={{ ...card, color: "#3D332C" }}>
          {transcript ?? "Voor dit overleg is alleen de samenvatting bewaard."}
        </section>
      )}
    </article>
  );
}

const card: React.CSSProperties = {
  background: "rgba(255,253,250,0.78)",
  backdropFilter: "var(--backdrop-blur)",
  WebkitBackdropFilter: "var(--backdrop-blur)",
  border: "0.5px solid rgba(255,255,255,0.65)",
  boxShadow: "0 1px 0 rgba(255,255,255,.7) inset, 0 6px 24px -10px rgba(60,40,30,0.15)",
};
