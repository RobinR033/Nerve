import { NextRequest, NextResponse, after } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateSummary, ingestMeeting } from "@/lib/supabase/meetingsIngest";
import { meetingPayloadSchema } from "@/lib/utils/meetingPayload";

// Transcripties kunnen groot zijn en AI-extractie kost even; het vangnet-verslag
// (Opus, na het antwoord via after()) kan ruim een minuut duren
export const maxDuration = 300;

function authorized(req: NextRequest): boolean {
  const secret = process.env.MEETINGS_WEBHOOK_SECRET;
  if (!secret) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Verbindingstest vanuit de transcriptie-tool: klopt adres + sleutel? Slaat niets op. */
export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}

/**
 * Ontvangt een overleg van de transcriptie-tool (of een andere bron).
 * Body: zie meetingPayloadSchema. Idempotent op external_id.
 */
export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const result = meetingPayloadSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Ongeldige data", details: result.error.flatten() }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Persoonlijke app: vaste gebruiker via env, anders de eerste gebruiker (zoals Outlook-webhook)
  let userId = process.env.NERVE_USER_ID ?? null;
  if (!userId) {
    const { data: users } = await supabase.auth.admin.listUsers();
    userId = users?.users?.[0]?.id ?? null;
  }
  if (!userId) {
    return NextResponse.json({ error: "Geen gebruiker gevonden" }, { status: 500 });
  }

  try {
    const res = await ingestMeeting(supabase, userId, result.data);

    // Vangnet: geen verslag meegestuurd (bijv. Claude Code op de Mac faalde) maar wel
    // een transcript → Nerve maakt het verslag zelf, nadat de bron al antwoord heeft
    const created = res.status === "created" ? res.meeting : null;
    if (created && !created.summary?.trim() && created.transcript?.trim()) {
      after(async () => {
        try {
          await generateSummary(supabase, userId, created);
        } catch (err) {
          console.error("[integrations/meetings] vangnet-verslag mislukt:", err);
        }
      });
    }
    return NextResponse.json({
      ok: true,
      action: res.status,
      meetingId: res.meeting.id,
      suggestions: res.status === "created" ? res.suggestions : undefined,
      actionsError: res.status === "created" ? res.actionsError : undefined,
    });
  } catch (err) {
    console.error("[integrations/meetings] error:", err);
    return NextResponse.json({ error: "Opslaan mislukt" }, { status: 500 });
  }
}
