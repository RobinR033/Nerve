import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyzePatterns } from "@/lib/ai/analyzePatterns";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Testdata van voor de livegang uitsluiten — alles vanaf deze datum telt mee
  const LIVE_SINCE = "2026-03-25T00:00:00.000Z";

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .gte("created_at", LIVE_SINCE)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const allTasks = data ?? [];
  const completedTasks = allTasks.filter((t) => t.status === "done");

  const result = await analyzePatterns(allTasks, completedTasks);
  return NextResponse.json(result);
}
