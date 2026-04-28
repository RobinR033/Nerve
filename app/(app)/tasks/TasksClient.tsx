"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTasks } from "@/hooks/useTasks";
import { useCaptureStore } from "@/stores/captureStore";
import { useTaskStore } from "@/stores/taskStore";
import { TaskRow } from "@/components/tasks/TaskRow";
import { TaskEditModal } from "@/components/tasks/TaskEditModal";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { OutlookRow } from "@/components/tasks/OutlookRow";
import { ProjectBoard } from "@/components/tasks/ProjectBoard";
import { createTask, updateTask } from "@/lib/supabase/tasks";
import type { Category, Priority, Task, TaskStatus } from "@/types/database";

type View = "lijst" | "bord";
type SubTab = "taken" | "vlaggetjes" | "projecten";

type StatusFilter = "all" | TaskStatus;
type PriorityFilter = "all" | Priority;

const statusLabels: Partial<Record<StatusFilter, string>> = {
  all: "Alles",
  todo: "Te doen",
  done: "Afgerond",
  late: "Te laat",
};

const priorityLabels: Record<PriorityFilter, string> = {
  all: "Alle",
  urgent: "Urgent",
  high: "Hoog",
  medium: "Normaal",
  low: "Laag",
};

const priorityDotColors: Record<Priority, string> = {
  urgent: "#E5484D",
  high: "#FF7A45",
  medium: "#6B9BF5",
  low: "#C7C0B8",
};

type Props = { category?: Category; title: string; showOutlookTab?: boolean; hideBoard?: boolean };

