import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Geeft alle actieve Outlook-taken terug (niet gearchiveerd, niet afgerond).
 *  Beveiligd met dezelfde Bearer token als de webhook. */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const secret = process.env.OUTLOOK_WEBHOOK_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("tasks")
    .select("id, outlook_message_id, title")
    .not("outlook_message_id", "is", null)
    .is("archived_at", null)
    .neq("status", "done");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    tasks: (data ?? []).map((t) => ({
      taskId: t.id,
      messageId: t.outlook_message_id,
      title: t.title,
    })),
  });
}
