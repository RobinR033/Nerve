"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTasks } from "@/hooks/useTasks";
import { useCaptureStore } from "@/stores/captureStore";
import { TaskEditModal } from "@/components/tasks/TaskEditModal";
import type { Task } from "@/types/database";

// --- Datum helpers ---

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = zondag
  const diff = day === 0 ? -6 : 1 - day; // maandag = start
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
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function isBeforeDay(a: Date, b: Date): boolean {
  const da = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const db = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return da < db;
}

function formatWeekRange(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  const sameMonth = weekStart.getMonth() === end.getMonth();
  if (sameMonth) {
    return `${weekStart.getDate()} – ${end.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}`;
  }
  return `${weekStart.toLocaleDateString("nl-NL", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })}`;
}

const DAY_NAMES = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];
const DAY_NAMES_FULL = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"];

const priorityColor: Record<Task["priority"], string> = {
  urgent: "border-l-red-500 bg-red-50",
  high:   "border-l-yellow-400 bg-yellow-50",
  medium: "border-l-blue-400 bg-blue-50",
  low:    "border-l-gray-300 bg-gray-50",
};

const priorityDot: Record<Task["priority"], string> = {
  urgent: "bg-red-500",
  high:   "bg-yellow-400",
  medium: "bg-blue-400",
  low:    "bg-gray-300",
};

// --- Component ---

