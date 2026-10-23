import type { MeetingFolder, MeetingWithSuggestions, Task } from "@/types/database";
import { descendantIds } from "./folderTree";
import { parseDecisions } from "./decisions";

/** Overleggen van een project: in (een submap van) de projectmap, of met taken die bij het project horen */
export function projectMeetings(
  projectId: string,
  projectName: string,
  folders: MeetingFolder[],
  meetings: MeetingWithSuggestions[],
  tasks: Task[],
): MeetingWithSuggestions[] {
  const folderIds = new Set<string>();
  for (const f of folders) if (f.project_id === projectId) for (const id of descendantIds(folders, f.id)) folderIds.add(id);
  const viaTasks = new Set(tasks.filter((t) => t.project === projectName && t.source_meeting_id).map((t) => t.source_meeting_id!));
  return meetings
    .filter((m) => (m.folder_id && folderIds.has(m.folder_id)) || viaTasks.has(m.id))
    .sort((a, b) => b.held_at.localeCompare(a.held_at));
}

export type Decision = { text: string; meetingId: string; meetingTitle: string; heldAt: string };

/** Besluitenlogboek: alle besluiten uit de verslagen, nieuwste eerst */
export function decisionLog(meetings: MeetingWithSuggestions[]): Decision[] {
  return meetings.flatMap((m) =>
    parseDecisions(m.summary).map((text) => ({ text, meetingId: m.id, meetingTitle: m.title, heldAt: m.held_at })),
  );
}
