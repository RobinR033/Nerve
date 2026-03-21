import Anthropic from "@anthropic-ai/sdk";
import type { Priority } from "@/types/database";

export type ParsedTask = {
  title: string;
  deadline: string | null;
  deadline_has_time: boolean;
  priority: Priority;
  project: string | null;
  reason: string;
};

/** Compute Europe/Amsterdam ISO offset string, e.g. "+01:00" of "+02:00" */
function getAmsterdamOffset(): string {
  const now = new Date();
  const utcMs = now.getTime();
  const nlMs = new Date(
    now.toLocaleString("en-US", { timeZone: "Europe/Amsterdam" })
  ).getTime();
  const offsetMinutes = Math.round((nlMs - utcMs) / 60000);
  const h = Math.floor(Math.abs(offsetMinutes) / 60);
  const m = Math.abs(offsetMinutes) % 60;
  const sign = offsetMinutes >= 0 ? "+" : "-";
  return `${sign}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Huidige datum in Amsterdam-tijdzone als YYYY-MM-DD */
function getAmsterdamDate(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
}

/** Huidige weekdag in Amsterdam-tijdzone */
function getAmsterdamWeekday(): string {
  return new Date().toLocaleDateString("nl-NL", {
    timeZone: "Europe/Amsterdam",
    weekday: "long",
  });
}

export async function parseTask(raw: string, referenceDate?: string, existingProjects: string[] = []): Promise<ParsedTask> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const offset = getAmsterdamOffset();
  const today = referenceDate ?? getAmsterdamDate();
  const weekday = getAmsterdamWeekday();

  const projectInstructie = existingProjects.length > 0
    ? `- project: kies ALLEEN uit deze bestaande projecten als de taak er duidelijk bij hoort: [${existingProjects.map(p => `"${p}"`).join(", ")}]. Verzin nooit een nieuw project. Als geen enkel project past, gebruik null.`
    : `- project: altijd null`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `Vandaag is ${today} (${weekday}). Tijdzone: Europe/Amsterdam (UTC${offset}). Parseer deze taakinvoer in het Nederlands en extraheer alle eigenschappen.

Invoer: "${raw}"

Regels:
- title: alleen de schone actie, zonder urgentie/prioriteit/deadline-aanduidingen. Eerste letter hoofdletter.
- deadline: ISO 8601 datum+tijd MET tijdzone offset als er een datum/dag/tijdstip in de tekst staat, anders null. Relatieve datums oplossen t.o.v. vandaag. Gebruik ALTIJD de tijdzone offset ${offset}, bv. "2026-03-21T22:05:00${offset}". Nooit zonder offset als er een tijdstip is!
- deadline_has_time: true als er een specifiek tijdstip wordt genoemd (bv. "14:00", "om 3 uur", "22:05"). Anders false.
- priority: begrijp de intentie semantisch — "urgent" als het dringend is of niet kan wachten, "low" als het weinig haast heeft of optioneel aanvoelt, "high" als het belangrijk maar niet spoedeisend is, anders "medium". Woorden als "lage prio", "niet urgent", "ooit", "als ik tijd heb", "laag", "low priority" wijzen op "low". Woorden als "urgent", "spoed", "asap", "dringend" wijzen op "urgent".
${projectInstructie}
- reason: één korte Nederlandse zin waarom deze prioriteit, max 8 woorden

Geef ALLEEN JSON terug:
{"title":"...","deadline":"...of null","deadline_has_time":false,"priority":"...","project":null,"reason":"..."}`,
      },
    ],
  });

  const raw2 = message.content[0].type === "text" ? message.content[0].text : "";

  // Haal JSON eruit ook als Claude het in een markdown code block zet
  const jsonMatch = raw2.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? jsonMatch[0] : raw2.trim();

  try {
    const parsed = JSON.parse(jsonStr);
    return {
      title: parsed.title ?? raw,
      deadline: parsed.deadline && parsed.deadline !== "null" ? parsed.deadline : null,
      deadline_has_time: parsed.deadline_has_time ?? false,
      priority: parsed.priority ?? "medium",
      project: existingProjects.includes(parsed.project) ? parsed.project : null,
      reason: parsed.reason ?? "",
    };
  } catch {
    return {
      title: raw,
      deadline: null,
      deadline_has_time: false,
      priority: "medium",
      project: null,
      reason: "",
    };
  }
}
