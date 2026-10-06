import type { MeetingFolder, MeetingFolderType, Project } from "@/types/database";

export const FOLDER_GROUPS: { type: MeetingFolderType; label: string; single: string; color: string }[] = [
  { type: "project", label: "Projecten", single: "Project", color: "#FF5A1F" },
  { type: "person", label: "Personen", single: "Persoon (bila)", color: "#2E6BFF" },
  { type: "series", label: "Overlegreeksen", single: "Overlegreeks", color: "#7C3AED" },
  { type: "other", label: "Overig", single: "Overig", color: "#6B6157" },
];

export type FlatFolder = { folder: MeetingFolder; depth: number };

/** Mappen van één type als boom, platgeslagen met diepte (voor lijsten en selects). */
export function flattenFolders(folders: MeetingFolder[], type?: MeetingFolderType): FlatFolder[] {
  const ids = new Set(folders.map((f) => f.id));
  const children = new Map<string | null, MeetingFolder[]>();
  for (const f of folders) {
    // Ouder bestaat niet (meer) → behandel als top-level
    const parent = f.parent_id && ids.has(f.parent_id) ? f.parent_id : null;
    children.set(parent, [...(children.get(parent) ?? []), f]);
  }
  const out: FlatFolder[] = [];
  const seen = new Set<string>();
  const walk = (parent: string | null, depth: number) => {
    const list = (children.get(parent) ?? []).sort((a, b) => a.name.localeCompare(b.name, "nl"));
    for (const f of list) {
      if (seen.has(f.id)) continue; // bescherming tegen kringverwijzingen
      seen.add(f.id);
      if (depth > 0 || !type || f.type === type) {
        out.push({ folder: f, depth });
        walk(f.id, depth + 1);
      }
    }
  };
  walk(null, 0);
  return out;
}

/** Alle ids van een map plus al zijn submappen */
export function descendantIds(folders: MeetingFolder[], rootId: string): Set<string> {
  const result = new Set([rootId]);
  let added = true;
  while (added) {
    added = false;
    for (const f of folders) {
      if (f.parent_id && result.has(f.parent_id) && !result.has(f.id)) {
        result.add(f.id);
        added = true;
      }
    }
  }
  return result;
}

/** "Klant X / Stuurgroep" */
export function folderPath(folders: MeetingFolder[], id: string | null): string {
  if (!id) return "Ongesorteerd";
  const byId = new Map(folders.map((f) => [f.id, f]));
  const parts: string[] = [];
  let cur = byId.get(id);
  while (cur && parts.length < 6) {
    parts.unshift(cur.name);
    cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
  }
  return parts.join(" / ") || "Ongesorteerd";
}

/**
 * Nerve-project voor taken uit een overleg in deze map: expliciete koppeling,
 * anders een projectmap waarvan de naam gelijk is aan een bestaand project.
 * Kijkt ook naar bovenliggende mappen.
 */
export function projectForFolder(folders: MeetingFolder[], projects: Project[], id: string | null): string | null {
  const byId = new Map(folders.map((f) => [f.id, f]));
  let cur = id ? byId.get(id) : undefined;
  for (let i = 0; cur && i < 6; i++) {
    if (cur.project_id) {
      const p = projects.find((p) => p.id === cur!.project_id);
      if (p) return p.name;
    }
    if (cur.type === "project") {
      const p = projects.find((p) => p.name.toLocaleLowerCase("nl") === cur!.name.toLocaleLowerCase("nl"));
      if (p) return p.name;
    }
    cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
  }
  return null;
}
