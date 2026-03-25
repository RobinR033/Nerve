"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createTask, updateTask } from "@/lib/supabase/tasks";
import { useTaskStore } from "@/stores/taskStore";
import { Button } from "@/components/ui/Button";
import type { Category, Priority, Recurrence } from "@/types/database";

type Props = { open: boolean; onClose: () => void };

const priorities: { value: Priority; label: string; color: string }[] = [
  { value: "low",    label: "Laag",    color: "bg-gray-100 text-gray-500 data-[active=true]:bg-gray-200 data-[active=true]:text-gray-900" },
  { value: "medium", label: "Normaal", color: "bg-blue-50 text-blue-600 data-[active=true]:bg-blue-100 data-[active=true]:text-blue-700" },
  { value: "high",   label: "Hoog",    color: "bg-yellow-50 text-yellow-700 data-[active=true]:bg-yellow-100 data-[active=true]:text-yellow-800" },
  { value: "urgent", label: "Urgent",  color: "bg-red-50 text-red-600 data-[active=true]:bg-red-100 data-[active=true]:text-red-700" },
];

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type AllowedMime = (typeof ALLOWED_MIME)[number];

// Parse taak op de achtergrond en update de store + database
async function parseAndUpdate(taskId: string, raw: string) {
  useTaskStore.getState().setTaskParsing(taskId, true);
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

    // Store altijd bijwerken (UI reageert direct)
    useTaskStore.getState().updateTask(taskId, updates);

    // Daarna Supabase — los van store, fout is niet fataal
    updateTask(taskId, updates).catch((err) =>
      console.error("[parseAndUpdate] Supabase update mislukt:", err)
    );
  } catch (err) {
    console.error("[parseAndUpdate] mislukt:", err);
  } finally {
    useTaskStore.getState().setTaskParsing(taskId, false);
  }
}

