"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createTask } from "@/lib/supabase/tasks";
import { useTaskStore } from "@/stores/taskStore";
import { Button } from "@/components/ui/Button";
import type { Priority } from "@/types/database";

type Props = {
  open: boolean;
  onClose: () => void;
};

const priorities: { value: Priority; label: string; color: string }[] = [
  { value: "low",    label: "Laag",    color: "bg-gray-100 text-gray-500 data-[active=true]:bg-gray-200 data-[active=true]:text-gray-900" },
  { value: "medium", label: "Normaal", color: "bg-blue-50 text-blue-600 data-[active=true]:bg-blue-100 data-[active=true]:text-blue-700" },
  { value: "high",   label: "Hoog",    color: "bg-yellow-50 text-yellow-700 data-[active=true]:bg-yellow-100 data-[active=true]:text-yellow-800" },
  { value: "urgent", label: "Urgent",  color: "bg-red-50 text-red-600 data-[active=true]:bg-red-100 data-[active=true]:text-red-700" },
];

export function CaptureModal({ open, onClose }: Props) {
  const addTask = useTaskStore((s) => s.addTask);
  const titleRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [deadlineText, setDeadlineText] = useState("");
  const [resolvedDeadline, setResolvedDeadline] = useState<string | null>(null);
  const [deadlineHasTime, setDeadlineHasTime] = useState(false);
  const [priority, setPriority] = useState<Priority>("medium");
  const [project, setProject] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Reset bij openen
  useEffect(() => {
    if (open) {
      setTitle("");
      setDeadlineText("");
      setResolvedDeadline(null);
      setDeadlineHasTime(false);
      setPriority("medium");
      setProject("");
      setTimeout(() => titleRef.current?.focus(), 50);
    }
  }, [open]);

  // Escape sluiten
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  async function handleDeadlineBlur() {
    if (!deadlineText.trim() || resolvedDeadline) return;
    setIsExtracting(true);
    try {
      const res = await fetch("/api/ai/extract-deadline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: deadlineText }),
      });
      if (res.ok) {
        const data = await res.json();
        setResolvedDeadline(data.deadline);
        setDeadlineHasTime(data.deadline_has_time);
      }
    } finally {
      setIsExtracting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setIsSaving(true);
    try {
      const task = await createTask({
        title: title.trim(),
        description: null,
        priority,
        status: "todo",
        deadline: resolvedDeadline,
        deadline_has_time: deadlineHasTime,
        project: project.trim() || null,
        context: null,
        tags: [],
        archived_at: null,
      });
      addTask(task);
      onClose();
    } finally {
      setIsSaving(false);
    }
  }

  function formatDeadlinePreview(iso: string, hasTime: boolean): string {
    const d = new Date(iso);
    if (hasTime) {
      return d.toLocaleString("nl-NL", { weekday: "long", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Modal */}
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
              {/* Titel input */}
              <div className="px-5 pt-5 pb-3">
                <input
                  ref={titleRef}
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Wat moet er gedaan worden?"
                  className="w-full text-lg font-semibold text-gray-900 placeholder:text-gray-300 outline-none bg-transparent"
                />
              </div>

              <div className="h-px bg-gray-100 mx-5" />

              {/* Deadline input */}
              <div className="px-5 py-3 flex items-center gap-3">
                <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <input
                  type="text"
                  value={deadlineText}
                  onChange={(e) => { setDeadlineText(e.target.value); setResolvedDeadline(null); }}
                  onBlur={handleDeadlineBlur}
                  placeholder='Deadline: "vrijdag", "volgende week", "morgen 14:00"'
                  className="flex-1 text-sm text-gray-700 placeholder:text-gray-300 outline-none bg-transparent"
                />
                {isExtracting && (
                  <svg className="w-4 h-4 text-orange animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                )}
                {resolvedDeadline && !isExtracting && (
                  <span className="text-xs font-medium text-orange bg-orange-soft px-2 py-0.5 rounded-full shrink-0">
                    {formatDeadlinePreview(resolvedDeadline, deadlineHasTime)}
                  </span>
                )}
              </div>

              {/* Project input */}
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
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${p.color}`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                    Annuleer
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    loading={isSaving}
                    disabled={!title.trim()}
                  >
                    Opslaan
                  </Button>
                </div>
              </div>
            </form>

            {/* Tip */}
            <p className="text-center text-xs text-white/60 mt-3">
              Druk op <kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-white/80">Esc</kbd> om te sluiten
            </p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
