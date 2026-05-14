"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { PROJECT_COLOR_PRESETS } from "@/types/database";
import type { Project, ProjectType, ProjectUpdate } from "@/types/database";

export type ProjectModalMode =
  | { kind: "create" }
  | { kind: "edit"; project: Project };

type Props = {
  mode: ProjectModalMode | null;
  onClose: () => void;
  onCreate: (name: string, color: string, type: ProjectType) => Promise<void>;
  onUpdate: (id: string, updates: ProjectUpdate) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
};

export function ProjectEditModal({ mode, onClose, onCreate, onUpdate, onArchive }: Props) {
  const open = mode !== null;
  const isEdit = mode?.kind === "edit";

  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(PROJECT_COLOR_PRESETS[0].color);
  const [type, setType] = useState<ProjectType>("project");
  const [saving, setSaving] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  // Initial state per open
  useEffect(() => {
    if (!open) return;
    if (mode?.kind === "edit") {
      setName(mode.project.name);
      setColor(mode.project.color);
      setType(mode.project.type);
    } else {
      setName("");
      setColor(PROJECT_COLOR_PRESETS[0].color);
      setType("project");
    }
    setConfirmArchive(false);
    setTimeout(() => nameRef.current?.focus(), 50);
  }, [open, mode]);

  // Escape sluit
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      if (isEdit && mode?.kind === "edit") {
        const updates: ProjectUpdate = {};
        if (trimmed !== mode.project.name) updates.name = trimmed;
        if (color !== mode.project.color) updates.color = color;
        if (type !== mode.project.type) updates.type = type;
        if (Object.keys(updates).length > 0) {
          await onUpdate(mode.project.id, updates);
        }
      } else {
        await onCreate(trimmed, color, type);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive() {
    if (!isEdit || mode?.kind !== "edit") return;
    setSaving(true);
    try {
      await onArchive(mode.project.id);
      onClose();
    } finally {
      setSaving(false);
    }
  }

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
            className="fixed top-[12%] md:top-[20%] left-1/2 -translate-x-1/2 w-full max-w-md px-4 md:px-0 z-50"
          >
            <form
              onSubmit={handleSubmit}
              className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
            >
              {/* Header */}
              <div className="px-5 pt-5 pb-3 flex items-center gap-3">
                <div
                  className="w-7 h-7 rounded-lg shrink-0"
                  style={{ backgroundColor: color }}
                />
                <input
                  ref={nameRef}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Projectnaam"
                  className="flex-1 text-lg font-semibold text-gray-900 placeholder:text-gray-300 outline-none bg-transparent min-w-0"
                />
              </div>

              <div className="h-px bg-gray-100 mx-5" />

              {/* Kleur kiezen */}
              <div className="px-5 py-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                  Kleur
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PROJECT_COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.color}
                      type="button"
                      onClick={() => setColor(preset.color)}
                      title={preset.label}
                      className={[
                        "w-7 h-7 rounded-lg transition-all",
                        color === preset.color
                          ? "ring-2 ring-offset-2 ring-gray-400 scale-110"
                          : "hover:scale-105",
                      ].join(" ")}
                      style={{ backgroundColor: preset.color }}
                    />
                  ))}
                </div>
              </div>

              <div className="h-px bg-gray-100 mx-5" />

              {/* Type */}
              <div className="px-5 py-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                  Type
                </label>
                <div className="flex items-center gap-1.5">
                  {(["project", "interne_activiteit"] as ProjectType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={[
                        "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all",
                        type === t
                          ? "bg-orange text-white"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200",
                      ].join(" ")}
                    >
                      {t === "project" ? "Project" : "Interne activiteit"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-px bg-gray-100 mx-5" />

              {/* Footer */}
              <div className="px-5 py-3 flex items-center justify-between gap-3">
                {isEdit ? (
                  confirmArchive ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Zeker weten?</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmArchive(false)}
                      >
                        Annuleer
                      </Button>
                      <button
                        type="button"
                        onClick={handleArchive}
                        disabled={saving}
                        className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
                      >
                        Archiveer
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmArchive(true)}
                      className="text-xs font-semibold text-gray-400 hover:text-red-500 transition-colors"
                    >
                      Archiveer project
                    </button>
                  )
                ) : (
                  <span />
                )}

                <div className="flex items-center gap-2 shrink-0">
                  <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                    Annuleer
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    loading={saving}
                    disabled={!name.trim()}
                  >
                    {isEdit ? "Opslaan" : "Aanmaken"}
                  </Button>
                </div>
              </div>
            </form>

            <p className="text-center text-xs text-white/60 mt-3">
              Druk op{" "}
              <kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-white/80">Esc</kbd>{" "}
              om te sluiten
            </p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
