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
  };

  const isLate = task.status === "late";
  const isDone = task.status === "done";
  const getSubtasks = useTaskStore((s) => s.getSubtasks);
  const subtasks = task.parent_id ? [] : getSubtasks(task.id);
  const doneSubtasks = subtasks.filter((s) => s.status === "done").length;
  const totalSubtasks = subtasks.length;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        "bg-white rounded-xl border px-3.5 py-3 select-none",
        "hover:shadow-md transition-all",
        overlay ? "shadow-2xl rotate-1 scale-105 cursor-grabbing" : "cursor-grab active:cursor-grabbing shadow-sm",
        isDragging ? "opacity-30" : "",
        isDone ? "opacity-60" : "",
        isLate ? "border-red-200" : "border-gray-100",
      ].join(" ")}
    >
      {/* Drag handle area — touch-none voorkomt scroll-conflict op iOS */}
      <div {...attributes} {...listeners} className="flex items-start gap-2 touch-none">
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
            {totalSubtasks > 0 && (
              <span className="text-xs text-gray-400">{doneSubtasks}/{totalSubtasks}</span>
            )}
          </div>
          {/* Subtaak voortgangsbalk */}
          {totalSubtasks > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${(doneSubtasks / totalSubtasks) * 100}%`, backgroundColor: doneSubtasks === totalSubtasks ? "#16A34A" : "#F97316" }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Klik om te bewerken — apart van drag */}
      <button
        onClick={onEdit}
        className="mt-2 text-xs text-gray-300 hover:text-orange transition-colors"
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

// ─── Droppable kolom ──────────────────────────────────────────────────────────

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
        {/* Enveloppe-icoon voor Vlaggetjes kolom */}
        {isVlaggetjes && (
          <svg className="w-3.5 h-3.5 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        )}

        {/* Gekleurde dot — klik om kleur te kiezen */}
        {!isOverig && !isVlaggetjes && (
          <div className="relative">
            <button
              onClick={() => setShowColorPicker((v) => !v)}
              className="w-3 h-3 rounded-full shrink-0 ring-2 ring-white hover:ring-gray-200 transition-all"
              style={{ backgroundColor: projectColor ?? "#D1D5DB" }}
              title="Kleur kiezen"
            />
            {showColorPicker && (
              <div className="absolute top-5 left-0 z-20 bg-white rounded-xl shadow-lg border border-gray-100 p-2 flex flex-wrap gap-1.5 w-40">
                {PROJECT_COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.color}
                    onClick={() => handleColorChange(preset.color)}
                    title={preset.label}
                    className="w-6 h-6 rounded-full hover:scale-110 transition-transform ring-2 ring-transparent hover:ring-gray-300"
                    style={{ backgroundColor: preset.color }}
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
            className="text-sm font-bold text-gray-900 bg-transparent border-b-2 border-orange outline-none flex-1"
          />
        ) : (
          <button
            onClick={() => !isOverig && !isVlaggetjes && setEditing(true)}
            className={`text-sm font-bold uppercase tracking-wider flex-1 text-left transition-colors ${
              !isOverig && !isVlaggetjes ? "hover:opacity-70" : "text-gray-400"
            }`}
            style={{ color: isVlaggetjes ? "#3B82F6" : projectColor ?? (isOverig ? "#9CA3AF" : "#111111") }}
          >
            {displayName}
          </button>
        )}
        <span className="text-xs font-semibold text-gray-300 bg-gray-100 rounded-full w-5 h-5 flex items-center justify-center shrink-0">
          {activeTasks.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={[
          "flex flex-col gap-2 min-h-24 rounded-xl p-2 transition-colors",
          isOver ? "bg-orange/5 ring-2 ring-orange/30 ring-dashed" : "",
        ].join(" ")}
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
          <div className="h-16 rounded-xl border-2 border-dashed border-gray-100 flex items-center justify-center text-xs text-gray-300">
            Sleep hier een taak naartoe
          </div>
        )}
      </div>

      {/* Afgeronde taken */}
      {doneTasks.length > 0 && (
        <div className="mt-2 px-2">
          <button
            onClick={() => setShowDone((v) => !v)}
            className="flex items-center gap-1.5 w-full py-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showDone ? (
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            )}
            <span className="font-semibold">Afgerond — {doneTasks.length}</span>
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

// Achtergrondopties — subtiele tinten die passen bij de Nerve huisstijl
const BG_PRESETS = [
  { id: "default", label: "Standaard", value: "transparent" },
  { id: "warm",    label: "Warm",      value: "#FFF8F3" }, // zacht oranje tint
  { id: "koel",    label: "Koel",      value: "#F3F6FB" }, // zacht blauw tint
  { id: "zand",    label: "Zand",      value: "#FAF7F0" }, // zand/crème
] as const;

type BgPresetId = typeof BG_PRESETS[number]["id"];

function useBoardBg(): [string, (id: BgPresetId) => void] {
  const [bgId, setBgId] = useState<BgPresetId>(() => {
    if (typeof window === "undefined") return "default";
    return (localStorage.getItem("nerve-kanban-bg") as BgPresetId) ?? "default";
  });
  const setBg = (id: BgPresetId) => {
    setBgId(id);
    localStorage.setItem("nerve-kanban-bg", id);
  };
  const value = BG_PRESETS.find((p) => p.id === bgId)?.value ?? "transparent";
  return [value, setBg];
}

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
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [bgColor, setBgColor] = useBoardBg();

  const allProjects = Array.from(new Set([...projectNames, ...extraProjects]));
  const columns = [...allProjects, "__overig__"];

  const sensors = useSensors(
    // Muis: direct slepen na 8px beweging
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    // Touch (iOS/Android): lange druk van 200ms voorkomt conflict met scroll
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

    // over.id is óf een kolom-id óf een taak-id
    let targetColId = String(over.id);

    // Als het een taak-id is, pak de kolom van die taak
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
      {/* Achtergrond + kleurkiezer */}
      <div
        className="rounded-2xl transition-colors duration-300 relative"
        style={{ background: bgColor !== "transparent" ? bgColor : undefined }}
      >
        {/* Achtergrond-knop */}
        <div className="flex justify-end px-1 pt-1 pb-0">
          <div className="relative">
            <button
              onClick={() => setShowBgPicker((v) => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-gray-400 hover:text-gray-600 hover:bg-black/5 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Achtergrond
            </button>
            {showBgPicker && (
              <div className="absolute right-0 top-8 z-30 bg-white rounded-xl shadow-lg border border-gray-100 p-2 flex gap-2">
                {BG_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => { setBgColor(preset.id); setShowBgPicker(false); }}
                    className="flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div
                      className="w-8 h-8 rounded-lg border-2 border-gray-200"
                      style={{ background: preset.value === "transparent" ? "#FAFAF8" : preset.value }}
                    />
                    <span className="text-[10px] text-gray-500 font-medium">{preset.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

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
                <button onClick={addProject} className="flex-1 py-1.5 rounded-lg bg-orange text-white text-xs font-semibold hover:bg-orange-dark transition-colors">Toevoegen</button>
                <button onClick={() => setAddingProject(false)} className="flex-1 py-1.5 rounded-lg bg-gray-100 text-gray-500 text-xs font-semibold hover:bg-gray-200 transition-colors">Annuleren</button>
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
      </div>{/* einde achtergrond wrapper */}

      <DragOverlay>
        {activeTask && <TaskCard task={activeTask} overlay />}
      </DragOverlay>
    </DndContext>
  );
}
