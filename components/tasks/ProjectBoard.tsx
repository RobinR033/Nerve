"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, TouchSensor, useSensor, useSensors,
  useDroppable, useDraggable,
} from "@dnd-kit/core";
import { fetchProjects, updateProject } from "@/lib/supabase/projects";
import { fetchTaskPlanning, setTaskWeek, TaskPlanning } from "@/lib/supabase/projectPlanning";
import { useTaskStore } from "@/stores/taskStore";
import { TaskEditModal } from "./TaskEditModal";
import type { Project, Task } from "@/types/database";

// ─── Week helpers ─────────────────────────────────────────────────────────────

function isoWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function weekLabel(w: string): string {
  const [, num] = w.split("-W");
  return `W${num}`;
}

function generateWeeks(n: number): string[] {
  const today = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i * 7);
    return isoWeek(d);
  });
}

const WEEKS = generateWeeks(6); // huidig + 5 vooruit
const BACKLOG_ID = "backlog";

// ─── Mini taakkaartje ─────────────────────────────────────────────────────────

function TaskChip({
  task,
  onEdit,
  isDragging = false,
}: {
  task: Task;
  onEdit: () => void;
  isDragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: task.id });
  const style = transform
    ? { transform: `translate(${transform.x}px,${transform.y}px)`, zIndex: 50 }
    : undefined;

  const dotColor =
    task.priority === "urgent" ? "bg-red-500" :
    task.priority === "high"   ? "bg-yellow-400" : "hidden";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={[
        "flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs cursor-grab select-none",
        "bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow",
        isDragging ? "opacity-40" : "",
        task.status === "done" ? "opacity-50" : "",
      ].join(" ")}
    >
      {dotColor !== "hidden" && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />}
      <span
        className={["font-medium text-gray-800 leading-tight line-clamp-2", task.status === "done" ? "line-through text-gray-400" : ""].join(" ")}
        onClick={(e) => { e.stopPropagation(); onEdit(); }}
      >
        {task.title}
      </span>
    </div>
  );
}

// ─── Droppable cel ────────────────────────────────────────────────────────────

