"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { fetchProjects, updateProject, upsertProject } from "@/lib/supabase/projects";
import { getAllocations, upsertAllocation } from "@/lib/supabase/allocations";
import type { Allocation, Project, ProjectType } from "@/types/database";
import { PROJECT_COLOR_PRESETS } from "@/types/database";

// ─── Week utilities ──────────────────────────────────────────────────────────

function isoWeekLabel(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function weekLabelToMonday(label: string): Date {
  const [yearStr, wStr] = label.split("-W");
  const year = parseInt(yearStr);
  const week = parseInt(wStr);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - (jan4.getUTCDay() || 7) + 1 + (week - 1) * 7);
  return monday;
}

function formatWeekLabel(label: string): string {
  const monday = weekLabelToMonday(label);
  const friday = new Date(monday);
  friday.setUTCDate(monday.getUTCDate() + 4);
  const [, wStr] = label.split("-W");
  return `W${wStr} · ${monday.getUTCDate()}/${monday.getUTCMonth() + 1}`;
}

function generateWeeks(startOffset: number, count: number): string[] {
  const today = new Date();
  const weeks: string[] = [];
  for (let i = startOffset; i < startOffset + count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i * 7);
    weeks.push(isoWeekLabel(d));
  }
  return weeks;
}

// ─── Cel editor ──────────────────────────────────────────────────────────────

const HALFDAY_OPTIONS = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];

