import { createClient } from "./client";
import { archiveTask, createTask } from "./tasks";
import type {
  ActionOwner,
  ActionSuggestion,
  Meeting,
  MeetingCategory,
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
  categoryId: string | null = null,
): Promise<MeetingFolder> {
  const supabase = createClient();
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from("meeting_folders")
    .insert({
      user_id: userId,
      name: name.trim(),
      type,
      parent_id: parentId,
      project_id: projectId,
      // Zonder migratie 005 bestaat de kolom niet; dan niet meesturen
      ...(categoryId ? { category_id: categoryId } : {}),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateFolder(id: string, updates: Partial<Pick<MeetingFolder, "name" | "type" | "category_id" | "parent_id" | "project_id">>): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("meeting_folders").update(updates).eq("id", id);
  if (error) throw error;
}

/** Meerdere mappen tegelijk naar een categorie (met bijpassend type) */
export async function setFoldersCategory(ids: string[], categoryId: string, type: (id: string) => MeetingFolderType): Promise<void> {
  if (ids.length === 0) return;
  const supabase = createClient();
  // Per type groeperen: één update per type in plaats van per map
  const byType = new Map<MeetingFolderType, string[]>();
  for (const id of ids) byType.set(type(id), [...(byType.get(type(id)) ?? []), id]);
  for (const [t, group] of byType) {
    const { error } = await supabase.from("meeting_folders").update({ category_id: categoryId, type: t }).in("id", group);
    if (error) throw error;
  }
}

// ── Categorieën ─────────────────────────────────────────────────────

export async function fetchCategories(): Promise<MeetingCategory[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("meeting_categories").select("*").order("position").order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function createCategory(fields: Pick<MeetingCategory, "name" | "kind" | "color" | "position">): Promise<MeetingCategory> {
  const supabase = createClient();
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from("meeting_categories")
    .insert({ user_id: userId, ...fields, name: fields.name.trim() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCategory(id: string, updates: Partial<Pick<MeetingCategory, "name" | "kind" | "color" | "position">>): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("meeting_categories").update(updates).eq("id", id);
  if (error) throw error;
}

// Mappen moeten vooraf naar een andere categorie zijn verplaatst (zie useMeetings.removeCategory)
export async function deleteCategory(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("meeting_categories").delete().eq("id", id);
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

/** Titels van alle overleggen, om bij taken te tonen waar ze vandaan komen */
export async function fetchMeetingTitles(): Promise<Record<string, string>> {
  const supabase = createClient();
  const { data, error } = await supabase.from("meetings").select("id, title");
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((m) => [m.id, m.title]));
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

/** Datum/tijd van het overleg aanpassen */
export async function updateMeetingHeldAt(id: string, heldAt: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("meetings").update({ held_at: heldAt }).eq("id", id);
  if (error) throw error;
}

/** Verslag (zelf getypt of aangepast) opslaan */
export async function updateMeetingSummary(id: string, summary: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("meetings").update({ summary: summary.trim() || null }).eq("id", id);
  if (error) throw error;
}

/** "Opbergen" ongedaan maken: overleg komt terug in "Te beoordelen" (map blijft staan) */
export async function reopenReview(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("meetings").update({ reviewed_at: null }).eq("id", id);
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

/** Actie ↔ naja omklappen (alleen voor nog open suggesties) */
export async function updateSuggestionOwner(id: string, owner: ActionOwner, person: string | null): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("action_suggestions").update({ owner, person }).eq("id", id);
  if (error) throw error;
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

/** Meerdere suggesties tegelijk verwerpen of terugzetten (bijv. "Alles verwerpen" + ongedaan maken) */
export async function setSuggestionsStatus(ids: string[], status: "rejected" | "suggested"): Promise<void> {
  if (ids.length === 0) return;
  const supabase = createClient();
  const { error } = await supabase
    .from("action_suggestions")
    .update({ status, decided_at: status === "rejected" ? new Date().toISOString() : null })
    .in("id", ids);
  if (error) throw error;
}

/**
 * Accepteren terugdraaien: de aangemaakte taak gaat naar het archief (niet verwijderd,
 * zie CLAUDE.md) en de suggestie staat weer open.
 */
export async function undoAcceptSuggestion(suggestion: ActionSuggestion): Promise<ActionSuggestion> {
  if (suggestion.task_id) await archiveTask(suggestion.task_id);
  const supabase = createClient();
  const { data, error } = await supabase
    .from("action_suggestions")
    .update({ status: "suggested", task_id: null, decided_at: null })
    .eq("id", suggestion.id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
