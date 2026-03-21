"use client";

import { useEffect } from "react";
import { useTaskStore } from "@/stores/taskStore";
import { fetchTasks, markLateTasks, completeTask, archiveTask, updateTask } from "@/lib/supabase/tasks";
import { playComplete } from "@/lib/utils/sound";
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
      await markLateTasks();
      const data = await fetchTasks();
      setTasks(data);
      useTaskStore.setState({ isLoading: false });
    }
    load();
  }, [setTasks]);

  async function complete(task: Task) {
    playComplete();
    const now = new Date().toISOString();
    updateLocal(task.id, { status: "done", completed_at: now });
    const result = await completeTask(task);
    // Als er een nieuwe instantie is aangemaakt (herhaling), voeg toe aan store
    if (task.recurrence) {
      // Herlaad taken zodat de nieuwe instantie zichtbaar wordt
      const fresh = await fetchTasks();
      setTasks(fresh);
    } else {
      updateLocal(task.id, result);
    }
  }

  async function archive(id: string) {
    updateLocal(id, { archived_at: new Date().toISOString() });
    await archiveTask(id);
  }

  async function update(id: string, data: TaskUpdate) {
    updateLocal(id, data);
    await updateTask(id, data);
  }

  return {
    tasks,
    isLoading,
    activeTasks: getActiveTasks(),
    lateTasks: getLateTasks(),
    doneTasks: getDoneTasks(),
    complete,
    archive,
    update,
  };
}
