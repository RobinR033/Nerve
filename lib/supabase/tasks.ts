import { createClient } from "./client";
import type { Task, TaskInsert, TaskUpdate } from "@/types/database";

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

// Taak afronden
export async function completeTask(id: string): Promise<Task> {
  return updateTask(id, { status: "done" });
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
