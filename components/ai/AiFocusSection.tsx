"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTaskStore } from "@/stores/taskStore";
import type { FocusItem } from "@/lib/ai/generateFocusList";
import type { Task } from "@/types/database";

type FocusResult = {
  intro: string;
  items: FocusItem[];
};

export function AiFocusSection({ onComplete }: { onComplete: (id: string) => void }) {
  const tasks = useTaskStore((s) => s.tasks);
  const [result, setResult] = useState<FocusResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  async function generate() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/ai/focus-list");
      if (res.ok) {
        const data = await res.json();
        setResult(data);
        setGenerated(true);
      }
    } finally {
      setIsLoading(false);
    }
  }

  // Verwijder afgeronde taken uit de AI lijst
  const focusTasks: { task: Task; reason: string }[] = (result?.items ?? [])
    .map((item) => {
      const task = tasks.find((t) => t.id === item.task_id);
      return task ? { task, reason: item.reason } : null;
    })
    .filter((x): x is { task: Task; reason: string } => x !== null && x.task.status !== "done");

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm">✦</span>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-widest">AI Focus</h2>
        </div>
        <button
          onClick={generate}
          disabled={isLoading}
          className="text-xs font-medium text-orange hover:text-orange-dark transition-colors disabled:opacity-50"
        >
          {isLoading ? "Analyseren…" : generated ? "Opnieuw" : "Genereer focuslijst"}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {!generated && !isLoading && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-white border border-dashed border-gray-200 rounded-xl px-5 py-8 text-center"
          >
            <p className="text-sm text-gray-400 mb-3">
              Laat Claude bepalen wat je vandaag als eerste moet aanpakken.
            </p>
            <button
              onClick={generate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange text-white text-sm font-semibold hover:bg-orange-dark transition-colors"
            >
              <span>✦</span>
              Genereer focuslijst
            </button>
          </motion.div>
        )}

        {isLoading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-2"
          >
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </motion.div>
        )}

        {generated && !isLoading && result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {/* Intro zin */}
            <p className="text-sm text-gray-500 italic mb-3">{result.intro}</p>

            {focusTasks.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Alle taken zijn afgerond 🎉</p>
            ) : (
              <div className="space-y-2">
                {focusTasks.map(({ task, reason }, i) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="group flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3 hover:shadow-sm hover:border-gray-200 transition-all"
                  >
                    {/* Nummer */}
                    <span className="shrink-0 w-5 h-5 rounded-full bg-orange-soft text-orange text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{reason}</p>
                    </div>

                    {/* Vinkje */}
                    <button
                      onClick={() => onComplete(task.id)}
                      className="shrink-0 w-5 h-5 rounded-full border-2 border-gray-300 hover:border-orange flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                    >
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
