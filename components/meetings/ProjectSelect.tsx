"use client";

import { useProjectStore } from "@/stores/projectStore";

type Props = {
  value: string | null;
  onChange: (project: string | null) => void;
};

/** Project waar de taken uit dit overleg onder vallen */
export function ProjectSelect({ value, onChange }: Props) {
  const projects = useProjectStore((s) => s.projects);
  const color = useProjectStore((s) => s.getColor(value));
  const names = projects.map((p) => p.name).filter((n) => n !== "Vlaggetjes");
  // Project van bestaande taken dat (nog) niet in de lijst staat, toch tonen
  if (value && !names.includes(value)) names.unshift(value);

  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className="h-8 px-2.5 rounded-lg text-[13px] font-medium max-w-full"
      style={{
        background: color ? `${color}14` : "rgba(255,255,255,0.8)",
        border: `0.5px solid ${color ?? "rgba(0,0,0,0.12)"}`,
        color: color ?? "#1A1410",
        outline: "none",
      }}
    >
      <option value="">Geen project</option>
      {names.map((n) => (
        <option key={n} value={n}>{n}</option>
      ))}
    </select>
  );
}
