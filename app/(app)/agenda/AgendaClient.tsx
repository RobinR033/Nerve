"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTasks } from "@/hooks/useTasks";
import { useCaptureStore } from "@/stores/captureStore";
import { useCategoryStore } from "@/stores/categoryStore";
import { TaskEditModal } from "@/components/tasks/TaskEditModal";
import type { Task } from "@/types/database";

// --- Datum helpers ---

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
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
  return new Date(a.getFullYear(), a.getMonth(), a.getDate()) <
    new Date(b.getFullYear(), b.getMonth(), b.getDate());
}

const DAY_NAMES = ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"];
const MONTH_NAMES = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

const priorityColor: Record<Task["priority"], string> = {
  urgent: "border-l-red-500 bg-red-50",
  high:   "border-l-yellow-400 bg-yellow-50",
  medium: "border-l-blue-400 bg-blue-50",
  low:    "border-l-gray-300 bg-gray-50",
};

// Hoeveel dagen voor/na vandaag
const DAYS_BEFORE = 14;
const DAYS_AFTER  = 84; // 12 weken vooruit
const COL_W = 88; // px breedte per dagkolom

// --- Hoofdcomponent ---

export function AgendaClient() {
  const { tasks, complete, update } = useTasks();
  const openCapture = useCaptureStore((s) => s.openCapture);
  const { activeCategory } = useCategoryStore();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [editTask, setEditTask] = useState<Task | null>(null);
  const [visibleWeek, setVisibleWeek] = useState(getWeekNumber(today));
  const scrollRef = useRef<HTMLDivElement>(null);
  const todayRef = useRef<HTMLDivElement>(null);

  // Genereer alle dagen
  const allDays = Array.from({ length: DAYS_BEFORE + DAYS_AFTER }, (_, i) =>
    addDays(today, i - DAYS_BEFORE)
  );

  const tasksWithDeadline = tasks.filter(
    (t) => t.deadline && t.archived_at === null &&
      (t.category === activeCategory || t.category === null)
  );

  const overdueTasks = tasksWithDeadline.filter((t) => {
    const d = new Date(t.deadline!);
    d.setHours(0, 0, 0, 0);
    return isBeforeDay(d, today) && t.status !== "done";
  });

  function tasksForDay(day: Date): Task[] {
    return tasksWithDeadline
      .filter((t) => isSameDay(new Date(t.deadline!), day))
      .sort((a, b) => ({ urgent: 0, high: 1, medium: 2, low: 3 }[a.priority] - { urgent: 0, high: 1, medium: 2, low: 3 }[b.priority]));
  }

  // Scroll naar vandaag bij mount
  useEffect(() => {
    if (todayRef.current && scrollRef.current) {
      const containerLeft = scrollRef.current.getBoundingClientRect().left;
      const todayLeft = todayRef.current.getBoundingClientRect().left;
      scrollRef.current.scrollLeft += todayLeft - containerLeft - 16;
    }
  }, []);

  // Update zichtbare week op basis van scroll
  function handleScroll() {
    if (!scrollRef.current) return;
    const scrollLeft = scrollRef.current.scrollLeft;
    const dayIndex = Math.round(scrollLeft / COL_W);
    const day = allDays[Math.min(Math.max(dayIndex, 0), allDays.length - 1)];
    setVisibleWeek(getWeekNumber(day));
  }

  function scrollToToday() {
    if (todayRef.current && scrollRef.current) {
      const containerLeft = scrollRef.current.getBoundingClientRect().left;
      const todayLeft = todayRef.current.getBoundingClientRect().left;
      scrollRef.current.scrollBy({ left: todayLeft - containerLeft - 16, behavior: "smooth" });
    }
  }

  const isOnToday = visibleWeek === getWeekNumber(today);

  return (
    <>
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-10">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <h1 className="font-display text-3xl font-bold text-gray-900">Agenda</h1>
              <span className="text-xs font-bold text-orange bg-orange/10 px-2 py-0.5 rounded-full shrink-0">
                W{visibleWeek}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {!isOnToday && (
                <button
                  onClick={scrollToToday}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Vandaag
                </button>
              )}
              <button
                onClick={() => openCapture()}
                className="w-9 h-9 rounded-xl bg-orange text-white flex items-center justify-center hover:bg-orange-dark transition-colors active:scale-95"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
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
                  <AgendaTaskCard key={task.id} task={task} onComplete={complete} onEdit={() => setEditTask(task)} isLate />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Doorlopende scroll */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="-mx-4 md:mx-0 overflow-x-auto pb-4"
          style={{ touchAction: "pan-x" }}
        >
          <div className="flex gap-0 px-4 md:px-0" style={{ width: `${allDays.length * COL_W + 32}px` }}>
            {allDays.map((day, i) => {
              const isToday     = isSameDay(day, today);
              const isPast      = isBeforeDay(day, today);
              const isWeekend   = day.getDay() === 0 || day.getDay() === 6;
              const isMonStart  = day.getDate() === 1;
              const isWeekStart = day.getDay() === 1; // maandag
              const dayTasks    = tasksForDay(day);
              const weekNum     = getWeekNumber(day);

              return (
                <div
                  key={i}
                  ref={isToday ? todayRef : undefined}
                  style={{ width: COL_W, minWidth: COL_W }}
                  className="flex flex-col"
                >
                  {/* Week-label boven eerste dag van de week */}
                  <div className="h-5 flex items-center">
                    {isWeekStart && (
                      <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider pl-2">
                        W{weekNum}
                      </span>
                    )}
                    {isMonStart && !isWeekStart && (
                      <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider pl-2">
                        {MONTH_NAMES[day.getMonth()]}
                      </span>
                    )}
                  </div>

                  {/* Dag header */}
                  <div className={[
                    "text-center py-2 mx-1 border-b",
                    isToday ? "border-orange" : "border-gray-100",
                  ].join(" ")}>
                    <p className={[
                      "text-[10px] font-semibold uppercase tracking-widest",
                      isWeekend ? "text-gray-300" : isPast ? "text-gray-300" : "text-gray-400",
                    ].join(" ")}>
                      {DAY_NAMES[day.getDay()]}
                    </p>
                    <p className={[
                      "font-display text-lg font-bold mt-0.5",
                      isToday   ? "text-orange" :
                      isPast    ? "text-gray-300" :
                      isWeekend ? "text-gray-400" :
                                  "text-gray-900",
                    ].join(" ")}>
                      {day.getDate()}
                    </p>
                  </div>

                  {/* Taken */}
                  <div className="flex flex-col gap-1 pt-2 px-1 min-h-[140px]">
                    {dayTasks.map((task) => (
                      <AgendaTaskCard
                        key={task.id}
                        task={task}
                        onComplete={complete}
                        onEdit={() => setEditTask(task)}
                        isPast={isPast}
                      />
                    ))}
                    {dayTasks.length === 0 && !isPast && !isWeekend && (
                      <div className="flex-1 border border-dashed border-gray-100 rounded-lg" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {tasksWithDeadline.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 mt-4">
            <p className="font-display text-lg font-semibold text-gray-900 mb-1">Geen taken met deadline</p>
            <p className="text-sm text-gray-400">Voeg een deadline toe bij het aanmaken van een taak om hem hier te zien.</p>
          </motion.div>
        )}
      </div>

      <TaskEditModal
        task={editTask}
        onClose={() => setEditTask(null)}
        onSave={async (id, data) => { await update(id, data); setEditTask(null); }}
      />
    </>
  );
}

// --- Taakkaart ---

function AgendaTaskCard({ task, onComplete, onEdit, isPast = false, isLate = false }: {
  task: Task; onComplete: (task: Task) => void; onEdit: () => void;
  isPast?: boolean; isLate?: boolean;
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
        "group relative cursor-pointer rounded-lg border-l-2 px-1.5 py-1 transition-all hover:shadow-sm",
        isDone ? "border-l-green-400 bg-green-50 opacity-60" :
        isLate ? "border-l-red-500 bg-red-50" :
        priorityColor[task.priority],
      ].join(" ")}
    >
      <button
        onClick={(e) => { e.stopPropagation(); if (!isDone) onComplete(task); }}
        className="absolute top-1 right-1 w-3 h-3 rounded-full border opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all border-gray-300 hover:border-orange"
      >
        {isDone && <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
      </button>
      <p className={["text-[10px] font-semibold leading-tight pr-3 break-words", isDone ? "line-through text-gray-400" : "text-gray-800"].join(" ")}>
        {task.title}
      </p>
      {task.deadline_has_time && task.deadline && (
        <p className="text-[9px] text-gray-400 mt-0.5">
          {new Date(task.deadline).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
        </p>
      )}
    </motion.div>
  );
}
