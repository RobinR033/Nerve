import Anthropic from "@anthropic-ai/sdk";
import type { Task } from "@/types/database";

export type FocusItem = {
  task_id: string;
  reason: string;
};

type FocusListResult = {
  items: FocusItem[];
  intro: string;
};

const client = new Anthropic();

export async function generateFocusList(tasks: Task[]): Promise<FocusListResult> {
  if (tasks.length === 0) {
    return { items: [], intro: "Geen openstaande taken gevonden." };
  }

  const taskList = tasks
    .slice(0, 20) // max 20 taken meegeven
    .map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      status: t.status,
      deadline: t.deadline,
      project: t.project,
    }));

  const today = new Date().toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `Vandaag is ${today}. Je bent een slimme productiviteitsassistent voor een persoonlijk task management systeem.

Hier zijn de openstaande taken:
${JSON.stringify(taskList, null, 2)}

Kies de 3 tot 5 meest belangrijke taken voor vandaag. Houd rekening met:
- Status "late" = al te laat, hoge prioriteit
- Deadlines die vandaag of morgen zijn
- Prioriteit (urgent > high > medium > low)
- Logische werkflow

Geef ALLEEN JSON terug:
{
  "intro": "<één motiverende zin voor vandaag, max 12 woorden, in het Nederlands>",
  "items": [
    {"task_id": "<id>", "reason": "<waarom vandaag, max 8 woorden, Nederlands>"}
  ]
}`,
      },
    ],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "";

  try {
    const parsed = JSON.parse(raw.trim());
    return {
      intro: parsed.intro ?? "Hier zijn je prioriteiten voor vandaag.",
      items: parsed.items ?? [],
    };
  } catch {
    return { intro: "Hier zijn je prioriteiten voor vandaag.", items: [] };
  }
}
