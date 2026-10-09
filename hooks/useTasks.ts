"use client";

import { useEffect } from "react";
import { useTaskStore } from "@/stores/taskStore";
import { fetchTasks, markLateTasks, completeTask, archiveTask, updateTask } from "@/lib/supabase/tasks";
import { playComplete } from "@/lib/utils/sound";
import { hapticComplete } from "@/lib/utils/haptic";
import { useToastStore } from "@/stores/toastStore";
import type { Task, TaskUpdate } from "@/types/database";

// Gedeeld door alle onderdelen die useTasks gebruiken (zijbalk, pagina, meldingen…):
// één laadronde tegelijk, en niet bij elke klik opnieuw
const FRESH_MS = 30_000;
const LATE_CHECK_MS = 60 * 60_000;
let lastLoadAt = 0;
let lateCheckedAt = 0;
let inflight: Promise<void> | null = null;

function loadTasks(): Promise<void> {
  if (inflight) return inflight;
  inflight = (async () => {
    // Laadindicator alleen als er nog niets te tonen is
    if (lastLoadAt === 0) useTaskStore.setState({ isLoading: true });
    try {
      // Sneeuwschuiver ("Te laat"): bij openen van de app, daarna hooguit eens per uur
      if (Date.now() - lateCheckedAt > LATE_CHECK_MS) {
        await markLateTasks();
        lateCheckedAt = Date.now();
      }
      useTaskStore.getState().setTasks(await fetchTasks());
      lastLoadAt = Date.now();
    } catch (err) {
      console.error("Taken laden mislukt:", err);
    } finally {
      useTaskStore.setState({ isLoading: false });
      inflight = null;
    }
  })();
  return inflight;
}

export function useTasks() {
  const {
    tasks,
    isLoading,
    setTasks,
    updateTask: updateLocal,
    getActiveTasks,
    getLateTasks,
    getDoneTasks,
  } = useTaskStore();

  useEffect(() => {
    // Alleen verversen als de gegevens niet vers zijn; anders direct tonen wat er al is
    if (Date.now() - lastLoadAt > FRESH_MS) loadTasks();
  }, []);

  async function complete(task: Task) {
    playComplete();
    hapticComplete();
    const now = new Date().toISOString();
    updateLocal(task.id, { status: "done", completed_at: now });
    try {
      const result = await completeTask(task);
      if (task.recurrence) {
        const fresh = await fetchTasks();
        setTasks(fresh);
      } else {
        updateLocal(task.id, result);
      }
    } catch (err) {
      console.error("Taak afronden mislukt:", err);
      updateLocal(task.id, { status: task.status, completed_at: task.completed_at });
    }
  }

  async function uncomplete(task: Task) {
    updateLocal(task.id, { status: "todo", completed_at: null });
    try {
      await updateTask(task.id, { status: "todo", completed_at: null });
    } catch (err) {
      console.error("Taak terugzetten mislukt:", err);
      updateLocal(task.id, { status: task.status, completed_at: task.completed_at });
    }
  }

  async function archive(id: string) {
    updateLocal(id, { archived_at: new Date().toISOString() });
    try {
      await archiveTask(id);
      useToastStore.getState().show("Taak gearchiveerd", {
        label: "Ongedaan maken",
        onClick: () => {
          updateLocal(id, { archived_at: null });
          updateTask(id, { archived_at: null }).catch(console.error);
        },
      });
    } catch (err) {
      console.error("Archiveren mislukt:", err);
      updateLocal(id, { archived_at: null });
    }
  }

  async function update(id: string, data: TaskUpdate) {
    const prev = useTaskStore.getState().tasks.find((t) => t.id === id);
    updateLocal(id, data);
    try {
      await updateTask(id, data);
    } catch (err) {
      console.error("Taak bijwerken mislukt:", err);
      if (prev) updateLocal(id, prev);
    }
  }

  return {
    tasks,
    isLoading,
    activeTasks: getActiveTasks(),
    lateTasks: getLateTasks(),
    doneTasks: getDoneTasks(),
    complete,
    uncomplete,
    archive,
    update,
  };
}
