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

const DAY_NAMES = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

const priorityDotColor: Record<Task["priority"], string> = {
  urgent: "#E5484D",
  high: "#FF7A45",
  medium: "#6B9BF5",
  low: "#C7C0B8",
};

// Conic-gradient donut ring for completion rate
function CompletionRing({ rate, size = 80 }: { rate: number | null; size?: number }) {
  const pct = rate ?? 0;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct / 100);

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <defs>
          <linearGradient id="review-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FF7A45" />
            <stop offset="60%" stopColor="#FF5A1F" />
            <stop offset="100%" stopColor="#FF3D8B" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(0,0,0,0.06)" strokeWidth={stroke} fill="none" />
        {pct > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={pct >= 80 ? "#1F9D55" : "url(#review-ring)"}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={c}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        )}
      </svg>
      <div style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <span style={{ fontSize: 18, fontWeight: 800, color: pct >= 80 ? "#1F9D55" : "#FF5A1F", letterSpacing: "-.04em", lineHeight: 1 }}>
          {rate !== null ? `${rate}%` : "–"}
        </span>
        <span style={{ fontSize: 9, color: "#9A8F84", letterSpacing: ".02em", fontWeight: 600, marginTop: 2 }}>KLAAR</span>
      </div>
    </div>
  );
}

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

  function completedOnDay(day: Date): Task[] {
    return tasks.filter((t) => {
      if (t.status !== "done") return false;
      const ts = t.completed_at ?? t.updated_at;
      const d = new Date(ts);
      return isSameDay(d, day);
    });
  }

  function deadlineOnDay(day: Date): Task[] {
    return tasks.filter((t) => {
      if (!t.deadline || t.archived_at) return false;
      return isSameDay(new Date(t.deadline), day);
    });
  }

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

  const completionRate =
    allDeadlineThisWeek.length > 0
      ? Math.round((completedThisWeek.length / allDeadlineThisWeek.length) * 100)
      : null;

  const glassCard = {
    background: "rgba(255,253,250,0.75)",
    backdropFilter: "blur(8px) saturate(120%)",
    WebkitBackdropFilter: "blur(8px) saturate(120%)",
    border: "0.5px solid rgba(255,255,255,0.65)",
    boxShadow: "0 1px 0 rgba(255,255,255,.7) inset, 0 4px 16px -4px rgba(60,40,30,.08)",
  };

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold" style={{ color: "#1A1410", letterSpacing: "-.03em" }}>Weekoverzicht</h1>
          <p className="text-sm mt-1" style={{ color: "#9A8F84" }}>{formatWeekRange(weekStart)}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {!isCurrentWeek && (
            <button
              onClick={() => setWeekOffset(0)}
              className="px-3 py-2 rounded-xl text-sm font-medium transition-colors"
              style={{ color: "#6B6157" }}
            >
              Deze week
            </button>
          )}
          {([-1, 1] as const).map((dir) => (
            <button
              key={dir}
              onClick={() => setWeekOffset((w) => w + dir)}
              disabled={dir === 1 && isCurrentWeek}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
              style={{
                ...glassCard,
                color: "#6B6157",
              }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d={dir === -1 ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"} />
              </svg>
            </button>
          ))}
        </div>
      </div>

      {/* Stats hero */}
      <div
        className="rounded-2xl p-5 mb-6 flex items-center gap-5"
        style={glassCard}
      >
        <CompletionRing rate={completionRate} size={80} />
        <div className="flex-1 grid grid-cols-2 gap-3">
          <MiniStat label="Afgerond" value={completedThisWeek.length} color="#1F9D55" />
          <MiniStat label="Met deadline" value={allDeadlineThisWeek.length} color="#6B9BF5" />
          <MiniStat
            label="Completiegraad"
            value={completionRate !== null ? `${completionRate}%` : "–"}
            color={completionRate !== null && completionRate >= 80 ? "#1F9D55" : "#FF5A1F"}
            sub={completionRate === null ? "geen deadlines" : completionRate >= 80 ? "uitstekend 🔥" : completionRate >= 50 ? "goed bezig" : "ruimte voor groei"}
          />
          <MiniStat
            label="Niet afgerond"
            value={allDeadlineThisWeek.filter(t => t.status !== "done").length}
            color="#E5484D"
          />
        </div>
      </div>

      {/* Per dag */}
      <div className="space-y-3">
        {weekDays.map((day, i) => {
          const isToday = isSameDay(day, today);
          const isPast = day < today && !isToday;
          const isFuture = day > today;
          const deadlines = deadlineOnDay(day);
          const completed = completedOnDay(day);
          const hasContent = deadlines.length > 0 || completed.length > 0;
          const doneCount = deadlines.filter(t => t.status === "done").length;

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-2xl p-4 transition-all"
              style={{
                ...glassCard,
                background: isToday
                  ? "linear-gradient(135deg, rgba(255,235,225,.85) 0%, rgba(255,228,240,.8) 100%)"
                  : glassCard.background,
                border: isToday ? "0.5px solid rgba(255,180,150,.35)" : glassCard.border,
                opacity: isFuture && !hasContent ? 0.45 : 1,
              }}
            >
              {/* Dag header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-bold uppercase tracking-widest"
                    style={{ color: isToday ? "#FF5A1F" : isPast ? "#9A8F84" : "#6B6157" }}
                  >
                    {DAY_NAMES[i]}
                  </span>
                  <span
                    className="font-display text-lg font-bold"
                    style={{ color: isToday ? "#FF5A1F" : isPast ? "#9A8F84" : "#1A1410" }}
                  >
                    {day.getDate()} {day.toLocaleDateString("nl-NL", { month: "short" })}
                  </span>
                  {isToday && (
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                      style={{ background: "linear-gradient(135deg, #FF7A45, #FF3D8B)" }}
                    >
                      Vandaag
                    </span>
                  )}
                </div>
                {deadlines.length > 0 && (
                  <span className="text-xs font-medium" style={{ color: doneCount === deadlines.length ? "#1F9D55" : "#9A8F84" }}>
                    {doneCount}/{deadlines.length} afgerond
                  </span>
                )}
              </div>

              {/* Inhoud */}
              {!hasContent ? (
                <p className="text-sm italic" style={{ color: "#C7C0B8" }}>Geen taken</p>
              ) : (
                <div className="space-y-1.5">
                  {deadlines.map((task) => (
                    <ReviewTaskRow key={task.id} task={task} />
                  ))}
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

function MiniStat({ label, value, color, sub }: { label: string; value: number | string; color: string; sub?: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: "#9A8F84" }}>{label}</p>
      <p className="font-display text-2xl font-bold leading-none" style={{ color, letterSpacing: "-.04em" }}>{value}</p>
      {sub && <p className="text-[10px] mt-0.5" style={{ color: "#9A8F84" }}>{sub}</p>}
    </div>
  );
}

function ReviewTaskRow({ task, extraLabel }: { task: Task; extraLabel?: string }) {
  const isDone = task.status === "done";
  const isLate = task.status === "late";

  return (
    <div
      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm"
      style={{
        background: isDone
          ? "rgba(31,157,85,0.07)"
          : isLate
          ? "rgba(229,72,77,0.07)"
          : "rgba(255,255,255,0.5)",
        border: `0.5px solid ${isDone ? "rgba(31,157,85,0.2)" : isLate ? "rgba(229,72,77,0.2)" : "rgba(255,255,255,0.6)"}`,
      }}
    >
      {/* Status icoon */}
      <span
        className="shrink-0 flex items-center justify-center"
        style={{
          width: 16,
          height: 16,
          borderRadius: "50%",
          border: `2px solid ${isDone ? "#1F9D55" : isLate ? "#E5484D" : "#C7C0B8"}`,
          background: isDone ? "#1F9D55" : "transparent",
        }}
      >
        {isDone && (
          <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3.5 12.5l5 5L21 5" />
          </svg>
        )}
      </span>

      {/* Prioriteit dot */}
      <span className="shrink-0 rounded-full" style={{ width: 5, height: 5, background: priorityDotColor[task.priority] }} />

      {/* Titel */}
      <p
        className="flex-1 font-medium truncate"
        style={{
          color: isDone ? "#9A8F84" : isLate ? "#E5484D" : "#1A1410",
          textDecoration: isDone ? "line-through" : "none",
          fontSize: 13,
        }}
      >
        {task.title}
      </p>

      {task.project && (
        <span className="text-xs shrink-0" style={{ color: "#9A8F84" }}>{task.project}</span>
      )}

      {extraLabel && (
        <span className="text-xs italic shrink-0" style={{ color: "#C7C0B8" }}>{extraLabel}</span>
      )}

      <span
        className="text-xs font-semibold shrink-0"
        style={{ color: isDone ? "#1F9D55" : isLate ? "#E5484D" : "#9A8F84" }}
      >
        {isDone ? "✓" : isLate ? "Te laat" : "Open"}
      </span>
    </div>
  );
}
