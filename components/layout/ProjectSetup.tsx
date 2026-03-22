"use client";

import { useEffect } from "react";
import { fetchProjects, upsertProject } from "@/lib/supabase/projects";
import { useProjectStore } from "@/stores/projectStore";
import { useTaskStore } from "@/stores/taskStore";
import { defaultColorForProject } from "@/lib/utils/projectColor";

/**
 * Laadt projecten bij opstarten en synchroniseert ontbrekende
 * project-records automatisch met een deterministische standaardkleur.
 */
export function ProjectSetup() {
  const setProjects = useProjectStore((s) => s.setProjects);
  const upsertInStore = useProjectStore((s) => s.upsertProject);
  const tasks = useTaskStore((s) => s.tasks);

  // Laad projecten bij mount
  useEffect(() => {
    fetchProjects().then(setProjects).catch(console.error);
  }, [setProjects]);

  // Zodra taken geladen zijn: maak ontbrekende project-records aan met auto-kleur
  useEffect(() => {
    if (tasks.length === 0) return;
    const projectNames = Array.from(
      new Set(tasks.map((t) => t.project).filter((p): p is string => !!p))
    );

    async function sync() {
      const existing = await fetchProjects();
      const existingNames = new Set(existing.map((p) => p.name));
      for (const name of projectNames) {
        if (!existingNames.has(name)) {
          const project = await upsertProject(name, defaultColorForProject(name)).catch(() => null);
          if (project) upsertInStore(project);
        }
      }
      const updated = await fetchProjects();
      setProjects(updated);
    }

    sync().catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks.length]);

  return null;
}
