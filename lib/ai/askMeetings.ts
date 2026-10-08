import { askClaude, extractJson } from "./claude";

export type AskVerdict = "ja" | "nee" | "deels" | "onbekend";

export type MeetingAnswer = {
  answer: string;
  verdict: AskVerdict;
  quotes: { text: string; verified: boolean }[];
};

export type MeetingSource = {
  id: string;
  title: string;
  heldAt: string;
  participants: string[];
  summary: string | null;
  transcript: string | null;
};

export type CrossAnswer = {
  answer: string;
  sources: { meetingId: string; quote: string | null }[];
};

// Eén overleg: ±3 uur gesprek past erin; langer wordt ingekort (staat dan in het antwoord)
const MAX_TRANSCRIPT = 150_000;
// Meerdere overleggen: per overleg alleen het verslag, begrensd
const MAX_SUMMARY = 4_000;
const MAX_MEETINGS = 30;

// Woorden die niets zeggen over het onderwerp
const STOPWORDS = new Set(
  "over wat waar wanneer hebben heeft hadden afgesproken besproken gezegd gehad zijn waren worden werd deze die dat daar hier welke voor naar door maar ook nog niet geen meer alle iets zoals tijdens overleg overleggen gesprek".split(" "),
);

const VERDICTS: AskVerdict[] = ["ja", "nee", "deels", "onbekend"];

