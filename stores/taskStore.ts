import { create } from "zustand";
import type { Task, TaskInsert, TaskUpdate } from "@/types/database";

type TaskFilter = {
  status?: Task["status"][];
  priority?: Task["priority"][];
  project?: string;
  context?: string;
  showArchived?: boolean;
};

type TaskStore = {
  tasks: Task[];
  filter: TaskFilter;
  isLoading: boolean;

  // Acties
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: TaskUpdate) => void;
  removeTask: (id: string) => void;
  setFilter: (filter: Partial<TaskFilter>) => void;
  resetFilter: () => void;

  // Selectors
  getActiveTasks: () => Task[];
  getLateTasks: () => Task[];
  getDoneTasks: () => Task[];
  getArchivedTasks: () => Task[];
  getTasksByProject: (project: string) => Task[];
};

const defaultFilter: TaskFilter = {
  showArchived: false,
};

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  filter: defaultFilter,
  isLoading: false,

  setTasks: (tasks) => set({ tasks }),

  addTask: (task) => set((state) => ({ tasks: [task, ...state.tasks] })),

  updateTask: (id, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t
      ),
    })),

  removeTask: (id) =>
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) })),

  setFilter: (filter) =>
    set((state) => ({ filter: { ...state.filter, ...filter } })),

  resetFilter: () => set({ filter: defaultFilter }),

  getActiveTasks: () => {
    const { tasks } = get();
    return tasks.filter(
      (t) => t.archived_at === null && (t.status === "todo" || t.status === "in_progress")
    );
  },

  getLateTasks: () => {
    const { tasks } = get();
    return tasks.filter((t) => t.archived_at === null && t.status === "late");
  },

  getDoneTasks: () => {
    const { tasks } = get();
    return tasks.filter((t) => t.archived_at === null && t.status === "done");
  },

  getArchivedTasks: () => {
    const { tasks } = get();
    return tasks.filter((t) => t.archived_at !== null);
  },

  getTasksByProject: (project) => {
    const { tasks } = get();
    return tasks.filter((t) => t.project === project && t.archived_at === null);
  },
}));
