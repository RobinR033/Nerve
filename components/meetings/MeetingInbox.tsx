"use client";

import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import { useMeetings } from "@/hooks/useMeetings";
import { MeetingReviewCard } from "./MeetingReviewCard";

/** Dashboardblok "Uit overleggen": nieuwe overleggen beoordelen (map + acties). */
export function MeetingInbox({ label }: { label: (count: number, accessory: React.ReactNode) => React.ReactNode }) {
  const { meetings, folders, isLoading, accept, reject, undoReject, finish, addFolder, findActions, acceptAll, rejectAll, undoAccept } = useMeetings("review");

  if (isLoading) return null;

  if (meetings.length === 0) return null;

  return (
    <section>
      {label(
        meetings.length,
        <Link href="/overleggen" className="text-[11.5px] font-semibold" style={{ color: "#7C3AED" }}>
          Alle overleggen →
        </Link>,
      )}
      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {meetings.map((m) => (
            <MeetingReviewCard
              key={m.id}
              meeting={m}
              folders={folders}
              onAccept={accept}
              onReject={reject}
              onUndoReject={undoReject}
              onUndoAccept={undoAccept}
              onAcceptAll={acceptAll}
              onRejectAll={rejectAll}
              onFinish={finish}
              onCreateFolder={(name, type, parentId) => addFolder(name, type, parentId)}
              onFindActions={findActions}
            />
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
