"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchStore } from "@/stores/searchStore";
import { useTasks } from "@/hooks/useTasks";
import { searchMeetings, type MeetingHit } from "@/lib/supabase/meetings";
import { summaryPreview } from "@/lib/utils/meetingList";
import { TaskEditModal } from "@/components/tasks/TaskEditModal";
import type { Task } from "@/types/database";

/** Zoeken in taken en overleggen; resultaten verschijnen direct onder de balk */
export function SearchBar() {
  const { query, setQuery, clear } = useSearchStore();
  const { tasks, update } = useTasks();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [meetings, setMeetings] = useState<MeetingHit[]>([]);
  const [editTask, setEditTask] = useState<Task | null>(null);

  const q = query.trim().toLocaleLowerCase("nl");

  // Taken: direct uit het geheugen
  const taskHits = useMemo(() => {
    if (q.length < 2) return [];
    return tasks
      .filter((t) => !t.archived_at)
      .filter((t) =>
        [t.title, t.project ?? "", t.description ?? "", t.waiting_for ?? ""].some((v) => v.toLocaleLowerCase("nl").includes(q)),
      )
      .sort((a, b) => Number(a.status === "done") - Number(b.status === "done"))
      .slice(0, 6);
  }, [tasks, q]);

  // Overleggen: in de database, even wachten tot je uitgetypt bent
  useEffect(() => {
    if (q.length < 2) return;
    const timer = setTimeout(() => {
      searchMeetings(q)
        .then(setMeetings)
        .catch((err) => console.error("Overleggen zoeken mislukt:", err));
    }, 250);
    return () => clearTimeout(timer);
  }, [q]);

  // Klik buiten de balk sluit de resultaten
  useEffect(() => {
    function onDown(e: MouseEvent | TouchEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, []);

  const meetingHits = q.length < 2 ? [] : meetings;
  const showResults = open && q.length >= 2;

  return (
    <div ref={boxRef} className="relative flex items-center gap-2 flex-1 mr-3" style={{ maxWidth: 280 }}>
      <div
        className="flex items-center gap-2 flex-1 rounded-xl px-3"
        style={{
          height: 34,
          background: "rgba(255,255,255,0.6)",
          backdropFilter: "var(--backdrop-blur-sm)",
          WebkitBackdropFilter: "var(--backdrop-blur-sm)",
          border: "0.5px solid rgba(255,255,255,0.7)",
          boxShadow: "0 1px 0 rgba(255,255,255,.6) inset, 0 1px 6px -2px rgba(60,40,30,.08)",
        }}
      >
        <svg className="shrink-0" style={{ width: 13, height: 13, color: "#9A8F84" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
          <circle cx="11" cy="11" r="8" />
          <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
        </svg>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              inputRef.current?.blur();
            }
          }}
          placeholder="Zoek taken en overleggen…"
          style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none", fontSize: 13, color: "#1A1410", letterSpacing: "-.01em" }}
        />
        {query && (
          <button
            onClick={() => {
              clear();
              inputRef.current?.focus();
            }}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "#9A8F84", lineHeight: 1, fontSize: 16, padding: 0 }}
            aria-label="Zoekopdracht wissen"
          >
            ×
          </button>
        )}
      </div>

      {showResults && (
        <div
          className="absolute left-0 top-[40px] z-50 rounded-2xl p-2 overflow-y-auto"
          style={{
            width: "min(380px, calc(100vw - 32px))",
            maxHeight: "70vh",
            background: "rgba(255,253,250,0.97)",
            border: "0.5px solid rgba(0,0,0,0.08)",
            boxShadow: "0 12px 40px -12px rgba(60,40,30,0.35)",
          }}
        >
          {taskHits.length === 0 && meetingHits.length === 0 && (
            <p className="px-2 py-3 text-[13px]" style={{ color: "#9A8F84" }}>Niets gevonden voor “{query.trim()}”.</p>
          )}

          {taskHits.length > 0 && (
            <ResultGroup title="Taken" color="#FF5A1F">
              {taskHits.map((t) => (
                <ResultRow
                  key={t.id}
                  title={t.title}
                  sub={[t.project, t.waiting_for ? `wacht op ${t.waiting_for}` : null, t.status === "done" ? "afgerond" : null].filter(Boolean).join(" · ")}
                  done={t.status === "done"}
                  onClick={() => {
                    setOpen(false);
                    setEditTask(t);
                  }}
                />
              ))}
            </ResultGroup>
          )}

          {meetingHits.length > 0 && (
            <ResultGroup title="Overleggen" color="#7C3AED">
              {meetingHits.map((m) => (
                <ResultRow
                  key={m.id}
                  title={m.title}
                  sub={[
                    new Date(m.held_at).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" }),
                    summaryPreview(m.summary).slice(0, 80),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  onClick={() => {
                    setOpen(false);
                    router.push(`/overleggen?overleg=${m.id}`);
                  }}
                />
              ))}
            </ResultGroup>
          )}
        </div>
      )}

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

function ResultGroup({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <p className="px-2 pt-1.5 pb-1 text-[10.5px] font-bold uppercase tracking-wider" style={{ color }}>{title}</p>
      {children}
    </div>
  );
}

function ResultRow({ title, sub, done = false, onClick }: { title: string; sub: string; done?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full text-left rounded-lg px-2 py-1.5 hover:bg-white">
      <span className="block text-[13.5px] truncate" style={{ color: done ? "#9A8F84" : "#1A1410", textDecoration: done ? "line-through" : "none" }}>{title}</span>
      {sub && <span className="block text-[11.5px] truncate" style={{ color: "#9A8F84" }}>{sub}</span>}
    </button>
  );
}
