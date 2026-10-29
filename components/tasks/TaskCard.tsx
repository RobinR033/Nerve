"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTaskStore } from "@/stores/taskStore";
import { useProjectStore } from "@/stores/projectStore";
import type { Task } from "@/types/database";
import { TaskTitle } from "./TaskTitle";
import { MeetingOrigin } from "./MeetingOrigin";
import { FocusButton } from "./FocusButton";

type TaskCardProps = {
  task: Task;
  subtasks?: Task[];
  onComplete: (task: Task) => void;
  onUncomplete?: (task: Task) => void;
  onArchive?: (id: string) => void;
  onEdit?: () => void;
  onToggleFocus?: (task: Task) => void;
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

export function TaskCard({ task, subtasks: subtasksProp, onComplete, onUncomplete, onArchive, onEdit, onToggleFocus, compact = false }: TaskCardProps) {
  const isLate = task.status === "late";
  const isDone = task.status === "done";
  const isParsing = useTaskStore((s) => s.parsingTaskIds.has(task.id));
  const getSubtasks = useTaskStore((s) => s.getSubtasks);
  const projectColor = useProjectStore((s) => s.getColor(task.project));

  const subtasks = subtasksProp ?? (task.parent_id ? [] : getSubtasks(task.id));
  const doneSubtasks = subtasks.filter((s) => s.status === "done").length;
  const totalSubtasks = subtasks.length;
  const subtaskProgress = totalSubtasks > 0 ? doneSubtasks / totalSubtasks : null;
  // Bundel (taak met subtaken): standaard dicht, één tik op de voortgang klapt open
  const [expanded, setExpanded] = useState(false);

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
        backdropFilter: "var(--backdrop-blur)",
        WebkitBackdropFilter: "var(--backdrop-blur)",
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
            {/* Gradient checkbox — 44×44px touch target via padding+margin trick */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isDone) onUncomplete?.(task);
                else onComplete(task);
              }}
              title={isDone ? "Terugzetten naar Te doen" : "Afronden"}
              className="shrink-0 transition-all flex items-center justify-center"
              style={{ padding: 11, margin: -11, background: "transparent", border: "none", cursor: "pointer" }}
            >
              <div
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
                  flexShrink: 0,
                }}
              >
                {isDone && (
                  <svg style={{ width: 12, height: 12 }} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3.5 12.5l5 5L21 5" />
                  </svg>
                )}
              </div>
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <TaskTitle title={task.title} isDone={isDone} />

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
                  {task.source_meeting_id && <MeetingOrigin meetingId={task.source_meeting_id} />}
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

            {onToggleFocus && !isDone && <FocusButton task={task} onToggle={onToggleFocus} />}

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

          {/* Subtask progress bar — klikbaar: subtaken in- en uitklappen */}
          {subtaskProgress !== null && !compact && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((v) => !v);
              }}
              className="mt-2 w-full flex items-center gap-2 text-left"
              title={expanded ? "Subtaken verbergen" : "Subtaken tonen"}
              aria-expanded={expanded}
            >
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
              <span className="text-[10px] shrink-0 flex items-center gap-0.5" style={{ color: "#B8B0A8" }}>
                {doneSubtasks}/{totalSubtasks}
                <svg
                  className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </button>
          )}

          <AnimatePresence initial={false}>
            {expanded && !compact && totalSubtasks > 0 && (
              <motion.ul
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden mt-1.5 space-y-0.5"
                onClick={(e) => e.stopPropagation()}
              >
                {subtasks.map((sub) => {
                  const subDone = sub.status === "done";
                  return (
                    <li key={sub.id} className="flex items-center gap-2.5 py-1 pl-0.5">
                      <button
                        onClick={() => (subDone ? onUncomplete?.(sub) : onComplete(sub))}
                        title={subDone ? "Terugzetten" : "Afronden"}
                        className="shrink-0 flex items-center justify-center"
                        style={{ padding: 8, margin: -8 }}
                      >
                        <span
                          className="flex items-center justify-center"
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: "50%",
                            border: subDone ? "none" : `1.5px solid ${sub.status === "late" ? "#E63E0C" : "#FFB08F"}`,
                            background: subDone ? "#1F9D55" : "transparent",
                          }}
                        >
                          {subDone && (
                            <svg style={{ width: 9, height: 9 }} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3.5 12.5l5 5L21 5" />
                            </svg>
                          )}
                        </span>
                      </button>
                      <span
                        className={`flex-1 min-w-0 text-[13px] leading-snug ${subDone ? "line-through" : ""}`}
                        style={{ color: subDone ? "#B8B0A8" : "#3D332C" }}
                      >
                        {sub.title}
                      </span>
                      {sub.deadline && !subDone && (
                        <span className="text-[11px] shrink-0" style={{ color: sub.status === "late" ? "#E5484D" : "#9A8F84" }}>
                          {formatDeadline(sub.deadline, sub.deadline_has_time)}
                        </span>
                      )}
                    </li>
                  );
                })}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
