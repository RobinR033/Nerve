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

const client = new Anthropic();

export async function parseTask(raw: string, referenceDate?: string): Promise<ParsedTask> {
  const today = referenceDate ?? new Date().toISOString().split("T")[0];

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: `Vandaag is ${today} (${new Date().toLocaleDateString("nl-NL", { weekday: "long" })}). Parseer deze taakinvoer en extraheer alle eigenschappen.

Invoer: "${raw}"

Regels:
- title: alleen de schone actie, geen deadline- of prioriteitwoorden erin. Eerste letter hoofdletter.
- deadline: ISO 8601 als er een datum/dag in de tekst staat, anders null. "woensdag" = eerstvolgende woensdag.
- deadline_has_time: true als er een tijdstip is (bv. "14:00")
- priority: "urgent" bij woorden als urgent/dringend/asap/spoed, "high" bij "belangrijk/prioriteit/hoog", "low" bij "misschien/ooit/later", anders "medium"
- project: projectnaam als die duidelijk aanwezig is (bv. "voor [project]"), anders null
- reason: één korte Nederlandse zin waarom deze prioriteit, max 8 woorden

Geef ALLEEN JSON terug:
{"title":"...","deadline":"...of null","deadline_has_time":false,"priority":"...","project":null,"reason":"..."}`,
      },
    ],
  });

  const raw2 = message.content[0].type === "text" ? message.content[0].text : "";

  try {
    const parsed = JSON.parse(raw2.trim());
    return {
      title: parsed.title ?? raw,
      deadline: parsed.deadline ?? null,
      deadline_has_time: parsed.deadline_has_time ?? false,
      priority: parsed.priority ?? "medium",
      project: parsed.project ?? null,
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
