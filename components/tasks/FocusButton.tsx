"use client";

import { motion } from "framer-motion";
import type { Task } from "@/types/database";

/** Doelwit-knopje op de actieregel: taak in/uit focus (bovenaan het dashboard). */
export function FocusButton({ task, onToggle }: { task: Task; onToggle: (task: Task) => void }) {
  const active = Boolean(task.focused_at);

  return (
    <motion.button
      whileTap={{ scale: 0.8 }}
      onClick={(e) => {
        e.stopPropagation();
        onToggle(task);
      }}
      title={active ? "Uit focus halen" : "In focus zetten"}
      aria-label={active ? "Uit focus halen" : "In focus zetten"}
      aria-pressed={active}
      className={[
        "shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all",
        // Niet in focus: op desktop alleen bij hover, op touch altijd (zacht) zichtbaar
        active ? "" : "opacity-60 md:opacity-0 md:group-hover:opacity-100",
      ].join(" ")}
      style={{ color: active ? "#FF5A1F" : "#C7C0B8", background: active ? "rgba(255,90,31,0.1)" : "transparent" }}
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      </svg>
    </motion.button>
  );
}
