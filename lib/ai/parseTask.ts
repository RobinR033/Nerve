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


export async function parseTask(raw: string, referenceDate?: string, existingProjects: string[] = []): Promise<ParsedTask> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const today = referenceDate ?? new Date().toISOString().split("T")[0];

  const projectInstructie = existingProjects.length > 0
    ? `- project: kies ALLEEN uit deze bestaande projecten als de taak er duidelijk bij hoort: [${existingProjects.map(p => `"${p}"`).join(", ")}]. Verzin nooit een nieuw project. Als geen enkel project past, gebruik null.`
    : `- project: altijd null`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `Vandaag is ${today} (${new Date().toLocaleDateString("nl-NL", { weekday: "long" })}). Parseer deze taakinvoer in het Nederlands en extraheer alle eigenschappen.

Invoer: "${raw}"

Regels:
- title: alleen de schone actie, zonder urgentie/prioriteit/deadline-aanduidingen. Eerste letter hoofdletter.
- deadline: ISO 8601 datum+tijd als er een datum/dag/tijdstip in de tekst staat, anders null. Relatieve datums: "morgen", "woensdag", "volgende week maandag" etc. oplossen t.o.v. vandaag.
- deadline_has_time: true als er een specifiek tijdstip wordt genoemd (bv. "14:00", "om 3 uur")
- priority: begrijp de intentie semantisch — "urgent"/"hoog" als het dringend is of niet kan wachten, "low" als het weinig haast heeft of optioneel aanvoelt, "high" als het belangrijk maar niet spoedeisend is, anders "medium". Woorden als "lage prio", "niet urgent", "ooit", "als ik tijd heb", "laag", "low priority" wijzen op "low". Woorden als "urgent", "spoed", "asap", "dringend" wijzen op "urgent".
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
      deadline: parsed.deadline ?? null,
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
