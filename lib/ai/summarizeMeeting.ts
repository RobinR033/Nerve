import { askClaude } from "./claude";

// ±2 uur gesprek; houdt kosten begrensd
const MAX_CHARS = 120_000;
// Gemiddeld spreektempo, om de duur uit het transcript te schatten
const WORDS_PER_MINUTE = 130;

/**
 * Vuistregel (gelijk aan de transcriptie-tool): ½ A4 (±250 woorden) per begonnen
 * kwartier gesprek, minimaal ½ en maximaal 2 A4.
 */
export function summaryLength(transcript: string): { a4: number; words: number } {
  const minutes = transcript.trim().split(/\s+/).length / WORDS_PER_MINUTE;
  const quarters = Math.min(4, Math.max(1, Math.ceil(minutes / 15)));
  return { a4: quarters * 0.5, words: quarters * 250 };
}

/**
 * Verslag uit een transcript, voor overleggen die zonder verslag binnenkwamen.
 * Normaal maakt de transcriptie-tool het verslag via `claude -p` (abonnement);
 * dit is het vangnet via de API ("complex"-niveau).
 */
export async function summarizeMeeting(input: {
  title: string;
  heldAt: string;
  participants: string[];
  transcript: string;
}): Promise<string> {
  const { a4, words } = summaryLength(input.transcript);
  const a4Text = String(a4).replace(".", ",");

  const summary = await askClaude({
    tier: "complex",
    content: `Je bent een Nederlandstalige notulist. Maak een beknopt verslag van het overleg "${input.title}" (${input.heldAt.slice(0, 10)}).
Deelnemers: ${input.participants.length ? input.participants.join(", ") : "onbekend"}.

Lengte: ongeveer ${a4Text} A4 (±${words} woorden) — vuistregel ½ A4 per kwartier gesprek.
Gebruik markdown met precies deze kopjes:
## Besproken punten
(de kern per onderwerp, kort, bulletpoints)
## Besluiten
## Afspraken en acties
(wie, wat, wanneer)

Kort in op discussie en herhaling, nooit op besluiten en afspraken: die staan er altijd volledig in.
Het transcript is automatisch gemaakt en kan fouten bevatten. Verzin geen feiten.
Antwoord met ALLEEN het verslag, zonder inleiding of afsluiting.

Transcript:
"""
${input.transcript.slice(0, MAX_CHARS)}
"""`,
  });

  return summary.trim();
}