function CellEditor({
  value,
  onSave,
  onClose,
}: {
  value: number;
  onSave: (v: number) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState(value);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl p-3 w-48"
    >
      <p className="text-xs text-gray-400 mb-2 font-medium">Dagdelen (max 10)</p>
      <div className="grid grid-cols-4 gap-1 mb-3">
        {HALFDAY_OPTIONS.map((v) => (
          <button
            key={v}
            onClick={() => setSelected(v)}
            className={[
              "py-1 rounded-lg text-xs font-semibold transition-all",
              selected === v ? "bg-orange text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200",
            ].join(" ")}
          >
            {v === 0 ? "–" : v}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={onClose} className="flex-1 py-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-600">Annuleer</button>
        <button
          onClick={() => { onSave(selected); onClose(); }}
          className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-orange text-white"
        >
          Opslaan
        </button>
      </div>
    </motion.div>
  );
}

// ─── Project rij label + type badge ─────────────────────────────────────────

function TypeBadge({ type }: { type: ProjectType }) {
  return (
    <span className={[
      "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
      type === "project" ? "bg-blue-100 text-blue-600" : "bg-amber-100 text-amber-700",
    ].join(" ")}>
      {type === "project" ? "Project" : "Intern"}
    </span>
  );
}

// ─── Nieuw project modal ──────────────────────────────────────────────────────

function NewProjectModal({ onSave, onClose }: { onSave: (p: Project) => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<ProjectType>("project");
  const [color, setColor] = useState<string>(PROJECT_COLOR_PRESETS[6].color);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const p = await upsertProject(name.trim(), color, type);
      onSave(p);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4"
      >
        <h3 className="font-display text-xl font-bold text-gray-900 mb-4">Nieuw project</h3>

        <div className="space-y-4">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Naam"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange"
          />

          <div>
            <p className="text-xs text-gray-400 mb-2 font-medium">Type</p>
            <div className="flex gap-2">
              {(["project", "interne_activiteit"] as ProjectType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={[
                    "flex-1 py-2 rounded-xl text-xs font-semibold transition-all",
                    type === t ? "bg-orange text-white" : "bg-gray-100 text-gray-600",
                  ].join(" ")}
                >
                  {t === "project" ? "Project" : "Interne activiteit"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-2 font-medium">Kleur</p>
            <div className="flex gap-1.5 flex-wrap">
              {PROJECT_COLOR_PRESETS.map((p) => (
                <button
                  key={p.color}
                  onClick={() => setColor(p.color)}
                  className="w-7 h-7 rounded-full border-2 transition-all"
                  style={{ backgroundColor: p.color, borderColor: color === p.color ? p.color : "transparent" }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-gray-400 hover:text-gray-600">Annuleer</button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-orange text-white disabled:opacity-50"
          >
            {saving ? "Opslaan…" : "Toevoegen"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Hoofdcomponent ───────────────────────────────────────────────────────────

const WEEKS_BACK = 4;
const WEEKS_FORWARD = 12;
const TOTAL_CAPACITY = 10; // dagdelen per week per persoon (standaard)

export function PlanningClient() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [activeTab, setActiveTab] = useState<"matrix" | "overzicht">("matrix");
  const [unit, setUnit] = useState<"dagdelen" | "procent">("dagdelen");
  const [editingCell, setEditingCell] = useState<{ projectId: string; week: string } | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  const weeks = useMemo(() => generateWeeks(-WEEKS_BACK, WEEKS_BACK + WEEKS_FORWARD), []);
  const currentWeek = isoWeekLabel(new Date());

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [ps, as] = await Promise.all([fetchProjects(), getAllocations(weeks)]);
        setProjects(ps.filter((p) => p.name !== "Vlaggetjes"));
        setAllocations(as);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [weeks]);

  const allocationMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of allocations) {
      map[`${a.project_id}__${a.week}`] = a.halfdays;
    }
    return map;
  }, [allocations]);

  const handleCellSave = useCallback(async (projectId: string, week: string, halfdays: number) => {
    await upsertAllocation(projectId, week, halfdays);
    setAllocations((prev) => {
      const key = `${projectId}__${week}`;
      const without = prev.filter((a) => !(a.project_id === projectId && a.week === week));
      if (halfdays === 0) return without;
      return [...without, { id: key, user_id: "", project_id: projectId, week, halfdays, created_at: "" }];
    });
  }, []);

  // Grafieksdata per week
  const chartData = useMemo(() => {
    const visibleWeeks = showHistory ? weeks : weeks.filter((w) => w >= currentWeek);
    return visibleWeeks.map((week) => {
      const totalHalfdays = projects.reduce((sum, p) => sum + (allocationMap[`${p.id}__${week}`] ?? 0), 0);
      const projectHalfdays = projects
        .filter((p) => p.type === "project")
        .reduce((sum, p) => sum + (allocationMap[`${p.id}__${week}`] ?? 0), 0);
      const capaciteitPct = Math.round((totalHalfdays / TOTAL_CAPACITY) * 100);
      const declarabiliteitPct = Math.round((projectHalfdays / TOTAL_CAPACITY) * 100);
      const [, wStr] = week.split("-W");
      return { week: `W${wStr}`, capaciteit: capaciteitPct, declarabiliteit: declarabiliteitPct };
    });
  }, [weeks, currentWeek, projects, allocationMap, showHistory]);

  const projecten = projects.filter((p) => p.type === "project");
  const intern = projects.filter((p) => p.type === "interne_activiteit");

  function cellValue(projectId: string, week: string) {
    return allocationMap[`${projectId}__${week}`] ?? 0;
  }

  function displayValue(v: number): string {
    if (v === 0) return "";
    if (unit === "procent") return `${Math.round((v / TOTAL_CAPACITY) * 100)}%`;
    return v % 1 === 0 ? String(v) : v.toFixed(1);
  }

  function cellBg(v: number, project: Project): string {
    if (v === 0) return "";
    const alpha = Math.min(0.15 + (v / TOTAL_CAPACITY) * 0.55, 0.7);
    return `${project.color}${Math.round(alpha * 255).toString(16).padStart(2, "0")}`;
  }

  const visibleWeeks = weeks.filter((w) => w >= currentWeek || showHistory);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Laden…</div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] pb-24">
      {/* Header */}
      <div className="px-4 md:px-8 pt-6 pb-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Planning</h1>
          <p className="text-sm text-gray-400">Capaciteit per project per week</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewProject(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-orange text-white text-sm font-semibold rounded-xl"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Project
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 md:px-8 mb-4 flex items-center gap-1 border-b border-gray-100">
        {(["matrix", "overzicht"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={[
              "px-4 py-2.5 text-sm font-semibold capitalize border-b-2 -mb-px transition-all",
              activeTab === tab ? "border-orange text-orange" : "border-transparent text-gray-400 hover:text-gray-700",
            ].join(" ")}
          >
            {tab === "matrix" ? "Matrix" : "Overzicht"}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2 pb-1">
          <button
            onClick={() => setShowHistory((v) => !v)}
            className={[
              "text-xs px-2.5 py-1 rounded-lg font-medium transition-all",
              showHistory ? "bg-gray-200 text-gray-700" : "bg-gray-100 text-gray-400",
            ].join(" ")}
          >
            {showHistory ? "Incl. verleden" : "Toekomst"}
          </button>
          {activeTab === "overzicht" && (
            <div className="flex items-center rounded-lg overflow-hidden border border-gray-200">
              {(["dagdelen", "procent"] as const).map((u) => (
                <button
                  key={u}
                  onClick={() => setUnit(u)}
                  className={[
                    "px-3 py-1 text-xs font-semibold transition-all",
                    unit === u ? "bg-orange text-white" : "bg-white text-gray-500",
                  ].join(" ")}
                >
                  {u === "dagdelen" ? "Dagdelen" : "%"}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {activeTab === "matrix" && (
        <div className="px-4 md:px-8 overflow-x-auto">
          <table className="w-full border-collapse text-sm" style={{ minWidth: `${200 + visibleWeeks.length * 72}px` }}>
            <thead>
              <tr>
                <th className="text-left py-2 pr-4 text-xs text-gray-400 font-medium w-48 sticky left-0 bg-[#FAFAF8]">Project</th>
                {visibleWeeks.map((week) => (
                  <th
                    key={week}
                    className={[
                      "py-2 px-1 text-xs font-medium text-center",
                      week === currentWeek ? "text-orange" : "text-gray-400",
                    ].join(" ")}
                    style={{ minWidth: 64 }}
                  >
                    {formatWeekLabel(week)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Projecten */}
              {projecten.length > 0 && (
                <>
                  <tr>
                    <td colSpan={visibleWeeks.length + 1} className="py-1.5 px-0">
                      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Projecten</span>
                    </td>
                  </tr>
                  {projecten.map((project) => (
                    <ProjectRow
                      key={project.id}
                      project={project}
                      weeks={visibleWeeks}
                      currentWeek={currentWeek}
                      cellValue={cellValue}
                      displayValue={displayValue}
                      cellBg={cellBg}
                      editingCell={editingCell}
                      setEditingCell={setEditingCell}
                      onSave={handleCellSave}
                    />
                  ))}
                </>
              )}

              {/* Interne activiteiten */}
              {intern.length > 0 && (
                <>
                  <tr>
                    <td colSpan={visibleWeeks.length + 1} className="py-1.5 px-0 pt-4">
                      <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Interne activiteiten</span>
                    </td>
                  </tr>
                  {intern.map((project) => (
                    <ProjectRow
                      key={project.id}
                      project={project}
                      weeks={visibleWeeks}
                      currentWeek={currentWeek}
                      cellValue={cellValue}
                      displayValue={displayValue}
                      cellBg={cellBg}
                      editingCell={editingCell}
                      setEditingCell={setEditingCell}
                      onSave={handleCellSave}
                    />
                  ))}
                </>
              )}

              {/* Totaalrij */}
              <tr className="border-t-2 border-gray-200">
                <td className="py-2 pr-4 text-xs font-bold text-gray-500 sticky left-0 bg-[#FAFAF8]">Totaal</td>
                {visibleWeeks.map((week) => {
                  const total = projects.reduce((sum, p) => sum + cellValue(p.id, week), 0);
                  const pct = Math.round((total / TOTAL_CAPACITY) * 100);
                  const over = total > TOTAL_CAPACITY;
                  return (
                    <td key={week} className={["py-2 px-1 text-center text-xs font-bold", over ? "text-red-500" : "text-gray-700"].join(" ")}>
                      {total > 0 ? (unit === "procent" ? `${pct}%` : total % 1 === 0 ? total : total.toFixed(1)) : ""}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "overzicht" && (
        <div className="px-4 md:px-8 space-y-6">
          {/* Tabel */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm" style={{ minWidth: `${200 + visibleWeeks.length * 80}px` }}>
              <thead>
                <tr>
                  <th className="text-left py-2 pr-4 text-xs text-gray-400 font-medium w-48 sticky left-0 bg-[#FAFAF8]">Project</th>
                  {visibleWeeks.map((week) => (
                    <th key={week} className={["py-2 px-2 text-xs font-medium text-center", week === currentWeek ? "text-orange" : "text-gray-400"].join(" ")} style={{ minWidth: 72 }}>
                      {formatWeekLabel(week)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id} className="border-t border-gray-100">
                    <td className="py-2 pr-4 sticky left-0 bg-[#FAFAF8]">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
                        <span className="text-xs font-medium text-gray-700 truncate max-w-[120px]">{project.name}</span>
                        <TypeBadge type={project.type} />
                      </div>
                    </td>
                    {visibleWeeks.map((week) => {
                      const v = cellValue(project.id, week);
                      return (
                        <td key={week} className="py-2 px-2 text-center text-xs text-gray-700 font-medium">
                          {v > 0 ? displayValue(v) : <span className="text-gray-200">–</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="border-t-2 border-gray-200">
                  <td className="py-2 pr-4 text-xs font-bold text-gray-500 sticky left-0 bg-[#FAFAF8]">Totaal</td>
                  {visibleWeeks.map((week) => {
                    const total = projects.reduce((sum, p) => sum + cellValue(p.id, week), 0);
                    const over = total > TOTAL_CAPACITY;
                    return (
                      <td key={week} className={["py-2 px-2 text-center text-xs font-bold", over ? "text-red-500" : "text-gray-700"].join(" ")}>
                        {total > 0 ? displayValue(total) : ""}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Grafiek */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">Capaciteit & declarabiliteit</h3>
                <p className="text-xs text-gray-400">% van beschikbare capaciteit (10 dagdelen/week)</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10, fill: "#9CA3AF" }} domain={[0, 120]} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine y={100} stroke="#EF4444" strokeDasharray="4 2" label={{ value: "100%", fill: "#EF4444", fontSize: 10 }} />
                <Bar dataKey="capaciteit" name="Capaciteitsbenutting" fill="#3B82F6" radius={[4, 4, 0, 0]} opacity={0.8} />
                <Bar dataKey="declarabiliteit" name="Declarabiliteit" fill="#FF6B00" radius={[4, 4, 0, 0]} opacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showNewProject && (
          <NewProjectModal
            onSave={(p) => { setProjects((prev) => [...prev, p]); setShowNewProject(false); }}
            onClose={() => setShowNewProject(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── ProjectRow ───────────────────────────────────────────────────────────────

function ProjectRow({
  project, weeks, currentWeek, cellValue, displayValue, cellBg,
  editingCell, setEditingCell, onSave,
}: {
  project: Project;
  weeks: string[];
  currentWeek: string;
  cellValue: (id: string, week: string) => number;
  displayValue: (v: number) => string;
  cellBg: (v: number, p: Project) => string;
  editingCell: { projectId: string; week: string } | null;
  setEditingCell: (v: { projectId: string; week: string } | null) => void;
  onSave: (projectId: string, week: string, halfdays: number) => Promise<void>;
}) {
  return (
    <tr className="border-t border-gray-100 group">
      <td className="py-2 pr-4 sticky left-0 bg-[#FAFAF8]">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
          <span className="text-xs font-medium text-gray-700 truncate max-w-[120px]">{project.name}</span>
        </div>
      </td>
      {weeks.map((week) => {
        const v = cellValue(project.id, week);
        const isEditing = editingCell?.projectId === project.id && editingCell?.week === week;
        const bg = cellBg(v, project);
        return (
          <td key={week} className="py-1 px-1 text-center relative">
            <button
              onClick={() => setEditingCell(isEditing ? null : { projectId: project.id, week })}
              className={[
                "w-full h-8 rounded-lg text-xs font-semibold transition-all",
                week === currentWeek ? "ring-1 ring-orange/30" : "",
                v > 0 ? "text-gray-800" : "text-gray-200 hover:text-gray-400 hover:bg-gray-50",
              ].join(" ")}
              style={bg ? { backgroundColor: bg } : undefined}
            >
              {v > 0 ? displayValue(v) : "·"}
            </button>
            <AnimatePresence>
              {isEditing && (
                <CellEditor
                  value={v}
                  onSave={(newV) => onSave(project.id, week, newV)}
                  onClose={() => setEditingCell(null)}
                />
              )}
            </AnimatePresence>
          </td>
        );
      })}
    </tr>
  );
}
