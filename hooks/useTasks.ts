"use client";

import { useEffect } from "react";
import { useTaskStore } from "@/stores/taskStore";
import { fetchTasks, markLateTasks, completeTask, archiveTask, updateTask } from "@/lib/supabase/tasks";
import type { TaskUpdate } from "@/types/database";

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

  async function complete(id: string) {
    updateLocal(id, { status: "done" });
    await completeTask(id);
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
