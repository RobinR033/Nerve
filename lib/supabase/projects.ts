import { createClient } from "@/lib/supabase/client";
import type { Project } from "@/types/database";

export async function fetchProjects(): Promise<Project[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function upsertProject(name: string, color: string, type: import("@/types/database").ProjectType = "project"): Promise<Project> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Niet ingelogd");

  const { data, error } = await supabase
    .from("projects")
    .upsert({ user_id: user.id, name, color, type }, { onConflict: "user_id,name" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProjectColor(id: string, color: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("projects")
    .update({ color })
    .eq("id", id);
  if (error) throw error;
}

export async function updateProject(id: string, updates: import("@/types/database").ProjectUpdate): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", id);
  if (error) throw error;
}
