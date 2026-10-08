"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useTasks } from "@/hooks/useTasks";
import { useMeetings } from "@/hooks/useMeetings";
import { useProjectStore } from "@/stores/projectStore";
import { updateProject } from "@/lib/supabase/projects";
import { TaskRow } from "@/components/tasks/TaskRow";
import { TaskEditModal } from "@/components/tasks/TaskEditModal";
import { AskBox } from "@/components/meetings/AskBox";
import { formatMeetingDate } from "@/components/meetings/MeetingReviewCard";
import { summaryPreview } from "@/lib/utils/meetingList";
import { decisionLog, projectMeetings } from "@/lib/utils/projectDossier";
import type { Task } from "@/types/database";

/** Projectdossier: status, vragen, open acties, wacht-op, besluiten en tijdlijn van overleggen. */
export function ProjectDossierClient({ projectId }: { projectId: string }) {
  const project = useProjectStore((s) => s.projects.find((p) => p.id === projectId) ?? null);
  const upsertProject = useProjectStore((s) => s.upsertProject);
  const { tasks, complete, uncomplete, archive, update } = useTasks();
  const m = useMeetings("all");
  const router = useRouter();
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [showAllDecisions, setShowAllDecisions] = useState(false);

  const meetings = useMemo(
    () => (project ? projectMeetings(project.id, project.name, m.folders, m.meetings, tasks) : []),
    [project, m.folders, m.meetings, tasks],
  );
  const decisions = useMemo(() => decisionLog(meetings), [meetings]);
  const projectTasks = tasks.filter((t) => project && t.project === project.name && !t.archived_at && t.status !== "done" && !t.parent_id);
  const mine = projectTasks.filter((t) => !t.waiting_for);
  const waiting = projectTasks.filter((t) => t.waiting_for);

  if (!project) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <Link href="/projecten" className="text-[13px] font-semibold" style={{ color: "#FF5A1F" }}>← Projecten</Link>
        <p className="mt-6 text-[14px]" style={{ color: "#9A8F84" }}>Project laden…</p>
      </div>
    );
  }

  const meetingLabel = (id: string) => {
    const x = meetings.find((mm) => mm.id === id);
    return x ? `${x.title} · ${formatMeetingDate(x.held_at)}` : null;
  };
  const openMeeting = (id: string) => router.push(`/overleggen?overleg=${id}`);

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-10 space-y-4">
      <Link href="/projecten" className="text-[13px] font-semibold" style={{ color: "#FF5A1F" }}>← Projecten</Link>

      <header className="flex items-center gap-3">
        <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ background: project.color }} />
        <h1 className="font-display text-[28px] md:text-[32px] font-semibold leading-tight" style={{ color: "#1A1410", letterSpacing: "-.03em" }}>
          {project.name}
        </h1>
      </header>
      <p className="text-[13px] -mt-2" style={{ color: "#9A8F84" }}>
        {meetings.length} overleg{meetings.length === 1 ? "" : "gen"} · {mine.length} open actie{mine.length === 1 ? "" : "s"} · {waiting.length} wacht op
      </p>

      <Section title="Status" color={project.color}>
        <StatusBlock
          projectName={project.name}
          note={project.status_note}
          meetingIds={meetings.map((x) => x.id)}
          onUseAsNote={async (note) => {
            await updateProject(project.id, { status_note: note });
            upsertProject({ ...project, status_note: note });
          }}
        />
      </Section>

      <Section>
        <AskBox
          title={`Vraag over ${project.name}`}
          placeholder="Bijv. Wat is er afgesproken over de oplevering?"
          hint={meetings.length ? `Zoekt in de verslagen van ${meetings.length} overleg${meetings.length === 1 ? "" : "gen"}.` : "Nog geen overleggen bij dit project."}
          mode={{ kind: "cross", meetingIds: meetings.map((x) => x.id) }}
          meetingLabel={meetingLabel}
          onOpenMeeting={openMeeting}
        />
      </Section>

      <Section title={`Open acties (${mine.length})`} color="#FF5A1F">
        {mine.length === 0 ? (
          <Empty text="Geen open acties." />
        ) : (
          <div className="space-y-1.5">
            <AnimatePresence>
              {mine.map((t) => (
                <TaskRow key={t.id} task={t} onComplete={complete} onUncomplete={uncomplete} onArchive={archive} onEdit={() => setEditTask(t)} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </Section>

      <Section title={`Wacht op (${waiting.length})`} color="#2E6BFF">
        {waiting.length === 0 ? (
          <Empty text="Je wacht op niemand." />
        ) : (
          <div className="space-y-1.5">
            <AnimatePresence>
              {waiting.map((t) => (
                <div key={t.id}>
                  <p className="text-[11px] font-bold mb-0.5 px-1" style={{ color: "#2E6BFF" }}>{t.waiting_for}</p>
                  <TaskRow task={t} onComplete={complete} onUncomplete={uncomplete} onArchive={archive} onEdit={() => setEditTask(t)} />
                </div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </Section>

      <Section title={`Besluiten (${decisions.length})`} color="#1F9D55">
        {decisions.length === 0 ? (
          <Empty text="Nog geen besluiten gevonden in de verslagen (kopje “Besluiten”)." />
        ) : (
          <ul className="space-y-2">
            {(showAllDecisions ? decisions : decisions.slice(0, 8)).map((d, i) => (
              <li key={i} className="text-[13.5px] leading-snug" style={{ color: "#1A1410" }}>
                <span className="font-semibold tabular-nums mr-1.5" style={{ color: "#1F9D55" }}>
                  {new Date(d.heldAt).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
                </span>
                {d.text}
                <button onClick={() => openMeeting(d.meetingId)} className="ml-1.5 text-[11.5px]" style={{ color: "#9A8F84" }}>
                  ↳ {d.meetingTitle}
                </button>
              </li>
            ))}
            {decisions.length > 8 && (
              <button onClick={() => setShowAllDecisions((v) => !v)} className="text-[12.5px] font-semibold" style={{ color: "#1F9D55" }}>
                {showAllDecisions ? "Minder tonen" : `Alle ${decisions.length} tonen`}
              </button>
            )}
          </ul>
        )}
      </Section>

      <Section title={`Tijdlijn overleggen (${meetings.length})`} color="#7C3AED">
        {meetings.length === 0 ? (
          <Empty text="Nog geen overleggen. Zet een overleg in de projectmap of kies dit project bij een overleg." />
        ) : (
          <ol className="relative pl-4" style={{ borderLeft: "2px solid rgba(124,58,237,0.2)" }}>
            {meetings.map((x) => {
              const preview = summaryPreview(x.summary);
              return (
                <li key={x.id} className="mb-3 last:mb-0">
                  <span className="absolute -left-[5px] w-2 h-2 rounded-full mt-1.5" style={{ background: "#7C3AED" }} />
                  <button onClick={() => openMeeting(x.id)} className="text-left w-full">
                    <p className="text-[11.5px] font-semibold" style={{ color: "#7C3AED" }}>{formatMeetingDate(x.held_at)}</p>
                    <p className="text-[14px] font-semibold" style={{ color: "#1A1410" }}>{x.title}</p>
                    {preview && <p className="text-[12.5px] leading-snug line-clamp-2" style={{ color: "#6B6157" }}>{preview}</p>}
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </Section>

      <TaskEditModal
        task={editTask}
        onClose={() => setEditTask(null)}
        onSave={async (id, data) => {
          await update(id, data);
          setEditTask(null);
        }}
      />
    </div>
  );
}

function StatusBlock({
  projectName,
  note,
  meetingIds,
  onUseAsNote,
}: {
  projectName: string;
  note: string | null;
  meetingIds: string[];
  onUseAsNote: (note: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/projects/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: projectName, meetingIds: meetingIds.slice(0, 10) }),
      });
      const body = (await res.json().catch(() => ({}))) as { status?: string; error?: string };
      if (!res.ok || !body.status) setError(body.error ?? `Fout ${res.status}`);
      else setDraft(body.status);
    } catch {
      setError("Geen verbinding");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {note ? (
        <p className="text-[13.5px] leading-relaxed whitespace-pre-line" style={{ color: "#1A1410" }}>{note}</p>
      ) : (
        <p className="text-[13px]" style={{ color: "#9A8F84" }}>Nog geen statusnotitie.</p>
      )}

      {draft && (
        <div className="rounded-xl p-3" style={{ background: "rgba(124,58,237,0.07)" }}>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: "#7C3AED" }}>Voorstel van AI</p>
          <p className="text-[13.5px] leading-relaxed whitespace-pre-line" style={{ color: "#1A1410" }}>{draft}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <button
              onClick={async () => {
                await onUseAsNote(draft);
                setDraft(null);
              }}
              className="h-8 px-3 rounded-lg text-[12.5px] font-semibold text-white"
              style={{ background: "#7C3AED" }}
            >
              Gebruik als statusnotitie
            </button>
            <button onClick={() => navigator.clipboard?.writeText(draft)} className="h-8 px-3 rounded-lg text-[12.5px] font-semibold" style={{ color: "#7C3AED", background: "rgba(124,58,237,0.1)" }}>
              Kopieer
            </button>
            <button onClick={() => setDraft(null)} className="h-8 px-2 text-[12.5px]" style={{ color: "#9A8F84" }}>
              Weg
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-[12.5px]" style={{ color: "#E5484D" }}>{error}</p>}

      <button
        onClick={generate}
        disabled={busy}
        className="h-8 px-3 rounded-lg text-[12.5px] font-semibold disabled:opacity-60"
        style={{ color: "#7C3AED", background: "rgba(124,58,237,0.08)" }}
      >
        {busy ? "Status maken…" : "✦ Maak status in 5 regels"}
      </button>
    </div>
  );
}

function Section({ title, color = "#9A8F84", children }: { title?: string; color?: string; children: React.ReactNode }) {
  return (
    <section
      className="rounded-2xl p-4"
      style={{
        background: "rgba(255,253,250,0.78)",
        border: "0.5px solid rgba(255,255,255,0.65)",
        boxShadow: "0 1px 0 rgba(255,255,255,.7) inset, 0 6px 24px -10px rgba(60,40,30,0.15)",
      }}
    >
      {title && <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color }}>{title}</p>}
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-[13px]" style={{ color: "#9A8F84" }}>{text}</p>;
}
