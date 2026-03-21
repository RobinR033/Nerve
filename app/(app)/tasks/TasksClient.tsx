"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTasks } from "@/hooks/useTasks";
import { useCaptureStore } from "@/stores/captureStore";
import { TaskRow } from "@/components/tasks/TaskRow";
import { TaskEditModal } from "@/components/tasks/TaskEditModal";
import type { Priority, Task, TaskStatus } from "@/types/database";

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

export function TasksClient() {
  const { tasks, isLoading, complete, archive, update } = useTasks();
  const openCapture = useCaptureStore((s) => s.openCapture);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [editTask, setEditTask] = useState<Task | null>(null);

  const activeTasks = tasks.filter((t) => t.archived_at === null);

  const filtered = activeTasks.filter((t) => {
    const statusOk = statusFilter === "all" || t.status === statusFilter;
    const priorityOk = priorityFilter === "all" || t.priority === priorityFilter;
    return statusOk && priorityOk;
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
      <div className="max-w-2xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-gray-900">Taken</h1>
            <p className="text-sm text-gray-400 mt-1">
              {isLoading ? "Laden..." : `${activeTasks.length} ${activeTasks.length === 1 ? "taak" : "taken"}`}
            </p>
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
