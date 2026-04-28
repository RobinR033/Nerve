"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTasks } from "@/hooks/useTasks";
import type { Task } from "@/types/database";
import { TaskCard } from "@/components/tasks/TaskCard";
import { useCaptureStore } from "@/stores/captureStore";
import { InsightsSection } from "@/components/ai/InsightsSection";
import { TaskEditModal } from "@/components/tasks/TaskEditModal";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Goedemorgen";
  if (h < 18) return "Goedemiddag";
  return "Goedenavond";
}

function formatDate(): string {
  return new Date().toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

// Donut progress ring for daily focus
function DailyFocusRing({ done, total }: { done: number; total: number }) {
  const progress = total > 0 ? done / total : 0;
  const size = 72;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <defs>
          <linearGradient id="focus-ring-dash" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FF7A45" />
            <stop offset="50%" stopColor="#FF5A1F" />
            <stop offset="100%" stopColor="#FF3D8B" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,90,31,0.10)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#focus-ring-dash)"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progress)}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset .6s cubic-bezier(.3,.7,.3,1)" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontSize: 17, fontWeight: 700, color: "#1A1410", letterSpacing: "-.03em", lineHeight: 1 }}>
          {done}/{total}
        </span>
        <span style={{ fontSize: 9, fontWeight: 600, color: "#9A8F84", letterSpacing: ".06em", textTransform: "uppercase", marginTop: 2 }}>
          focus
        </span>
      </div>
    </div>
  );
}

// Stat mini-card
function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent: string;
}) {
  return (
    <div
      className="flex-1 rounded-2xl p-3"
      style={{
        background: "rgba(255,253,250,0.72)",
        backdropFilter: "blur(20px) saturate(150%)",
        WebkitBackdropFilter: "blur(20px) saturate(150%)",
        border: "0.5px solid rgba(255,255,255,0.65)",
        boxShadow: "0 1px 0 rgba(255,255,255,.7) inset, 0 4px 16px -4px rgba(60,40,30,.1)",
      }}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <div
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: accent,
            boxShadow: `0 0 8px ${accent}88`,
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 9.5, fontWeight: 700, color: accent, letterSpacing: ".08em", textTransform: "uppercase" }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 600, color: "#1A1410", letterSpacing: "-.03em", lineHeight: 1.1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: "#9A8F84", marginTop: 2 }}>{sub}</div>
      )}
    </div>
  );
}

// Section header with glowing dot
function SectionLabel({
  children,
  color = "#FF5A1F",
  count,
  accessory,
}: {
  children: React.ReactNode;
  color?: string;
  count?: number;
  accessory?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: color,
          boxShadow: `0 0 10px ${color}88`,
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", color, textTransform: "uppercase" }}>
        {children}
        {count != null && ` — ${count}`}
      </span>
      {accessory && <div style={{ marginLeft: "auto" }}>{accessory}</div>}
    </div>
  );
}

type Props = { firstName: string };