function DroppableCell({
  id,
  children,
  isCurrentWeek,
}: {
  id: string;
  children: React.ReactNode;
  isCurrentWeek?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={[
        "min-h-[80px] rounded-xl p-1.5 flex flex-col gap-1 transition-colors",
        isOver ? "bg-orange/10 ring-1 ring-orange/30" : isCurrentWeek ? "bg-orange/5" : "bg-gray-50/60",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

// ─── Status cel ──────────────────────────────────────────────────────────────

function StatusCell({ project, onSave }: { project: Project; onSave: (note: string) => void }) {
  const [value, setValue] = useState(project.status_note ?? "");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(v: string) {
    setValue(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onSave(v), 800);
  }

  return (
    <textarea
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      placeholder="Status…"
      rows={2}
      className="w-full resize-none text-xs text-gray-700 placeholder:text-gray-300 bg-transparent outline-none leading-relaxed"
    />
  );
}

// ─── Hoofdcomponent ───────────────────────────────────────────────────────────

export function ProjectBoard() {
  const tasks = useTaskStore((s) => s.tasks);
  const updateTask = useTaskStore((s) => s.updateTask);

  const [projects, setProjects] = useState<Project[]>([]);
  const [planning, setPlanning] = useState<TaskPlanning[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [editTask, setEditTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const currentWeek = isoWeek(new Date());

  useEffect(() => {
    async function load() {
      const [ps, pl] = await Promise.all([fetchProjects(), fetchTaskPlanning()]);
      setProjects(ps.filter((p) => p.name !== "Vlaggetjes"));
      setPlanning(pl);
      setLoading(false);
    }
    load();
  }, []);

  // Taken per project (werk, niet gearchiveerd)
  const werkTasks = tasks.filter((t) => t.archived_at === null && t.category !== "prive");

  function tasksForProject(projectName: string): Task[] {
    return werkTasks.filter((t) => t.project === projectName);
  }

  function weekForTask(taskId: string): string | null {
    return planning.find((p) => p.task_id === taskId)?.week ?? null;
  }

  function tasksInCell(projectName: string, week: string | null): Task[] {
    const all = tasksForProject(projectName);
    if (week === null) {
      return all.filter((t) => weekForTask(t.id) === null);
    }
    return all.filter((t) => weekForTask(t.id) === week);
  }

  function handleDragStart(e: DragStartEvent) {
    const task = tasks.find((t) => t.id === e.active.id);
    setActiveTask(task ?? null);
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveTask(null);
    const taskId = String(e.active.id);
    const overId = e.over?.id ? String(e.over.id) : null;
    if (!overId) return;

    // overId formaat: "backlog__ProjectNaam" of "week__2026-W17__ProjectNaam"
    let newWeek: string | null = null;
    if (overId.startsWith("week__")) {
      const parts = overId.split("__");
      newWeek = parts[1];
    }

    const current = weekForTask(taskId);
    if (current === newWeek) return;

    setPlanning((prev) => {
      const without = prev.filter((p) => p.task_id !== taskId);
      if (!newWeek) return without;
      return [...without, { id: "", user_id: "", task_id: taskId, week: newWeek, created_at: "" }];
    });

    await setTaskWeek(taskId, newWeek);
  }

  async function handleStatusSave(projectId: string, note: string) {
    await updateProject(projectId, { status_note: note });
  }

  if (loading) return <div className="py-20 text-center text-sm text-gray-400">Laden…</div>;

  const werkProjects = projects.filter((p) => p.type !== "interne_activiteit" || true); // toon alles

  return (
    <>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto -mx-4 md:mx-0" style={{ touchAction: "pan-x" }}>
          <div style={{ minWidth: `${220 + 180 + 120 + WEEKS.length * 140}px` }}>

            {/* Header rij */}
            <div className="flex gap-0 mb-1 px-4 md:px-0">
              <div className="w-[220px] shrink-0 px-2 pb-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Project</div>
              <div className="w-[180px] shrink-0 px-2 pb-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</div>
              <div className="w-[120px] shrink-0 px-2 pb-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Backlog</div>
              {WEEKS.map((w) => (
                <div key={w} className={["w-[140px] shrink-0 px-2 pb-2 text-[10px] font-bold uppercase tracking-wider", w === currentWeek ? "text-orange" : "text-gray-400"].join(" ")}>
                  {weekLabel(w)}{w === currentWeek ? " · Nu" : ""}
                </div>
              ))}
            </div>

            {/* Project rijen */}
            <div className="flex flex-col gap-1 px-4 md:px-0">
              {werkProjects.map((project) => {
                const projectTasks = tasksForProject(project.name);
                if (projectTasks.length === 0 && !project.status_note) return null;

                return (
                  <div key={project.id} className="flex gap-0 items-start group">

                    {/* Project naam */}
                    <div className="w-[220px] shrink-0 px-2 py-2 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
                      <span className="text-sm font-semibold text-gray-800 truncate">{project.name}</span>
                    </div>

                    {/* Status */}
                    <div className="w-[180px] shrink-0 px-2 py-2">
                      <StatusCell project={project} onSave={(note) => handleStatusSave(project.id, note)} />
                    </div>

                    {/* Backlog */}
                    <div className="w-[120px] shrink-0 px-1 py-1">
                      <DroppableCell id={`${BACKLOG_ID}__${project.name}`}>
                        {tasksInCell(project.name, null).map((t) => (
                          <TaskChip
                            key={t.id}
                            task={t}
                            onEdit={() => setEditTask(t)}
                            isDragging={activeTask?.id === t.id}
                          />
                        ))}
                      </DroppableCell>
                    </div>

                    {/* Week cellen */}
                    {WEEKS.map((w) => (
                      <div key={w} className="w-[140px] shrink-0 px-1 py-1">
                        <DroppableCell id={`week__${w}__${project.name}`} isCurrentWeek={w === currentWeek}>
                          {tasksInCell(project.name, w).map((t) => (
                            <TaskChip
                              key={t.id}
                              task={t}
                              onEdit={() => setEditTask(t)}
                              isDragging={activeTask?.id === t.id}
                            />
                          ))}
                        </DroppableCell>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Drag overlay */}
        <DragOverlay>
          {activeTask && (
            <div className="px-2 py-1 rounded-lg text-xs bg-white border border-orange shadow-xl font-medium text-gray-800 cursor-grabbing">
              {activeTask.title}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <TaskEditModal
        task={editTask}
        onClose={() => setEditTask(null)}
        onSave={async (id, data) => {
          updateTask(id, data);
          setEditTask(null);
        }}
      />
    </>
  );
}
