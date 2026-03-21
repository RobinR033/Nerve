"use client";

import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";
import type { Priority, Task, TaskUpdate } from "@/types/database";

const priorityDot: Record<Priority, string> = {
  urgent: "bg-red-500",
  high: "bg-yellow-400",
  medium: "bg-blue-400",
  low: "bg-gray-300",
};

const priorityOrder: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

// ─── Taakkaart ────────────────────────────────────────────────────────────────

function TaskCard({
  task,
  onEdit,
  overlay = false,
}: {
  task: Task;
  onEdit?: () => void;
  overlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const isLate = task.status === "late";
  const isDone = task.status === "done";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onEdit}
      className={[
        "bg-white rounded-xl border px-3.5 py-3 cursor-grab active:cursor-grabbing select-none",
        "hover:shadow-md transition-all group",
        overlay ? "shadow-2xl rotate-1 scale-105" : "shadow-sm",
        isDone ? "opacity-50" : "",
        isLate ? "border-red-200" : "border-gray-100",
      ].join(" ")}
    >
      <div className="flex items-start gap-2">
        <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${priorityDot[task.priority]}`} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium text-gray-900 leading-snug ${isDone ? "line-through" : ""}`}>
            {task.title}
          </p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {task.deadline && (
              <span className={`text-xs ${isLate ? "text-red-500 font-semibold" : "text-gray-400"}`}>
                {isLate ? "⚠ Te laat" : formatDeadline(task.deadline)}
              </span>
            )}
            {task.recurrence && (
              <span className="text-xs text-purple-400">↻</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDeadline(deadline: string): string {
  const d = new Date(deadline);
  const now = new Date();
  const diff = Math.round((d.getTime() - now.getTime()) / 86400000);
  if (diff === 0) return "Vandaag";
  if (diff === 1) return "Morgen";
  if (diff === -1) return "Gisteren";
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

// ─── Kolom ────────────────────────────────────────────────────────────────────

function Column({
  name,
  tasks,
  onEdit,
  onRename,
}: {
  name: string;
  tasks: Task[];
  onEdit: (task: Task) => void;
  onRename?: (oldName: string, newName: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [nameVal, setNameVal] = useState(name);
  const isOverig = name === "__overig__";
  const displayName = isOverig ? "Overig" : name;

  function commitRename() {
    setEditing(false);
    if (nameVal.trim() && nameVal.trim() !== name && onRename) {
      onRename(name, nameVal.trim());
    }
  }

  const sorted = [...tasks].sort((a, b) => {
    if (a.status === "done" && b.status !== "done") return 1;
    if (b.status === "done" && a.status !== "done") return -1;
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return (
    <div className="flex flex-col w-72 shrink-0">
      {/* Kolomheader */}
      <div className="flex items-center gap-2 mb-3 px-1">
        {editing && !isOverig ? (
          <input
            autoFocus
            value={nameVal}
            onChange={(e) => setNameVal(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setEditing(false); }}
            className="text-sm font-bold text-gray-900 bg-transparent border-b-2 border-orange outline-none flex-1"
          />
        ) : (
          <button
            onClick={() => !isOverig && setEditing(true)}
            className={`text-sm font-bold text-gray-900 uppercase tracking-wider flex-1 text-left ${!isOverig ? "hover:text-orange transition-colors" : ""}`}
          >
            {displayName}
          </button>
        )}
        <span className="text-xs font-semibold text-gray-300 bg-gray-100 rounded-full w-5 h-5 flex items-center justify-center">
          {tasks.filter(t => t.status !== "done").length}
        </span>
      </div>

      {/* Taken */}
      <div className="flex flex-col gap-2 min-h-16">
        <SortableContext items={sorted.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <AnimatePresence initial={false}>
            {sorted.map((task) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
              >
                <TaskCard task={task} onEdit={() => onEdit(task)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </SortableContext>

        {sorted.length === 0 && (
          <div className="h-16 rounded-xl border-2 border-dashed border-gray-100 flex items-center justify-center text-xs text-gray-300">
            Sleep hier een taak naartoe
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Hoofd KanbanBoard ────────────────────────────────────────────────────────

type Props = {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onUpdate: (id: string, data: TaskUpdate) => Promise<void>;
};

export function KanbanBoard({ tasks, onEdit, onUpdate }: Props) {
  const activeTasks = tasks.filter((t) => t.archived_at === null);

  // Leid kolommen af uit project-veld
  const projectNames = Array.from(
    new Set(activeTasks.map((t) => t.project).filter(Boolean) as string[])
  ).sort();

  const [extraProjects, setExtraProjects] = useState<string[]>([]);
  const [addingProject, setAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const allProjects = Array.from(new Set([...projectNames, ...extraProjects]));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function getTasksForColumn(project: string | null): Task[] {
    if (project === "__overig__") return activeTasks.filter((t) => !t.project);
    return activeTasks.filter((t) => t.project === project);
  }

  function handleDragStart({ active }: DragStartEvent) {
    setActiveTask(activeTasks.find((t) => t.id === active.id) ?? null);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveTask(null);
    if (!over) return;

    const draggedTask = activeTasks.find((t) => t.id === active.id);
    if (!draggedTask) return;

    // Bepaal de doelkolom: over kan een task-id zijn of een kolom-id
    const overTask = activeTasks.find((t) => t.id === over.id);
    let targetProject: string | null = null;

    if (overTask) {
      targetProject = overTask.project ?? null;
    } else {
      // over.id is een kolom-id
      targetProject = over.id === "__overig__" ? null : String(over.id);
    }

    if (draggedTask.project !== targetProject) {
      onUpdate(draggedTask.id, { project: targetProject });
    }
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    const draggedTask = activeTasks.find((t) => t.id === active.id);
    if (!draggedTask) return;
    const overTask = activeTasks.find((t) => t.id === over.id);
    if (!overTask) return;
    if (draggedTask.project !== overTask.project) {
      onUpdate(draggedTask.id, { project: overTask.project ?? null });
    }
  }

  function handleRename(oldName: string, newName: string) {
    // Update alle taken in deze kolom
    const toUpdate = activeTasks.filter((t) => t.project === oldName);
    toUpdate.forEach((t) => onUpdate(t.id, { project: newName }));
    setExtraProjects((prev) => prev.map((p) => (p === oldName ? newName : p)));
  }

  function addProject() {
    const name = newProjectName.trim();
    if (name && !allProjects.includes(name)) {
      setExtraProjects((prev) => [...prev, name]);
    }
    setNewProjectName("");
    setAddingProject(false);
  }

  const columns = [...allProjects, "__overig__"];

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
    >
      <div className="flex gap-5 overflow-x-auto pb-6 pt-2 px-1 min-h-[60vh]">
        {columns.map((col) => (
          <Column
            key={col}
            name={col}
            tasks={getTasksForColumn(col === "__overig__" ? null : col)}
            onEdit={onEdit}
            onRename={col !== "__overig__" ? handleRename : undefined}
          />
        ))}

        {/* Nieuw project aanmaken */}
        <div className="w-72 shrink-0">
          {addingProject ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
              <input
                autoFocus
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addProject(); if (e.key === "Escape") setAddingProject(false); }}
                placeholder="Projectnaam…"
                className="w-full text-sm font-semibold text-gray-900 outline-none placeholder:text-gray-300 mb-3"
              />
              <div className="flex gap-2">
                <button
                  onClick={addProject}
                  className="flex-1 py-1.5 rounded-lg bg-orange text-white text-xs font-semibold hover:bg-orange-dark transition-colors"
                >
                  Toevoegen
                </button>
                <button
                  onClick={() => setAddingProject(false)}
                  className="flex-1 py-1.5 rounded-lg bg-gray-100 text-gray-500 text-xs font-semibold hover:bg-gray-200 transition-colors"
                >
                  Annuleren
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingProject(true)}
              className="w-full h-12 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 text-sm font-semibold hover:border-orange hover:text-orange transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Nieuw project
            </button>
          )}
        </div>
      </div>

      <DragOverlay>
        {activeTask && <TaskCard task={activeTask} overlay />}
      </DragOverlay>
    </DndContext>
  );
}
