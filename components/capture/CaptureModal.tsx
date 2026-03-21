"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createTask } from "@/lib/supabase/tasks";
import { useTaskStore } from "@/stores/taskStore";
import { Button } from "@/components/ui/Button";
import type { Priority } from "@/types/database";

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type AllowedMime = (typeof ALLOWED_MIME)[number];

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

const priorityLabels: Record<Priority, string> = {
  low: "Laag", medium: "Normaal", high: "Hoog", urgent: "Urgent",
};

export function CaptureModal({ open, onClose }: Props) {
  const addTask = useTaskStore((s) => s.addTask);
  const titleRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [deadlineText, setDeadlineText] = useState("");
  const [resolvedDeadline, setResolvedDeadline] = useState<string | null>(null);
  const [deadlineHasTime, setDeadlineHasTime] = useState(false);
  const [priority, setPriority] = useState<Priority>("medium");
  const [project, setProject] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // AI prioriteit suggestie
  const [suggestedPriority, setSuggestedPriority] = useState<Priority | null>(null);
  const [suggestionReason, setSuggestionReason] = useState("");
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [userOverrode, setUserOverrode] = useState(false);

  // Foto upload
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);

  // Reset bij openen
  useEffect(() => {
    if (open) {
      setTitle("");
      setDeadlineText("");
      setResolvedDeadline(null);
      setDeadlineHasTime(false);
      setPriority("medium");
      setProject("");
      setSuggestedPriority(null);
      setSuggestionReason("");
      setUserOverrode(false);
      setImagePreview(null);
      setTimeout(() => titleRef.current?.focus(), 50);
    }
  }, [open]);

  // Escape sluiten
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Prioriteit suggestie on title blur
  async function handleTitleBlur() {
    if (!title.trim() || title.trim().length < 4 || userOverrode) return;
    setIsSuggesting(true);
    try {
      const res = await fetch("/api/ai/suggest-priority", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setSuggestedPriority(data.priority);
        setSuggestionReason(data.reason);
        if (!userOverrode) setPriority(data.priority);
      }
    } finally {
      setIsSuggesting(false);
    }
  }

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

  function handlePriorityClick(p: Priority) {
    setPriority(p);
    setUserOverrode(true);
    setSuggestedPriority(null);
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_MIME.includes(file.type as AllowedMime)) return;

    // Preview
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    // Base64 voor API
    setIsAnalyzingImage(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      const res = await fetch("/api/ai/extract-from-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64, mediaType: file.type }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.title) setTitle(data.title);
        if (data.deadline) { setResolvedDeadline(data.deadline); setDeadlineHasTime(data.deadline_has_time); }
        if (data.project) setProject(data.project);
        if (data.priority) setPriority(data.priority);
        if (data.notes) setDeadlineText(data.notes); // gebruik deadline veld tijdelijk voor notes
      }
    } finally {
      setIsAnalyzingImage(false);
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
              {/* Foto upload */}
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleImageChange}
              />

              {/* Image preview */}
              <AnimatePresence>
                {(imagePreview || isAnalyzingImage) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="relative"
                  >
                    {imagePreview && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imagePreview} alt="Preview" className="w-full max-h-36 object-cover" />
                    )}
                    {isAnalyzingImage && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center gap-2">
                        <Spinner />
                        <span className="text-sm text-gray-500 font-medium">Claude analyseert…</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => { setImagePreview(null); if (fileRef.current) fileRef.current.value = ""; }}
                      className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full shadow flex items-center justify-center text-gray-400 hover:text-gray-700"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Titel input */}
              <div className="px-5 pt-5 pb-3 flex items-center gap-3">
                <input
                  ref={titleRef}
                  type="text"
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); setSuggestedPriority(null); setSuggestionReason(""); }}
                  onBlur={handleTitleBlur}
                  placeholder="Wat moet er gedaan worden?"
                  className="flex-1 text-lg font-semibold text-gray-900 placeholder:text-gray-300 outline-none bg-transparent"
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  title="Foto of screenshot toevoegen"
                  className="shrink-0 text-gray-300 hover:text-orange transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
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
                {isExtracting && <Spinner />}
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
              <div className="px-5 py-4 space-y-3">

                {/* AI suggestie banner */}
                <AnimatePresence>
                  {isSuggesting && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-2 text-xs text-gray-400"
                    >
                      <Spinner />
                      <span>Prioriteit analyseren…</span>
                    </motion.div>
                  )}
                  {suggestedPriority && suggestionReason && !isSuggesting && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2"
                    >
                      <span className="text-gray-400">✦</span>
                      <span>
                        <span className="font-semibold text-gray-700">{priorityLabels[suggestedPriority]}</span>
                        {" "}— {suggestionReason}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5">
                    {priorities.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        data-active={priority === p.value}
                        onClick={() => handlePriorityClick(p.value)}
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
                    <Button type="submit" variant="primary" size="sm" loading={isSaving} disabled={!title.trim()}>
                      Opslaan
                    </Button>
                  </div>
                </div>
              </div>
            </form>

            <p className="text-center text-xs text-white/60 mt-3">
              Druk op <kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-white/80">Esc</kbd> om te sluiten
            </p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Spinner() {
  return (
    <svg className="w-4 h-4 text-orange animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}
