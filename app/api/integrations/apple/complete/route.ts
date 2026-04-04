import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { completeReminderByUid } from "@/lib/apple/caldav";

const schema = z.object({
  reminderUid: z.string().min(1),
});

// POST — markeer de bijbehorende Apple Reminder als afgerond
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });
  }

  const { reminderUid } = parsed.data;

  // Haal integratie-instellingen op
  const { data: integration } = await supabase
    .from("apple_integrations")
    .select("apple_id_email, app_password, selected_list_urls")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!integration) {
    return NextResponse.json({ error: "Geen Apple integratie geconfigureerd" }, { status: 404 });
  }

  const { apple_id_email, app_password, selected_list_urls } = integration;

  // Probeer de herinnering in elke geselecteerde lijst te vinden en af te vinken
  for (const listUrl of selected_list_urls) {
    try {
      const success = await completeReminderByUid(
        apple_id_email,
        app_password,
        listUrl,
        reminderUid
      );
      if (success) {
        return NextResponse.json({ ok: true });
      }
    } catch (err) {
      console.error(`Apple complete fout voor lijst ${listUrl}:`, err);
    }
  }

  // Herinnering niet gevonden — geen fout, taak is al afgevinkt in Nerve
  return NextResponse.json({ ok: true, found: false });
}
