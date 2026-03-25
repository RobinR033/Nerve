import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyzePatterns } from "@/lib/ai/analyzePatterns";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Alleen taken van vandaag (Amsterdam tijd) — testdata van eerdere dagen telt niet mee
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .gte("created_at", todayStart.toISOString())
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const allTasks = data ?? [];
  const completedTasks = allTasks.filter((t) => t.status === "done");

  const result = await analyzePatterns(allTasks, completedTasks);
  return NextResponse.json(result);
}
