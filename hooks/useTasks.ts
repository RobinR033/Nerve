"use client";

import { useEffect } from "react";
import { useTaskStore } from "@/stores/taskStore";
import { fetchTasks, markLateTasks, completeTask, archiveTask, updateTask } from "@/lib/supabase/tasks";
import { playComplete } from "@/lib/utils/sound";
import { hapticComplete } from "@/lib/utils/haptic";
import { useToastStore } from "@/stores/toastStore";
import type { Task, TaskUpdate } from "@/types/database";

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
    async function load() {
      useTaskStore.setState({ isLoading: true });
      try {
        await markLateTasks();
        const data = await fetchTasks();
        setTasks(data);
      } catch (err) {
        console.error("Taken laden mislukt:", err);
      } finally {
        useTaskStore.setState({ isLoading: false });
      }
    }
    load();
  }, [setTasks]);

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
