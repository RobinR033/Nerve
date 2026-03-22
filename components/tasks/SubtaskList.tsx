"use client";

import { useState } from "react";
import type { Priority, Task } from "@/types/database";
import { createTask, updateTask, completeTask } from "@/lib/supabase/tasks";
import { useTaskStore } from "@/stores/taskStore";

type Props = {
  parentTask: Task;
  subtasks: Task[];
};

const priorityColors: Record<Priority, string> = {
  low:    "text-gray-400",
  medium: "text-blue-500",
  high:   "text-yellow-600",
  urgent: "text-red-500",
};

const priorityLabels: Record<Priority, string> = {
  low: "Laag", medium: "Normaal", high: "Hoog", urgent: "Urgent",
};

export function SubtaskList({ parentTask, subtasks }: Props) {
  const [newTitle, setNewTitle] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newPriority, setNewPriority] = useState<Priority>("medium");
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const addTaskToStore = useTaskStore((s) => s.addTask);
  const updateTaskInStore = useTaskStore((s) => s.updateTask);

  async function handleAddSubtask() {
    if (!newTitle.trim()) return;
    setIsSaving(true);
    try {
      const deadline = newDeadline
        ? newTime
          ? new Date(`${newDeadline}T${newTime}:00`).toISOString()
          : newDeadline
        : null;

      const task = await createTask({
        title: newTitle.trim(),
        description: null,
        priority: newPriority,
        status: "todo",
        deadline,
        deadline_has_time: !!(newDeadline && newTime),
        project: parentTask.project,
        context: null,
        tags: [],
        recurrence: null,
        category: parentTask.category,
        outlook_message_id: null,
        parent_id: parentTask.id,
        completed_at: null,
        archived_at: null,
      });

      addTaskToStore(task);
      setNewTitle("");
      setNewDeadline("");
      setNewTime("");
      setNewPriority("medium");
      setIsAdding(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleComplete(subtask: Task) {
    const updated = await completeTask(subtask);
    updateTaskInStore(updated.id, updated);
  }

  async function handleChangePriority(subtask: Task, priority: Priority) {
    await updateTask(subtask.id, { priority });
    updateTaskInStore(subtask.id, { priority });
  }

  return (
    <div className="space-y-1">
      {subtasks.map((sub) => {
        const isDone = sub.status === "done";
        return (
          <div
            key={sub.id}
            className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-50 group"
          >
            {/* Vinkje */}
            <button
              onClick={() => { if (!isDone) handleComplete(sub); }}
              className={[
                "shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all",
                isDone ? "border-green-500 bg-green-500" : "border-gray-300 hover:border-orange",
              ].join(" ")}
            >
              {isDone && (
                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>

            {/* Titel */}
            <span className={`flex-1 text-sm ${isDone ? "line-through text-gray-400" : "text-gray-700"}`}>
              {sub.title}
            </span>

            {/* Deadline */}
            {sub.deadline && (
              <span className="text-xs text-gray-400">
                {new Date(sub.deadline).toLocaleDateString("nl-NL", {
                  day: "numeric", month: "short",
                  ...(sub.deadline_has_time ? { hour: "2-digit", minute: "2-digit" } : {}),
                })}
              </span>
            )}

            {/* Prioriteit */}
            <select
              value={sub.priority}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => handleChangePriority(sub, e.target.value as Priority)}
              className={`text-xs bg-transparent border-none outline-none cursor-pointer ${priorityColors[sub.priority]}`}
            >
              {(Object.keys(priorityLabels) as Priority[]).map((p) => (
                <option key={p} value={p}>{priorityLabels[p]}</option>
              ))}
            </select>
          </div>
        );
      })}

      {/* Subtaak toevoegen */}
      {isAdding ? (
        <div className="pt-1 space-y-2 border-t border-gray-100 mt-2">
          <input
            autoFocus
            type="text"
            placeholder="Subtaak omschrijving..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAddSubtask(); if (e.key === "Escape") setIsAdding(false); }}
            className="w-full text-sm text-gray-900 bg-gray-50 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-orange/30"
          />
          <div className="flex gap-2 items-center flex-wrap">
            <input
              type="date"
              value={newDeadline}
              onChange={(e) => { setNewDeadline(e.target.value); if (!e.target.value) setNewTime(""); }}
              className="text-xs text-gray-600 bg-gray-50 rounded-lg px-2 py-1.5 outline-none border border-gray-200"
            />
            {newDeadline && (
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="text-xs text-gray-600 bg-gray-50 rounded-lg px-2 py-1.5 outline-none border border-gray-200"
              />
            )}
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as Priority)}
              className="text-xs text-gray-600 bg-gray-50 rounded-lg px-2 py-1.5 outline-none border border-gray-200"
            >
              {(Object.keys(priorityLabels) as Priority[]).map((p) => (
                <option key={p} value={p}>{priorityLabels[p]}</option>
              ))}
            </select>
            <div className="flex gap-1 ml-auto">
              <button
                onClick={() => setIsAdding(false)}
                className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded"
              >
                Annuleren
              </button>
              <button
                onClick={handleAddSubtask}
                disabled={!newTitle.trim() || isSaving}
                className="text-xs bg-orange text-white px-3 py-1 rounded-lg disabled:opacity-50"
              >
                {isSaving ? "..." : "Toevoegen"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-orange transition-colors py-1 px-2"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Subtaak toevoegen
        </button>
      )}
    </div>
  );
}
