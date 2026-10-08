/**
 * Besluiten uit een verslag halen: de opsomming onder het kopje "Besluiten"
 * (zo maken zowel de Mac-app als Nerve hun verslagen). Gratis, geen AI nodig.
 */
export function parseDecisions(summary: string | null): string[] {
  if (!summary) return [];
  const lines = summary.split("\n");
  const out: string[] = [];
  let inSection = false;
  for (const line of lines) {
    const heading = line.match(/^\s*#{1,6}\s+(.*)$/);
    if (heading) {
      inSection = /^besluit/i.test(heading[1].replace(/[*_]/g, "").trim());
      continue;
    }
    if (!inSection) continue;
    const item = line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "").replace(/\*\*/g, "").trim();
    if (!item) continue;
    // "Geen besluiten genomen" e.d. overslaan
    if (/^(geen|er zijn geen|n\.?v\.?t)/i.test(item)) continue;
    out.push(item);
  }
  return out;
}
