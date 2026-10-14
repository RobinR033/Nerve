import { createClient } from "@/lib/supabase/client";
import type { Project, ProjectUpdate } from "@/types/database";

// Ontbrekende velden vult de database zelf in (standaardwaarden)
type ProjectInsert = Omit<Project, "id" | "archived_at" | "created_at">;

export async function fetchProjects(): Promise<Project[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("name");
  if (error) throw error;
  // Client-side filter zodat dit ook werkt vóór de archived_at migration.
  return (data ?? []).filter((p) => !p.archived_at);
}

export async function archiveProject(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("projects")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function createProject(
  name: string,
  color: string,
  type: "project" | "interne_activiteit" = "project",
): Promise<Project> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Niet ingelogd");

  // "project" is de standaard in de database: alleen meesturen als het iets anders is,
  // zodat aanmaken ook werkt in databases zonder die kolom (vóór migratie 006)
  const { data, error } = await supabase
    .from("projects")
    .insert((type === "project" ? { user_id: user.id, name, color } : { user_id: user.id, name, color, type }) as ProjectInsert)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Project met deze naam opzoeken (hoofdletters maken niet uit) of aanmaken.
 * Een gearchiveerd project met dezelfde naam komt terug uit het archief.
 * Geen upsert: die vereist een unieke index op (user_id, name) die niet overal bestaat.
 */
export async function ensureProject(name: string, color: string): Promise<Project> {
  const supabase = createClient();
  const clean = name.trim();
  const { data: found, error } = await supabase
    .from("projects")
    .select("*")
    .ilike("name", clean.replace(/[\\%_]/g, (c) => `\\${c}`))
    .limit(1);
  if (error) throw error;
  const existing = found?.[0];
  if (existing) {
    if (!existing.archived_at) return existing;
    const { data, error: unarchiveError } = await supabase
      .from("projects")
      .update({ archived_at: null })
      .eq("id", existing.id)
      .select()
      .single();
    if (unarchiveError) throw unarchiveError;
    return data;
  }
  return createProject(clean, color, "project");
}

/** @deprecated naam blijft voor bestaande aanroepen; doet hetzelfde als ensureProject */
export async function upsertProject(name: string, color: string): Promise<Project> {
  return ensureProject(name, color);
}

export async function updateProjectColor(id: string, color: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("projects")
    .update({ color })
    .eq("id", id);
  if (error) throw error;
}

export async function updateProject(id: string, updates: ProjectUpdate): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", id);
  if (error) throw error;
}
