"use client";

import { motion } from "framer-motion";
import { useTaskStore } from "@/stores/taskStore";
import { useProjectStore } from "@/stores/projectStore";
import type { Task } from "@/types/database";

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
  onUncomplete?: (task: Task) => void;
  onArchive: (id: string) => void;
  onEdit: () => void;
};

export function TaskRow({ task, onComplete, onUncomplete, onArchive, onEdit }: Props) {
  const isLate = task.status === "late";
  const isDone = task.status === "done";
  const isParsing = useTaskStore((s) => s.parsingTaskIds.has(task.id));
  const getSubtasks = useTaskStore((s) => s.getSubtasks);
  const projectColor = useProjectStore((s) => s.getColor(task.project));

  const subtasks = getSubtasks(task.id);
  const doneSubtasks = subtasks.filter((s) => s.status === "done").length;
  const totalSubtasks = subtasks.length;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ duration: 0.18 }}
      onClick={onEdit}
      className="group overflow-hidden transition-all"
      style={{
        background: isLate
          ? "linear-gradient(135deg, rgba(255,235,225,.85) 0%, rgba(247,224,238,.85) 100%)"
          : isDone
          ? "rgba(255,253,250,0.5)"
          : "rgba(255,253,250,0.75)",
        backdropFilter: "blur(8px) saturate(120%)",
        WebkitBackdropFilter: "blur(8px) saturate(120%)",
        border: `0.5px solid ${isLate ? "rgba(255,180,150,.35)" : "rgba(255,255,255,0.6)"}`,
        borderRadius: 12,
        boxShadow: isLate
          ? "0 1px 0 rgba(255,255,255,.65) inset, 0 2px 10px -4px rgba(229,72,77,.1)"
          : "0 1px 0 rgba(255,255,255,.65) inset, 0 2px 10px -4px rgba(60,40,30,.06)",
        cursor: "pointer",
      }}
    >
      <div className="flex items-center gap-3 px-4 py-3 min-w-0">
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
            width: 20,
            height: 20,
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
            <svg style={{ width: 10, height: 10 }} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3.5 12.5l5 5L21 5" />
            </svg>
          )}
        </button>

        {/* Parsing spinner or urgent badge */}
        {isParsing ? (
          <svg className="w-3 h-3 animate-spin shrink-0" style={{ color: "#FF5A1F" }} fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        ) : task.priority === "urgent" ? (
          <span className="shrink-0 font-black text-sm leading-none" style={{ color: "#E5484D" }} title="Urgent">!</span>
        ) : null}

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
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {task.project && (
              <span
                className="text-xs font-semibold rounded-full px-1.5 py-0.5"
                style={{
                  color: projectColor ?? "#9A8F84",
                  background: projectColor ? `${projectColor}18` : "rgba(0,0,0,0.05)",
                }}
              >
                {task.project}
              </span>
            )}
            {task.deadline && (
              <span className="text-xs font-medium" style={{ color: isLate ? "#E5484D" : "#9A8F84" }}>
                {formatDeadline(task.deadline, task.deadline_has_time)}
              </span>
            )}
            {totalSubtasks > 0 && (
              <span className="text-xs" style={{ color: "#B8B0A8" }}>{doneSubtasks}/{totalSubtasks} subtaken</span>
            )}
          </div>
        </div>

        {/* Hover actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {!isDone && (
            <button
              onClick={(e) => { e.stopPropagation(); onArchive(task.id); }}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
              style={{ color: "#C7C0B8" }}
              title="Archiveren"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
