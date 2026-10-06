import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { fetchMeetingForUser, findActions } from "@/lib/supabase/meetingsIngest";

export const maxDuration = 60;

const paramsSchema = z.object({ id: z.uuid() });

/** Acties (opnieuw) laten zoeken voor een bestaand overleg, bijv. na een eerdere AI-fout. */
export async function POST(_req: NextRequest, ctx: RouteContext<"/api/meetings/[id]/extract">) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = paramsSchema.safeParse(await ctx.params);
  if (!parsed.success) return NextResponse.json({ error: "Ongeldig overleg-id" }, { status: 400 });

  const meeting = await fetchMeetingForUser(supabase, user.id, parsed.data.id);
  if (!meeting) return NextResponse.json({ error: "Overleg niet gevonden" }, { status: 404 });

  const meta = user.user_metadata;
  const ownName = (meta?.full_name as string | undefined) ?? (meta?.name as string | undefined) ?? null;

  try {
    const res = await findActions(supabase, user.id, meeting, ownName);
    if (res.error) return NextResponse.json({ error: res.error }, { status: 502 });
    return NextResponse.json({ ok: true, suggestions: res.count });
  } catch (err) {
    console.error("[meetings/extract] error:", err);
    return NextResponse.json({ error: "Opslaan mislukt" }, { status: 500 });
  }
}
