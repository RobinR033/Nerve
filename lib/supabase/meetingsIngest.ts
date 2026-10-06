import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Meeting } from "@/types/database";
import type { MeetingPayload } from "@/lib/utils/meetingPayload";
import { suggestFolder } from "@/lib/utils/folderSuggestion";
import { extractMeetingActions, type ExtractedAction } from "@/lib/ai/extractMeetingActions";

type Result =
  | { status: "created"; meeting: Meeting; suggestions: number; actionsError?: string }
  | { status: "already_exists"; meeting: Meeting };

type Db = SupabaseClient<Database>;

/** "2026-10-09" → middernacht Amsterdam-tijd als ISO met offset (zelfde conventie als parseTask) */
function amsterdamMidnight(date: string): string {
  const d = date.slice(0, 10);
  const probe = new Date(`${d}T12:00:00Z`);
  const nl = new Date(probe.toLocaleString("en-US", { timeZone: "Europe/Amsterdam" }));
  const utc = new Date(probe.toLocaleString("en-US", { timeZone: "UTC" }));
  const offsetMin = Math.round((nl.getTime() - utc.getTime()) / 60000);
  const sign = offsetMin >= 0 ? "+" : "-";
  const h = String(Math.floor(Math.abs(offsetMin) / 60)).padStart(2, "0");
  const m = String(Math.abs(offsetMin) % 60).padStart(2, "0");
  return `${d}T00:00:00${sign}${h}:${m}`;
}

/**
 * Slaat een binnenkomend overleg op met mapvoorstel en actiesuggesties.
 * Werkt met zowel de admin client (webhook) als de user client (handmatig) —
 * userId wordt altijd expliciet meegegeven.
 */
export async function ingestMeeting(
  supabase: Db,
  userId: string,
  payload: MeetingPayload,
): Promise<Result> {
  // Idempotent: zelfde bron-id nogmaals aangeleverd → niets dubbel aanmaken
  if (payload.external_id) {
    const { data: existing } = await supabase
      .from("meetings")
      .select("*")
      .eq("user_id", userId)
      .eq("external_id", payload.external_id)
      .maybeSingle();
    if (existing) return { status: "already_exists", meeting: existing };
  }

  const [{ data: folders }, { data: pastMeetings }] = await Promise.all([
    supabase.from("meeting_folders").select("*").eq("user_id", userId),
    supabase
      .from("meetings")
      .select("title, folder_id")
      .eq("user_id", userId)
      .not("folder_id", "is", null)
      .order("held_at", { ascending: false })
      .limit(300),
  ]);

  const suggestion = suggestFolder({
    title: payload.title,
    participants: payload.participants,
    folderHint: payload.folder_hint ?? null,
    folders: folders ?? [],
    pastMeetings: pastMeetings ?? [],
    ownName: payload.owner_name ?? null,
  });

  const heldAt = payload.held_at ?? new Date().toISOString();

  const { data: meeting, error } = await supabase
    .from("meetings")
    .insert({
      user_id: userId,
      external_id: payload.external_id ?? null,
      source: payload.source,
      title: payload.title,
      held_at: heldAt,
      participants: payload.participants,
      summary: payload.summary ?? null,
      transcript: payload.transcript ?? null,
      folder_hint: payload.folder_hint ?? null,
      suggested_folder_id: suggestion?.folderId ?? null,
      folder_reason: suggestion?.reason ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  // Acties: meegeleverd door de bron, of als fallback door Nerve zelf eruit gehaald
  if (payload.actions !== undefined) {
    const count = await storeActions(
      supabase,
      userId,
      meeting.id,
      payload.actions.map((a) => ({
        text: a.text,
        owner: a.owner,
        person: a.person ?? null,
        deadline: a.deadline ?? null,
        quote: a.quote ?? null,
      })),
    );
    return { status: "created", meeting, suggestions: count };
  }

  const found = await findActions(supabase, userId, meeting, payload.owner_name ?? null);
  return { status: "created", meeting, suggestions: found.count, actionsError: found.error };
}

async function storeActions(supabase: Db, userId: string, meetingId: string, actions: ExtractedAction[]): Promise<number> {
  if (actions.length === 0) return 0;
  const { error } = await supabase.from("action_suggestions").insert(
    actions.map((a) => ({
      user_id: userId,
      meeting_id: meetingId,
      text: a.text,
      owner: a.owner,
      person: a.person,
      deadline: a.deadline ? amsterdamMidnight(a.deadline) : null,
      quote: a.quote,
    })),
  );
  if (error) throw error;
  return actions.length;
}

/**
 * Laat Claude acties uit het verslag halen en slaat ze op als suggesties.
 * Een mislukte AI-aanroep gooit niet, maar komt terug als `error`: het overleg
 * zelf is dan al bewaard en de gebruiker kan het later opnieuw proberen.
 */
export async function findActions(
  supabase: Db,
  userId: string,
  meeting: Pick<Meeting, "id" | "title" | "held_at" | "participants" | "summary" | "transcript">,
  ownName: string | null,
): Promise<{ count: number; error?: string }> {
  // Samenvatting is compacter (= goedkoper); transcript alleen als er niets anders is
  const text = meeting.summary?.trim() || meeting.transcript || "";
  if (!text.trim()) return { count: 0, error: "Geen tekst om acties uit te halen" };
  let actions: ExtractedAction[];
  try {
    actions = await extractMeetingActions({
      title: meeting.title,
      heldAt: meeting.held_at,
      participants: meeting.participants,
      text,
      ownName,
    });
  } catch (err) {
    console.error("[meetings] acties extraheren mislukt:", err);
    return { count: 0, error: err instanceof Error ? err.message : String(err) };
  }
  return { count: await storeActions(supabase, userId, meeting.id, actions) };
}

/** Overleg van deze gebruiker ophalen (incl. transcript), voor opnieuw acties zoeken. */
export async function fetchMeetingForUser(supabase: Db, userId: string, id: string): Promise<Meeting | null> {
  const { data, error } = await supabase.from("meetings").select("*").eq("user_id", userId).eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}
