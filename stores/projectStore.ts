import { create } from "zustand";
import type { Project } from "@/types/database";

type ProjectStore = {
  projects: Project[];
  setProjects: (projects: Project[]) => void;
  upsertProject: (project: Project) => void;
  updateColor: (id: string, color: string) => void;
  // Geeft de hex-kleur terug voor een projectnaam, of null als onbekend
  getColor: (name: string | null | undefined) => string | null;
};

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],

  setProjects: (projects) => set({ projects }),

  upsertProject: (project) =>
    set((state) => {
      const exists = state.projects.find((p) => p.id === project.id);
      if (exists) {
        return { projects: state.projects.map((p) => p.id === project.id ? project : p) };
      }
      return { projects: [...state.projects, project] };
    }),

  updateColor: (id, color) =>
    set((state) => ({
      projects: state.projects.map((p) => p.id === id ? { ...p, color } : p),
    })),

  getColor: (name) => {
    if (!name) return null;
    const project = get().projects.find((p) => p.name === name);
    return project?.color ?? null;
  },
}));
