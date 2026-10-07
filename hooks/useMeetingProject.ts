"use client";

import { useState } from "react";
import { useProjectStore } from "@/stores/projectStore";
import { useTaskStore } from "@/stores/taskStore";
import { isProjectFolder, projectForFolder } from "@/lib/utils/folderTree";
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
  // Map van een project opzoeken of aanmaken
  onEnsureProjectFolder: (project: string) => Promise<string | null>;
};

/**
 * Project voor de taken uit een overleg — en projectmap = project:
 * - map kiezen die bij een project hoort → taken gaan naar dat project
 * - project kiezen terwijl het overleg ongesorteerd of in een projectmap staat
 *   → overleg verhuist naar de map van dat project
 * Volgorde zonder eigen keuze: map → al geaccepteerde taken.
 */
export function useMeetingProject({ meetingId, folders, categories, folderId, onChangeProject, onMoveFolder, onEnsureProjectFolder }: Options) {
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

  async function changeProject(p: string | null) {
    setChosen(p);
    onChangeProject(p);
    if (p && (folderId === null || isProjectFolder(folders, categories, folderId))) {
      const id = await onEnsureProjectFolder(p);
      if (id && id !== folderId) onMoveFolder(id);
    }
  }

  return { project, changeFolder, changeProject };
}
