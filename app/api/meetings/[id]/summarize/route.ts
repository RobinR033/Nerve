import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { fetchMeetingForUser, generateSummary } from "@/lib/supabase/meetingsIngest";

// Een uur transcript samenvatten met Opus (thinking) kan ruim een minuut duren
export const maxDuration = 300;

const paramsSchema = z.object({ id: z.uuid() });

/** Verslag maken uit het bewaarde transcript (vangnet als de transcriptie-tool geen verslag meestuurde). */
export async function POST(_req: NextRequest, ctx: RouteContext<"/api/meetings/[id]/summarize">) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = paramsSchema.safeParse(await ctx.params);
  if (!parsed.success) return NextResponse.json({ error: "Ongeldig overleg-id" }, { status: 400 });

  const meeting = await fetchMeetingForUser(supabase, user.id, parsed.data.id);
  if (!meeting) return NextResponse.json({ error: "Overleg niet gevonden" }, { status: 404 });

  try {
    const summary = await generateSummary(supabase, user.id, meeting);
    return NextResponse.json({ ok: true, summary });
  } catch (err) {
    if (err instanceof Error && err.message === "NO_TRANSCRIPT") {
      return NextResponse.json({ error: "Voor dit overleg is geen transcript bewaard" }, { status: 400 });
    }
    console.error("[meetings/summarize] error:", err);
    return NextResponse.json({ error: "Verslag maken mislukt" }, { status: 502 });
  }
}
