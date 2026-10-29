"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useTasks } from "@/hooks/useTasks";
import { TaskRow } from "@/components/tasks/TaskRow";
import { TaskEditModal } from "@/components/tasks/TaskEditModal";
import type { Task } from "@/types/database";

const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };

/**
 * Acties die uit dit overleg zijn voortgekomen (na het opbergen): openstaand bovenaan,
 * afgerond dichtgeklapt. Bundels tellen als één actie.
 */
export function MeetingTasks({ meetingId }: { meetingId: string }) {
  const { tasks, complete, uncomplete, archive, update, toggleFocus } = useTasks();
  const [showDone, setShowDone] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);

  const fromMeeting = tasks.filter((t) => t.source_meeting_id === meetingId && t.parent_id === null && t.archived_at === null);
  const open = fromMeeting
    .filter((t) => t.status !== "done")
    .sort((a, b) => {
      // Eigen acties vóór naja's, daarbinnen te laat / vroegste deadline eerst
      const aW = Boolean(a.waiting_for);
      const bW = Boolean(b.waiting_for);
      if (aW !== bW) return aW ? 1 : -1;
      if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  const done = fromMeeting.filter((t) => t.status === "done");

  if (fromMeeting.length === 0) return null;

  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "#7C3AED" }}>
        Openstaande acties{open.length > 0 && ` — ${open.length}`}
      </p>
      {open.length === 0 ? (
        <p className="text-[13px] mb-1" style={{ color: "#1F9D55" }}>Alles uit dit overleg is afgerond.</p>
      ) : (
        <div className="space-y-1.5">
          <AnimatePresence initial={false}>
            {open.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onComplete={complete}
                onUncomplete={uncomplete}
                onArchive={archive}
                onEdit={() => setEditTask(task)}
                onToggleFocus={toggleFocus}
                hideMeeting
                showWaiting
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {done.length > 0 && (
        <div className="mt-2">
          <button onClick={() => setShowDone((v) => !v)} className="text-[11.5px] font-semibold py-1" style={{ color: "#1F9D55" }}>
            Afgerond ({done.length}) — {showDone ? "verbergen" : "tonen"}
          </button>
          {showDone && (
            <div className="space-y-1.5 mt-1">
              {done.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onComplete={complete}
                  onUncomplete={uncomplete}
                  onArchive={archive}
                  onEdit={() => setEditTask(task)}
                  hideMeeting
                  showWaiting
                />
              ))}
            </div>
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
