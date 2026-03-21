import Anthropic from "@anthropic-ai/sdk";
import type { Priority } from "@/types/database";

type PriorityResult = {
  priority: Priority;
  reason: string;
};

const client = new Anthropic();

export async function suggestPriority(title: string): Promise<PriorityResult> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 128,
    messages: [
      {
        role: "user",
        content: `Je bent een productiviteitsassistent. Geef een prioriteit voor deze taak op basis van de taaknaam.

Taak: "${title}"

Prioriteiten:
- urgent: moet vandaag of morgen, blokkerende of tijdkritische zaken
- high: belangrijk deze week, heeft impact
- medium: normaal werk, geen urgentie
- low: nice-to-have, kan wachten

Geef ALLEEN JSON terug:
{"priority": "urgent"|"high"|"medium"|"low", "reason": "<één korte zin in het Nederlands, max 8 woorden>"}`,
      },
    ],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "";

  try {
    const parsed = JSON.parse(raw.trim());
    return {
      priority: parsed.priority ?? "medium",
      reason: parsed.reason ?? "",
    };
  } catch {
    return { priority: "medium", reason: "" };
  }
}
