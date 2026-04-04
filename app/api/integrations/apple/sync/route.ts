import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchReminders } from "@/lib/apple/caldav";

// POST — sync Apple Reminders voor de ingelogde gebruiker
// Wordt aangeroepen bij het openen van het dashboard (fire-and-forget)
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  // Haal integratie op met ontsleuteld wachtwoord
  const { data, error } = await supabase.rpc("get_my_apple_integration");

  if (error || !data || data.length === 0) {
    // Geen integratie geconfigureerd — stilletjes stoppen
    return NextResponse.json({ ok: true, skipped: true });
  }

  const { apple_id_email, app_password, selected_list_urls } = data[0];

  let aangemaakt = 0;
  let afgevinkt = 0;

  for (const listUrl of selected_list_urls) {
    let reminders;
    try {
      reminders = await fetchReminders(apple_id_email, app_password, listUrl);
    } catch (err) {
      console.error("Apple sync fout:", err);
      continue;
    }

    const { data: bestaandeTaken } = await supabase
      .from("tasks")
      .select("id, apple_reminder_uid, status")
      .is("archived_at", null)
      .not("apple_reminder_uid", "is", null);

    const bestaandeUids = new Map(
      (bestaandeTaken ?? []).map((t) => [t.apple_reminder_uid as string, t])
    );

    for (const reminder of reminders) {
      const bestaand = bestaandeUids.get(reminder.uid);

      if (!bestaand) {
        if (reminder.status === "NEEDS-ACTION") {
          await supabase.from("tasks").insert({
            user_id: user.id,
            title: reminder.title,
            status: "todo",
            priority: "medium",
            deadline: reminder.due ?? null,
            deadline_has_time: false,
            tags: [],
            apple_reminder_uid: reminder.uid,
          });
          aangemaakt++;
        }
      } else {
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

  await supabase
    .from("apple_integrations")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("user_id", user.id);

  return NextResponse.json({ ok: true, aangemaakt, afgevinkt });
}
