import type { MeetingFolder } from "@/types/database";

export type FolderSuggestion = { folderId: string; reason: string } | null;

type PastMeeting = { title: string; folder_id: string | null };

type Input = {
  title: string;
  participants: string[];
  folderHint: string | null;
  folders: MeetingFolder[];
  // Eerder bevestigde overleggen (met folder_id) — hieruit leert het voorstel
  pastMeetings: PastMeeting[];
  // Eigen naam, zodat die niet als bila-partner telt
  ownName?: string | null;
};

const norm = (s: string) => s.toLocaleLowerCase("nl-NL").trim();

/**
 * Titel zonder datums, nummers en leestekens, zodat "Weekly MT 6 okt" en
 * "Weekly MT – 13/10" als dezelfde reeks worden herkend.
 */
export function normalizeTitle(title: string): string {
  return norm(title)
    .replace(/\b(jan|feb|mrt|maa|apr|mei|jun|jul|aug|sep|okt|nov|dec)[a-z]*\b/g, " ")
    .replace(/\b(ma|di|wo|do|vr|za|zo|maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag)\b/g, " ")
    .replace(/[0-9]+/g, " ")
    .replace(/[^\p{L}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Stelt een map voor op basis van simpele, uitlegbare regels (geen AI-kosten).
 * Volgorde = zekerheid: hint uit bron → zelfde reeks als eerder → mapnaam in titel → bila.
 */
export function suggestFolder({ title, participants, folderHint, folders, pastMeetings, ownName }: Input): FolderSuggestion {
  if (folders.length === 0) return null;
  const byId = new Map(folders.map((f) => [f.id, f]));

  // 1. Hint uit de bron (bijv. gekozen in de iPhone-Shortcut)
  if (folderHint) {
    const hit = folders.find((f) => norm(f.name) === norm(folderHint));
    if (hit) return { folderId: hit.id, reason: "Gekozen bij het opnemen" };
  }

  // 2. Eerder overleg met dezelfde (genormaliseerde) titel → zelfde map
  const key = normalizeTitle(title);
  if (key.length >= 3) {
    const counts = new Map<string, number>();
    for (const m of pastMeetings) {
      if (m.folder_id && byId.has(m.folder_id) && normalizeTitle(m.title) === key) {
        counts.set(m.folder_id, (counts.get(m.folder_id) ?? 0) + 1);
      }
    }
    const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (best) {
      return { folderId: best[0], reason: `Zelfde reeks als ${best[1]} eerder overleg${best[1] > 1 ? "gen" : ""}` };
    }
  }

  // 3. Mapnaam komt als los woord in de titel voor (langste naam wint: "Weekly MT" boven "MT")
  const t = norm(title);
  const named = folders
    .filter((f) => f.name.trim().length >= 2 && containsWord(t, norm(f.name)))
    .sort((a, b) => b.name.length - a.name.length)[0];
  if (named) return { folderId: named.id, reason: `"${named.name}" staat in de titel` };

  // 4. Bila: precies één andere deelnemer met een eigen persoonsmap
  const others = participants.filter((p) => !ownName || !personMatches(ownName, p));
  if (others.length === 1) {
    const person = folders.find((f) => f.type === "person" && personMatches(f.name, others[0]));
    if (person) return { folderId: person.id, reason: `Bila met ${others[0]}` };
  }

  return null;
}

/** Hele-woord-match, zodat map "Jan" niet in "Januari planning" valt. */
function containsWord(haystack: string, needle: string): boolean {
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, "u").test(haystack);
}

/** "Jan" matcht "Jan de Vries" en andersom; map "Bila Jan" matcht ook. */
export function personMatches(folderName: string, participant: string): boolean {
  const f = norm(folderName).replace(/^bila('s)?\s+(met\s+)?/, "");
  const p = norm(participant);
  if (!f || !p) return false;
  return f === p || p.startsWith(f + " ") || f.startsWith(p + " ");
}
