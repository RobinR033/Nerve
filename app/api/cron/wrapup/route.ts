import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

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

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth_key");

  if (!subs || subs.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  let sent = 0;

  // Amsterdam datum voor "vandaag"
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });

  for (const sub of subs) {
    const { data: done } = await supabase
      .from("tasks")
      .select("id")
      .eq("user_id", sub.user_id)
      .eq("status", "done")
      .gte("completed_at", today);

    const { data: late } = await supabase
      .from("tasks")
      .select("id")
      .eq("user_id", sub.user_id)
      .eq("status", "late")
      .is("archived_at", null);

    const doneCount = done?.length ?? 0;
    const lateCount = late?.length ?? 0;

    const title = doneCount > 0 ? "Goed gedaan vandaag 🎯" : "Einde van de dag";
    const body = `Afgerond: ${doneCount} taken${lateCount > 0 ? ` · Te laat: ${lateCount}` : ""}`;

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
