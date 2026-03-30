import { createClient } from "./client";
import type { Allocation } from "@/types/database";

export async function getAllocations(weeks: string[]): Promise<Allocation[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("allocations")
    .select("*")
    .in("week", weeks);
  if (error) throw error;
  return data ?? [];
}

export async function upsertAllocation(
  projectId: string,
  week: string,
  halfdays: number
): Promise<Allocation> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Niet ingelogd");

  if (halfdays === 0) {
    // Verwijder als 0 — lege cel
    await supabase
      .from("allocations")
      .delete()
      .eq("project_id", projectId)
      .eq("week", week)
      .eq("user_id", user.id);
    return { id: "", user_id: user.id, project_id: projectId, week, halfdays: 0, created_at: "" };
  }

  const { data, error } = await supabase
    .from("allocations")
    .upsert(
      { user_id: user.id, project_id: projectId, week, halfdays },
      { onConflict: "user_id,project_id,week" }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}
