"use client";

import { motion } from "framer-motion";
import { useTaskStore } from "@/stores/taskStore";
import type { Task } from "@/types/database";

const priorityDot: Record<Task["priority"], string> = {
  urgent: "bg-red-500",
  high:   "bg-yellow-400",
  medium: "bg-blue-400",
  low:    "bg-gray-300",
};

function formatDeadline(deadline: string, hasTime: boolean): string {
  const date = new Date(deadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 86400000);
  const taskDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (taskDay.getTime() === today.getTime()) {
    return hasTime
      ? `Vandaag ${date.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}`
      : "Vandaag";
  }
  if (taskDay.getTime() === tomorrow.getTime()) return "Morgen";
  if (taskDay < today) {
    const days = Math.round((today.getTime() - taskDay.getTime()) / 86400000);
    return days === 1 ? "Gisteren" : `${days}d te laat`;
  }
  return date.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

type Props = {
  task: Task;
  onComplete: (task: Task) => void;
  onArchive: (id: string) => void;
  onEdit: () => void;
};

export function TaskRow({ task, onComplete, onArchive, onEdit }: Props) {
  const isLate = task.status === "late";
  const isDone = task.status === "done";
  const isParsing = useTaskStore((s) => s.parsingTaskIds.has(task.id));

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ duration: 0.18 }}
      className={[
        "group flex items-center gap-3 px-4 py-3 rounded-xl bg-white border transition-all hover:shadow-sm",
        isLate ? "border-red-100" : "border-gray-100 hover:border-gray-200",
      ].join(" ")}
    >
      {/* Vinkje */}
      <button
        onClick={() => !isDone && onComplete(task)}
        className={[
          "shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
          isDone
            ? "border-green-500 bg-green-500"
            : isLate
            ? "border-red-300 hover:border-red-500"
            : "border-gray-300 hover:border-orange",
        ].join(" ")}
      >
        {isDone && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Prioriteit dot / parsing spinner */}
      {isParsing ? (
        <svg className="w-3 h-3 text-orange animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      ) : (
        <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${priorityDot[task.priority]}`} />
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={[
          "text-sm font-medium truncate",
          isDone ? "line-through text-gray-400" : "text-gray-900",
        ].join(" ")}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {task.project && (
            <span className="text-xs text-gray-400">{task.project}</span>
          )}
          {task.deadline && (
            <>
              {task.project && <span className="text-gray-200 text-xs">·</span>}
              <span className={`text-xs font-medium ${isLate ? "text-red-500" : "text-gray-400"}`}>
                {formatDeadline(task.deadline, task.deadline_has_time)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Acties (hover) */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {/* Bewerken */}
        <button
          onClick={onEdit}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
          title="Bewerken"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        {/* Archiveren */}
        {!isDone && (
          <button
            onClick={() => onArchive(task.id)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
            title="Archiveren"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
          </button>
        )}
      </div>
    </motion.div>
  );
}
