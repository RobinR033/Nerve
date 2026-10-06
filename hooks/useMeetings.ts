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
  resetSuggestion,
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
    } catch (err) {
      console.error("Suggestie afwijzen mislukt:", err);
      patchSuggestion(suggestion);
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
    reject,
    undoReject,
    finish,
    move,
    remove,
    addFolder,
    editFolder,
    removeFolder,
  };
}
