"use client";

import { useCallback, useEffect, useState } from "react";
import { ProjectBoard } from "@/components/tasks/ProjectBoard";
import { ProjectEditModal, type ProjectModalMode } from "@/components/projects/ProjectEditModal";
import {
  archiveProject,
  createProject,
  fetchProjects,
  updateProject,
} from "@/lib/supabase/projects";
import type { Project, ProjectType, ProjectUpdate } from "@/types/database";

type TypeFilter = "all" | ProjectType;

const filterLabels: Record<TypeFilter, string> = {
  all: "Alles",
  project: "Projecten",
  interne_activiteit: "Intern",
};

export function ProjectsClient() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [modalMode, setModalMode] = useState<ProjectModalMode | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    const ps = await fetchProjects();
    setProjects(ps.filter((p) => p.name !== "Vlaggetjes"));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(name: string, color: string, type: ProjectType) {
    await createProject(name, color, type);
    await load();
    setRefreshKey((k) => k + 1);
  }

  async function handleUpdate(id: string, updates: ProjectUpdate) {
    await updateProject(id, updates);
    await load();
    setRefreshKey((k) => k + 1);
  }

  async function handleArchive(id: string) {
    await archiveProject(id);
    await load();
    setRefreshKey((k) => k + 1);
  }

  const filtered = projects.filter((p) => typeFilter === "all" || p.type === typeFilter);

  return (
    <div className="px-4 md:px-6 py-6 md:py-10">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold" style={{ color: "#1A1410", letterSpacing: "-.03em" }}>
            Projecten
          </h1>
          <p className="text-sm mt-1" style={{ color: "#9A8F84" }}>
            {loading
              ? "Laden…"
              : `${filtered.length} ${filtered.length === 1 ? "project" : "projecten"}`}
          </p>
        </div>

        <button
          onClick={() => setModalMode({ kind: "create" })}
          className="h-10 px-4 rounded-xl flex items-center gap-2 text-white text-sm font-semibold transition-opacity hover:opacity-90 active:scale-95"
          style={{
            background: "linear-gradient(135deg, #FF7A45 0%, #FF5A1F 50%, #FF3D8B 110%)",
            boxShadow: "0 1px 0 rgba(255,255,255,.3) inset, 0 4px 12px -2px rgba(255,90,31,.5)",
          }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nieuw project
        </button>
      </div>

      {/* Type filter */}
      <div
        className="inline-flex items-center gap-0.5 p-1 mb-6"
        style={{
          background: "rgba(255,253,250,0.7)",
          backdropFilter: "var(--backdrop-blur)",
          WebkitBackdropFilter: "var(--backdrop-blur)",
          border: "0.5px solid rgba(255,255,255,0.6)",
          borderRadius: 12,
        }}
      >
        {(Object.keys(filterLabels) as TypeFilter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setTypeFilter(f)}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
            style={
              typeFilter === f
                ? {
                    background: "rgba(255,255,255,0.9)",
                    color: "#1A1410",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                  }
                : { color: "#6B6157" }
            }
          >
            {filterLabels[f]}
          </button>
        ))}
      </div>

      {/* Board */}
      {loading ? (
        <div className="py-20 text-center text-sm text-gray-400">Laden…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="font-display text-lg font-semibold mb-1" style={{ color: "#1A1410" }}>
            Geen projecten
          </p>
          <p className="text-sm" style={{ color: "#9A8F84" }}>
            Klik op &ldquo;Nieuw project&rdquo; om er een aan te maken.
          </p>
        </div>
      ) : (
        <ProjectBoard
          projects={filtered}
          onEditProject={(p) => setModalMode({ kind: "edit", project: p })}
          refreshKey={refreshKey}
        />
      )}

      <ProjectEditModal
        mode={modalMode}
        onClose={() => setModalMode(null)}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onArchive={handleArchive}
      />
    </div>
  );
}
