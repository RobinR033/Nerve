"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTasks } from "@/hooks/useTasks";
import { useCaptureStore } from "@/stores/captureStore";
import { TaskRow } from "@/components/tasks/TaskRow";
import { TaskEditModal } from "@/components/tasks/TaskEditModal";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import type { Category, Priority, Task, TaskStatus } from "@/types/database";

type View = "lijst" | "bord";

type StatusFilter = "all" | TaskStatus;
type PriorityFilter = "all" | Priority;

const statusLabels: Record<StatusFilter, string> = {
  all: "Alles",
  todo: "Te doen",
  in_progress: "Bezig",
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

type Props = { category?: Category; title: string };

export function TasksClient({ category, title }: Props) {
  const { tasks, isLoading, complete, archive, update } = useTasks();
  const openCapture = useCaptureStore((s) => s.openCapture);

  const [view, setView] = useState<View>("lijst");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [editTask, setEditTask] = useState<Task | null>(null);

  // Filter op categorie: geen categorie = alle taken zonder filter tonen
  const activeTasks = tasks.filter((t) => {
    if (t.archived_at !== null) return false;
    if (category) return t.category === category || t.category === null;
    return true;
  });

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
        <div className="flex items-center justify-between mb-8">
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

        {/* Bord weergave */}
        {view === "bord" && (
          <KanbanBoard
            tasks={activeTasks}
            onEdit={(task) => setEditTask(task)}
            onUpdate={update}
          />
        )}

        {view === "lijst" && (<>

        {/* Zoekbalk */}
        <div className="relative mb-4">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Zoek op taaknaam of project…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-gray-100 text-sm text-gray-900 placeholder:text-gray-300 outline-none focus:border-orange transition-colors"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          {/* Status */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            {(Object.keys(statusLabels) as StatusFilter[]).map((s) => (
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
                {statusLabels[s]}
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
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                  priorityFilter === p
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700",
                ].join(" ")}
              >
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
        ) : sorted.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <p className="font-display text-lg font-semibold text-gray-900 mb-1">Geen taken gevonden</p>
            <p className="text-sm text-gray-400">Pas de filters aan of voeg een nieuwe taak toe.</p>
          </motion.div>
        ) : (
          <div className="space-y-1.5">
            <AnimatePresence>
              {sorted.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onComplete={complete}
                  onArchive={archive}
                  onEdit={() => setEditTask(task)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </>) }
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
