"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTasks } from "@/hooks/useTasks";
import type { Task } from "@/types/database";
import { TaskCard } from "@/components/tasks/TaskCard";
import { useCaptureStore } from "@/stores/captureStore";
import { AiFocusSection } from "@/components/ai/AiFocusSection";
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

type Props = { firstName: string };

export function DashboardClient({ firstName }: Props) {
  const { activeTasks, lateTasks, doneTasks, isLoading, complete, archive, update } = useTasks();
  const openCapture = useCaptureStore((s) => s.openCapture);
  const [editTask, setEditTask] = useState<Task | null>(null);

  // Focus = top 5 op prioriteit (urgent → low)
  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
  const focusTasks = [...activeTasks]
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
    .slice(0, 5);

  const totalActive = activeTasks.length + lateTasks.length;

  return (
    <>
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-10">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400 capitalize mb-1">{formatDate()}</p>
          <h1 className="font-display text-3xl font-bold text-gray-900">
            {getGreeting()}, {firstName} 👋
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            {isLoading
              ? "Taken laden..."
              : totalActive === 0
              ? "Geen openstaande taken. Geniet ervan!"
              : `${totalActive} ${totalActive === 1 ? "taak" : "taken"} open`}
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

      {/* AI Focus */}
      <AiFocusSection onComplete={complete} />

      {/* Te laat sectie */}
      {lateTasks.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <h2 className="text-sm font-semibold text-red-500 uppercase tracking-widest">
              Te laat — {lateTasks.length}
            </h2>
          </div>
          <div className="space-y-2">
            <AnimatePresence>
              {lateTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onComplete={complete}
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
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange" />
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-widest">
              Focus vandaag
            </h2>
          </div>
          {activeTasks.length > 5 && (
            <span className="text-xs text-gray-400">top 5 van {activeTasks.length}</span>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
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
                  onArchive={archive}
                  onEdit={() => setEditTask(task)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* Vandaag afgerond */}
      {doneTasks.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">
              Afgerond — {doneTasks.length}
            </h2>
          </div>
          <div className="space-y-2">
            <AnimatePresence>
              {doneTasks.slice(0, 3).map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onComplete={complete}
                  onEdit={() => setEditTask(task)}
                />
              ))}
            </AnimatePresence>
          </div>
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
      className="text-center py-16"
    >
      <div className="w-14 h-14 bg-orange-soft rounded-2xl flex items-center justify-center mx-auto mb-4">
        <svg className="w-7 h-7 text-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </div>
      <p className="font-display text-lg font-semibold text-gray-900 mb-1">Geen taken</p>
      <p className="text-sm text-gray-400">Voeg je eerste taak toe om te beginnen.</p>
    </motion.div>
  );
}
