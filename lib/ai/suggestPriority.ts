import { askClaude, extractJson } from "./claude";
import type { Priority } from "@/types/database";

type PriorityResult = {
  priority: Priority;
  reason: string;
};


export async function suggestPriority(title: string): Promise<PriorityResult> {
  const raw = await askClaude({
    tier: "simple",
    content: `Je bent een productiviteitsassistent. Geef een prioriteit voor deze taak op basis van de taaknaam.

Taak: "${title}"

Prioriteiten:
- urgent: moet vandaag of morgen, blokkerende of tijdkritische zaken
- high: belangrijk deze week, heeft impact
- medium: normaal werk, geen urgentie
- low: nice-to-have, kan wachten

Geef ALLEEN JSON terug:
{"priority": "urgent"|"high"|"medium"|"low", "reason": "<één korte zin in het Nederlands, max 8 woorden>"}`,
  });

  try {
    const parsed = extractJson<Partial<PriorityResult>>(raw);
    return {
      priority: parsed.priority ?? "medium",
      reason: parsed.reason ?? "",
    };
  } catch {
    return { priority: "medium", reason: "" };
  }
}
