"use client";

import { motion } from "framer-motion";
import type { Task } from "@/types/database";

type Props = {
  task: Task;
  onComplete: (task: Task) => void;
  onEdit: () => void;
};

function parseOutlookDescription(description: string | null): { from: string | null; preview: string | null } {
  if (!description) return { from: null, preview: null };
  const lines = description.split("\n");
  const fromLine = lines.find((l) => l.startsWith("Van:"));
  const from = fromLine ? fromLine.replace("Van:", "").trim() : null;
  const preview = lines.filter((l) => !l.startsWith("Van:")).join(" ").trim() || null;
  return { from, preview };
}

function formatDate(dateStr: string | null | undefined, fallback: string): string {
  if (!dateStr) return formatDate(fallback, fallback);
  const date = new Date(dateStr);
  // Ongeldige datum (bv. oude context die een e-mailadres bevatte) → fallback
  if (isNaN(date.getTime())) return formatDate(fallback, fallback);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const taskDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (taskDay.getTime() === today.getTime())
    return date.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
  if (today.getTime() - taskDay.getTime() < 7 * 86400000)
    return date.toLocaleDateString("nl-NL", { weekday: "short" });
  return date.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

export function OutlookRow({ task, onComplete, onEdit }: Props) {
  const isDone = task.status === "done";
  const { from, preview } = parseOutlookDescription(task.description);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: isDone ? 0.5 : 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.18 }}
      onClick={onEdit}
      className={[
        "group flex items-start gap-3 bg-white rounded-xl border px-4 py-3 cursor-pointer",
        "hover:shadow-sm hover:border-gray-200 transition-all",
        isDone ? "border-gray-100" : "border-gray-100",
      ].join(" ")}
    >
      {/* Checkbox */}
      <button
        onClick={(e) => { e.stopPropagation(); if (!isDone) onComplete(task); }}
        className={[
          "mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
          isDone
            ? "bg-green-500 border-green-500"
            : "border-gray-300 hover:border-green-400 active:scale-90",
        ].join(" ")}
      >
        {isDone && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Mail icoon */}
      <div className="mt-0.5 shrink-0">
        <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>

      {/* Inhoud */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <p className={["text-sm font-semibold leading-snug truncate", isDone ? "line-through text-gray-400" : "text-gray-900"].join(" ")}>
            {task.title}
          </p>
          <span className="text-[11px] text-gray-400 shrink-0 mt-0.5">
            {formatDate(task.context, task.created_at)}
          </span>
        </div>

        {from && (
          <p className="text-xs text-gray-400 mt-0.5 truncate">
            {from}
          </p>
        )}

        {preview && (
          <p className="text-xs text-gray-400 mt-1 line-clamp-1">
            {preview}
          </p>
        )}
      </div>
    </motion.div>
  );
}
