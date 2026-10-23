"use client";

import { useState } from "react";
import { useProjectStore } from "@/stores/projectStore";
import { useTaskStore } from "@/stores/taskStore";
import { projectForFolder } from "@/lib/utils/folderTree";
import { projectOfMeetingTasks } from "@/lib/utils/taskGroups";
import type { MeetingCategory, MeetingFolder } from "@/types/database";

type Options = {
  meetingId: string;
  folders: MeetingFolder[];
  categories: MeetingCategory[];
  folderId: string | null;
  // Taken uit dit overleg naar een project (ook de al geaccepteerde)
  onChangeProject: (project: string | null) => void;
  // Overleg naar een andere map
  onMoveFolder: (folderId: string | null) => void;
};

/**
 * Project voor de taken uit een overleg volgt de map (projectmap = project):
 * map kiezen die bij een project hoort → taken gaan naar dat project.
 * Zonder projectmap: het project van al geaccepteerde taken.
 */
export function useMeetingProject({ meetingId, folders, folderId, onChangeProject, onMoveFolder }: Options) {
  const projects = useProjectStore((s) => s.projects);
  const tasks = useTaskStore((s) => s.tasks);
  const [chosen, setChosen] = useState<string | null | undefined>(undefined);

  const project =
    chosen !== undefined
      ? chosen
      : projectForFolder(folders, projects, folderId) ?? projectOfMeetingTasks(tasks, meetingId);

  function changeFolder(id: string | null) {
    onMoveFolder(id);
    const p = projectForFolder(folders, projects, id);
    if (p) {
      setChosen(undefined);
      if (p !== project) onChangeProject(p);
    }
  }

  return { project, changeFolder };
}
