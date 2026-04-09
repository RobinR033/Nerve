"use client";

import { useState } from "react";
import { useCategoryStore } from "@/stores/categoryStore";
import { useTasks } from "@/hooks/useTasks";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { TaskEditModal } from "@/components/tasks/TaskEditModal";
import type { Task } from "@/types/database";

export default function BordPage() {
  const { activeCategory } = useCategoryStore();
  const { tasks, update } = useTasks();
  const [editTask, setEditTask] = useState<Task | null>(null);

  const boardTasks = tasks.filter(
    (t) => t.archived_at === null && (t.category === activeCategory || t.category === null)
  );

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 pt-6 pb-4 shrink-0">
        <h1 className="font-display text-2xl font-bold text-gray-900">
          Bord — {activeCategory === "werk" ? "Werk" : "Privé"}
        </h1>
      </div>

      <div className="flex-1 overflow-hidden">
        <KanbanBoard
          tasks={boardTasks}
          onEdit={setEditTask}
          onUpdate={(id, data) => update(id, data)}
        />
      </div>

      {editTask && (
        <TaskEditModal
          task={editTask}
          onClose={() => setEditTask(null)}
          onSave={async (id, data) => { await update(id, data); setEditTask(null); }}
        />
      )}
    </div>
  );
}
