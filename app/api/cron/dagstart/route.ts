import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateFocusList, type FocusItem } from "@/lib/ai/generateFocusList";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return auth === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createAdminClient();

  // Haal alle gebruikers met push subscriptions op
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth_key");

  if (!subs || subs.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  let sent = 0;

  for (const sub of subs) {
    // Haal taken op voor deze gebruiker
    const { data: tasks } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", sub.user_id)
      .is("archived_at", null)
      .neq("status", "done")
      .order("created_at", { ascending: false })
      .limit(20);

    let title = "Goedemorgen 👋";
    let body = "Start je dag met Nerve";

    if (tasks && tasks.length > 0) {
      try {
        const focus = await generateFocusList(tasks as never[]);
        const top = focus.items.slice(0, 3).map((f: FocusItem) => {
          const task = tasks.find((t) => t.id === f.task_id);
          return task?.title ? `• ${task.title}` : null;
        }).filter(Boolean).join("\n");
        title = "Goedemorgen — jouw focus vandaag";
        body = top || "Open Nerve om je dag te plannen";
      } catch {
        body = `Je hebt ${tasks.length} open taken`;
      }
    }

    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
        JSON.stringify({ title, body, url: "/dashboard" })
      );
      sent++;
    } catch (err) {
      if ((err as { statusCode?: number }).statusCode === 410) {
        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
      }
    }
  }

  return NextResponse.json({ ok: true, sent });
}
