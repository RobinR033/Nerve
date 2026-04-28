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

const priorityAccent: Record<Task["priority"], string> = {
  urgent: "#E5484D",
  high:   "#FF7A45",
  medium: "#6B9BF5",
  low:    "#C7C0B8",
};

const DAYS_BEFORE = 14;
const DAYS_AFTER  = 84;
const COL_W = 88;

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

  useEffect(() => {
    if (todayRef.current && scrollRef.current) {
      const containerLeft = scrollRef.current.getBoundingClientRect().left;
      const todayLeft = todayRef.current.getBoundingClientRect().left;
      scrollRef.current.scrollLeft += todayLeft - containerLeft - 16;
    }
  }, []);

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
              <h1 className="font-display text-3xl font-bold" style={{ color: "#1A1410", letterSpacing: "-.03em" }}>Agenda</h1>
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
                style={{ color: "#FF5A1F", background: "rgba(255,90,31,0.1)" }}
              >
                W{visibleWeek}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {!isOnToday && (
                <button
                  onClick={scrollToToday}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors"
                  style={{ color: "#6B6157" }}
                >
                  Vandaag
                </button>
              )}
              <button
                onClick={() => openCapture()}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white transition-opacity hover:opacity-90 active:scale-95"
                style={{
                  background: "linear-gradient(135deg, #FF7A45 0%, #FF5A1F 50%, #FF3D8B 110%)",
                  boxShadow: "0 1px 0 rgba(255,255,255,.3) inset, 0 4px 12px -2px rgba(255,90,31,.5)",
                }}
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
              className="mb-6 rounded-2xl p-4"
              style={{
                background: "linear-gradient(135deg, rgba(255,235,225,.9) 0%, rgba(247,224,238,.9) 100%)",
                backdropFilter: "blur(20px)",
                border: "0.5px solid rgba(255,180,150,.35)",
                boxShadow: "0 1px 0 rgba(255,255,255,.7) inset, 0 4px 16px -4px rgba(229,72,77,.12)",
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full" style={{ background: "#E5484D" }} />
                <p className="text-sm font-bold uppercase tracking-widest" style={{ color: "#E5484D" }}>
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

        {/* Horizontale scroll */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="-mx-4 md:mx-0 overflow-x-auto pb-4"
          style={{ touchAction: "pan-x" }}
        >
          <div className="flex gap-0 px-4 md:px-0" style={{ width: `${allDays.length * COL_W + 32}px` }}>
            {allDays.map((day, i) => {
              const isToday   = isSameDay(day, today);
              const isPast    = isBeforeDay(day, today);
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;
              const isMonStart  = day.getDate() === 1;
              const isWeekStart = day.getDay() === 1;
              const dayTasks  = tasksForDay(day);
              const weekNum   = getWeekNumber(day);

              return (
                <div
                  key={i}
                  ref={isToday ? todayRef : undefined}
                  style={{ width: COL_W, minWidth: COL_W }}
                  className="flex flex-col"
                >
                  {/* Week/maand label */}
                  <div className="h-5 flex items-center">
                    {isWeekStart && (
                      <span className="text-[10px] font-bold uppercase tracking-wider pl-2" style={{ color: "#C7C0B8" }}>
                        W{weekNum}
                      </span>
                    )}
                    {isMonStart && !isWeekStart && (
                      <span className="text-[10px] font-bold uppercase tracking-wider pl-2" style={{ color: "#C7C0B8" }}>
                        {MONTH_NAMES[day.getMonth()]}
                      </span>
                    )}
                  </div>

                  {/* Dag header */}
                  <div
                    className="text-center py-2 mx-1 border-b"
                    style={{ borderColor: isToday ? "#FF5A1F" : "rgba(0,0,0,0.06)" }}
                  >
                    <p
                      className="text-[10px] font-semibold uppercase tracking-widest"
                      style={{ color: isWeekend || isPast ? "#C7C0B8" : "#9A8F84" }}
                    >
                      {DAY_NAMES[day.getDay()]}
                    </p>
                    <p
                      className="font-display text-lg font-bold mt-0.5"
                      style={{
                        color: isToday ? "#FF5A1F" : isPast ? "#C7C0B8" : isWeekend ? "#9A8F84" : "#1A1410",
                      }}
                    >
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
                      <div
                        className="flex-1 rounded-lg"
                        style={{ border: "1px dashed rgba(0,0,0,0.06)" }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {tasksWithDeadline.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 mt-4">
            <p className="font-display text-lg font-semibold mb-1" style={{ color: "#1A1410" }}>Geen taken met deadline</p>
            <p className="text-sm" style={{ color: "#9A8F84" }}>Voeg een deadline toe bij het aanmaken van een taak om hem hier te zien.</p>
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
  const accent = isLate ? "#E5484D" : isDone ? "#1F9D55" : priorityAccent[task.priority];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      onClick={onEdit}
      className="group relative cursor-pointer rounded-lg px-1.5 py-1 transition-all"
      style={{
        background: isDone
          ? "rgba(31,157,85,0.06)"
          : isLate
          ? "rgba(229,72,77,0.07)"
          : "rgba(255,253,250,0.8)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: `0.5px solid ${isDone ? "rgba(31,157,85,0.2)" : isLate ? "rgba(229,72,77,0.2)" : "rgba(255,255,255,0.6)"}`,
        borderLeft: `2px solid ${accent}`,
        opacity: isDone ? 0.65 : 1,
        boxShadow: "0 1px 0 rgba(255,255,255,.5) inset",
      }}
    >
      <button
        onClick={(e) => { e.stopPropagation(); if (!isDone) onComplete(task); }}
        className="absolute top-1 right-1 w-3 h-3 rounded-full border opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all"
        style={{ borderColor: accent }}
      >
        {isDone && <svg className="w-2 h-2" style={{ color: accent }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
      </button>
      <p
        className="text-[10px] font-semibold leading-tight pr-3 break-words"
        style={{ color: isDone ? "#9A8F84" : "#1A1410", textDecoration: isDone ? "line-through" : "none" }}
      >
        {task.title}
      </p>
      {task.deadline_has_time && task.deadline && (
        <p className="text-[9px] mt-0.5" style={{ color: "#9A8F84" }}>
          {new Date(task.deadline).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
        </p>
      )}
    </motion.div>
  );
}
