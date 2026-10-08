import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { fetchMeetingSources, fetchProjectTaskTitles } from "@/lib/supabase/meetingsIngest";
import { projectStatus } from "@/lib/ai/projectStatus";

export const maxDuration = 60;

const bodySchema = z.object({
  project: z.string().trim().min(1).max(200),
  meetingIds: z.array(z.uuid()).max(500),
});

/** Voorstel voor een projectstatus in 5 regels (de gebruiker beslist of hij die overneemt). */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = bodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });

  try {
    const [meetings, tasks] = await Promise.all([
      body.data.meetingIds.length ? fetchMeetingSources(supabase, user.id, body.data.meetingIds) : Promise.resolve([]),
      fetchProjectTaskTitles(supabase, user.id, body.data.project),
    ]);
    const status = await projectStatus({ project: body.data.project, meetings, openTasks: tasks.open, waitingFor: tasks.waiting });
    return NextResponse.json({ status });
  } catch (err) {
    console.error("[projects/status] error:", err);
    return NextResponse.json({ error: "Status maken mislukt" }, { status: 502 });
  }
}
