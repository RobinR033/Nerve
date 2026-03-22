import { PROJECT_COLOR_PRESETS } from "@/types/database";

/**
 * Geeft een deterministische kleur op basis van de projectnaam.
 * Dezelfde naam geeft altijd dezelfde kleur, verdeeld over het pallet.
 */
export function defaultColorForProject(name: string): string {
  const hash = [...name].reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) >>> 0, 0);
  return PROJECT_COLOR_PRESETS[hash % PROJECT_COLOR_PRESETS.length].color;
}