export function AgendaClient() {
  const { tasks, complete, update } = useTasks();
  const openCapture = useCaptureStore((s) => s.openCapture);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [editTask, setEditTask] = useState<Task | null>(null);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Taken met deadline, niet gearchiveerd
  const tasksWithDeadline = tasks.filter(
    (t) => t.deadline && t.archived_at === null
  );

  // Taken vóór vandaag zonder afronding = "te laat" sectie (onafhankelijk van welke week je bekijkt)
  const overdueTasks = tasksWithDeadline.filter((t) => {
    const d = new Date(t.deadline!);
    d.setHours(0, 0, 0, 0);
    return isBeforeDay(d, today) && t.status !== "done";
  });

  // Taken per dag van de week
  function tasksForDay(day: Date): Task[] {
    return tasksWithDeadline.filter((t) => {
      const d = new Date(t.deadline!);
      return isSameDay(d, day);
    }).sort((a, b) => {
      const order = { urgent: 0, high: 1, medium: 2, low: 3 };
      return order[a.priority] - order[b.priority];
    });
  }

  function goToPrevWeek() {
    setWeekStart((w) => addDays(w, -7));
  }

  function goToNextWeek() {
    setWeekStart((w) => addDays(w, 7));
  }

  function goToToday() {
    setWeekStart(startOfWeek(new Date()));
  }

  const isCurrentWeek = isSameDay(weekStart, startOfWeek(new Date()));

  return (
    <>
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-gray-900">Agenda</h1>
            <p className="text-sm text-gray-400 mt-1">{formatWeekRange(weekStart)}</p>
          </div>
          <div className="flex items-center gap-2">
            {!isCurrentWeek && (
              <button
                onClick={goToToday}
                className="px-3 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Vandaag
              </button>
            )}
            <button
              onClick={goToPrevWeek}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={goToNextWeek}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              onClick={openCapture}
              className="w-11 h-11 rounded-xl bg-orange text-white flex items-center justify-center hover:bg-orange-dark transition-colors active:scale-95"
              title="Nieuwe taak (C)"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Te laat sectie */}
        <AnimatePresence>
          {overdueTasks.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 bg-red-50 border border-red-100 rounded-2xl p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <p className="text-sm font-semibold text-red-600 uppercase tracking-widest">
                  Te laat — {overdueTasks.length}
                </p>
              </div>
              <div className="space-y-1.5">
                {overdueTasks.map((task) => (
                  <AgendaTaskCard
                    key={task.id}
                    task={task}
                    onComplete={complete}
                    onEdit={() => setEditTask(task)}
                    isLate
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Week grid — horizontaal scrollbaar op mobiel */}
        <div className="-mx-4 md:mx-0 overflow-x-auto">
        <div className="grid grid-cols-7 gap-3 min-w-[600px] px-4 md:px-0">
          {weekDays.map((day, i) => {
            const isToday = isSameDay(day, today);
            const isPast = isBeforeDay(day, today);
            const dayTasks = tasksForDay(day);
            const isWeekend = i >= 5;

            return (
              <div key={i} className="flex flex-col gap-2">
                {/* Dag header */}
                <div className={`text-center pb-2 border-b ${isToday ? "border-orange" : "border-gray-100"}`}>
                  <p className={`text-xs font-semibold uppercase tracking-widest ${isWeekend ? "text-gray-300" : isPast ? "text-gray-300" : "text-gray-500"}`}>
                    {DAY_NAMES[i]}
                  </p>
                  <p className={[
                    "font-display text-xl font-bold mt-0.5",
                    isToday
                      ? "text-orange"
                      : isPast
                      ? "text-gray-300"
                      : isWeekend
                      ? "text-gray-400"
                      : "text-gray-900",
                  ].join(" ")}>
                    {day.getDate()}
                  </p>
                </div>

                {/* Taken */}
                <div className="flex flex-col gap-1.5 min-h-[120px]">
                  <AnimatePresence>
                    {dayTasks.map((task) => (
                      <AgendaTaskCard
                        key={task.id}
                        task={task}
                        onComplete={complete}
                        onEdit={() => setEditTask(task)}
                        isPast={isPast}
                      />
                    ))}
                  </AnimatePresence>

                  {/* Drop hint als leeg */}
                  {dayTasks.length === 0 && !isPast && !isWeekend && (
                    <div className="flex-1 border border-dashed border-gray-100 rounded-lg" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
        </div>

        {/* Geen deadlines melding */}
        {tasksWithDeadline.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 mt-4"
          >
            <p className="font-display text-lg font-semibold text-gray-900 mb-1">Geen taken met deadline</p>
            <p className="text-sm text-gray-400">Voeg een deadline toe bij het aanmaken van een taak om hem hier te zien.</p>
          </motion.div>
        )}
      </div>

      {/* Edit modal */}
      <TaskEditModal
        task={editTask}
        onClose={() => setEditTask(null)}
        onSave={async (id, data) => {
          await update(id, data);
          setEditTask(null);
        }}
      />
    </>
  );
}

// --- Taakkaart in de agenda ---

function AgendaTaskCard({
  task,
  onComplete,
  onEdit,
  isPast = false,
  isLate = false,
}: {
  task: Task;
  onComplete: (task: Task) => void;
  onEdit: () => void;
  isPast?: boolean;
  isLate?: boolean;
}) {
  const isDone = task.status === "done";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      onClick={onEdit}
      className={[
        "group relative cursor-pointer rounded-lg border-l-2 px-2 py-1.5 transition-all",
        "hover:shadow-sm",
        isDone
          ? "border-l-green-400 bg-green-50 opacity-60"
          : isLate
          ? "border-l-red-500 bg-red-50"
          : priorityColor[task.priority],
      ].join(" ")}
    >
      {/* Vinkje */}
      <button
        onClick={(e) => { e.stopPropagation(); if (!isDone) onComplete(task); }}
        className={[
          "absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all",
          "opacity-0 group-hover:opacity-100",
          isDone ? "border-green-500 bg-green-500" : "border-gray-300 hover:border-orange",
        ].join(" ")}
      >
        {isDone && (
          <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      <p className={[
        "text-xs font-semibold leading-tight pr-4",
        isDone ? "line-through text-gray-400" : "text-gray-800",
      ].join(" ")}>
        {task.title}
      </p>

      {task.deadline_has_time && task.deadline && (
        <p className="text-[10px] text-gray-400 mt-0.5">
          {new Date(task.deadline).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
        </p>
      )}

      {task.project && (
        <p className="text-[10px] text-gray-400 truncate mt-0.5">{task.project}</p>
      )}
    </motion.div>
  );
}
