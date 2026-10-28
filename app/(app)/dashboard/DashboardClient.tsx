"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTasks } from "@/hooks/useTasks";
import type { Task } from "@/types/database";
import { TaskCard } from "@/components/tasks/TaskCard";
import { useCaptureStore } from "@/stores/captureStore";
import { useCategoryStore } from "@/stores/categoryStore";
import { TaskEditModal } from "@/components/tasks/TaskEditModal";
import { MeetingInbox } from "@/components/meetings/MeetingInbox";

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

type SortMode = "priority" | "deadline";
const SORT_KEY = "nerve.dashboard.sort";

const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };

// Vroegste deadline eerst; zonder deadline achteraan, daarbinnen op prioriteit
function byDeadline(a: Task, b: Task): number {
  if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline) || priorityOrder[a.priority] - priorityOrder[b.priority];
  if (a.deadline) return -1;
  if (b.deadline) return 1;
  return priorityOrder[a.priority] - priorityOrder[b.priority];
}

function SortToggle({ value, onChange }: { value: SortMode; onChange: (v: SortMode) => void }) {
  return (
    <div className="flex items-center rounded-full p-0.5" style={{ background: "rgba(0,0,0,0.05)" }}>
      {(["priority", "deadline"] as const).map((mode) => (
        <button
          key={mode}
          onClick={() => onChange(mode)}
          className="px-2.5 h-6 rounded-full text-[11px] font-semibold transition-all"
          style={
            value === mode
              ? { background: "#fff", color: "#1A1410", boxShadow: "0 1px 3px rgba(60,40,30,.15)" }
              : { color: "#9A8F84" }
          }
        >
          {mode === "priority" ? "Prioriteit" : "Deadline"}
        </button>
      ))}
    </div>
  );
}

type Props = { firstName: string };

