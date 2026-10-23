import type { Task } from "@/types/database";

export type GroupBy = "none" | "project" | "meeting";

export type TaskGroup = { key: string; label: string; tasks: Task[] };

export const NO_GROUP = "__none__";

/**
 * Taken groeperen op project of op overleg. Volgorde binnen een groep blijft
 * zoals aangeleverd (al gesorteerd). Groepen op naam; "zonder" komt achteraan.
 */
export function groupTasks(tasks: Task[], by: GroupBy, meetingTitles: Record<string, string>): TaskGroup[] {
  if (by === "none") return [{ key: "all", label: "", tasks }];

  const groups = new Map<string, TaskGroup>();
  for (const t of tasks) {
    const id = by === "project" ? t.project : t.source_meeting_id ?? null;
    const key = id ?? NO_GROUP;
    const label =
      id === null
        ? by === "project" ? "Zonder project" : "Niet uit een overleg"
        : by === "project" ? id : meetingTitles[id] ?? "Overleg";
    if (!groups.has(key)) groups.set(key, { key, label, tasks: [] });
    groups.get(key)!.tasks.push(t);
  }

  return [...groups.values()].sort((a, b) => {
    if (a.key === NO_GROUP) return 1;
    if (b.key === NO_GROUP) return -1;
    return a.label.localeCompare(b.label, "nl");
  });
}

/** Het project waar de taken uit een overleg (meestal) onder vallen, of null */
export function projectOfMeetingTasks(tasks: Task[], meetingId: string): string | null {
  const counts = new Map<string, number>();
  for (const t of tasks) {
    if (t.source_meeting_id !== meetingId || t.archived_at || !t.project) continue;
    counts.set(t.project, (counts.get(t.project) ?? 0) + 1);
  }
  let best: string | null = null;
  let max = 0;
  for (const [p, n] of counts) if (n > max) [best, max] = [p, n];
  return best;
}
