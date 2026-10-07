"use client";

import { useEffect } from "react";
import { useMeetingTitleStore } from "@/stores/meetingTitleStore";

/** "↳ Weekly projectteam": uit welk overleg een taak komt */
export function MeetingOrigin({ meetingId }: { meetingId: string }) {
  const title = useMeetingTitleStore((s) => s.titles[meetingId]);
  const load = useMeetingTitleStore((s) => s.load);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <span className="text-xs truncate max-w-[14rem]" style={{ color: "#7C3AED" }} title="Uit overleg">
      ↳ {title ?? "overleg"}
    </span>
  );
}