export function DashboardClient({ firstName }: Props) {
  const { activeTasks, lateTasks, doneTasks, isLoading, complete, uncomplete, archive, update, toggleFocus } = useTasks();
  const activeCategory = useCategoryStore((s) => s.activeCategory);

  useEffect(() => {
    fetch("/api/integrations/apple/sync", { method: "POST" }).catch(() => {});
  }, []);

  const openCapture = useCaptureStore((s) => s.openCapture);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("priority");

  // Gekozen sortering onthouden (per apparaat)
  useEffect(() => {
    try {
      if (localStorage.getItem(SORT_KEY) === "deadline") setSortMode("deadline");
    } catch {}
  }, []);
  function changeSort(mode: SortMode) {
    setSortMode(mode);
    try {
      localStorage.setItem(SORT_KEY, mode);
    } catch {}
  }

  // Categorie-filter: taken die actief in de huidige category zitten, of geen voorkeur hebben
  const inCategory = (t: Task) =>
    t.category === activeCategory || t.category === null;
  const isFlag = (t: Task) => t.tags?.includes("outlook") ?? false;

  const isWaiting = (t: Task) => Boolean(t.waiting_for);
  const isFocus = (t: Task) => Boolean(t.focused_at);

  // Focus gaat overal voor: die taken staan alleen bovenaan, niet nog eens in de andere lijsten
  const activeInCat = activeTasks.filter(inCategory).filter((t) => !isFocus(t));
  const lateInCat = lateTasks.filter(inCategory).filter((t) => !isFocus(t));
  const doneInCat = doneTasks.filter(inCategory);

  // Focus — zelf gekozen voor vandaag (en blijft staan tot afgerond of uitgezet)
  const focusTasks = [...activeTasks, ...lateTasks].filter(inCategory).filter(isFocus).sort(byDeadline);

  // Te laat — eigen acties; naja's staan in hun eigen lijst verderop
  const lateOwn = lateInCat.filter((t) => !isWaiting(t)).sort(byDeadline);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // Open-lijst: alle actieve taken behalve vlaggetjes en naja's
  const openTasks = activeInCat.filter((t) => !isFlag(t) && !isWaiting(t)).sort((a, b) => {
    if (sortMode === "deadline") return byDeadline(a, b);
    const aDdl = a.deadline && new Date(a.deadline) <= todayEnd;
    const bDdl = b.deadline && new Date(b.deadline) <= todayEnd;
    if (aDdl && !bDdl) return -1;
    if (bDdl && !aDdl) return 1;
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  // Vlaggetjes — Outlook-vlaggetjes als aparte sectie
  const flagTasks = activeInCat.filter(isFlag);

  // Naja's — acties die bij iemand anders liggen (ook als ze te laat zijn), per persoon;
  // te late bovenaan binnen de persoon
  const waitingByPerson = new Map<string, Task[]>();
  const waitingAll = [...lateInCat, ...activeInCat].filter(isWaiting).sort((a, b) => {
    const aLate = a.status === "late";
    const bLate = b.status === "late";
    if (aLate !== bLate) return aLate ? -1 : 1;
    return a.created_at.localeCompare(b.created_at);
  });
  for (const t of waitingAll) {
    const key = t.waiting_for!;
    waitingByPerson.set(key, [...(waitingByPerson.get(key) ?? []), t]);
  }
  const waitingCount = waitingAll.length;
  const waitingLateCount = waitingAll.filter((t) => t.status === "late").length;

  const cardProps = (task: Task) => ({
    task,
    onComplete: complete,
    onUncomplete: uncomplete,
    onArchive: archive,
    onEdit: () => setEditTask(task),
    onToggleFocus: toggleFocus,
  });

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

        {/* Focus — wat je zelf hebt gekozen om op te pakken */}
        {focusTasks.length > 0 ? (
          <section>
            <SectionLabel color="#FF5A1F" count={focusTasks.length}>
              Focus
            </SectionLabel>
            <div className="space-y-2">
              <AnimatePresence>
                {focusTasks.map((task) => (
                  <TaskCard key={task.id} {...cardProps(task)} />
                ))}
              </AnimatePresence>
            </div>
          </section>
        ) : (
          !isLoading && openTasks.length + lateOwn.length > 0 && (
            <p className="text-[12.5px] px-1" style={{ color: "#9A8F84" }}>
              Kies wat je wilt oppakken: tik op <span style={{ color: "#FF5A1F" }}>◎</span> bij een actie om hem in focus te zetten.
            </p>
          )
        )}

        {/* Uit overleggen — suggesties beoordelen (alleen in werk-modus) */}
        {activeCategory === "werk" && (
          <MeetingInbox
            label={(count, accessory) => (
              <SectionLabel color="#7C3AED" count={count} accessory={accessory}>
                Uit overleggen
              </SectionLabel>
            )}
          />
        )}

        {/* Te laat sectie — zonder naja's (die staan verderop) */}
        {lateOwn.length > 0 && (
          <section>
            <SectionLabel color="#E5484D" count={lateOwn.length}>
              Te laat
            </SectionLabel>
            <div className="space-y-2">
              <AnimatePresence>
                {lateOwn.map((task) => (
                  <TaskCard key={task.id} {...cardProps(task)} />
                ))}
              </AnimatePresence>
            </div>
          </section>
        )}

        {/* Open taken */}
        <section>
          <SectionLabel
            color="#FF5A1F"
            count={openTasks.length}
            accessory={openTasks.length > 1 && <SortToggle value={sortMode} onChange={changeSort} />}
          >
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
                  <TaskCard key={task.id} {...cardProps(task)} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>

        {/* Naja's — acties bij anderen, per persoon (ook de te late) */}
        {waitingCount > 0 && (
          <section>
            <SectionLabel
              color="#2E6BFF"
              count={waitingCount}
              accessory={
                waitingLateCount > 0 && (
                  <span className="text-[11px] font-semibold" style={{ color: "#E5484D" }}>
                    {waitingLateCount} te laat
                  </span>
                )
              }
            >
              Naja&apos;s
            </SectionLabel>
            <div className="space-y-3">
              {[...waitingByPerson.entries()].map(([person, tasks]) => (
                <div key={person}>
                  <p className="text-[12px] font-semibold mb-1.5 pl-1" style={{ color: "#2E6BFF" }}>{person}</p>
                  <div className="space-y-2">
                    <AnimatePresence>
                      {tasks.map((task) => (
                        <TaskCard key={task.id} {...cardProps(task)} />
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Vlaggetjes (Outlook) — aparte sectie onder de Open-lijst */}
        {flagTasks.length > 0 && (
          <section>
            <SectionLabel color="#6B9BF5" count={flagTasks.length}>
              Vlaggetjes
            </SectionLabel>
            <div className="space-y-2">
              <AnimatePresence>
                {flagTasks.map((task) => (
                  <TaskCard key={task.id} {...cardProps(task)} />
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
