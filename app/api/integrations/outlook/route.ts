import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  action: z.enum(["flag", "unflag"]),
  messageId: z.string().min(1),
  subject: z.string().optional(),
  from: z.string().optional(),
  preview: z.string().optional(),
  receivedAt: z.string().optional(),
});

export async function POST(req: NextRequest) {
  // Verifieer het webhook secret (Bearer token)
  const auth = req.headers.get("authorization") ?? "";
  const secret = process.env.OUTLOOK_WEBHOOK_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const result = schema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Ongeldige data", details: result.error.flatten() }, { status: 400 });
  }

  const { action, messageId, subject, from, preview, receivedAt } = result.data;

  // Admin client: bypast RLS, heeft toegang tot auth.admin
  const supabase = createAdminClient();

  // Zoek de eigenaar — persoonlijke app, pak de eerste gebruiker
  const { data: users } = await supabase.auth.admin.listUsers();
  const userId = users?.users?.[0]?.id;

  if (!userId) {
    return NextResponse.json({ error: "Geen gebruiker gevonden" }, { status: 500 });
  }

  if (action === "flag") {
    // Controleer of er al een taak bestaat voor dit bericht
    const { data: existing } = await supabase
      .from("tasks")
      .select("id")
      .eq("outlook_message_id", messageId)
      .single();

    if (existing) {
      return NextResponse.json({ ok: true, action: "already_exists" });
    }

    // Bouw taaknaam op uit het onderwerp
    const title = subject?.trim() || "E-mail van " + (from?.split("<")[0].trim() || "Outlook");
    const description = [
      from ? `Van: ${from}` : null,
      preview ? `\n${preview}` : null,
    ].filter(Boolean).join("\n") || null;

    const { error } = await supabase.from("tasks").insert({
      user_id: userId,
      title,
      description,
      priority: "medium",
      status: "todo",
      deadline: null,
      deadline_has_time: false,
      project: "Vlaggetjes",
      context: receivedAt ?? null, // ontvangstdatum opgeslagen voor weergave
      tags: ["outlook"],
      recurrence: null,
      category: "werk",
      outlook_message_id: messageId,
      completed_at: null,
      archived_at: null,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, action: "task_created" });
  }

  if (action === "unflag") {
    // Vind de taak op basis van messageId en archiveer hem
    const { data: task } = await supabase
      .from("tasks")
      .select("id, status, created_at")
      .eq("outlook_message_id", messageId)
      .single();

    if (!task) {
      return NextResponse.json({ ok: true, action: "not_found" });
    }

    // Veiligheidscheck: taak moet minimaal 5 minuten oud zijn
    // Voorkomt race condition waarbij de scheduled flow een net-aangemaakte taak direct archiveert
    const ageMs = Date.now() - new Date(task.created_at).getTime();
    if (ageMs < 5 * 60 * 1000) {
      return NextResponse.json({ ok: true, action: "too_new" });
    }

    // Archiveer de taak (vlaggetje weg = mail afgehandeld)
    const { error } = await supabase
      .from("tasks")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", task.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, action: "task_archived" });
  }

  return NextResponse.json({ error: "Onbekende actie" }, { status: 400 });
}
