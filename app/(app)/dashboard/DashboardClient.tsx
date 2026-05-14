"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTasks } from "@/hooks/useTasks";
import type { Task } from "@/types/database";
import { TaskCard } from "@/components/tasks/TaskCard";
import { useCaptureStore } from "@/stores/captureStore";
import { useCategoryStore } from "@/stores/categoryStore";
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
  const activeCategory = useCategoryStore((s) => s.activeCategory);

  useEffect(() => {
    fetch("/api/integrations/apple/sync", { method: "POST" }).catch(() => {});
  }, []);

  const openCapture = useCaptureStore((s) => s.openCapture);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [showDone, setShowDone] = useState(false);

  // Categorie-filter: taken die actief in de huidige category zitten, of geen voorkeur hebben
  const inCategory = (t: Task) =>
    t.category === activeCategory || t.category === null;
  const isFlag = (t: Task) => t.tags?.includes("outlook") ?? false;

  const activeInCat = activeTasks.filter(inCategory);
  const lateInCat = lateTasks.filter(inCategory);
  const doneInCat = doneTasks.filter(inCategory);

  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // Open-lijst: alle actieve taken behalve vlaggetjes
  const openTasks = activeInCat.filter((t) => !isFlag(t)).sort((a, b) => {
    const aDdl = a.deadline && new Date(a.deadline) <= todayEnd;
    const bDdl = b.deadline && new Date(b.deadline) <= todayEnd;
    if (aDdl && !bDdl) return -1;
    if (bDdl && !aDdl) return 1;
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  // Vlaggetjes — Outlook-vlaggetjes als aparte sectie
  const flagTasks = activeInCat.filter(isFlag);

  return (
    <>
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-5">

        {/* Hero card */}
        <div
          className="rounded-2xl p-5 relative overflow-hidden"
          style={{
            background: "rgba(255,253,250,0.72)",
            backdropFilter: "var(--backdrop-blur)",
            WebkitBackdropFilter: "var(--backdrop-blur)",
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
                style={{ fontSize: 28, fontWeight: 600, color: "#1A1410", letterSpacing: "-.03em", lineHeight: 1.05, margin: "2px 0 0" }}
              >
                {getGreeting()}, {firstName}
              </h1>
            </div>

            <button
              onClick={() => openCapture()}
              className="shrink-0 rounded-full flex items-center justify-center active:scale-95 transition-transform"
              style={{
                width: 44,
                height: 44,
                background: "linear-gradient(135deg, #FF7A45 0%, #FF5A1F 50%, #FF3D8B 110%)",
                boxShadow: "0 1px 0 rgba(255,255,255,.4) inset, 0 6px 18px -4px rgba(255,90,31,.5)",
              }}
              title="Nieuwe taak"
              aria-label="Nieuwe taak toevoegen"
            >
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Te laat sectie */}
        {lateInCat.length > 0 && (
          <section>
            <SectionLabel color="#E5484D" count={lateInCat.length}>
              Te laat
            </SectionLabel>
            <div className="space-y-2">
              <AnimatePresence>
                {lateInCat.map((task) => (
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

        {/* Open taken */}
        <section>
          <SectionLabel color="#FF5A1F" count={openTasks.length}>
            Open
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
          ) : openTasks.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {openTasks.map((task) => (
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

        {/* Vlaggetjes (Outlook) — aparte sectie onder de Open-lijst */}
        {flagTasks.length > 0 && (
          <section>
            <SectionLabel color="#6B9BF5" count={flagTasks.length}>
              Vlaggetjes
            </SectionLabel>
            <div className="space-y-2">
              <AnimatePresence>
                {flagTasks.map((task) => (
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

        {/* Afgerond vandaag — standaard dichtgeklapt */}
        {doneInCat.length > 0 && (
          <section>
            <button
              onClick={() => setShowDone((v) => !v)}
              className="flex items-center gap-2 mb-3 transition-colors"
              title={showDone ? "Verbergen" : "Tonen"}
            >
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#1F9D55", boxShadow: "0 0 8px #1F9D5588", flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", color: "#1F9D55", textTransform: "uppercase" }}>
                Afgerond — {doneInCat.length}
              </span>
              <svg
                className={`w-3.5 h-3.5 transition-transform ${showDone ? "rotate-180" : ""}`}
                style={{ color: "#C7C0B8" }}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
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
                    {doneInCat.slice(0, 3).map((task) => (
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
