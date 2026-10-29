"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTasks } from "@/hooks/useTasks";
import { personMatches } from "@/lib/utils/folderSuggestion";
import { TaskRow } from "@/components/tasks/TaskRow";
import { TaskEditModal } from "@/components/tasks/TaskEditModal";
import type { Task } from "@/types/database";

/**
 * Balk boven een persoonsmap (desktop): welke naja's er bij deze persoon nog openstaan,
 * uit alle overleggen. Standaard ingeklapt tot een regel; te late tellen apart.
 */
export function PersonNajaBar({ person }: { person: string }) {
  const { tasks, complete, uncomplete, archive, update, toggleFocus } = useTasks();
  const [open, setOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);

  const najas = tasks
    .filter(
      (t) =>
        t.parent_id === null &&
        t.archived_at === null &&
        t.status !== "done" &&
        t.waiting_for &&
        personMatches(person, t.waiting_for),
    )
    .sort((a, b) => {
      const aLate = a.status === "late";
      const bLate = b.status === "late";
      if (aLate !== bLate) return aLate ? -1 : 1;
      if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return a.created_at.localeCompare(b.created_at);
    });
  const lateCount = najas.filter((t) => t.status === "late").length;

  return (
    <div className="mb-5 rounded-2xl" style={{ background: "rgba(46,107,255,0.06)", border: "0.5px solid rgba(46,107,255,0.15)" }}>
      <button
        onClick={() => najas.length > 0 && setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left"
        style={{ cursor: najas.length > 0 ? "pointer" : "default" }}
        aria-expanded={open}
      >
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#2E6BFF", boxShadow: "0 0 10px #2E6BFF88", flexShrink: 0 }} />
        <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#2E6BFF" }}>
          Naja&apos;s bij {person}
          {najas.length > 0 && ` — ${najas.length}`}
        </span>
        {lateCount > 0 && (
          <span className="text-[11px] font-semibold" style={{ color: "#E5484D" }}>{lateCount} te laat</span>
        )}
        {najas.length === 0 ? (
          <span className="text-[12px] ml-auto" style={{ color: "#8AA4E0" }}>Niets open</span>
        ) : (
          <>
            {!open && (
              <span className="text-[12.5px] truncate flex-1 min-w-0 ml-1" style={{ color: "#4A5D8F" }}>
                {najas.slice(0, 2).map((t) => t.title).join(" · ")}
                {najas.length > 2 && ` · +${najas.length - 2}`}
              </span>
            )}
            <svg
              className={`w-3.5 h-3.5 ml-auto shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
              style={{ color: "#8AA4E0" }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>

      <AnimatePresence initial={false}>
        {open && najas.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-1.5">
              <AnimatePresence initial={false}>
                {najas.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onComplete={complete}
                    onUncomplete={uncomplete}
                    onArchive={archive}
                    onEdit={() => setEditTask(task)}
                    onToggleFocus={toggleFocus}
                  />
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <TaskEditModal
        task={editTask}
        onClose={() => setEditTask(null)}
        onSave={async (id, data) => {
          await update(id, data);
          setEditTask(null);
        }}
      />
    </div>
  );
}
