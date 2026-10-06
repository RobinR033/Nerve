import { askClaude, extractJson } from "./claude";
import type { ActionOwner } from "@/types/database";

export type ExtractedAction = {
  text: string;
  owner: ActionOwner;
  person: string | null;
  deadline: string | null;
  quote: string | null;
};

// Begrenst kosten: ±1,5 uur overleg past ruim binnen deze lengte
const MAX_CHARS = 60_000;

/**
 * Fallback als de bron zelf geen acties meelevert (bijv. geplakte OneNote-aantekeningen).
 * De transcriptie-tool levert normaal al acties aan via `claude -p` (geen API-kosten).
 */
export async function extractMeetingActions(input: {
  title: string;
  heldAt: string;
  participants: string[];
  text: string;
  ownName: string | null;
}): Promise<ExtractedAction[]> {
  const text = input.text.slice(0, MAX_CHARS);
  const me = input.ownName ? `"${input.ownName}" (de gebruiker, ook "ik")` : `de gebruiker ("ik")`;

  const raw = await askClaude({
    tier: "simple",
    content: `Je haalt concrete actiepunten uit een overlegverslag. Het overleg "${input.title}" was op ${input.heldAt.slice(0, 10)} (Europe/Amsterdam).
Deelnemers: ${input.participants.length ? input.participants.join(", ") : "onbekend"}.
De gebruiker is ${me}.

Regels:
- Alleen echte afspraken/acties, geen besproken onderwerpen of meningen. Liever te weinig dan kaf.
- text: korte actie in de gebiedende wijs, eerste letter hoofdletter, max 12 woorden.
- owner: "me" als de gebruiker de actie moet doen, "other" als iemand anders hem moet doen (de gebruiker wil dat najagen).
- person: bij "other" de naam van wie de actie ligt, anders null.
- deadline: ISO-datum (YYYY-MM-DD) alleen als die expliciet of afleidbaar genoemd is, anders null.
- quote: kort letterlijk citaat (max 25 woorden) waarop de actie gebaseerd is, of null.
- Maximaal 15 acties.

Verslag:
"""
${text}
"""

Geef ALLEEN JSON terug:
{"actions":[{"text":"...","owner":"me","person":null,"deadline":null,"quote":"..."}]}`,
  });

  try {
    const parsed = extractJson<{ actions?: unknown[] }>(raw);
    return (parsed.actions ?? []).flatMap((a) => {
      const item = a as Record<string, unknown>;
      if (typeof item.text !== "string" || !item.text.trim()) return [];
      const owner: ActionOwner = item.owner === "other" ? "other" : "me";
      return [{
        text: item.text.trim(),
        owner,
        person: owner === "other" && typeof item.person === "string" ? item.person : null,
        deadline: typeof item.deadline === "string" && /^\d{4}-\d{2}-\d{2}/.test(item.deadline) ? item.deadline : null,
        quote: typeof item.quote === "string" ? item.quote : null,
      }];
    });
  } catch {
    return [];
  }
}