function dateNl(iso: string) {
  return new Date(iso).toLocaleDateString("nl-NL", { timeZone: "Europe/Amsterdam", weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

/** Spaties/hoofdletters/leestekens gelijk trekken, om citaten in de bron terug te vinden */
function norm(s: string) {
  return s.toLocaleLowerCase("nl").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

/** Vraag over één overleg. Citaten worden nagelopen: staat het er letterlijk? */
export async function askMeeting(meeting: MeetingSource, question: string): Promise<MeetingAnswer> {
  const transcript = meeting.transcript ?? "";
  const cut = transcript.length > MAX_TRANSCRIPT;
  const raw = await askClaude({
    tier: "simple",
    content: `Je beantwoordt een vraag van de gebruiker over één overleg. Gebruik ALLEEN de tekst hieronder; verzin niets.
Overleg: "${meeting.title}", ${dateNl(meeting.heldAt)}. Deelnemers: ${meeting.participants.join(", ") || "onbekend"}.

Verslag:
"""
${meeting.summary ?? "(geen verslag)"}
"""

${transcript ? `Transcript${cut ? " (ingekort)" : ""}:
"""
${transcript.slice(0, MAX_TRANSCRIPT)}
"""` : "(geen transcript bewaard)"}

Vraag: ${question}

Regels:
- answer: kort en direct in het Nederlands (max 4 zinnen). Zeg eerlijk als het niet in de tekst staat.
- verdict: "ja", "nee", "deels" of "onbekend" (bij ja/nee-vragen; anders "onbekend").
- quotes: 0-3 LETTERLIJKE stukjes uit het transcript (of verslag) die het antwoord onderbouwen, elk max 30 woorden. Niet parafraseren.

Geef ALLEEN JSON terug:
{"answer":"...","verdict":"ja","quotes":["..."]}`,
  });

  const parsed = extractJson<{ answer?: unknown; verdict?: unknown; quotes?: unknown[] }>(raw);
  const haystack = norm(`${meeting.summary ?? ""} ${transcript}`);
  const quotes = (parsed.quotes ?? [])
    .filter((q): q is string => typeof q === "string" && q.trim().length > 0)
    .slice(0, 3)
    .map((q) => ({ text: q.trim(), verified: haystack.includes(norm(q)) }));
  return {
    answer: typeof parsed.answer === "string" ? parsed.answer.trim() : "Geen antwoord gevonden.",
    verdict: VERDICTS.includes(parsed.verdict as AskVerdict) ? (parsed.verdict as AskVerdict) : "onbekend",
    quotes,
  };
}

/**
 * Bij veel overleggen: eerst de meest relevante kiezen (woorden uit de vraag in
 * titel/verslag), aangevuld met de meest recente. Houdt het snel en goedkoop.
 */
export function pickRelevant(meetings: MeetingSource[], question: string, max = MAX_MEETINGS): MeetingSource[] {
  if (meetings.length <= max) return meetings;
  const words = [...new Set(norm(question).split(" ").filter((w) => w.length > 3 && !STOPWORDS.has(w)))];
  const scored = meetings.map((m, i) => {
    // Hele woorden; titel en deelnemers tellen zwaarder dan het verslag
    const head = new Set(norm(`${m.title} ${m.participants.join(" ")}`).split(" "));
    const body = new Set(norm(m.summary ?? "").split(" "));
    const hits = words.reduce((n, w) => n + (head.has(w) ? 2 : 0) + (body.has(w) ? 1 : 0), 0);
    return { m, hits, recent: i };
  });
  const byHits = [...scored].filter((x) => x.hits > 0).sort((a, b) => b.hits - a.hits || a.recent - b.recent);
  const chosen = new Set(byHits.slice(0, max).map((x) => x.m));
  for (const x of scored) {
    if (chosen.size >= max) break;
    chosen.add(x.m);
  }
  // Volgorde aanhouden (nieuwste eerst)
  return meetings.filter((m) => chosen.has(m));
}

/** Vraag over meerdere overleggen (alle, of die van een project). Bronnen verwijzen naar overleg-id's. */
export async function askAcrossMeetings(meetings: MeetingSource[], question: string): Promise<CrossAnswer> {
  if (meetings.length === 0) return { answer: "Er zijn (nog) geen overleggen om in te zoeken.", sources: [] };
  const picked = pickRelevant(meetings, question);
  const refs = picked.map((m, i) => ({ ref: `O${i + 1}`, m }));
  const corpus = refs
    .map(({ ref, m }) => {
      const body = (m.summary?.trim() || m.transcript?.slice(0, MAX_SUMMARY) || "(leeg)").slice(0, MAX_SUMMARY);
      return `[${ref}] "${m.title}" — ${dateNl(m.heldAt)} — ${m.participants.join(", ") || "deelnemers onbekend"}\n${body}`;
    })
    .join("\n\n---\n\n");

  const raw = await askClaude({
    tier: "simple",
    content: `Je beantwoordt een vraag van de gebruiker over zijn eigen overleggen. Gebruik ALLEEN de verslagen hieronder; verzin niets.
${meetings.length > picked.length ? `(Dit zijn de ${picked.length} meest relevante van ${meetings.length} overleggen.)\n` : ""}
${corpus}

Vraag: ${question}

Regels:
- answer: kort en direct in het Nederlands (max 6 zinnen). Noem datum en overleg als dat helpt. Zeg eerlijk als het er niet in staat.
- sources: de overleggen waarop je antwoord steunt (ref zoals "O3"), met een kort letterlijk citaat uit dat verslag (max 25 woorden) of null. Max 5.

Geef ALLEEN JSON terug:
{"answer":"...","sources":[{"ref":"O1","quote":"..."}]}`,
  });

  const parsed = extractJson<{ answer?: unknown; sources?: unknown[] }>(raw);
  const byRef = new Map(refs.map(({ ref, m }) => [ref, m.id]));
  const seen = new Set<string>();
  const sources = (parsed.sources ?? []).flatMap((s) => {
    const item = s as Record<string, unknown>;
    const id = typeof item.ref === "string" ? byRef.get(item.ref.trim()) : undefined;
    if (!id || seen.has(id)) return [];
    seen.add(id);
    return [{ meetingId: id, quote: typeof item.quote === "string" && item.quote.trim() ? item.quote.trim() : null }];
  });
  return {
    answer: typeof parsed.answer === "string" ? parsed.answer.trim() : "Geen antwoord gevonden.",
    sources: sources.slice(0, 5),
  };
}
