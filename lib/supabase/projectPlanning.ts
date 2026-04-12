import { createClient } from "./client";

export type TaskPlanning = {
  id: string;
  user_id: string;
  task_id: string;
  week: string;
  created_at: string;
};

export async function fetchTaskPlanning(): Promise<TaskPlanning[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("task_planning").select("*");
  if (error) throw error;
  return data ?? [];
}

/** Koppel taak aan week (upsert). week=null = verwijder koppeling (backlog). */
export async function setTaskWeek(taskId: string, week: string | null): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Niet ingelogd");

  if (!week) {
    await supabase.from("task_planning").delete().eq("task_id", taskId).eq("user_id", user.id);
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("task_planning") as any)
    .upsert({ user_id: user.id, task_id: taskId, week }, { onConflict: "user_id,task_id" });
}

export async function updateProjectStatusNote(projectId: string, note: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("projects").update({ status_note: note }).eq("id", projectId);
  if (error) throw error;
}
