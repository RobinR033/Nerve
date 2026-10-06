import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ingestMeeting } from "@/lib/supabase/meetingsIngest";
import { meetingPayloadSchema } from "@/lib/utils/meetingPayload";

export const maxDuration = 60;

/** Handmatig een overleg/aantekening toevoegen vanuit Nerve (bijv. geplakt uit OneNote). */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const result = meetingPayloadSchema.safeParse({ source: "handmatig", ...body });
  if (!result.success) {
    return NextResponse.json({ error: "Ongeldige invoer", details: result.error.flatten() }, { status: 400 });
  }

  const meta = user.user_metadata;
  const ownName = (meta?.full_name as string | undefined) ?? (meta?.name as string | undefined) ?? null;

  try {
    const res = await ingestMeeting(supabase, user.id, { ...result.data, owner_name: result.data.owner_name ?? ownName });
    return NextResponse.json({ ok: true, action: res.status, meetingId: res.meeting.id });
  } catch (err) {
    console.error("[meetings] error:", err);
    return NextResponse.json({ error: "Opslaan mislukt" }, { status: 500 });
  }
}