export function DashboardClient({ firstName }: Props) {
  const { activeTasks, lateTasks, doneTasks, isLoading, complete, uncomplete, archive, update } = useTasks();

  useEffect(() => {
    fetch("/api/integrations/apple/sync", { method: "POST" }).catch(() => {});
  }, []);

  const openCapture = useCaptureStore((s) => s.openCapture);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [showDone, setShowDone] = useState(true);

  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const focusTasks = [...activeTasks]
    .filter((t) => {
      if (!t.deadline) return t.priority === "urgent" || t.priority === "high";
      return new Date(t.deadline) <= todayEnd;
    })
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
    .slice(0, 5);

  const totalActive = activeTasks.length + lateTasks.length;
  const focusDone = doneTasks.length;
  const focusTotal = Math.max(focusTasks.length + focusDone, 1);

  return (
    <>
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-5">

        {/* Hero card */}
        <div
          className="rounded-2xl p-5 relative overflow-hidden"
          style={{
            background: "rgba(255,253,250,0.72)",
            backdropFilter: "blur(28px) saturate(180%)",
            WebkitBackdropFilter: "blur(28px) saturate(180%)",
            border: "0.5px solid rgba(255,255,255,0.65)",
            boxShadow: "0 1px 0 rgba(255,255,255,.7) inset, 0 8px 32px -8px rgba(60,40,30,0.14)",
          }}
        >
          {/* Decorative glow */}
          <div
            style={{
              position: "absolute",
              right: -40,
              top: -40,
              width: 200,
              height: 200,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(255,167,140,.4) 0%, transparent 65%)",
              pointerEvents: "none",
            }}
          />
          <div className="flex items-start justify-between gap-4 relative">
            <div className="flex-1 min-w-0">
              <p
                className="capitalize mb-1"
                style={{ fontSize: 13, color: "#9A8F84", fontWeight: 500 }}
              >
                {formatDate()}
              </p>
              <h1
                className="font-display"
                style={{ fontSize: 28, fontWeight: 600, color: "#1A1410", letterSpacing: "-.03em", lineHeight: 1.05, margin: "2px 0 10px" }}
              >
                {getGreeting()}, {firstName}{" "}
                <span className="float">👋</span>
              </h1>
              <div className="flex items-center gap-3 flex-wrap">
                <span style={{ fontSize: 13, color: "#6B6157" }}>
                  {isLoading ? (
                    "Taken laden…"
                  ) : (
                    <>
                      <strong style={{ color: "#1A1410", fontWeight: 600 }}>{totalActive}</strong> open
                      {lateTasks.length > 0 && (
                        <> · <strong style={{ color: "#E5484D", fontWeight: 600 }}>{lateTasks.length}</strong> te laat</>
                      )}
                      {" · "}
                      <strong style={{ color: "#1F9D55", fontWeight: 600 }}>{doneTasks.length}</strong> klaar
                    </>
                  )}
                </span>
                {/* Streak chip */}
                <div
                  className="inline-flex items-center gap-1.5 rounded-full"
                  style={{
                    background: "rgba(255,253,250,0.72)",
                    backdropFilter: "blur(16px)",
                    WebkitBackdropFilter: "blur(16px)",
                    border: "0.5px solid rgba(255,255,255,0.6)",
                    boxShadow: "0 1px 0 rgba(255,255,255,.6) inset, 0 2px 8px rgba(60,40,30,.06)",
                    padding: "4px 10px 4px 8px",
                  }}
                >
                  <span style={{ fontSize: 14, lineHeight: 1 }}>🔥</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#1A1410" }}>12</span>
                  <span style={{ fontSize: 11, color: "#9A8F84" }}>dagen</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-3">
              <DailyFocusRing done={focusDone} total={focusTotal} />
              <button
                onClick={() => openCapture()}
                className="rounded-full flex items-center justify-center active:scale-95 transition-transform"
                style={{
                  width: 40,
                  height: 40,
                  background: "linear-gradient(135deg, #FF7A45 0%, #FF5A1F 50%, #FF3D8B 110%)",
                  boxShadow: "0 1px 0 rgba(255,255,255,.4) inset, 0 6px 18px -4px rgba(255,90,31,.5)",
                }}
                title="Nieuwe taak"
              >
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Stat row */}
        <div className="flex gap-3">
          <StatCard label="Te laat" value={lateTasks.length} sub={lateTasks.length > 0 ? "verouderd" : "—"} accent="#E5484D" />
          <StatCard label="Vandaag" value={focusTasks.length} sub="in focus" accent="#FF5A1F" />
          <StatCard label="Klaar" value={doneTasks.length} sub="vandaag" accent="#1F9D55" />
        </div>

        {/* Te laat sectie */}
        {lateTasks.length > 0 && (
          <section>
            <SectionLabel color="#E5484D" count={lateTasks.length}>
              Te laat
            </SectionLabel>
            <div className="space-y-2">
              <AnimatePresence>
                {lateTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onComplete={complete}
                    onUncomplete={uncomplete}
                    onArchive={archive}
                    onEdit={() => setEditTask(task)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </section>
        )}

        {/* Focus vandaag */}
        <section>
          <SectionLabel
            color="#FF5A1F"
            count={focusTasks.length}
            accessory={
              activeTasks.length > 5 ? (
                <span style={{ fontSize: 11, color: "#9A8F84" }}>top 5 van {activeTasks.length}</span>
              ) : undefined
            }
          >
            Focus vandaag
          </SectionLabel>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-14 rounded-xl animate-pulse"
                  style={{ background: "rgba(255,255,255,0.5)" }}
                />
              ))}
            </div>
          ) : focusTasks.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {focusTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onComplete={complete}
                    onUncomplete={uncomplete}
                    onArchive={archive}
                    onEdit={() => setEditTask(task)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>

        {/* Afgerond vandaag */}
        {doneTasks.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#1F9D55", boxShadow: "0 0 8px #1F9D5588", flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", color: "#1F9D55", textTransform: "uppercase" }}>
                Afgerond — {doneTasks.length}
              </span>
              <button
                onClick={() => setShowDone((v) => !v)}
                className="ml-1 transition-colors"
                style={{ color: "#C7C0B8" }}
                title={showDone ? "Verbergen" : "Tonen"}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  {showDone ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  )}
                </svg>
              </button>
            </div>
            <AnimatePresence initial={false}>
              {showDone && (
                <motion.div
                  key="done-list"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden space-y-2"
                >
                  <AnimatePresence>
                    {doneTasks.slice(0, 3).map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onComplete={complete}
                        onUncomplete={uncomplete}
                        onEdit={() => setEditTask(task)}
                      />
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        )}

        {/* Inzichten */}
        <InsightsSection />
      </div>

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

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-center py-14"
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{ background: "rgba(255,90,31,.08)" }}
      >
        <svg className="w-7 h-7" style={{ color: "#FF5A1F" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </div>
      <p className="font-display text-lg font-semibold mb-1" style={{ color: "#1A1410" }}>Geen taken</p>
      <p className="text-sm" style={{ color: "#9A8F84" }}>Voeg je eerste taak toe om te beginnen.</p>
    </motion.div>
  );
}
