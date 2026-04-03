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
import { createTask, updateTask } from "@/lib/supabase/tasks";
import type { Category, Priority, Task, TaskStatus } from "@/types/database";

type View = "lijst" | "bord";
type SubTab = "taken" | "vlaggetjes";

type StatusFilter = "all" | TaskStatus;
type PriorityFilter = "all" | Priority;

const statusLabels: Partial<Record<StatusFilter, string>> = {
  all: "Alles",
  todo: "Te doen",
  done: "Afgerond",
  late: "Te laat",
};

const priorityLabels: Record<PriorityFilter, string> = {
  all: "Alle prioriteiten",
  urgent: "Urgent",
  high: "Hoog",
  medium: "Normaal",
  low: "Laag",
};

type Props = { category?: Category; title: string; showOutlookTab?: boolean };

export function TasksClient({ category, title, showOutlookTab = false }: Props) {
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
      // AI parse op de achtergrond
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

  // Outlook-geflagde mails zijn taken met tag "outlook"
  const isOutlook = (t: Task) => t.tags?.includes("outlook");

  // Alle actieve taken voor deze categorie (inclusief outlook — voor Kanban)
  const allActiveTasks = tasks.filter((t) => {
    if (t.archived_at !== null) return false;
    if (category) return t.category === category || t.category === null;
    return true;
  });

  // Lijstweergave Taken-tab: outlook-taken weggefilterd (eigen Vlaggetjes-tab)
  const activeTasks = showOutlookTab
    ? allActiveTasks.filter((t) => !isOutlook(t))
    : allActiveTasks;

  // Outlook taken (voor vlaggetjes-tab)
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

  // Sortering: late eerst, dan urgent→low, dan created_at desc
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

  return (
    <>
      <div className={view === "bord" ? "px-4 md:px-6 py-6 md:py-10" : "max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-10"}>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold text-gray-900">{title}</h1>
            <p className="text-sm text-gray-400 mt-1">
              {isLoading ? "Laden..." : `${activeTasks.length} ${activeTasks.length === 1 ? "taak" : "taken"}`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* View toggle */}
            <div className="flex items-center gap-0.5 bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setView("lijst")}
                title="Lijstweergave"
                className={["p-2 rounded-lg transition-all", view === "lijst" ? "bg-white shadow-sm text-gray-900" : "text-gray-400 hover:text-gray-600"].join(" ")}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
              <button
                onClick={() => setView("bord")}
                title="Bordweergave"
                className={["p-2 rounded-lg transition-all", view === "bord" ? "bg-white shadow-sm text-gray-900" : "text-gray-400 hover:text-gray-600"].join(" ")}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
              </button>
            </div>

            <button
              onClick={openCaptureWithCategory}
              className="w-11 h-11 rounded-xl bg-orange text-white flex items-center justify-center hover:bg-orange-dark transition-colors active:scale-95"
              title="Nieuwe taak (C)"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Sub-tabs (alleen op Werk-pagina) */}
        {showOutlookTab && (
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 mb-6 self-start w-fit">
            <button
              onClick={() => setSubTab("taken")}
              className={[
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all",
                subTab === "taken" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700",
              ].join(" ")}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Taken
            </button>
            <button
              onClick={() => setSubTab("vlaggetjes")}
              className={[
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all",
                subTab === "vlaggetjes" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700",
              ].join(" ")}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Vlaggetjes
              {outlookTasks.filter(t => t.status !== "done").length > 0 && (
                <span className="bg-blue-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {outlookTasks.filter(t => t.status !== "done").length}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Vlaggetjes-tab inhoud */}
        {showOutlookTab && subTab === "vlaggetjes" && (
          <div className="space-y-1.5">
            {outlookTasks.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="font-display text-lg font-semibold text-gray-900 mb-1">Geen vlaggetjes</p>
                <p className="text-sm text-gray-400">Vlaggetje op een mail in Outlook? Die verschijnt hier automatisch.</p>
              </motion.div>
            ) : (
              <AnimatePresence>
                {outlookTasks.map((task) => (
                  <OutlookRow
                    key={task.id}
                    task={task}
                    onComplete={complete}
                    onEdit={() => setEditTask(task)}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>
        )}

        {/* Reguliere taken — verborgen als vlaggetjes-tab actief is */}
        {(!showOutlookTab || subTab === "taken") && (
        <>

        {/* Bord weergave */}
        {view === "bord" && (
          <KanbanBoard
            tasks={allActiveTasks}
            onEdit={(task) => setEditTask(task)}
            onUpdate={update}
          />
        )}

        {view === "lijst" && (<>

        {/* Quick invoer */}
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <input
              ref={quickRef}
              type="text"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleQuickAdd(); }}
              placeholder={`Nieuwe taak toevoegen${category ? ` aan ${category === "werk" ? "Werk" : "Privé"}` : ""}…`}
              className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-white border border-gray-100 text-sm text-gray-900 placeholder:text-gray-300 outline-none focus:border-orange transition-colors"
            />
            <AnimatePresence>
              {quickInput.trim() && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  onClick={handleQuickAdd}
                  disabled={quickSaving}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg bg-orange flex items-center justify-center text-white disabled:opacity-50"
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

          {/* Zoekknop */}
          <button
            onClick={() => {
              setSearchOpen((v) => !v);
              if (!searchOpen) setTimeout(() => searchRef.current?.focus(), 50);
            }}
            className={["w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0", searchOpen ? "bg-orange text-white" : "bg-white border border-gray-100 text-gray-400 hover:text-gray-600"].join(" ")}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>

        {/* Zoekbalk (uitklapbaar) */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-4"
            >
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Zoek op taaknaam of project…"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-orange text-sm text-gray-900 placeholder:text-gray-300 outline-none transition-colors"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
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
        <div className="flex flex-wrap gap-4 mb-6">
          {/* Status */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            {(Object.keys(statusLabels) as StatusFilter[]).filter((s) => s in statusLabels).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={[
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                  statusFilter === s
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700",
                ].join(" ")}
              >
                {statusLabels[s]!}
              </button>
            ))}
          </div>

          {/* Prioriteit */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            {(Object.keys(priorityLabels) as PriorityFilter[]).map((p) => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={[
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5",
                  priorityFilter === p
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700",
                ].join(" ")}
              >
                {p !== "all" && (
                  <span className={[
                    "w-2 h-2 rounded-full shrink-0",
                    p === "urgent" ? "bg-red-500" :
                    p === "high"   ? "bg-yellow-400" :
                    p === "medium" ? "bg-blue-400" :
                                     "bg-gray-300",
                  ].join(" ")} />
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
              <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (() => {
          const openTasks = sorted.filter((t) => t.status !== "done");
          const doneTasks = sorted.filter((t) => t.status === "done");
          if (openTasks.length === 0 && doneTasks.length === 0) return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
              <p className="font-display text-lg font-semibold text-gray-900 mb-1">Geen taken gevonden</p>
              <p className="text-sm text-gray-400">Pas de filters aan of voeg een nieuwe taak toe.</p>
            </motion.div>
          );
          return (
            <>
              {/* Open taken */}
              <div className="space-y-1.5">
                <AnimatePresence>
                  {openTasks.map((task) => (
                    <TaskRow key={task.id} task={task} onComplete={complete} onUncomplete={uncomplete} onArchive={archive} onEdit={() => setEditTask(task)} />
                  ))}
                </AnimatePresence>
              </div>

              {/* Afgerond sectie */}
              {doneTasks.length > 0 && (
                <div className="mt-6">
                  <button
                    onClick={() => setShowDone((v) => !v)}
                    className="flex items-center gap-2 mb-3 group"
                  >
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Afgerond — {doneTasks.length}</span>
                    {showDone ? (
                      <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    )}
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
      </>)}
      </>)}
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
