import type { MeetingCategory, MeetingCategoryKind, MeetingFolder, MeetingFolderType, Project } from "@/types/database";

// Startset (en terugval zolang migratie 005 nog niet gedraaid is)
export const DEFAULT_CATEGORIES: { name: string; kind: MeetingCategoryKind; color: string; legacyType: MeetingFolderType }[] = [
  { name: "Projecten", kind: "project", color: "#FF5A1F", legacyType: "project" },
  { name: "Personen", kind: "person", color: "#2E6BFF", legacyType: "person" },
  { name: "Overlegreeksen", kind: "other", color: "#7C3AED", legacyType: "series" },
  { name: "Overig", kind: "other", color: "#6B6157", legacyType: "other" },
];

// Id-voorvoegsel van terugval-categorieën (bestaan niet in de database)
export const VIRTUAL_PREFIX = "virtual:";

/** Categorieën zoals vóór migratie 005: vast, niet te beheren. */
export function virtualCategories(): MeetingCategory[] {
  return DEFAULT_CATEGORIES.map((c, i) => ({
    id: VIRTUAL_PREFIX + c.legacyType,
    user_id: "",
    name: c.name,
    kind: c.kind,
    color: c.color,
    position: i,
    created_at: "",
  }));
}

export const CATEGORY_KINDS: { kind: MeetingCategoryKind; label: string; hint: string }[] = [
  { kind: "other", label: "Gewoon", hint: "Mappen zonder extra gedrag" },
  { kind: "person", label: "Personen", hint: "Herkent bila's en toont 'Ook bij aanwezig'" },
  { kind: "project", label: "Projecten", hint: "Mappen kun je aan een Nerve-project koppelen" },
];

export const CATEGORY_COLORS = ["#FF5A1F", "#2E6BFF", "#7C3AED", "#1F9D55", "#E0A100", "#FF3D8B", "#0EA5B7", "#6B6157"];

/** Categorie van een map: eigen categorie, anders die van de bovenmap, anders op basis van het oude type. */
export function categoryIdOf(folders: MeetingFolder[], categories: MeetingCategory[], folder: MeetingFolder): string | null {
  const known = new Set(categories.map((c) => c.id));
  const byId = new Map(folders.map((f) => [f.id, f]));
  let cur: MeetingFolder | undefined = folder;
  for (let i = 0; cur && i < 8; i++) {
    if (cur.category_id && known.has(cur.category_id)) return cur.category_id;
    const parent: MeetingFolder | undefined = cur.parent_id ? byId.get(cur.parent_id) : undefined;
    if (!parent) break;
    cur = parent;
  }
  const root = cur ?? folder;
  const virtual = VIRTUAL_PREFIX + root.type;
  if (known.has(virtual)) return virtual;
  const kind: MeetingCategoryKind = root.type === "project" || root.type === "person" ? root.type : "other";
  return (categories.find((c) => c.kind === kind) ?? categories.find((c) => c.kind === "other") ?? categories[0])?.id ?? null;
}

/** Map-type dat bij een categorie hoort (oude overlegreeks-mappen blijven reeks in een gewone categorie). */
export function folderTypeFor(kind: MeetingCategoryKind, current?: MeetingFolderType): MeetingFolderType {
  if (kind === "other") return current === "series" ? "series" : "other";
  return kind;
}

export type FlatFolder = { folder: MeetingFolder; depth: number };

/** Mappen als boom, platgeslagen met diepte (voor lijsten en selects). Filter geldt alleen voor top-level. */
export function flattenFolders(folders: MeetingFolder[], topFilter?: (f: MeetingFolder) => boolean): FlatFolder[] {
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
      if (depth > 0 || !topFilter || topFilter(f)) {
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
