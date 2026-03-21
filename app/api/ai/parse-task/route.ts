import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { parseTask } from "@/lib/ai/parseTask";

const schema = z.object({
  raw: z.string().min(2).max(500),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const result = schema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });

  try {
    // Haal bestaande projectnamen op zodat AI alleen die kan toewijzen
    const { data: tasks } = await supabase
      .from("tasks")
      .select("project")
      .not("project", "is", null)
      .is("archived_at", null);

    const existingProjects = Array.from(
      new Set((tasks ?? []).map((t: { project: string | null }) => t.project).filter(Boolean) as string[])
    );

    const parsed = await parseTask(result.data.raw, undefined, existingProjects);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("[parse-task] error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
