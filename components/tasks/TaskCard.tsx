"use client";

import { motion } from "framer-motion";
import { PriorityBadge } from "@/components/ui/Badge";
import type { Task } from "@/types/database";

type TaskCardProps = {
  task: Task;
  onComplete: (id: string) => void;
  onArchive?: (id: string) => void;
  onEdit?: () => void;
  compact?: boolean;
};

function formatDeadline(deadline: string, hasTime: boolean): string {
  const date = new Date(deadline);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
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
    return days === 1 ? "Gisteren" : `${days} dagen te laat`;
  }
  return date.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

export function TaskCard({ task, onComplete, onArchive, onEdit, compact = false }: TaskCardProps) {
  const isLate = task.status === "late";
  const isDone = task.status === "done";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      onClick={onEdit}
      className={[
        "group bg-white rounded-xl border transition-all",
        isLate ? "border-red-100" : "border-gray-100",
        "hover:shadow-md hover:border-gray-200",
        onEdit ? "cursor-pointer" : "",
        compact ? "p-3" : "p-4",
      ].join(" ")}
    >
      <div className="flex items-center gap-3">
        {/* Vinkje */}
        <button
          onClick={(e) => { e.stopPropagation(); if (!isDone) onComplete(task.id); }}
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

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={[
            "text-sm font-medium truncate",
            isDone ? "line-through text-gray-400" : "text-gray-900",
          ].join(" ")}>
            {task.title}
          </p>

          {!compact && (
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {task.project && (
                <span className="text-xs text-gray-400">{task.project}</span>
              )}
              {task.project && task.deadline && (
                <span className="text-gray-200 text-xs">·</span>
              )}
              {task.deadline && (
                <span className={`text-xs font-medium ${isLate ? "text-red-500" : "text-gray-400"}`}>
                  {formatDeadline(task.deadline, task.deadline_has_time)}
                </span>
              )}
              {task.context && (
                <>
                  <span className="text-gray-200 text-xs">·</span>
                  <span className="text-xs text-gray-400">{task.context}</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Priority badge */}
        <PriorityBadge priority={task.priority} />

        {/* Archive knop (hover) */}
        {onArchive && !isDone && (
          <button
            onClick={(e) => { e.stopPropagation(); onArchive(task.id); }}
            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-gray-500 transition-all shrink-0"
            title="Archiveren"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
          </button>
        )}
      </div>
    </motion.div>
  );
}
