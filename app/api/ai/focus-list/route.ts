import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateFocusList } from "@/lib/ai/generateFocusList";
import { fetchTasks } from "@/lib/supabase/tasks";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tasks = await fetchTasks();
  const activeTasks = tasks.filter((t) => t.status !== "done" && t.archived_at === null);
  const result = await generateFocusList(activeTasks);

  return NextResponse.json(result);
}
