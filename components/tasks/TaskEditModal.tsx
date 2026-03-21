"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import type { Priority, Task, TaskUpdate } from "@/types/database";

type Props = {
  task: Task | null;
  onClose: () => void;
  onSave: (id: string, data: TaskUpdate) => Promise<void>;
};

const priorities: { value: Priority; label: string }[] = [
  { value: "low",    label: "Laag" },
  { value: "medium", label: "Normaal" },
  { value: "high",   label: "Hoog" },
  { value: "urgent", label: "Urgent" },
];

const priorityColors: Record<Priority, string> = {
  low:    "bg-gray-100 text-gray-500 data-[active=true]:bg-gray-200 data-[active=true]:text-gray-900",
  medium: "bg-blue-50 text-blue-600 data-[active=true]:bg-blue-100 data-[active=true]:text-blue-700",
  high:   "bg-yellow-50 text-yellow-700 data-[active=true]:bg-yellow-100 data-[active=true]:text-yellow-800",
  urgent: "bg-red-50 text-red-600 data-[active=true]:bg-red-100 data-[active=true]:text-red-700",
};

export function TaskEditModal({ task, onClose, onSave }: Props) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [project, setProject] = useState("");
  const [deadline, setDeadline] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setPriority(task.priority);
      setProject(task.project ?? "");
      // Zet deadline als locale datum string voor de date input
      setDeadline(task.deadline ? task.deadline.slice(0, 10) : "");
    }
  }, [task]);

  useEffect(() => {
    if (!task) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [task, onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!task || !title.trim()) return;
    setIsSaving(true);
    try {
      await onSave(task.id, {
        title: title.trim(),
        priority,
        project: project.trim() || null,
        deadline: deadline || null,
        deadline_has_time: false,
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {task && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          <motion.div
            key="modal"
            initial={{ opacity: 0, y: -16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg z-50"
          >
            <form
              onSubmit={handleSubmit}
              className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
            >
              {/* Header */}
              <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Taak bewerken</p>
                <button type="button" onClick={onClose} className="text-gray-300 hover:text-gray-500 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Titel */}
              <div className="px-5 pb-3">
                <input
                  autoFocus
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Taaknaam"
                  className="w-full text-lg font-semibold text-gray-900 placeholder:text-gray-300 outline-none bg-transparent"
                />
              </div>

              <div className="h-px bg-gray-100 mx-5" />

              {/* Deadline */}
              <div className="px-5 py-3 flex items-center gap-3">
                <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="flex-1 text-sm text-gray-700 outline-none bg-transparent"
                />
              </div>

              {/* Project */}
              <div className="px-5 pb-3 flex items-center gap-3">
                <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <input
                  type="text"
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                  placeholder="Project (optioneel)"
                  className="flex-1 text-sm text-gray-700 placeholder:text-gray-300 outline-none bg-transparent"
                />
              </div>

              <div className="h-px bg-gray-100 mx-5" />

              {/* Prioriteit + submit */}
              <div className="px-5 py-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  {priorities.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      data-active={priority === p.value}
                      onClick={() => setPriority(p.value)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${priorityColors[p.value]}`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button type="button" variant="ghost" size="sm" onClick={onClose}>Annuleer</Button>
                  <Button type="submit" variant="primary" size="sm" loading={isSaving} disabled={!title.trim()}>
                    Opslaan
                  </Button>
                </div>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
