"use client";

import { motion } from "framer-motion";
import { useTaskStore } from "@/stores/taskStore";
import { useProjectStore } from "@/stores/projectStore";
import type { Task } from "@/types/database";

type TaskCardProps = {
  task: Task;
  subtasks?: Task[];
  onComplete: (task: Task) => void;
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

export function TaskCard({ task, subtasks: subtasksProp, onComplete, onArchive, onEdit, compact = false }: TaskCardProps) {
  const isLate = task.status === "late";
  const isDone = task.status === "done";
  const isParsing = useTaskStore((s) => s.parsingTaskIds.has(task.id));
  const getSubtasks = useTaskStore((s) => s.getSubtasks);
  const projectColor = useProjectStore((s) => s.getColor(task.project));

  // Gebruik meegegeven subtasks als prop, anders haal ze op uit de store
  const subtasks = subtasksProp ?? (task.parent_id ? [] : getSubtasks(task.id));

  function hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  const doneSubtasks = subtasks.filter((s) => s.status === "done").length;
  const totalSubtasks = subtasks.length;
  const subtaskProgress = totalSubtasks > 0 ? doneSubtasks / totalSubtasks : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      onClick={onEdit}
      className={[
        "group rounded-xl border transition-all overflow-hidden",
        isLate ? "border-red-100" : "border-gray-100",
        "hover:shadow-md hover:border-gray-200",
        onEdit ? "cursor-pointer" : "",
      ].join(" ")}
      style={{
        backgroundColor: projectColor
          ? hexToRgba(projectColor, isDone ? 0.04 : 0.08)
          : "#ffffff",
      }}
    >
      <div className="flex">
        <div className={compact ? "p-3 flex-1 min-w-0" : "p-4 flex-1 min-w-0"}>
          <div className="flex items-center gap-3">
            {/* Vinkje */}
            <button
              onClick={(e) => { e.stopPropagation(); if (!isDone) onComplete(task); }}
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
                    <span
                      className="text-xs font-medium"
                      style={{ color: projectColor ?? "#9CA3AF" }}
                    >
                      {task.project}
                    </span>
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

            {/* Prioriteit indicator — alleen bij urgent */}
            {isParsing ? (
              <svg className="w-4 h-4 text-orange animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            ) : task.priority === "urgent" ? (
              <span className="shrink-0 text-red-500 font-black text-base leading-none" title="Urgent">!</span>
            ) : null}

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

          {/* Subtaak voortgangsbalk */}
          {subtaskProgress !== null && !compact && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${subtaskProgress * 100}%`,
                    backgroundColor: subtaskProgress === 1 ? "#16A34A" : (projectColor ?? "#3B82F6"),
                  }}
                />
              </div>
              <span className="text-[10px] text-gray-400 shrink-0">
                {doneSubtasks}/{totalSubtasks}
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
