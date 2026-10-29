"use client";

import { useState } from "react";
import { useProjectStore } from "@/stores/projectStore";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  inputClassName?: string;
};

const norm = (s: string) => s.trim().toLocaleLowerCase("nl");

/**
 * Projectveld met bestaande projecten als keuzechips onder het veld, zodat je
 * niet per ongeluk telkens een nieuw project aanmaakt. Chips staan in de flow
 * (geen zwevende lijst), dus ze werken ook in uitklappanelen en op mobiel.
 */
export function ProjectInput({ value, onChange, placeholder = "Project", autoFocus, inputClassName }: Props) {
  const projects = useProjectStore((s) => s.projects);
  const [focused, setFocused] = useState(Boolean(autoFocus));

  const names = projects.filter((p) => !p.archived_at && p.name !== "Vlaggetjes").map((p) => p.name);
  const q = norm(value);
  const exact = names.find((n) => norm(n) === q);
  const matches = names
    .filter((n) => !q || norm(n).includes(q))
    .sort((a, b) => {
      // Begint met de zoekterm → eerst
      const aStart = norm(a).startsWith(q);
      const bStart = norm(b).startsWith(q);
      if (aStart !== bStart) return aStart ? -1 : 1;
      return a.localeCompare(b, "nl");
    })
    .slice(0, 6);

  const showChips = focused && !exact && matches.length > 0;

  return (
    <div className="flex-1 min-w-0">
      <input
        type="text"
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        // Kleine vertraging: een tik op een chip moet nog aankomen
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        onKeyDown={(e) => {
          // Enter met precies één treffer: die kiezen in plaats van het formulier versturen
          if (e.key === "Enter" && q && !exact && matches.length === 1) {
            e.preventDefault();
            onChange(matches[0]);
          }
        }}
        placeholder={placeholder}
        className={inputClassName}
      />
      {showChips && (
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {matches.map((name) => (
            <ProjectChip key={name} name={name} onPick={() => onChange(name)} />
          ))}
        </div>
      )}
      {focused && q && !exact && matches.length === 0 && (
        <p className="text-[11.5px] mt-1" style={{ color: "#9A8F84" }}>
          Nieuw project “{value.trim()}”
        </p>
      )}
    </div>
  );
}

function ProjectChip({ name, onPick }: { name: string; onPick: () => void }) {
  const color = useProjectStore((s) => s.getColor(name)) ?? "#9A8F84";
  return (
    <button
      type="button"
      // mousedown i.p.v. click: gebeurt vóór de blur van het invoerveld
      onMouseDown={(e) => {
        e.preventDefault();
        onPick();
      }}
      className="px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ color, background: `${color}18` }}
    >
      {name}
    </button>
  );
}
