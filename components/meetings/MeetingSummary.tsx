"use client";

import { Fragment } from "react";

/** **vet** binnen een regel → <strong>. Geen HTML-injectie: alles blijft React-tekst. */
function inline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>,
  );
}

/** Lichte markdown-weergave voor verslagen: kopjes, opsommingen en alinea's. */
export function MeetingSummary({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  return (
    <div className="space-y-1.5 text-[13.5px] leading-relaxed" style={{ color: "#3D332C" }}>
      {lines.map((raw, i) => {
        const line = raw.trimEnd();
        if (!line.trim()) return <div key={i} className="h-1" />;
        const heading = line.match(/^(#{1,4})\s+(.*)$/);
        if (heading) {
          return (
            <p key={i} className="font-display font-semibold pt-2" style={{ color: "#1A1410", fontSize: heading[1].length <= 2 ? 15 : 14 }}>
              {inline(heading[2])}
            </p>
          );
        }
        const bullet = line.match(/^(\s*)[-*•]\s+(.*)$/);
        if (bullet) {
          return (
            <div key={i} className="flex gap-2" style={{ paddingLeft: Math.min(bullet[1].length, 8) * 6 }}>
              <span style={{ color: "#FF7A45" }}>•</span>
              <span className="flex-1">{inline(bullet[2])}</span>
            </div>
          );
        }
        return <p key={i}>{inline(line)}</p>;
      })}
    </div>
  );
}