export function CaptureModal({ open, onClose }: Props) {
  const addTask = useTaskStore((s) => s.addTask);
  const titleRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [rawInput, setRawInput] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [project, setProject] = useState("");
  const [deadline, setDeadline] = useState("");
  const [time, setTime] = useState("");
  const [recurrence, setRecurrence] = useState<Recurrence | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Foto upload state
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);

  // Reset bij openen
  useEffect(() => {
    if (open) {
      setRawInput("");
      setPriority("medium");
      setProject("");
      setDeadline("");
      setTime("");
      setRecurrence(null);
      setCategory(null);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const raw = rawInput.trim();
    if (!raw) return;

    setIsSaving(true);
    try {
      const task = await createTask({
        title: raw,
        description: null,
        priority,
        status: "todo",
        // Converteer naar UTC ISO: browser interpreteert lokale tijd (Amsterdam) correct
        deadline: deadline
          ? time
            ? new Date(`${deadline}T${time}:00`).toISOString()
            : deadline
          : null,
        deadline_has_time: !!(deadline && time),
        project: project.trim() || null,
        context: null,
        tags: [],
        recurrence,
        category,
        outlook_message_id: null,
        completed_at: null,
        archived_at: null,
      });
      addTask(task);
      onClose();

      // AI parse op de achtergrond — geen await
      parseAndUpdate(task.id, raw);
    } finally {
      setIsSaving(false);
    }
  }

  // Foto upload → AI extraheert taak
  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !ALLOWED_MIME.includes(file.type as AllowedMime)) return;

    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);

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
        if (data.title) setRawInput(data.title);
        if (data.project) setProject(data.project);
        if (data.priority) setPriority(data.priority);
      }
    } finally {
      setIsAnalyzingImage(false);
    }
  }

  const hasTitle = rawInput.trim().length > 0;

  return (
    <AnimatePresence>
      {open && (
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
            className="fixed top-[8%] md:top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg px-4 md:px-0 z-50"
          >
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">

              {/* Verborgen file input */}
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleImageChange} />

              {/* Foto preview */}
              <AnimatePresence>
                {(imagePreview || isAnalyzingImage) && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="relative">
                    {imagePreview && <img src={imagePreview} alt="Preview" className="w-full max-h-36 object-cover" />}
                    {isAnalyzingImage && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center gap-2">
                        <Spinner />
                        <span className="text-sm text-gray-500 font-medium">Claude analyseert…</span>
                      </div>
                    )}
                    <button type="button" onClick={() => { setImagePreview(null); if (fileRef.current) fileRef.current.value = ""; }} className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full shadow flex items-center justify-center text-gray-400 hover:text-gray-700">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Titel input */}
              <div className="px-5 pt-5 pb-3 flex items-center gap-3">
                <input
                  ref={titleRef}
                  type="text"
                  value={rawInput}
                  onChange={(e) => setRawInput(e.target.value)}
                  placeholder="Typ een taak…"
                  className="flex-1 text-lg font-semibold text-gray-900 placeholder:text-gray-300 outline-none bg-transparent min-w-0"
                />
                <button type="button" onClick={() => fileRef.current?.click()} title="Foto of screenshot" className="shrink-0 text-gray-300 hover:text-orange transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                {/* Vinkknop — altijd zichtbaar zodra er tekst is */}
                <AnimatePresence>
                  {hasTitle && (
                    <motion.button
                      key="submit-check"
                      type="submit"
                      disabled={isSaving}
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.7 }}
                      transition={{ duration: 0.15 }}
                      className="shrink-0 w-8 h-8 rounded-xl bg-orange flex items-center justify-center text-white shadow-md shadow-orange/30 active:scale-90 transition-transform disabled:opacity-50"
                    >
                      {isSaving ? <Spinner /> : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>

              <div className="h-px bg-gray-100 mx-5" />

              {/* Project */}
              <div className="px-5 py-3 flex items-center gap-3">
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

              {/* Categorie */}
              <div className="px-5 py-3 flex items-center gap-3">
                <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <div className="flex items-center gap-1.5">
                  {([null, "werk", "prive"] as (Category | null)[]).map((c) => {
                    const label = c === null ? "Geen" : c === "werk" ? "💼 Werk" : "🏠 Privé";
                    return (
                      <button
                        key={String(c)}
                        type="button"
                        onClick={() => setCategory(c)}
                        className={[
                          "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all",
                          category === c
                            ? "bg-orange text-white"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200",
                        ].join(" ")}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="h-px bg-gray-100 mx-5" />

              {/* Deadline + tijdstip */}
              <div className="px-5 py-3 flex items-center gap-3">
                <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => { setDeadline(e.target.value); if (!e.target.value) setTime(""); }}
                  className="text-sm text-gray-700 outline-none bg-transparent"
                />
                {deadline && (
                  <>
                    <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="text-sm text-gray-700 outline-none bg-transparent w-24"
                    />
                  </>
                )}
              </div>

              <div className="h-px bg-gray-100 mx-5" />

              {/* Herhaling */}
              <div className="px-5 py-3 flex items-center gap-3">
                <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {([null, "daily", "weekdays", "weekly", "monthly"] as (Recurrence | null)[]).map((r) => {
                    const label = r === null ? "Nooit" : r === "daily" ? "Dagelijks" : r === "weekdays" ? "Werkdagen" : r === "weekly" ? "Wekelijks" : "Maandelijks";
                    return (
                      <button
                        key={String(r)}
                        type="button"
                        onClick={() => setRecurrence(r)}
                        className={[
                          "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all",
                          recurrence === r
                            ? "bg-orange text-white"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200",
                        ].join(" ")}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
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
                  <Button type="button" variant="ghost" size="sm" onClick={onClose}>Annuleer</Button>
                  <Button type="submit" variant="primary" size="sm" loading={isSaving} disabled={!hasTitle}>Opslaan</Button>
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
