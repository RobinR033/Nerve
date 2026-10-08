import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { fetchMeetingSources } from "@/lib/supabase/meetingsIngest";
import { askAcrossMeetings } from "@/lib/ai/askMeetings";

export const maxDuration = 60;

const bodySchema = z.object({
  question: z.string().trim().min(3).max(500),
  // Beperken tot bijv. de overleggen van één project; weglaten = alle overleggen
  meetingIds: z.array(z.uuid()).max(500).optional(),
});

/** Vraag over al je overleggen (of een selectie), met verwijzingen naar de bron-overleggen. */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = bodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Ongeldige vraag" }, { status: 400 });

  try {
    const meetings = await fetchMeetingSources(supabase, user.id, body.data.meetingIds ?? null);
    return NextResponse.json(await askAcrossMeetings(meetings, body.data.question));
  } catch (err) {
    console.error("[meetings/ask-all] error:", err);
    return NextResponse.json({ error: "Vraag beantwoorden mislukt" }, { status: 502 });
  }
}
