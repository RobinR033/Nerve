import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";
import { generateFocusList, type FocusItem } from "@/lib/ai/generateFocusList";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await req.json(); // "dagstart" | "wrapup" | "deadline"
  const { type, taskTitle } = payload;

  // Haal subscriptions op
  type PushSub = { id: string; endpoint: string; p256dh: string; auth_key: string };
  const { data: subsRaw } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", user.id);
  const subs = subsRaw as PushSub[] | null;

  if (!subs || subs.length === 0) return NextResponse.json({ ok: true, sent: 0 });

  // Bouw notificatie-inhoud op basis van type
  let title = "Nerve";
  let body = "";
  let url = "/dashboard";

  if (type === "dagstart") {
    // Haal taken op voor focuslijst
    const { data: tasks } = await supabase
      .from("tasks")
      .select("*")
      .is("archived_at", null)
      .neq("status", "done")
      .order("created_at", { ascending: false })
      .limit(20);

    if (tasks && tasks.length > 0) {
      const focus = await generateFocusList(tasks as never[]);
      const top = focus.items.slice(0, 3).map((f: FocusItem) => {
        const task = tasks.find((t) => t.id === f.task_id);
        return `• ${task?.title ?? ""}`;
      }).filter(Boolean).join("\n");
      title = "Goedemorgen — jouw focus vandaag";
      body = top || "Start je dag met Nerve";
    } else {
      title = "Goedemorgen 👋";
      body = "Je hebt nog geen taken. Capture iets!";
    }
  } else if (type === "deadline") {
    title = "⏰ Deadline";
    body = taskTitle ?? "Een taak heeft zijn deadline bereikt";
    url = "/dashboard";
  } else if (type === "wrapup") {
    const today = new Date().toISOString().slice(0, 10);
    const { data: done } = await supabase
      .from("tasks")
      .select("id")
      .eq("status", "done")
      .gte("completed_at", today);
    const { data: late } = await supabase
      .from("tasks")
      .select("id")
      .eq("status", "late");

    title = "Einde van de dag — goed gedaan";
    body = `Afgerond: ${done?.length ?? 0} taken. Te laat: ${late?.length ?? 0} taken.`;
    url = "/dashboard";
  }

  // Verstuur naar alle subscriptions
  let sent = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
        JSON.stringify({ title, body, url })
      );
      sent++;
    } catch (err) {
      // Verlopen subscription verwijderen
      if ((err as { statusCode?: number }).statusCode === 410) {
        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
      }
    }
  }

  return NextResponse.json({ ok: true, sent });
}
