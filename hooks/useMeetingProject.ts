"use client";

import { useState } from "react";
import { useProjectStore } from "@/stores/projectStore";
import { useTaskStore } from "@/stores/taskStore";
import { projectForFolder } from "@/lib/utils/folderTree";
import { projectOfMeetingTasks } from "@/lib/utils/taskGroups";
import type { MeetingFolder } from "@/types/database";

/**
 * Project voor de taken uit een overleg. Volgorde: zelf gekozen → project van
 * al geaccepteerde taken → project gekoppeld aan de map.
 */
export function useMeetingProject(meetingId: string, folders: MeetingFolder[], folderId: string | null) {
  const projects = useProjectStore((s) => s.projects);
  const tasks = useTaskStore((s) => s.tasks);
  const [chosen, setChosen] = useState<string | null | undefined>(undefined);

  const project =
    chosen !== undefined
      ? chosen
      : projectOfMeetingTasks(tasks, meetingId) ?? projectForFolder(folders, projects, folderId);

  return [project, setChosen] as const;
}
