/** Hulpjes voor de overleggenlijst (OneNote-achtig: pagina's per periode met voorproefje) */

const DAY = 86400000;

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** "Vandaag", "Gisteren", "Deze week", "Vorige week" of "oktober 2026" */
export function periodLabel(iso: string, now = new Date()): string {
  const day = startOfDay(new Date(iso));
  const today = startOfDay(now);
  if (day >= today) return "Vandaag";
  if (day >= today - DAY) return "Gisteren";
  // Week begint op maandag
  const weekStart = today - ((now.getDay() + 6) % 7) * DAY;
  if (day >= weekStart) return "Deze week";
  if (day >= weekStart - 7 * DAY) return "Vorige week";
  const label = new Date(iso).toLocaleDateString("nl-NL", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Opeenvolgende items met hetzelfde periodelabel bij elkaar (lijst is al op datum gesorteerd) */
export function groupByPeriod<T extends { held_at: string }>(items: T[], now = new Date()): { label: string; items: T[] }[] {
  const groups: { label: string; items: T[] }[] = [];
  for (const item of items) {
    const label = periodLabel(item.held_at, now);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }
  return groups;
}

/** Verslag als platte tekst voor een voorproefje: kopjes weg, opsommingen achter elkaar */
export function summaryPreview(summary: string | null): string {
  if (!summary) return "";
  return summary
    .split("\n")
    .filter((line) => !/^\s*#/.test(line))
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "").replace(/[*_`>]/g, "").trim())
    .filter(Boolean)
    .join(" · ");
}
