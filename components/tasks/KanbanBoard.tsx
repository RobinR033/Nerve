"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  rectIntersection,
  useDroppable,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";
import type { Priority, Task, TaskUpdate } from "@/types/database";
import { PROJECT_COLOR_PRESETS } from "@/types/database";
import { useProjectStore } from "@/stores/projectStore";
import { useTaskStore } from "@/stores/taskStore";
import { upsertProject, updateProjectColor } from "@/lib/supabase/projects";

const priorityColors: Record<Priority, string> = {
  urgent: "#E5484D",
  high: "#FF7A45",
  medium: "#6B9BF5",
  low: "#C7C0B8",
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
  };

  const isLate = task.status === "late";
  const isDone = task.status === "done";
  const getSubtasks = useTaskStore((s) => s.getSubtasks);
  const projectColor = useProjectStore((s) => s.getColor(task.project));
  const subtasks = task.parent_id ? [] : getSubtasks(task.id);
  const doneSubtasks = subtasks.filter((s) => s.status === "done").length;
  const totalSubtasks = subtasks.length;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        background: isLate
          ? "linear-gradient(135deg, rgba(255,235,225,.92) 0%, rgba(247,224,238,.92) 100%)"
          : isDone
          ? "rgba(255,253,250,0.5)"
          : overlay
          ? "rgba(255,253,250,0.96)"
          : "rgba(255,253,250,0.82)",
        backdropFilter: "blur(8px) saturate(120%)",
        WebkitBackdropFilter: "blur(8px) saturate(120%)",
        border: `0.5px solid ${isLate ? "rgba(255,180,150,.4)" : "rgba(255,255,255,0.7)"}`,
        borderRadius: 12,
        boxShadow: overlay
          ? "0 1px 0 rgba(255,255,255,.8) inset, 0 20px 40px -8px rgba(60,40,30,.2)"
          : "0 1px 0 rgba(255,255,255,.7) inset, 0 2px 8px -3px rgba(60,40,30,.08)",
        opacity: isDragging ? 0.3 : 1,
        transform: overlay ? `${CSS.Transform.toString(transform) ?? ""} rotate(1.5deg) scale(1.03)` : CSS.Transform.toString(transform) ?? undefined,
        cursor: overlay ? "grabbing" : "grab",
        userSelect: "none",
      }}
      className="px-3 py-2.5 transition-shadow"
    >
      <div {...attributes} {...listeners} className="touch-none">
        <div className="flex items-start gap-2">
          <span
            className="mt-1 shrink-0 rounded-full"
            style={{ width: 6, height: 6, background: priorityColors[task.priority], flexShrink: 0, marginTop: 5 }}
          />
          <div className="flex-1 min-w-0">
            <p
              className="text-[13px] font-medium leading-snug"
              style={{
                color: isDone ? "#9A8F84" : "#1A1410",
                textDecoration: isDone ? "line-through" : "none",
                letterSpacing: "-.01em",
              }}
            >
              {task.title}
            </p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {task.deadline && (
                <span className="text-[11px] font-medium" style={{ color: isLate ? "#E5484D" : "#9A8F84" }}>
                  {isLate ? "Te laat" : formatDeadline(task.deadline)}
                </span>
              )}
              {task.recurrence && (
                <span className="text-[11px]" style={{ color: "#C7B4FF" }}>↻</span>
              )}
              {totalSubtasks > 0 && (
                <span className="text-[11px]" style={{ color: "#B8B0A8" }}>{doneSubtasks}/{totalSubtasks}</span>
              )}
            </div>
            {totalSubtasks > 0 && (
              <div className="mt-1.5 h-0.5 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.06)" }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(doneSubtasks / totalSubtasks) * 100}%`,
                    background: doneSubtasks === totalSubtasks
                      ? "#1F9D55"
                      : projectColor ?? "linear-gradient(90deg, #FF7A45, #FF3D8B)",
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={onEdit}
        className="mt-2 text-[11px] font-medium transition-colors"
        style={{ color: "#C7C0B8" }}
      >
        Bewerken
      </button>
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
  id,
  name,
  tasks,
  onEdit,
  onRename,
  isOver,
}: {
  id: string;
  name: string;
  tasks: Task[];
  onEdit: (task: Task) => void;
  onRename?: (oldName: string, newName: string) => void;
  isOver: boolean;
}) {
  const { setNodeRef } = useDroppable({ id });

  const [editing, setEditing] = useState(false);
  const [nameVal, setNameVal] = useState(name);
  const [showDone, setShowDone] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const isOverig = id === "__overig__";
  const isVlaggetjes = id === "Vlaggetjes";
  const displayName = isOverig ? "Overig" : name;

  const projectColor = useProjectStore((s) => s.getColor(isOverig ? null : name));
  const storeUpsert = useProjectStore((s) => s.upsertProject);
  const storeUpdateColor = useProjectStore((s) => s.updateColor);
  const projects = useProjectStore((s) => s.projects);

  async function handleColorChange(color: string) {
    setShowColorPicker(false);
    const existing = projects.find((p) => p.name === name);
    if (existing) {
      storeUpdateColor(existing.id, color);
      await updateProjectColor(existing.id, color);
    } else {
      const project = await upsertProject(name, color);
      storeUpsert(project);
    }
  }

  function commitRename() {
    setEditing(false);
    if (nameVal.trim() && nameVal.trim() !== name && onRename) {
      onRename(name, nameVal.trim());
    }
  }

  const activeTasks = [...tasks]
    .filter((t) => t.status !== "done")
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  const doneTasks = [...tasks]
    .filter((t) => t.status === "done")
    .sort((a, b) =>
      new Date(b.completed_at ?? b.updated_at).getTime() -
      new Date(a.completed_at ?? a.updated_at).getTime()
    );

  return (
    <div className="flex flex-col w-72 shrink-0">
      {/* Kolomheader */}
      <div className="flex items-center gap-2 mb-3 px-1">
        {isVlaggetjes && (
          <svg className="w-3.5 h-3.5 shrink-0" style={{ color: "#6B9BF5" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        )}

        {!isOverig && !isVlaggetjes && (
          <div className="relative">
            <button
              onClick={() => setShowColorPicker((v) => !v)}
              className="shrink-0 transition-transform hover:scale-110"
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: projectColor ?? "#D1D5DB",
                outline: `2px solid ${projectColor ? `${projectColor}40` : "rgba(0,0,0,0.08)"}`,
                outlineOffset: 1,
              }}
              title="Kleur kiezen"
            />
            {showColorPicker && (
              <div
                className="absolute top-6 left-0 z-20 rounded-2xl p-2 flex flex-wrap gap-1.5"
                style={{
                  background: "rgba(255,253,250,0.95)",
                  backdropFilter: "blur(8px)",
                  border: "0.5px solid rgba(255,255,255,0.7)",
                  boxShadow: "0 8px 32px -8px rgba(60,40,30,.2)",
                  width: 144,
                }}
              >
                {PROJECT_COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.color}
                    onClick={() => handleColorChange(preset.color)}
                    title={preset.label}
                    className="rounded-full hover:scale-110 transition-transform"
                    style={{ width: 22, height: 22, background: preset.color }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {editing && !isOverig ? (
          <input
            autoFocus
            value={nameVal}
            onChange={(e) => setNameVal(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") setEditing(false);
            }}
            className="text-xs font-bold uppercase tracking-widest bg-transparent outline-none flex-1 border-b"
            style={{ color: projectColor ?? "#1A1410", borderColor: projectColor ?? "#FF5A1F" }}
          />
        ) : (
          <button
            onClick={() => !isOverig && !isVlaggetjes && setEditing(true)}
            className="text-xs font-bold uppercase tracking-widest flex-1 text-left transition-opacity hover:opacity-70"
            style={{ color: isVlaggetjes ? "#6B9BF5" : projectColor ?? (isOverig ? "#9A8F84" : "#1A1410") }}
          >
            {displayName}
          </button>
        )}

        <span
          className="text-[10px] font-bold rounded-full flex items-center justify-center shrink-0"
          style={{
            width: 18,
            height: 18,
            color: projectColor ?? "#9A8F84",
            background: projectColor ? `${projectColor}15` : "rgba(0,0,0,0.05)",
          }}
        >
          {activeTasks.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className="flex flex-col gap-2 min-h-24 rounded-2xl p-2 transition-all"
        style={{
          background: isOver
            ? "rgba(255,90,31,0.04)"
            : "transparent",
          border: isOver
            ? "1.5px dashed rgba(255,90,31,0.3)"
            : "1.5px dashed transparent",
        }}
      >
        <SortableContext items={activeTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <AnimatePresence initial={false}>
            {activeTasks.map((task) => (
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

        {activeTasks.length === 0 && !isOver && (
          <div
            className="h-16 rounded-xl flex items-center justify-center text-xs"
            style={{
              border: "1.5px dashed rgba(0,0,0,0.06)",
              color: "#C7C0B8",
            }}
          >
            Sleep hier een taak
          </div>
        )}
      </div>

      {/* Afgeronde taken */}
      {doneTasks.length > 0 && (
        <div className="mt-2 px-1">
          <button
            onClick={() => setShowDone((v) => !v)}
            className="flex items-center gap-1.5 w-full py-1 text-xs font-semibold transition-colors"
            style={{ color: "#B8B0A8" }}
          >
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {showDone
                ? <><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
                : <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              }
            </svg>
            Afgerond — {doneTasks.length}
            <svg className={`w-3 h-3 ml-auto transition-transform ${showDone ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <AnimatePresence>
            {showDone && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-2 mt-1 overflow-hidden"
              >
                {doneTasks.map((task) => (
                  <TaskCard key={task.id} task={task} onEdit={() => onEdit(task)} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
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

  const projectNames = Array.from(
    new Set(activeTasks.map((t) => t.project).filter(Boolean) as string[])
  ).sort();

  const [extraProjects, setExtraProjects] = useState<string[]>([]);
  const [addingProject, setAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);

  const allProjects = Array.from(new Set([...projectNames, ...extraProjects]));
  const columns = [...allProjects, "__overig__"];

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );

  function getColumnForTask(task: Task): string {
    return task.project ?? "__overig__";
  }

  function getTasksForColumn(colId: string): Task[] {
    if (colId === "__overig__") return activeTasks.filter((t) => !t.project);
    return activeTasks.filter((t) => t.project === colId);
  }

  function handleDragStart({ active }: DragStartEvent) {
    setActiveTask(activeTasks.find((t) => t.id === active.id) ?? null);
  }

  const handleDragEnd = useCallback(({ active, over }: DragEndEvent) => {
    setActiveTask(null);
    setOverColumnId(null);
    if (!over) return;

    const draggedTask = activeTasks.find((t) => t.id === active.id);
    if (!draggedTask) return;

    let targetColId = String(over.id);
    const overTask = activeTasks.find((t) => t.id === over.id);
    if (overTask) targetColId = getColumnForTask(overTask);

    const currentColId = getColumnForTask(draggedTask);
    if (targetColId === currentColId) return;

    const newProject = targetColId === "__overig__" ? null : targetColId;
    onUpdate(draggedTask.id, { project: newProject });
  }, [activeTasks, onUpdate]);

  function handleDragOver({ over }: { over: DragEndEvent["over"] }) {
    if (!over) { setOverColumnId(null); return; }
    const overTask = activeTasks.find((t) => t.id === over.id);
    setOverColumnId(overTask ? getColumnForTask(overTask) : String(over.id));
  }

  function handleRename(oldName: string, newName: string) {
    activeTasks.filter((t) => t.project === oldName).forEach((t) => onUpdate(t.id, { project: newName }));
    setExtraProjects((prev) => prev.map((p) => (p === oldName ? newName : p)));
  }

  function addProject() {
    const name = newProjectName.trim();
    if (name && !allProjects.includes(name)) setExtraProjects((prev) => [...prev, name]);
    setNewProjectName("");
    setAddingProject(false);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
    >
      <div className="flex gap-5 overflow-x-auto pb-6 pt-2 px-1 min-h-[60vh]">
        {columns.map((col) => (
          <Column
            key={col}
            id={col}
            name={col === "__overig__" ? "Overig" : col}
            tasks={getTasksForColumn(col)}
            onEdit={onEdit}
            onRename={col !== "__overig__" ? handleRename : undefined}
            isOver={overColumnId === col}
          />
        ))}

        {/* Nieuw project */}
        <div className="w-72 shrink-0">
          {addingProject ? (
            <div
              className="rounded-2xl p-3"
              style={{
                background: "rgba(255,253,250,0.82)",
                backdropFilter: "blur(8px)",
                border: "0.5px solid rgba(255,255,255,0.7)",
                boxShadow: "0 1px 0 rgba(255,255,255,.7) inset, 0 4px 16px -4px rgba(60,40,30,.1)",
              }}
            >
              <input
                autoFocus
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addProject(); if (e.key === "Escape") setAddingProject(false); }}
                placeholder="Projectnaam…"
                className="w-full text-sm font-semibold bg-transparent outline-none placeholder:text-gray-300 mb-3"
                style={{ color: "#1A1410" }}
              />
              <div className="flex gap-2">
                <button
                  onClick={addProject}
                  className="flex-1 py-1.5 rounded-xl text-xs font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #FF7A45, #FF5A1F 60%, #FF3D8B)" }}
                >
                  Toevoegen
                </button>
                <button
                  onClick={() => setAddingProject(false)}
                  className="flex-1 py-1.5 rounded-xl text-xs font-semibold transition-colors"
                  style={{ background: "rgba(0,0,0,0.05)", color: "#6B6157" }}
                >
                  Annuleren
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingProject(true)}
              className="w-full h-12 rounded-2xl text-sm font-semibold transition-all flex items-center justify-center gap-2 hover:opacity-80"
              style={{
                border: "1.5px dashed rgba(255,90,31,0.25)",
                color: "#FF5A1F",
              }}
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
