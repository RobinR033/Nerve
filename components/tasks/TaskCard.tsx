"use client";

import { motion } from "framer-motion";
import { useTaskStore } from "@/stores/taskStore";
import { useProjectStore } from "@/stores/projectStore";
import type { Task } from "@/types/database";

type TaskCardProps = {
  task: Task;
  subtasks?: Task[];
  onComplete: (task: Task) => void;
  onUncomplete?: (task: Task) => void;
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

export function TaskCard({ task, subtasks: subtasksProp, onComplete, onUncomplete, onArchive, onEdit, compact = false }: TaskCardProps) {
  const isLate = task.status === "late";
  const isDone = task.status === "done";
  const isParsing = useTaskStore((s) => s.parsingTaskIds.has(task.id));
  const getSubtasks = useTaskStore((s) => s.getSubtasks);
  const projectColor = useProjectStore((s) => s.getColor(task.project));

  const subtasks = subtasksProp ?? (task.parent_id ? [] : getSubtasks(task.id));
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
      className="group overflow-hidden transition-all"
      style={{
        background: isLate
          ? "linear-gradient(135deg, rgba(255,235,225,.88) 0%, rgba(247,224,238,.88) 100%)"
          : isDone
          ? "rgba(255,253,250,0.55)"
          : "rgba(255,253,250,0.78)",
        backdropFilter: "blur(24px) saturate(160%)",
        WebkitBackdropFilter: "blur(24px) saturate(160%)",
        border: `0.5px solid ${isLate ? "rgba(255,180,150,.4)" : "rgba(255,255,255,0.65)"}`,
        borderRadius: 14,
        boxShadow: isLate
          ? "0 1px 0 rgba(255,255,255,.7) inset, 0 4px 16px -4px rgba(229,72,77,.12)"
          : "0 1px 0 rgba(255,255,255,.7) inset, 0 4px 16px -4px rgba(60,40,30,.08)",
        cursor: onEdit ? "pointer" : "default",
      }}
    >
      <div className="flex">
        {/* High-priority bar */}
        {(task.priority === "urgent" || task.priority === "high") && !isDone && (
          <div
            style={{
              width: 3,
              alignSelf: "stretch",
              borderRadius: "14px 0 0 14px",
              background:
                task.priority === "urgent"
                  ? "linear-gradient(180deg, #E5484D, #FF3D8B)"
                  : "linear-gradient(180deg, #FF7A45, #FF3D8B)",
              flexShrink: 0,
            }}
          />
        )}
        <div className={compact ? "p-3 flex-1 min-w-0" : "p-3.5 flex-1 min-w-0"}>
          <div className="flex items-center gap-3">
            {/* Gradient checkbox */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isDone) onUncomplete?.(task);
                else onComplete(task);
              }}
              title={isDone ? "Terugzetten naar Te doen" : "Afronden"}
              className="shrink-0 transition-all"
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                border: isDone ? "none" : `1.5px solid ${isLate ? "#E63E0C" : "#FF5A1F"}`,
                background: isDone
                  ? "linear-gradient(135deg, #FF7A45 0%, #FF5A1F 60%, #FF3D8B 100%)"
                  : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
                cursor: "pointer",
              }}
            >
              {isDone && (
                <svg style={{ width: 12, height: 12 }} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3.5 12.5l5 5L21 5" />
                </svg>
              )}
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p
                className="text-sm font-medium truncate"
                style={{
                  color: isDone ? "#9A8F84" : "#1A1410",
                  textDecoration: isDone ? "line-through" : "none",
                  letterSpacing: "-.01em",
                }}
              >
                {task.title}
              </p>

              {!compact && (
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {task.project && (
                    <span
                      className="text-xs font-semibold rounded-full px-2 py-0.5"
                      style={{
                        color: projectColor ?? "#9A8F84",
                        background: projectColor ? `${projectColor}18` : "rgba(0,0,0,0.05)",
                      }}
                    >
                      {task.project}
                    </span>
                  )}
                  {task.deadline && (
                    <span
                      className="text-xs font-medium"
                      style={{ color: isLate ? "#E5484D" : "#9A8F84" }}
                    >
                      {formatDeadline(task.deadline, task.deadline_has_time)}
                    </span>
                  )}
                  {task.context && (
                    <span className="text-xs" style={{ color: "#B8B0A8" }}>{task.context}</span>
                  )}
                </div>
              )}
            </div>

            {/* Parsing spinner or urgent badge */}
            {isParsing ? (
              <svg className="w-4 h-4 animate-spin shrink-0" style={{ color: "#FF5A1F" }} fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            ) : task.priority === "urgent" ? (
              <span className="shrink-0 font-black text-sm leading-none" style={{ color: "#E5484D" }} title="Urgent">!</span>
            ) : null}

            {/* Archive on hover */}
            {onArchive && !isDone && (
              <button
                onClick={(e) => { e.stopPropagation(); onArchive(task.id); }}
                className="opacity-0 group-hover:opacity-100 transition-all shrink-0"
                style={{ color: "#C7C0B8" }}
                title="Archiveren"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </button>
            )}
          </div>

          {/* Subtask progress bar */}
          {subtaskProgress !== null && !compact && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.06)" }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${subtaskProgress * 100}%`,
                    background:
                      subtaskProgress === 1
                        ? "#1F9D55"
                        : projectColor
                        ? projectColor
                        : "linear-gradient(90deg, #FF7A45, #FF3D8B)",
                  }}
                />
              </div>
              <span className="text-[10px] shrink-0" style={{ color: "#B8B0A8" }}>
                {doneSubtasks}/{totalSubtasks}
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
