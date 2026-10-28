"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchTaskOrigin, type TaskOrigin as Origin } from "@/lib/supabase/meetings";
import { formatMeetingDate } from "@/components/meetings/MeetingReviewCard";
import { summaryPreview } from "@/lib/utils/meetingList";
import type { Task } from "@/types/database";

/** Herkomst van een taak in de taak-popup: uit welk overleg (met citaat) of welke mail hij komt. */
export function TaskOrigin({ task, onNavigate }: { task: Task; onNavigate: () => void }) {
  const meetingId = task.source_meeting_id ?? null;
  // undefined = laden, null = niet (meer) gevonden
  const [origin, setOrigin] = useState<Origin | null | undefined>(undefined);

  useEffect(() => {
    if (!meetingId) return;
    let cancelled = false;
    fetchTaskOrigin(task.id, meetingId)
      .then((o) => !cancelled && setOrigin(o))
      .catch((err) => {
        console.error("Herkomst laden mislukt:", err);
        if (!cancelled) setOrigin(null);
      });
    return () => {
      cancelled = true;
    };
  }, [task.id, meetingId]);

  const isMail = task.tags?.includes("outlook") ?? false;
  if (!meetingId && !(isMail && task.description)) return null;

  return (
    <div className="px-5 pb-4 border-t border-gray-50 pt-3">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Herkomst</p>

      {meetingId ? (
        origin === undefined ? (
          <div className="h-14 rounded-xl animate-pulse" style={{ background: "rgba(124,58,237,0.06)" }} />
        ) : origin === null ? (
          <p className="text-[13px]" style={{ color: "#9A8F84" }}>Het overleg waar deze actie uit kwam is verwijderd.</p>
        ) : (
          <div className="rounded-xl p-3 space-y-2" style={{ background: "rgba(124,58,237,0.06)" }}>
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[13.5px] font-semibold truncate" style={{ color: "#3B2A6B" }}>{origin.meeting.title}</p>
                <p className="text-[12px]" style={{ color: "#8B7FB0" }}>
                  {formatMeetingDate(origin.meeting.held_at)}
                  {origin.meeting.participants.length > 0 && ` · ${origin.meeting.participants.join(", ")}`}
                </p>
              </div>
              <Link
                href={`/overleggen?overleg=${origin.meeting.id}`}
                onClick={onNavigate}
                className="shrink-0 h-8 px-3 rounded-lg text-[12.5px] font-semibold text-white flex items-center"
                style={{ background: "#7C3AED" }}
              >
                Open overleg →
              </Link>
            </div>
            {origin.quote ? (
              <blockquote className="text-[13px] italic pl-2.5" style={{ color: "#4A3F66", borderLeft: "2px solid #C4B5FD" }}>
                “{origin.quote}”
              </blockquote>
            ) : (
              origin.meeting.summary && (
                <p className="text-[12.5px] line-clamp-3" style={{ color: "#6B6157" }}>{summaryPreview(origin.meeting.summary)}</p>
              )
            )}
          </div>
        )
      ) : (
        <div className="rounded-xl p-3" style={{ background: "rgba(107,155,245,0.08)" }}>
          <p className="text-[12px] font-semibold mb-1" style={{ color: "#3D6AC4" }}>Uit Outlook</p>
          <p className="text-[13px] whitespace-pre-wrap line-clamp-6" style={{ color: "#3D332C" }}>{task.description}</p>
        </div>
      )}
    </div>
  );
}
