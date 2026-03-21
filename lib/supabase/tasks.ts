import { createClient } from "./client";
import type { Recurrence, Task, TaskInsert, TaskUpdate } from "@/types/database";

// Haal alle actieve taken op voor de ingelogde gebruiker
export async function fetchTasks(): Promise<Task[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as Task[];
}

// Maak een nieuwe taak aan
export async function createTask(input: TaskInsert): Promise<Task> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Niet ingelogd");

  const { data, error } = await supabase
    .from("tasks")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data as Task;
}

// Update een bestaande taak
export async function updateTask(id: string, updates: TaskUpdate): Promise<Task> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Task;
}

// Bereken volgende deadline op basis van herhaling
function nextDeadline(current: string | null, recurrence: Recurrence): string {
  const base = current ? new Date(current) : new Date();
  const d = new Date(base);

  switch (recurrence) {
    case "daily":
      d.setDate(d.getDate() + 1);
      break;
    case "weekdays": {
      d.setDate(d.getDate() + 1);
      // Overslaan in het weekend
      while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
      break;
    }
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      break;
  }

  return d.toISOString().slice(0, 10);
}

// Taak afronden — maakt automatisch volgende instantie bij herhaling
export async function completeTask(task: Task): Promise<Task> {
  const now = new Date().toISOString();
  const completed = await updateTask(task.id, { status: "done", completed_at: now });

  // Maak volgende instantie aan als de taak herhaalt
  if (task.recurrence) {
    const newDeadline = nextDeadline(task.deadline, task.recurrence);
    await createTask({
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: "todo",
      deadline: newDeadline,
      deadline_has_time: task.deadline_has_time,
      project: task.project,
      context: task.context,
      tags: task.tags,
      recurrence: task.recurrence,
      category: task.category,
      completed_at: null,
      archived_at: null,
    });
  }

  return completed;
}

// Taak archiveren (nooit hard deleten)
export async function archiveTask(id: string): Promise<Task> {
  return updateTask(id, { archived_at: new Date().toISOString() });
}

// Verwijder een taak permanent (alleen expliciet op verzoek van gebruiker)
export async function deleteTask(id: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}

// Roep de sneeuwschuiver-functie aan bij app-start
export async function markLateTasks(): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("mark_late_tasks");
  if (error) console.error("mark_late_tasks fout:", error);
}
