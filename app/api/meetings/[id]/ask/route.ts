import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { fetchMeetingSources } from "@/lib/supabase/meetingsIngest";
import { askMeeting } from "@/lib/ai/askMeetings";

export const maxDuration = 60;

const paramsSchema = z.object({ id: z.uuid() });
const bodySchema = z.object({ question: z.string().trim().min(3).max(500) });

/** Vraag over één overleg ("heb ik dit toegezegd?"), beantwoord met letterlijke citaten. */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/meetings/[id]/ask">) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = paramsSchema.safeParse(await ctx.params);
  const body = bodySchema.safeParse(await req.json().catch(() => null));
  if (!params.success || !body.success) return NextResponse.json({ error: "Ongeldige vraag" }, { status: 400 });

  const [meeting] = await fetchMeetingSources(supabase, user.id, [params.data.id], true);
  if (!meeting) return NextResponse.json({ error: "Overleg niet gevonden" }, { status: 404 });
  if (!meeting.summary?.trim() && !meeting.transcript?.trim()) {
    return NextResponse.json({ error: "Dit overleg heeft nog geen verslag of transcript" }, { status: 400 });
  }

  try {
    return NextResponse.json(await askMeeting(meeting, body.data.question));
  } catch (err) {
    console.error("[meetings/ask] error:", err);
    return NextResponse.json({ error: "Vraag beantwoorden mislukt" }, { status: 502 });
  }
}