export function TasksClient({ category, title, showOutlookTab = false, hideBoard = false }: Props) {
  const { tasks, isLoading, complete, uncomplete, archive, update } = useTasks();
  const openCapture = useCaptureStore((s) => s.openCapture);
  const openCaptureWithCategory = () => openCapture(category ?? null);
  const addTask = useTaskStore((s) => s.addTask);
  const storeUpdateTask = useTaskStore((s) => s.updateTask);

  const [view, setView] = useState<View>("lijst");
  const [subTab, setSubTab] = useState<SubTab>("taken");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [quickInput, setQuickInput] = useState("");
  const [quickSaving, setQuickSaving] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [showDone, setShowDone] = useState(false);
  const quickRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  async function handleQuickAdd() {
    const raw = quickInput.trim();
    if (!raw || quickSaving) return;
    setQuickSaving(true);
    try {
      const task = await createTask({
        title: raw,
        description: null,
        priority: "medium",
        status: "todo",
        deadline: null,
        deadline_has_time: false,
        project: null,
        context: null,
        tags: [],
        recurrence: null,
        category: category ?? null,
        outlook_message_id: null,
        completed_at: null,
        archived_at: null,
      });
      addTask(task);
      setQuickInput("");
      parseAndUpdateQuick(task.id, raw);
    } finally {
      setQuickSaving(false);
      quickRef.current?.focus();
    }
  }

  async function parseAndUpdateQuick(taskId: string, raw: string) {
    try {
      const res = await fetch("/api/ai/parse-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw }),
      });
      if (!res.ok) return;
      const data = await res.json();
      const updates = {
        title: data.title ?? raw,
        priority: data.priority ?? "medium",
        deadline: data.deadline ?? null,
        deadline_has_time: data.deadline_has_time ?? false,
        project: data.project ?? null,
      };
      storeUpdateTask(taskId, updates);
      updateTask(taskId, updates).catch(() => {});
    } catch {}
  }

  const isOutlook = (t: Task) => t.tags?.includes("outlook");

  const allActiveTasks = tasks.filter((t) => {
    if (t.archived_at !== null) return false;
    if (category) return t.category === category || t.category === null;
    return true;
  });

  const activeTasks = showOutlookTab
    ? allActiveTasks.filter((t) => !isOutlook(t))
    : allActiveTasks;

  const outlookTasks = showOutlookTab
    ? tasks.filter((t) => t.archived_at === null && isOutlook(t))
    : [];

  const q = searchQuery.toLowerCase().trim();
  const filtered = activeTasks.filter((t) => {
    const statusOk = statusFilter === "all" || t.status === statusFilter;
    const priorityOk = priorityFilter === "all" || t.priority === priorityFilter;
    const searchOk = !q || t.title.toLowerCase().includes(q) || (t.project ?? "").toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q);
    return statusOk && priorityOk && searchOk;
  });

  const priorityOrder: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
  const sorted = [...filtered].sort((a, b) => {
    if (a.status === "late" && b.status !== "late") return -1;
    if (b.status === "late" && a.status !== "late") return 1;
    if (a.status === "done" && b.status !== "done") return 1;
    if (b.status === "done" && a.status !== "done") return -1;
    const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (pDiff !== 0) return pDiff;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const glassFilter = {
    background: "rgba(255,253,250,0.7)",
    backdropFilter: "blur(16px) saturate(140%)",
    WebkitBackdropFilter: "blur(16px) saturate(140%)",
    border: "0.5px solid rgba(255,255,255,0.6)",
    borderRadius: 12,
  };

  return (
    <>
      <div className={(view === "bord" || subTab === "projecten") ? "px-4 md:px-6 py-6 md:py-10" : "max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-10"}>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold" style={{ color: "#1A1410", letterSpacing: "-.03em" }}>{title}</h1>
            <p className="text-sm mt-1" style={{ color: "#9A8F84" }}>
              {isLoading ? "Laden…" : `${activeTasks.length} ${activeTasks.length === 1 ? "taak" : "taken"}`}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* View toggle */}
            {subTab !== "projecten" && !hideBoard && (
              <div
                className="flex items-center gap-0.5 p-1"
                style={{ ...glassFilter, borderRadius: 10, padding: "3px" }}
              >
                <button
                  onClick={() => setView("lijst")}
                  title="Lijstweergave"
                  className="p-1.5 rounded-lg transition-all"
                  style={view === "lijst"
                    ? { background: "rgba(255,255,255,0.9)", color: "#1A1410", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }
                    : { color: "#9A8F84" }
                  }
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
                <button
                  onClick={() => setView("bord")}
                  title="Bordweergave"
                  className="p-1.5 rounded-lg transition-all"
                  style={view === "bord"
                    ? { background: "rgba(255,255,255,0.9)", color: "#1A1410", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }
                    : { color: "#9A8F84" }
                  }
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                  </svg>
                </button>
              </div>
            )}

            <button
              onClick={openCaptureWithCategory}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-opacity hover:opacity-90 active:scale-95"
              style={{
                background: "linear-gradient(135deg, #FF7A45 0%, #FF5A1F 50%, #FF3D8B 110%)",
                boxShadow: "0 1px 0 rgba(255,255,255,.3) inset, 0 4px 12px -2px rgba(255,90,31,.5)",
              }}
              title="Nieuwe taak (C)"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Sub-tabs */}
        {showOutlookTab && (
          <div
            className="flex items-center gap-0.5 p-1 mb-6 self-start w-fit"
            style={glassFilter}
          >
            {(["taken", "vlaggetjes", "projecten"] as SubTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setSubTab(tab)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all capitalize"
                style={subTab === tab
                  ? { background: "rgba(255,255,255,0.9)", color: "#1A1410", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }
                  : { color: "#6B6157" }
                }
              >
                {tab === "vlaggetjes" && outlookTasks.filter(t => t.status !== "done").length > 0 && (
                  <span
                    className="text-[10px] font-bold rounded-full flex items-center justify-center"
                    style={{ width: 16, height: 16, background: "#6B9BF5", color: "#fff" }}
                  >
                    {outlookTasks.filter(t => t.status !== "done").length}
                  </span>
                )}
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        )}

        {/* Vlaggetjes-tab */}
        {showOutlookTab && subTab === "vlaggetjes" && (
          <div className="space-y-1.5">
            {outlookTasks.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: "rgba(0,0,0,0.04)" }}
                >
                  <svg className="w-6 h-6" style={{ color: "#C7C0B8" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="font-display text-lg font-semibold mb-1" style={{ color: "#1A1410" }}>Geen vlaggetjes</p>
                <p className="text-sm" style={{ color: "#9A8F84" }}>Vlaggetje op een mail in Outlook? Die verschijnt hier automatisch.</p>
              </motion.div>
            ) : (
              <AnimatePresence>
                {outlookTasks.map((task) => (
                  <OutlookRow key={task.id} task={task} onComplete={complete} onEdit={() => setEditTask(task)} />
                ))}
              </AnimatePresence>
            )}
          </div>
        )}

        {/* Projecten-tab */}
        {showOutlookTab && subTab === "projecten" && <ProjectBoard />}

        {/* Taken lijst/bord */}
        {(!showOutlookTab || subTab === "taken") && (
          <>
            {view === "bord" && (
              <KanbanBoard tasks={allActiveTasks} onEdit={(task) => setEditTask(task)} onUpdate={update} />
            )}

            {view === "lijst" && (
              <>
                {/* Quick invoer */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="relative flex-1">
                    <input
                      ref={quickRef}
                      type="text"
                      value={quickInput}
                      onChange={(e) => setQuickInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleQuickAdd(); }}
                      placeholder={`Nieuwe taak${category ? ` in ${category === "werk" ? "Werk" : "Privé"}` : ""}…`}
                      className="w-full pl-4 pr-10 py-2.5 rounded-xl text-sm outline-none transition-all"
                      style={{
                        background: "rgba(255,253,250,0.75)",
                        backdropFilter: "blur(16px)",
                        WebkitBackdropFilter: "blur(16px)",
                        border: "0.5px solid rgba(255,255,255,0.65)",
                        color: "#1A1410",
                        boxShadow: "0 1px 0 rgba(255,255,255,.7) inset",
                      }}
                    />
                    <AnimatePresence>
                      {quickInput.trim() && (
                        <motion.button
                          initial={{ opacity: 0, scale: 0.7 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.7 }}
                          onClick={handleQuickAdd}
                          disabled={quickSaving}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg flex items-center justify-center text-white disabled:opacity-50"
                          style={{ background: "linear-gradient(135deg, #FF7A45, #FF3D8B)" }}
                        >
                          {quickSaving ? (
                            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
                          ) : (
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                          )}
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>

                  <button
                    onClick={() => {
                      setSearchOpen((v) => !v);
                      if (!searchOpen) setTimeout(() => searchRef.current?.focus(), 50);
                    }}
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0"
                    style={searchOpen
                      ? { background: "linear-gradient(135deg, #FF7A45, #FF3D8B)", color: "#fff" }
                      : {
                        background: "rgba(255,253,250,0.75)",
                        backdropFilter: "blur(16px)",
                        WebkitBackdropFilter: "blur(16px)",
                        border: "0.5px solid rgba(255,255,255,0.65)",
                        color: "#9A8F84",
                      }
                    }
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                </div>

                {/* Zoekbalk */}
                <AnimatePresence>
                  {searchOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden mb-4"
                    >
                      <div className="relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#C7C0B8" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                          ref={searchRef}
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Zoek op taaknaam of project…"
                          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                          style={{
                            background: "rgba(255,253,250,0.85)",
                            border: "1px solid rgba(255,90,31,0.3)",
                            color: "#1A1410",
                          }}
                        />
                        {searchQuery && (
                          <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#C7C0B8" }}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Filters */}
                <div className="flex flex-wrap gap-2 mb-5">
                  {/* Status */}
                  <div
                    className="flex items-center gap-0.5 p-1"
                    style={{ ...glassFilter, padding: "3px" }}
                  >
                    {(Object.keys(statusLabels) as StatusFilter[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
                        style={statusFilter === s
                          ? { background: s === "late" ? "#E5484D" : "rgba(255,255,255,0.9)", color: s === "late" ? "#fff" : "#1A1410", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }
                          : { color: "#6B6157" }
                        }
                      >
                        {statusLabels[s]!}
                      </button>
                    ))}
                  </div>

                  {/* Prioriteit */}
                  <div
                    className="flex items-center gap-0.5 p-1"
                    style={{ ...glassFilter, padding: "3px" }}
                  >
                    {(Object.keys(priorityLabels) as PriorityFilter[]).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPriorityFilter(p)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1"
                        style={priorityFilter === p
                          ? { background: "rgba(255,255,255,0.9)", color: "#1A1410", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }
                          : { color: "#6B6157" }
                        }
                      >
                        {p !== "all" && (
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: priorityDotColors[p as Priority] }} />
                        )}
                        {priorityLabels[p]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Lijst */}
                {isLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: "rgba(0,0,0,0.04)" }} />
                    ))}
                  </div>
                ) : (() => {
                  const openTasks = sorted.filter((t) => t.status !== "done");
                  const doneTasks = sorted.filter((t) => t.status === "done");
                  if (openTasks.length === 0 && doneTasks.length === 0) return (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
                      <p className="font-display text-lg font-semibold mb-1" style={{ color: "#1A1410" }}>Geen taken gevonden</p>
                      <p className="text-sm" style={{ color: "#9A8F84" }}>Pas de filters aan of voeg een nieuwe taak toe.</p>
                    </motion.div>
                  );
                  return (
                    <>
                      <div className="space-y-1.5">
                        <AnimatePresence>
                          {openTasks.map((task) => (
                            <TaskRow key={task.id} task={task} onComplete={complete} onUncomplete={uncomplete} onArchive={archive} onEdit={() => setEditTask(task)} />
                          ))}
                        </AnimatePresence>
                      </div>

                      {doneTasks.length > 0 && (
                        <div className="mt-6">
                          <button
                            onClick={() => setShowDone((v) => !v)}
                            className="flex items-center gap-2 mb-3"
                          >
                            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#9A8F84" }}>
                              Afgerond — {doneTasks.length}
                            </span>
                            <svg
                              className={`w-3.5 h-3.5 transition-transform ${showDone ? "rotate-180" : ""}`}
                              style={{ color: "#C7C0B8" }}
                              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>

                          <AnimatePresence>
                            {showDone && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-1.5 overflow-hidden"
                              >
                                {doneTasks.map((task) => (
                                  <TaskRow key={task.id} task={task} onComplete={complete} onUncomplete={uncomplete} onArchive={archive} onEdit={() => setEditTask(task)} />
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </>
                  );
                })()}
              </>
            )}
          </>
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
