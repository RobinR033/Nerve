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
  const { activeTasks, lateTasks, doneTasks, isLoading, complete, uncomplete, archive, update } = useTasks();
  const openCapture = useCaptureStore((s) => s.openCapture);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [showDone, setShowDone] = useState(true);

  // Focus = top 5 op prioriteit (urgent → low)
  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
  const focusTasks = [...activeTasks]
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
    .slice(0, 5);

  const totalActive = activeTasks.length + lateTasks.length;

  return (
    <>
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-10 space-y-8 md:space-y-10">

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
                  onUncomplete={uncomplete}
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
            <button
              onClick={() => setShowDone((v) => !v)}
              className="ml-1 text-gray-300 hover:text-gray-500 transition-colors"
              title={showDone ? "Verbergen" : "Tonen"}
            >
              {showDone ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              )}
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
                className="overflow-hidden"
              >
                <div className="space-y-2">
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
                </div>
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
