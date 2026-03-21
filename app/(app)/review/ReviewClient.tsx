"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useTasks } from "@/hooks/useTasks";
import type { Task } from "@/types/database";

// --- Datum helpers ---
function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatWeekRange(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  const sameMonth = weekStart.getMonth() === end.getMonth();
  if (sameMonth) {
    return `${weekStart.getDate()} – ${end.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}`;
  }
  return `${weekStart.toLocaleDateString("nl-NL", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })}`;
}

function formatDayLabel(date: Date): string {
  return date.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "short" });
}

const DAY_NAMES = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

const priorityColors: Record<Task["priority"], string> = {
  urgent: "bg-red-50 border-red-200 text-red-700",
  high: "bg-yellow-50 border-yellow-200 text-yellow-700",
  medium: "bg-blue-50 border-blue-200 text-blue-700",
  low: "bg-gray-50 border-gray-200 text-gray-600",
};

const priorityDot: Record<Task["priority"], string> = {
  urgent: "bg-red-500",
  high: "bg-yellow-400",
  medium: "bg-blue-400",
  low: "bg-gray-300",
};

export function ReviewClient() {
  const { tasks } = useTasks();
  const [weekOffset, setWeekOffset] = useState(0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const baseWeek = startOfWeek(today);
  const weekStart = addDays(baseWeek, weekOffset * 7);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekEnd = addDays(weekStart, 7);

  const isCurrentWeek = weekOffset === 0;

  // Taken afgerond deze week (via completed_at of updated_at als fallback)
  function completedOnDay(day: Date): Task[] {
    return tasks.filter((t) => {
      if (t.status !== "done") return false;
      const ts = t.completed_at ?? t.updated_at;
      const d = new Date(ts);
      return isSameDay(d, day);
    });
  }

  // Taken met deadline deze week
  function deadlineOnDay(day: Date): Task[] {
    return tasks.filter((t) => {
      if (!t.deadline || t.archived_at) return false;
      return isSameDay(new Date(t.deadline), day);
    });
  }

  // Stats voor de geselecteerde week
  const allDeadlineThisWeek = tasks.filter((t) => {
    if (!t.deadline || t.archived_at) return false;
    const d = new Date(t.deadline);
    return d >= weekStart && d < weekEnd;
  });

  const completedThisWeek = tasks.filter((t) => {
    if (t.status !== "done") return false;
    const ts = new Date(t.completed_at ?? t.updated_at);
    return ts >= weekStart && ts < weekEnd;
  });

  const missedThisWeek = allDeadlineThisWeek.filter(
    (t) => t.status !== "done" && t.status !== "todo" // late of niet afgerond
  );

  const completionRate =
    allDeadlineThisWeek.length > 0
      ? Math.round((completedThisWeek.length / allDeadlineThisWeek.length) * 100)
      : null;

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-gray-900">Weekoverzicht</h1>
          <p className="text-sm text-gray-400 mt-1">{formatWeekRange(weekStart)}</p>
        </div>
        <div className="flex items-center gap-2">
          {!isCurrentWeek && (
            <button
              onClick={() => setWeekOffset(0)}
              className="px-3 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Deze week
            </button>
          )}
          <button
            onClick={() => setWeekOffset((w) => w - 1)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => setWeekOffset((w) => w + 1)}
            disabled={isCurrentWeek}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-30"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
        <StatCard
          label="Afgerond"
          value={completedThisWeek.length}
          sub="taken klaar"
          color="text-green-600"
        />
        <StatCard
          label="Deadline gehad"
          value={allDeadlineThisWeek.length}
          sub="taken met deadline"
          color="text-blue-600"
        />
        <StatCard
          label="Completiegraad"
          value={completionRate !== null ? `${completionRate}%` : "–"}
          sub={completionRate === null ? "geen deadlines" : completionRate >= 80 ? "uitstekend 🔥" : completionRate >= 50 ? "goed bezig" : "ruimte voor groei"}
          color={completionRate !== null && completionRate >= 80 ? "text-green-600" : "text-orange"}
        />
      </div>

      {/* Per dag */}
      <div className="space-y-3">
        {weekDays.map((day, i) => {
          const isToday = isSameDay(day, today);
          const isPast = day < today && !isToday;
          const isFuture = day > today;
          const deadlines = deadlineOnDay(day);
          const completed = completedOnDay(day);
          // Toon deadlines voor verleden/heden, en afgeronde taken
          const hasContent = deadlines.length > 0 || completed.length > 0;

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={[
                "rounded-2xl border p-4 transition-all",
                isToday ? "border-orange bg-orange-soft/30" : "border-gray-100 bg-white",
                isFuture && !hasContent ? "opacity-40" : "",
              ].join(" ")}
            >
              {/* Dag header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={[
                    "text-xs font-bold uppercase tracking-widest",
                    isToday ? "text-orange" : isPast ? "text-gray-400" : "text-gray-500",
                  ].join(" ")}>
                    {DAY_NAMES[i]}
                  </span>
                  <span className={[
                    "font-display text-lg font-bold",
                    isToday ? "text-orange" : isPast ? "text-gray-400" : "text-gray-900",
                  ].join(" ")}>
                    {day.getDate()} {day.toLocaleDateString("nl-NL", { month: "short" })}
                  </span>
                  {isToday && (
                    <span className="text-xs bg-orange text-white px-2 py-0.5 rounded-full font-semibold">
                      Vandaag
                    </span>
                  )}
                </div>
                {deadlines.length > 0 && (
                  <span className="text-xs text-gray-400">
                    {deadlines.filter((t) => t.status === "done").length}/{deadlines.length} afgerond
                  </span>
                )}
              </div>

              {/* Inhoud */}
              {!hasContent ? (
                <p className="text-sm text-gray-300 italic">Geen taken</p>
              ) : (
                <div className="space-y-1.5">
                  {/* Taken met deadline op deze dag */}
                  {deadlines.map((task) => (
                    <ReviewTaskRow key={task.id} task={task} />
                  ))}
                  {/* Taken afgerond op deze dag zonder deadline op deze dag */}
                  {completed
                    .filter((t) => !t.deadline || !isSameDay(new Date(t.deadline), day))
                    .map((task) => (
                      <ReviewTaskRow key={task.id} task={task} extraLabel="Geen deadline" />
                    ))}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: number | string;
  sub: string;
  color: string;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
      <p className={`font-display text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
  );
}

function ReviewTaskRow({ task, extraLabel }: { task: Task; extraLabel?: string }) {
  const isDone = task.status === "done";
  const isLate = task.status === "late";

  return (
    <div className={[
      "flex items-center gap-2.5 px-3 py-2 rounded-xl border text-sm",
      isDone
        ? "border-green-100 bg-green-50"
        : isLate
        ? "border-red-100 bg-red-50"
        : "border-gray-100 bg-gray-50",
    ].join(" ")}>
      {/* Status icoon */}
      <span className={[
        "shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center",
        isDone ? "border-green-500 bg-green-500" : isLate ? "border-red-300" : "border-gray-300",
      ].join(" ")}>
        {isDone && (
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </span>

      {/* Prioriteit dot */}
      <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${priorityDot[task.priority]}`} />

      {/* Titel */}
      <p className={[
        "flex-1 font-medium truncate",
        isDone ? "line-through text-gray-400" : isLate ? "text-red-700" : "text-gray-700",
      ].join(" ")}>
        {task.title}
      </p>

      {/* Project */}
      {task.project && (
        <span className="text-xs text-gray-400 shrink-0">{task.project}</span>
      )}

      {/* Extra label (geen deadline) */}
      {extraLabel && (
        <span className="text-xs text-gray-300 italic shrink-0">{extraLabel}</span>
      )}

      {/* Status label */}
      <span className={[
        "text-xs font-semibold shrink-0",
        isDone ? "text-green-600" : isLate ? "text-red-500" : "text-gray-400",
      ].join(" ")}>
        {isDone ? "✓" : isLate ? "Te laat" : "Open"}
      </span>
    </div>
  );
}
