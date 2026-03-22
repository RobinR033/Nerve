"use client";

import { useEffect } from "react";
import { fetchProjects } from "@/lib/supabase/projects";
import { useProjectStore } from "@/stores/projectStore";

/** Laadt projecten eenmalig in de Zustand store bij opstarten van de app. */
export function ProjectSetup() {
  const setProjects = useProjectStore((s) => s.setProjects);

  useEffect(() => {
    fetchProjects()
      .then(setProjects)
      .catch(console.error);
  }, [setProjects]);

  return null;
}
