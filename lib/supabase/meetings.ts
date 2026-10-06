import { createClient } from "./client";
import { createTask } from "./tasks";
import type {
  ActionOwner,
  ActionSuggestion,
  Meeting,
  MeetingFolder,
  MeetingFolderType,
  MeetingWithSuggestions,
  Task,
} from "@/types/database";

// Lijstweergave zonder het (grote) transcript
const MEETING_LIST_COLUMNS =
  "id, user_id, external_id, source, title, held_at, participants, summary, folder_id, suggested_folder_id, folder_reason, folder_hint, reviewed_at, created_at, updated_at";

async function currentUserId(): Promise<string> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Niet ingelogd");
  return user.id;
}

// ── Mappen ──────────────────────────────────────────────────────────

export async function fetchFolders(): Promise<MeetingFolder[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("meeting_folders").select("*").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function createFolder(
  name: string,
  type: MeetingFolderType,
  parentId: string | null = null,
  projectId: string | null = null,
): Promise<MeetingFolder> {
  const supabase = createClient();
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from("meeting_folders")
    .insert({ user_id: userId, name: name.trim(), type, parent_id: parentId, project_id: projectId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateFolder(id: string, updates: Partial<Pick<MeetingFolder, "name" | "type" | "parent_id" | "project_id">>): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("meeting_folders").update(updates).eq("id", id);
  if (error) throw error;
}

// Overleggen in deze map gaan naar Ongesorteerd, submappen worden top-level (ON DELETE SET NULL)
export async function deleteFolder(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("meeting_folders").delete().eq("id", id);
  if (error) throw error;
}

// ── Overleggen ──────────────────────────────────────────────────────

async function attachSuggestions(meetings: Meeting[]): Promise<MeetingWithSuggestions[]> {
  if (meetings.length === 0) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from("action_suggestions")
    .select("*")
    .in("meeting_id", meetings.map((m) => m.id))
    .order("created_at");
  if (error) throw error;
  const byMeeting = new Map<string, ActionSuggestion[]>();
  for (const s of data ?? []) {
    byMeeting.set(s.meeting_id, [...(byMeeting.get(s.meeting_id) ?? []), s]);
  }
  return meetings.map((m) => ({ ...m, action_suggestions: byMeeting.get(m.id) ?? [] }));
}

export async function fetchMeetings(): Promise<MeetingWithSuggestions[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("meetings")
    .select(MEETING_LIST_COLUMNS)
    .order("held_at", { ascending: false });
  if (error) throw error;
  const meetings = (data ?? []).map((m) => ({ ...m, transcript: null }) as Meeting);
  return attachSuggestions(meetings);
}

/** Overleggen die nog beoordeeld moeten worden (dashboardblok "Uit overleggen") */
export async function fetchMeetingsToReview(): Promise<MeetingWithSuggestions[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("meetings")
    .select(MEETING_LIST_COLUMNS)
    .is("reviewed_at", null)
    .order("held_at", { ascending: false });
  if (error) throw error;
  const meetings = (data ?? []).map((m) => ({ ...m, transcript: null }) as Meeting);
  return attachSuggestions(meetings);
}

export async function fetchTranscript(meetingId: string): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from("meetings").select("transcript").eq("id", meetingId).single();
  if (error) throw error;
  return data?.transcript ?? null;
}

export async function moveMeeting(id: string, folderId: string | null): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("meetings").update({ folder_id: folderId }).eq("id", id);
  if (error) throw error;
}

/** Beoordeling afronden: map vastzetten (null = Ongesorteerd) en uit het dashboardblok halen */
export async function finishReview(id: string, folderId: string | null): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("meetings")
    .update({ folder_id: folderId, reviewed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

// Alleen bij expliciete actie van de gebruiker; suggesties gaan mee (cascade), taken blijven bestaan
export async function deleteMeeting(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("meetings").delete().eq("id", id);
  if (error) throw error;
}

// ── Actiesuggesties ─────────────────────────────────────────────────

export type SuggestionEdits = {
  text: string;
  owner: ActionOwner;
  person: string | null;
  deadline: string | null;
};

/**
 * Suggestie → geverifieerde taak. Bij owner "other" wordt het een naja-taak
 * (waiting_for = persoon) die je zelf najaagt.
 */
export async function acceptSuggestion(
  suggestion: ActionSuggestion,
  edits: SuggestionEdits,
  project: string | null,
): Promise<{ task: Task; suggestion: ActionSuggestion }> {
  const isOther = edits.owner === "other";
  const task = await createTask({
    title: edits.text,
    description: suggestion.quote ? `Uit overleg: “${suggestion.quote}”` : null,
    priority: "medium",
    status: "todo",
    deadline: edits.deadline,
    deadline_has_time: false,
    project,
    context: null,
    tags: isOther ? ["naja"] : [],
    recurrence: null,
    category: "werk",
    waiting_for: isOther ? edits.person?.trim() || "Onbekend" : null,
    source_meeting_id: suggestion.meeting_id,
    completed_at: null,
    archived_at: null,
  });

  const supabase = createClient();
  const { data, error } = await supabase
    .from("action_suggestions")
    .update({
      ...edits,
      status: "accepted",
      task_id: task.id,
      decided_at: new Date().toISOString(),
    })
    .eq("id", suggestion.id)
    .select()
    .single();
  if (error) throw error;
  return { task, suggestion: data };
}

export async function rejectSuggestion(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("action_suggestions")
    .update({ status: "rejected", decided_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/** Afwijzing terugdraaien */
export async function resetSuggestion(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("action_suggestions")
    .update({ status: "suggested", decided_at: null })
    .eq("id", id);
  if (error) throw error;
}
