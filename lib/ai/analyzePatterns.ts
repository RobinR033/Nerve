import { askClaude, extractJson } from "./claude";
import type { Task } from "@/types/database";

export type PatternInsight = {
  type: "strength" | "warning" | "tip";
  title: string;
  body: string;
};

export type PatternsResult = {
  insights: PatternInsight[];
  summary: string;
};


export async function analyzePatterns(
  allTasks: Task[],
  completedTasks: Task[]
): Promise<PatternsResult> {
  if (allTasks.length < 3) {
    return {
      summary: "Nog te weinig data voor patroonanalyse. Voeg meer taken toe.",
      insights: [],
    };
  }

  const today = new Date().toISOString().split("T")[0];

  // Compacte data meegeven — geen volledige taakobjecten
  const taskData = allTasks.slice(0, 50).map((t) => ({
    status: t.status,
    priority: t.priority,
    project: t.project,
    created: t.created_at.slice(0, 10),
    deadline: t.deadline?.slice(0, 10) ?? null,
    done: t.status === "done",
    late: t.status === "late",
  }));
  const raw = await askClaude({
    tier: "complex",
    content: `Vandaag is ${today}. Analyseer deze takenhistorie en geef persoonlijke productiviteitsinzichten.

Taken (max 50):
${JSON.stringify(taskData)}

Totaal: ${allTasks.length} taken, ${completedTasks.length} afgerond, ${allTasks.filter(t => t.status === "late").length} te laat.

Geef 2-4 concrete inzichten. Kijk naar: taken die te laat zijn, prioriteitsverdeling, projectpatronen, productiviteitsritme.

Geef ALLEEN JSON terug:
{
  "summary": "<één zin samenvatting van het patroon, persoonlijk aangesproken, Nederlands>",
  "insights": [
    {
      "type": "strength"|"warning"|"tip",
      "title": "<max 5 woorden>",
      "body": "<max 2 zinnen, concreet en persoonlijk, Nederlands>"
    }
  ]
}`,
  });

  try {
    const parsed = extractJson<Partial<PatternsResult>>(raw);
    return {
      summary: parsed.summary ?? "",
      insights: parsed.insights ?? [],
    };
  } catch {
    return { summary: "", insights: [] };
  }
}
