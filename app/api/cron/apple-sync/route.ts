import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchReminders } from "@/lib/apple/caldav";
import type { Priority } from "@/types/database";

function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return auth === `Bearer ${secret}`;
}

// Vertaal Apple prioriteit (1-9) naar Nerve prioriteit
function mapPriority(applePriority?: number): Priority {
  if (!applePriority) return "medium";
  if (applePriority <= 1) return "urgent";
  if (applePriority <= 5) return "high";
  if (applePriority <= 9) return "medium";
  return "low";
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  let aangemaakt = 0;
  let afgevinkt = 0;

  // Haal alle gebruikers op met een actieve Apple integratie
  const { data: integrations } = await supabase
    .from("apple_integrations")
    .select("user_id, apple_id_email, app_password, selected_list_urls");

  if (!integrations || integrations.length === 0) {
    return NextResponse.json({ ok: true, aangemaakt: 0, afgevinkt: 0 });
  }

  for (const integration of integrations) {
    const { user_id, apple_id_email, app_password, selected_list_urls } = integration;

    for (const listUrl of selected_list_urls) {
      let reminders;
      try {
        reminders = await fetchReminders(apple_id_email, app_password, listUrl);
      } catch (err) {
        console.error(`Apple sync fout voor gebruiker ${user_id}:`, err);
        continue;
      }

      // Haal bestaande apple_reminder_uids op voor deze gebruiker
      const { data: bestaandeTaken } = await supabase
        .from("tasks")
        .select("id, apple_reminder_uid, status")
        .eq("user_id", user_id)
        .not("apple_reminder_uid", "is", null);

      const bestaandeUids = new Map(
        (bestaandeTaken ?? []).map((t) => [t.apple_reminder_uid as string, t])
      );

      for (const reminder of reminders) {
        const bestaand = bestaandeUids.get(reminder.uid);

        if (!bestaand) {
          // Nieuwe herinnering vanuit Apple → taak aanmaken in Nerve
          if (reminder.status === "NEEDS-ACTION") {
            await supabase.from("tasks").insert({
              user_id,
              title: reminder.title,
              status: "todo",
              priority: mapPriority(undefined),
              deadline: reminder.due ?? null,
              deadline_has_time: false,
              tags: [],
              apple_reminder_uid: reminder.uid,
            });
            aangemaakt++;
          }
        } else {
          // Herinnering bestaat al — check of Apple hem heeft afgevinkt
          if (reminder.status === "COMPLETED" && bestaand.status !== "done") {
            await supabase
              .from("tasks")
              .update({ status: "done", completed_at: new Date().toISOString() })
              .eq("id", bestaand.id);
            afgevinkt++;
          }
        }
      }
    }

    // Sla laatste sync-tijdstip op
    await supabase
      .from("apple_integrations")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("user_id", user_id);
  }

  return NextResponse.json({ ok: true, aangemaakt, afgevinkt });
}
