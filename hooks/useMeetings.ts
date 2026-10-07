"use client";

import { useCallback, useEffect, useState } from "react";
import {
  acceptSuggestion,
  createFolder,
  deleteFolder,
  deleteMeeting,
  fetchFolders,
  fetchMeetings,
  fetchMeetingsToReview,
  finishReview,
  moveMeeting,
  rejectSuggestion,
  reopenReview,
  resetSuggestion,
  setSuggestionsStatus,
  undoAcceptSuggestion,
  updateMeetingSummary,
  updateFolder,
  type SuggestionEdits,
} from "@/lib/supabase/meetings";
import { useTaskStore } from "@/stores/taskStore";
import { useToastStore } from "@/stores/toastStore";
import type { ActionSuggestion, MeetingFolder, MeetingFolderType, MeetingWithSuggestions } from "@/types/database";

/**
 * Overleggen + mappen + suggesties.
 * mode "review": alleen nog niet beoordeelde overleggen (dashboard).
 * mode "all": alles (overlegpagina).
 */
export function useMeetings(mode: "review" | "all") {
  const [meetings, setMeetings] = useState<MeetingWithSuggestions[]>([]);
  const [folders, setFolders] = useState<MeetingFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const addTask = useTaskStore((s) => s.addTask);
  const updateTaskLocal = useTaskStore((s) => s.updateTask);
  const toast = useToastStore((s) => s.show);

  const load = useCallback(async () => {
    try {
      const [m, f] = await Promise.all([
        mode === "review" ? fetchMeetingsToReview() : fetchMeetings(),
        fetchFolders(),
      ]);
      setMeetings(m);
      setFolders(f);
    } catch (err) {
      // Tabellen bestaan nog niet (migratie niet gedraaid) → blok blijft gewoon leeg
      console.error("Overleggen laden mislukt:", err);
    } finally {
      setIsLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    load();
  }, [load]);

  const patchSuggestion = (updated: ActionSuggestion) =>
    setMeetings((ms) =>
      ms.map((m) =>
        m.id === updated.meeting_id
          ? { ...m, action_suggestions: m.action_suggestions.map((s) => (s.id === updated.id ? updated : s)) }
          : m,
      ),
    );

  async function accept(suggestion: ActionSuggestion, edits: SuggestionEdits, project: string | null) {
    try {
      const { task, suggestion: updated } = await acceptSuggestion(suggestion, edits, project);
      addTask(task);
      patchSuggestion(updated);
      toast(edits.owner === "other" ? `Naja-taak voor ${task.waiting_for}` : "Taak aangemaakt");
    } catch (err) {
      console.error("Suggestie accepteren mislukt:", err);
      toast("Taak aanmaken mislukt");
    }
  }

  async function reject(suggestion: ActionSuggestion) {
    patchSuggestion({ ...suggestion, status: "rejected" });
    try {
      await rejectSuggestion(suggestion.id);
      toast("Suggestie verworpen", { label: "Ongedaan maken", onClick: () => undoReject(suggestion) });
    } catch (err) {
      console.error("Suggestie afwijzen mislukt:", err);
      patchSuggestion(suggestion);
    }
  }

  /** Statussen van meerdere suggesties in één overleg lokaal aanpassen */
  const patchMany = (meetingId: string, ids: string[], status: ActionSuggestion["status"]) =>
    setMeetings((ms) =>
      ms.map((m) =>
        m.id === meetingId
          ? {
              ...m,
              action_suggestions: m.action_suggestions.map((s) =>
                ids.includes(s.id) ? { ...s, status, decided_at: status === "suggested" ? null : s.decided_at } : s,
              ),
            }
          : m,
      ),
    );

  async function rejectAll(meeting: MeetingWithSuggestions) {
    const ids = meeting.action_suggestions.filter((s) => s.status === "suggested").map((s) => s.id);
    if (ids.length === 0) return;
    patchMany(meeting.id, ids, "rejected");
    try {
      await setSuggestionsStatus(ids, "rejected");
      toast(`${ids.length} suggesties verworpen`, {
        label: "Ongedaan maken",
        onClick: async () => {
          patchMany(meeting.id, ids, "suggested");
          await setSuggestionsStatus(ids, "suggested").catch((err) => {
            console.error("Terugzetten mislukt:", err);
            load();
          });
        },
      });
    } catch (err) {
      console.error("Alles verwerpen mislukt:", err);
      patchMany(meeting.id, ids, "suggested");
    }
  }

  /** Alle open suggesties accepteren, elk met de eigen gegevens (eigenaar, persoon, deadline) */
  async function acceptAll(meeting: MeetingWithSuggestions, project: string | null) {
    const open = meeting.action_suggestions.filter((s) => s.status === "suggested");
    const accepted: ActionSuggestion[] = [];
    for (const s of open) {
      try {
        const { task, suggestion: updated } = await acceptSuggestion(
          s,
          { text: s.text, owner: s.owner, person: s.person, deadline: s.deadline },
          project,
        );
        addTask(task);
        patchSuggestion(updated);
        accepted.push(updated);
      } catch (err) {
        console.error("Suggestie accepteren mislukt:", err);
      }
    }
    if (accepted.length === 0) {
      toast("Taken aanmaken mislukt");
      return;
    }
    const failed = open.length - accepted.length;
    toast(
      `${accepted.length} ${accepted.length === 1 ? "taak" : "taken"} aangemaakt${failed ? ` (${failed} mislukt)` : ""}`,
      { label: "Ongedaan maken", onClick: () => accepted.forEach((s) => undoAccept(s)) },
    );
  }

  /** Accepteren terugdraaien: taak naar archief, suggestie weer open */
  async function undoAccept(suggestion: ActionSuggestion) {
    try {
      const updated = await undoAcceptSuggestion(suggestion);
      if (suggestion.task_id) updateTaskLocal(suggestion.task_id, { archived_at: new Date().toISOString() });
      patchSuggestion(updated);
    } catch (err) {
      console.error("Accepteren terugdraaien mislukt:", err);
      toast("Terugdraaien mislukt");
    }
  }

  async function undoReject(suggestion: ActionSuggestion) {
    patchSuggestion({ ...suggestion, status: "suggested", decided_at: null });
    try {
      await resetSuggestion(suggestion.id);
    } catch (err) {
      console.error("Terugzetten mislukt:", err);
      patchSuggestion(suggestion);
    }
  }

  async function finish(meetingId: string, folderId: string | null) {
    const before = meetings;
    const now = new Date().toISOString();
    setMeetings((ms) =>
      mode === "review"
        ? ms.filter((m) => m.id !== meetingId)
        : ms.map((m) => (m.id === meetingId ? { ...m, folder_id: folderId, reviewed_at: now } : m)),
    );
    try {
      await finishReview(meetingId, folderId);
      toast("Opgeborgen", {
        label: "Ongedaan maken",
        onClick: async () => {
          try {
            await reopenReview(meetingId);
            await load();
          } catch (err) {
            console.error("Terughalen mislukt:", err);
          }
        },
      });
    } catch (err) {
      console.error("Afronden mislukt:", err);
      setMeetings(before);
    }
  }

  async function move(meetingId: string, folderId: string | null) {
    setMeetings((ms) => ms.map((m) => (m.id === meetingId ? { ...m, folder_id: folderId } : m)));
    try {
      await moveMeeting(meetingId, folderId);
    } catch (err) {
      console.error("Verplaatsen mislukt:", err);
      load();
    }
  }

  async function remove(meetingId: string) {
    setMeetings((ms) => ms.filter((m) => m.id !== meetingId));
    try {
      await deleteMeeting(meetingId);
    } catch (err) {
      console.error("Verwijderen mislukt:", err);
      load();
    }
  }

  /** Laat Claude (opnieuw) acties zoeken in een overleg; meldt het resultaat. */
  async function findActions(meetingId: string) {
    try {
      const res = await fetch(`/api/meetings/${meetingId}/extract`, { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as { suggestions?: number; error?: string };
      if (!res.ok) {
        toast(`Acties zoeken mislukt: ${body.error ?? res.status}`);
        return;
      }
      toast(body.suggestions ? `${body.suggestions} nieuwe actie${body.suggestions === 1 ? "" : "s"} gevonden` : "Geen nieuwe acties gevonden");
      await load();
    } catch (err) {
      console.error("Acties zoeken mislukt:", err);
      toast("Acties zoeken mislukt");
    }
  }

  /** Verslag opslaan en daarna automatisch (opnieuw) acties laten zoeken */
  async function saveSummary(meetingId: string, summary: string) {
    const before = meetings;
    setMeetings((ms) => ms.map((m) => (m.id === meetingId ? { ...m, summary: summary.trim() || null } : m)));
    try {
      await updateMeetingSummary(meetingId, summary);
    } catch (err) {
      console.error("Verslag opslaan mislukt:", err);
      setMeetings(before);
      toast("Verslag opslaan mislukt");
      return;
    }
    if (summary.trim()) await findActions(meetingId);
    else toast("Verslag opgeslagen");
  }

  async function addFolder(name: string, type: MeetingFolderType, parentId: string | null, projectId: string | null = null) {
    const folder = await createFolder(name, type, parentId, projectId);
    setFolders((fs) => [...fs, folder]);
    return folder;
  }

  async function editFolder(id: string, updates: Partial<Pick<MeetingFolder, "name" | "type" | "parent_id" | "project_id">>) {
    setFolders((fs) => fs.map((f) => (f.id === id ? { ...f, ...updates } : f)));
    try {
      await updateFolder(id, updates);
    } catch (err) {
      console.error("Map bijwerken mislukt:", err);
      load();
    }
  }

  async function removeFolder(id: string) {
    try {
      await deleteFolder(id);
      // Database zet verwijzingen op null; lokaal hetzelfde doen
      setFolders((fs) => fs.filter((f) => f.id !== id).map((f) => (f.parent_id === id ? { ...f, parent_id: null } : f)));
      setMeetings((ms) =>
        ms.map((m) => ({
          ...m,
          folder_id: m.folder_id === id ? null : m.folder_id,
          suggested_folder_id: m.suggested_folder_id === id ? null : m.suggested_folder_id,
        })),
      );
    } catch (err) {
      console.error("Map verwijderen mislukt:", err);
    }
  }

  return {
    meetings,
    folders,
    isLoading,
    reload: load,
    accept,
    acceptAll,
    undoAccept,
    reject,
    rejectAll,
    undoReject,
    finish,
    move,
    remove,
    findActions,
    saveSummary,
    addFolder,
    editFolder,
    removeFolder,
  };
}
