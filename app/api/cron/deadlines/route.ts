import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// Vercel stuurt Authorization: Bearer <CRON_SECRET> bij cron-aanroepen
function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // geen secret geconfigureerd = alleen lokaal testen
  return auth === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Taken met een tijdstip dat in de komende 90 seconden vervalt (om uitloop te voorkomen bij trage cron)
  const now = new Date();
  const windowEnd = new Date(now.getTime() + 90 * 1000);

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("id, title, user_id, deadline, deadline_has_time")
    .eq("deadline_has_time", true)
    .eq("status", "todo")
    .is("archived_at", null)
    .gte("deadline", now.toISOString())
    .lte("deadline", windowEnd.toISOString());

  if (error) {
    console.error("[cron/deadlines] DB error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!tasks || tasks.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  let sent = 0;

  for (const task of tasks) {
    // Haal subscriptions op voor deze gebruiker
    type PushSub = { id: string; endpoint: string; p256dh: string; auth_key: string };
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth_key")
      .eq("user_id", task.user_id);

    if (!subs || subs.length === 0) continue;

    const payload = JSON.stringify({
      title: "⏰ " + task.title,
      body: "Deadline bereikt",
      url: "/dashboard",
    });

    for (const sub of subs as PushSub[]) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
          payload
        );
        sent++;
      } catch (err) {
        if ((err as { statusCode?: number }).statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }
  }

  return NextResponse.json({ ok: true, sent, tasks: tasks.length });
}
