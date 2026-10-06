import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Meeting } from "@/types/database";
import type { MeetingPayload } from "@/lib/utils/meetingPayload";
import { suggestFolder } from "@/lib/utils/folderSuggestion";
import { extractMeetingActions, type ExtractedAction } from "@/lib/ai/extractMeetingActions";

type Result =
  | { status: "created"; meeting: Meeting; suggestions: number }
  | { status: "already_exists"; meeting: Meeting };

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
  supabase: SupabaseClient<Database>,
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
  let actions: ExtractedAction[] = (payload.actions ?? []).map((a) => ({
    text: a.text,
    owner: a.owner,
    person: a.person ?? null,
    deadline: a.deadline ?? null,
    quote: a.quote ?? null,
  }));
  if (payload.actions === undefined) {
    try {
      actions = await extractMeetingActions({
        title: payload.title,
        heldAt,
        participants: payload.participants,
        // Samenvatting is compacter (= goedkoper); transcript alleen als er niets anders is
        text: payload.summary?.trim() || payload.transcript || "",
        ownName: payload.owner_name ?? null,
      });
    } catch (err) {
      // Overleg is wél opgeslagen; acties kunnen later alsnog handmatig
      console.error("[meetings] acties extraheren mislukt:", err);
    }
  }

  if (actions.length > 0) {
    const { error: sErr } = await supabase.from("action_suggestions").insert(
      actions.map((a) => ({
        user_id: userId,
        meeting_id: meeting.id,
        text: a.text,
        owner: a.owner,
        person: a.person,
        deadline: a.deadline ? amsterdamMidnight(a.deadline) : null,
        quote: a.quote,
      })),
    );
    if (sErr) throw sErr;
  }

  return { status: "created", meeting, suggestions: actions.length };
}
