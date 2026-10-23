"use client";

import { useCallback, useEffect, useState } from "react";
import {
  acceptSuggestion,
  createCategory,
  createFolder,
  deleteCategory,
  deleteFolder,
  deleteMeeting,
  fetchCategories,
  fetchFolders,
  fetchMeetings,
  fetchMeetingsToReview,
  finishReview,
  moveMeeting,
  rejectSuggestion,
  reopenReview,
  resetSuggestion,
  setFoldersCategory,
  setSuggestionsStatus,
  updateSuggestionOwner,
  undoAcceptSuggestion,
  updateCategory,
  updateMeetingHeldAt,
  updateMeetingSummary,
  updateFolder,
  type SuggestionEdits,
} from "@/lib/supabase/meetings";
import { setProjectForMeetingTasks } from "@/lib/supabase/tasks";
import { ensureProject, fetchProjects } from "@/lib/supabase/projects";
import { defaultColorForProject } from "@/lib/utils/projectColor";
import { useProjectStore } from "@/stores/projectStore";
import { useTaskStore } from "@/stores/taskStore";
import { useToastStore } from "@/stores/toastStore";
import type { ActionSuggestion, MeetingCategory, MeetingCategoryKind, MeetingFolder, MeetingWithSuggestions } from "@/types/database";
import {
  DEFAULT_CATEGORIES,
  VIRTUAL_PREFIX,
  categoryIdOf,
  isProjectCategory,
  unlinkedProjectFolders,
  descendantIds,
  folderTypeFor,
  virtualCategories,
} from "@/lib/utils/folderTree";

/**
 * Projectmap = Nerve-project: mappen in een projectcategorie zonder koppeling
 * krijgen het project met dezelfde naam (en bestaat dat niet, dan wordt het aangemaakt).
 */
async function linkProjectFolders(
  folders: MeetingFolder[],
  categories: MeetingCategory[],
): Promise<{ linked: MeetingFolder[]; created: number; failed: number }> {
  const projects = await fetchProjects();
  const todo = unlinkedProjectFolders(folders, categories, projects);
  const linked: MeetingFolder[] = [];
  let created = 0;
  let failed = 0;
  for (const { folder, match } of todo) {
    try {
      const project = match ?? (await ensureProject(folder.name, defaultColorForProject(folder.name.trim())));
      if (!match) {
        useProjectStore.getState().upsertProject(project);
        created++;
      }
      await updateFolder(folder.id, { project_id: project.id });
      linked.push({ ...folder, project_id: project.id });
    } catch (err) {
      failed++;
      console.error("Projectmap koppelen mislukt:", folder.name, err);
    }
  }
  return { linked, created, failed };
}

type Snapshot = {
  meetings: MeetingWithSuggestions[];
  folders: MeetingFolder[];
  categories: MeetingCategory[];
  categoriesManaged: boolean;
};

// Laatst geladen stand per weergave: bij terugkeren direct tonen, daarna op de achtergrond verversen
const snapshots: Partial<Record<"review" | "all", Snapshot>> = {};

/** Leesbare foutmelding, ook voor Supabase-fouten (dat zijn geen Error-objecten) */
function errorText(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) return String((err as { message: unknown }).message);
  return String(err);
}

/** Categorieën laden (en de startset aanmaken als er nog geen zijn). Zonder migratie 005: vaste set. */
async function loadCategories(): Promise<{ list: MeetingCategory[]; managed: boolean }> {
  try {
    let c = await fetchCategories();
    if (c.length === 0) {
      c = [];
      for (const [i, d] of DEFAULT_CATEGORIES.entries()) {
        c.push(await createCategory({ name: d.name, kind: d.kind, color: d.color, position: i }));
      }
    }
    return { list: c, managed: true };
  } catch (err) {
    console.error("Categorieën laden mislukt (migratie 005 gedraaid?):", err);
    return { list: virtualCategories(), managed: false };
  }
}

/**
 * Overleggen + mappen + suggesties.
 * mode "review": alleen nog niet beoordeelde overleggen (dashboard).
 * mode "all": alles (overlegpagina).
 */
export function useMeetings(mode: "review" | "all") {
  const cached = snapshots[mode];
  const [meetings, setMeetings] = useState<MeetingWithSuggestions[]>(cached?.meetings ?? []);
  const [folders, setFolders] = useState<MeetingFolder[]>(cached?.folders ?? []);
  const [categories, setCategories] = useState<MeetingCategory[]>(cached?.categories ?? virtualCategories);
  // false zolang migratie 005 niet gedraaid is: dan vaste categorieën, niet te beheren
  const [categoriesManaged, setCategoriesManaged] = useState(cached?.categoriesManaged ?? false);
  const [isLoading, setIsLoading] = useState(!cached);
  const addTask = useTaskStore((s) => s.addTask);
  const updateTaskLocal = useTaskStore((s) => s.updateTask);
  const toast = useToastStore((s) => s.show);

  const load = useCallback(async () => {
    let folderList: MeetingFolder[] = [];
    // Tegelijk met de overleggen starten i.p.v. erna
    const categoriesPromise = loadCategories();
    try {
      const [m, f] = await Promise.all([
        mode === "review" ? fetchMeetingsToReview() : fetchMeetings(),
        fetchFolders(),
      ]);
      setMeetings(m);
      setFolders(f);
      folderList = f;
    } catch (err) {
      // Tabellen bestaan nog niet (migratie niet gedraaid) → blok blijft gewoon leeg
      console.error("Overleggen laden mislukt:", err);
    } finally {
      setIsLoading(false);
    }
    const { list: categoryList, managed } = await categoriesPromise;
    setCategories(categoryList);
    setCategoriesManaged(managed);

    // Projectmap = Nerve-project; apart, zodat een fout hier de categorieën niet raakt
    try {
      const { linked, created, failed } = await linkProjectFolders(folderList, categoryList);
      if (linked.length > 0) {
        const byId = new Map(linked.map((x) => [x.id, x]));
        setFolders((fs) => fs.map((x) => byId.get(x.id) ?? x));
      }
      if (created > 0) useToastStore.getState().show(`${created} projectmap${created === 1 ? "" : "pen"} toegevoegd als Nerve-project`);
      if (failed > 0) useToastStore.getState().show(`${failed} projectmap${failed === 1 ? "" : "pen"} kon${failed === 1 ? "" : "den"} niet aan een project gekoppeld worden`);
    } catch (err) {
      console.error("Projectmappen koppelen mislukt:", err);
    }
  }, [mode]);

  useEffect(() => {
    load();
  }, [load]);

  // Stand bewaren voor de volgende keer dat deze weergave opent
  useEffect(() => {
    if (!isLoading) snapshots[mode] = { meetings, folders, categories, categoriesManaged };
  }, [mode, isLoading, meetings, folders, categories, categoriesManaged]);

  const patchSuggestion = (updated: ActionSuggestion) =>
    setMeetings((ms) =>
      ms.map((m) =>
        m.id === updated.meeting_id
          ? { ...m, action_suggestions: m.action_suggestions.map((s) => (s.id === updated.id ? updated : s)) }
          : m,
      ),
    );

  async function accept(suggestion: ActionSuggestion, edits: SuggestionEdits, project: string | null) {
    try {
      const { task, suggestion: updated } = await acceptSuggestion(suggestion, edits, project);
      addTask(task);
      patchSuggestion(updated);
      toast(edits.owner === "other" ? `Naja-taak voor ${task.waiting_for}` : "Taak aangemaakt");
    } catch (err) {
      console.error("Suggestie accepteren mislukt:", err);
      toast("Taak aanmaken mislukt");
    }
  }

  /** Actie ↔ naja omklappen */
  async function changeOwner(suggestion: ActionSuggestion, owner: ActionSuggestion["owner"], person: string | null) {
    patchSuggestion({ ...suggestion, owner, person });
    try {
      await updateSuggestionOwner(suggestion.id, owner, person);
    } catch (err) {
      console.error("Omklappen mislukt:", err);
      patchSuggestion(suggestion);
      toast("Omklappen mislukt");
    }
  }

  async function reject(suggestion: ActionSuggestion) {
    patchSuggestion({ ...suggestion, status: "rejected" });
    try {
      await rejectSuggestion(suggestion.id);
      toast("Suggestie verworpen", { label: "Ongedaan maken", onClick: () => undoReject(suggestion) });
    } catch (err) {
      console.error("Suggestie afwijzen mislukt:", err);
      patchSuggestion(suggestion);
    }
  }

  /** Statussen van meerdere suggesties in één overleg lokaal aanpassen */
  const patchMany = (meetingId: string, ids: string[], status: ActionSuggestion["status"]) =>
    setMeetings((ms) =>
      ms.map((m) =>
        m.id === meetingId
          ? {
              ...m,
              action_suggestions: m.action_suggestions.map((s) =>
                ids.includes(s.id) ? { ...s, status, decided_at: status === "suggested" ? null : s.decided_at } : s,
              ),
            }
          : m,
      ),
    );

  async function rejectAll(meeting: MeetingWithSuggestions) {
    const ids = meeting.action_suggestions.filter((s) => s.status === "suggested").map((s) => s.id);
    if (ids.length === 0) return;
    patchMany(meeting.id, ids, "rejected");
    try {
      await setSuggestionsStatus(ids, "rejected");
      toast(`${ids.length} suggesties verworpen`, {
        label: "Ongedaan maken",
        onClick: async () => {
          patchMany(meeting.id, ids, "suggested");
          await setSuggestionsStatus(ids, "suggested").catch((err) => {
            console.error("Terugzetten mislukt:", err);
            load();
          });
        },
      });
    } catch (err) {
      console.error("Alles verwerpen mislukt:", err);
      patchMany(meeting.id, ids, "suggested");
    }
  }

  /** Alle open suggesties accepteren, elk met de eigen gegevens (eigenaar, persoon, deadline) */
  async function acceptAll(meeting: MeetingWithSuggestions, project: string | null) {
    const open = meeting.action_suggestions.filter((s) => s.status === "suggested");
    const accepted: ActionSuggestion[] = [];
    for (const s of open) {
      try {
        const { task, suggestion: updated } = await acceptSuggestion(
          s,
          { text: s.text, owner: s.owner, person: s.person, deadline: s.deadline },
          project,
        );
        addTask(task);
        patchSuggestion(updated);
        accepted.push(updated);
      } catch (err) {
        console.error("Suggestie accepteren mislukt:", err);
      }
    }
    if (accepted.length === 0) {
      toast("Taken aanmaken mislukt");
      return;
    }
    const failed = open.length - accepted.length;
    toast(
      `${accepted.length} ${accepted.length === 1 ? "taak" : "taken"} aangemaakt${failed ? ` (${failed} mislukt)` : ""}`,
      { label: "Ongedaan maken", onClick: () => accepted.forEach((s) => undoAccept(s)) },
    );
  }

  /** Accepteren terugdraaien: taak naar archief, suggestie weer open */
  async function undoAccept(suggestion: ActionSuggestion) {
    try {
      const updated = await undoAcceptSuggestion(suggestion);
      if (suggestion.task_id) updateTaskLocal(suggestion.task_id, { archived_at: new Date().toISOString() });
      patchSuggestion(updated);
    } catch (err) {
      console.error("Accepteren terugdraaien mislukt:", err);
      toast("Terugdraaien mislukt");
    }
  }

  async function undoReject(suggestion: ActionSuggestion) {
    patchSuggestion({ ...suggestion, status: "suggested", decided_at: null });
    try {
      await resetSuggestion(suggestion.id);
    } catch (err) {
      console.error("Terugzetten mislukt:", err);
      patchSuggestion(suggestion);
    }
  }

  async function finish(meetingId: string, folderId: string | null) {
    const before = meetings;
    const now = new Date().toISOString();
    setMeetings((ms) =>
      mode === "review"
        ? ms.filter((m) => m.id !== meetingId)
        : ms.map((m) => (m.id === meetingId ? { ...m, folder_id: folderId, reviewed_at: now } : m)),
    );
    try {
      await finishReview(meetingId, folderId);
      toast("Opgeborgen", {
        label: "Ongedaan maken",
        onClick: async () => {
          try {
            await reopenReview(meetingId);
            await load();
          } catch (err) {
            console.error("Terughalen mislukt:", err);
          }
        },
      });
    } catch (err) {
      console.error("Afronden mislukt:", err);
      setMeetings(before);
    }
  }

  async function move(meetingId: string, folderId: string | null) {
    setMeetings((ms) => ms.map((m) => (m.id === meetingId ? { ...m, folder_id: folderId } : m)));
    try {
      await moveMeeting(meetingId, folderId);
    } catch (err) {
      console.error("Verplaatsen mislukt:", err);
      load();
    }
  }

  async function remove(meetingId: string) {
    setMeetings((ms) => ms.filter((m) => m.id !== meetingId));
    try {
      await deleteMeeting(meetingId);
    } catch (err) {
      console.error("Verwijderen mislukt:", err);
      load();
    }
  }

  /** Laat Claude (opnieuw) acties zoeken in een overleg; meldt het resultaat. */
  async function findActions(meetingId: string) {
    try {
      const res = await fetch(`/api/meetings/${meetingId}/extract`, { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as { suggestions?: number; error?: string };
      if (!res.ok) {
        toast(`Acties zoeken mislukt: ${body.error ?? res.status}`);
        return;
      }
      toast(body.suggestions ? `${body.suggestions} nieuwe actie${body.suggestions === 1 ? "" : "s"} gevonden` : "Geen nieuwe acties gevonden");
      await load();
    } catch (err) {
      console.error("Acties zoeken mislukt:", err);
      toast("Acties zoeken mislukt");
    }
  }

  /** Project kiezen voor een overleg: al geaccepteerde taken gaan direct mee */
  async function setProject(meetingId: string, project: string | null) {
    try {
      const updated = await setProjectForMeetingTasks(meetingId, project);
      updated.forEach((t) => updateTaskLocal(t.id, { project: t.project }));
      if (updated.length > 0) {
        const n = `${updated.length} ${updated.length === 1 ? "taak" : "taken"}`;
        toast(project ? `${n} naar ${project}` : `${n} zonder project`);
      }
    } catch (err) {
      console.error("Project koppelen mislukt:", err);
      toast("Project koppelen mislukt");
    }
  }

  async function setHeldAt(meetingId: string, heldAt: string) {
    const before = meetings;
    setMeetings((ms) => ms.map((m) => (m.id === meetingId ? { ...m, held_at: heldAt } : m)));
    try {
      await updateMeetingHeldAt(meetingId, heldAt);
    } catch (err) {
      console.error("Datum aanpassen mislukt:", err);
      setMeetings(before);
      toast("Datum aanpassen mislukt");
    }
  }

  /** Verslag laten maken uit het bewaarde transcript (API, Opus) */
  async function generateSummary(meetingId: string) {
    try {
      const res = await fetch(`/api/meetings/${meetingId}/summarize`, { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as { summary?: string; error?: string };
      if (!res.ok || !body.summary) {
        toast(`Verslag maken mislukt: ${body.error ?? res.status}`);
        return;
      }
      setMeetings((ms) => ms.map((m) => (m.id === meetingId ? { ...m, summary: body.summary ?? null } : m)));
      toast("Verslag gemaakt");
    } catch (err) {
      console.error("Verslag maken mislukt:", err);
      toast("Verslag maken mislukt");
    }
  }

  /**
   * Ontbrekende verslagen één voor één laten maken (alleen waar een transcript
   * bewaard is). Achter elkaar i.p.v. tegelijk: rustiger voor de API.
   */
  async function generateMissingSummaries(meetingIds: string[]) {
    let made = 0;
    let noTranscript = 0;
    let failed = 0;
    for (const id of meetingIds) {
      try {
        const res = await fetch(`/api/meetings/${id}/summarize`, { method: "POST" });
        const body = (await res.json().catch(() => ({}))) as { summary?: string };
        if (res.ok && body.summary) {
          made++;
          setMeetings((ms) => ms.map((m) => (m.id === id ? { ...m, summary: body.summary ?? null } : m)));
        } else if (res.status === 400) noTranscript++;
        else failed++;
      } catch {
        failed++;
      }
    }
    const parts = [`${made} verslag${made === 1 ? "" : "en"} gemaakt`];
    if (noTranscript) parts.push(`${noTranscript} zonder bewaard transcript`);
    if (failed) parts.push(`${failed} mislukt`);
    toast(parts.join(" · "));
  }

  /** Verslag opslaan en daarna automatisch (opnieuw) acties laten zoeken */
  async function saveSummary(meetingId: string, summary: string) {
    const before = meetings;
    setMeetings((ms) => ms.map((m) => (m.id === meetingId ? { ...m, summary: summary.trim() || null } : m)));
    try {
      await updateMeetingSummary(meetingId, summary);
    } catch (err) {
      console.error("Verslag opslaan mislukt:", err);
      setMeetings(before);
      toast("Verslag opslaan mislukt");
      return;
    }
    if (summary.trim()) await findActions(meetingId);
    else toast("Verslag opgeslagen");
  }

  const realCategoryId = (id: string | null) => (id && !id.startsWith(VIRTUAL_PREFIX) ? id : null);

  async function addFolder(name: string, categoryId: string | null, parentId: string | null, projectId: string | null = null) {
    // Submap valt altijd onder de categorie van de bovenmap
    const parent = parentId ? folders.find((f) => f.id === parentId) : undefined;
    const catId = parent ? categoryIdOf(folders, categories, parent) : categoryId;
    const cat = categories.find((c) => c.id === catId);
    const type = parent ? parent.type : folderTypeFor(cat?.kind ?? "other");
    // Nieuwe projectmap zonder gekozen project → Nerve-project met dezelfde naam
    // Lukt dat niet, dan toch de map maken (koppelen gebeurt later alsnog bij het laden)
    if (!parent && isProjectCategory(cat) && !projectId) {
      try {
        const project = await ensureProject(name, defaultColorForProject(name.trim()));
        useProjectStore.getState().upsertProject(project);
        projectId = project.id;
      } catch (err) {
        console.error("Nerve-project aanmaken mislukt:", err);
        toast(`Map wordt gemaakt, maar project aanmaken mislukte: ${errorText(err)}`);
      }
    }
    let folder: MeetingFolder;
    try {
      folder = await createFolder(name, type, parentId, projectId, realCategoryId(catId));
    } catch (err) {
      console.error("Map maken mislukt:", err);
      throw new Error(errorText(err));
    }
    setFolders((fs) => [...fs, folder]);
    return folder;
  }

  /** Map (met submappen) naar een andere categorie; type volgt het soort van de categorie */
  async function moveFolderToCategory(folderId: string, categoryId: string) {
    const cat = categories.find((c) => c.id === categoryId);
    if (!cat || !categoriesManaged) return;
    const ids = [...descendantIds(folders, folderId)];
    await applyCategory(ids, cat);
    // Top-level maken, anders blijft hij onder zijn oude bovenmap hangen
    const f = folders.find((x) => x.id === folderId);
    if (f?.parent_id) await editFolder(folderId, { parent_id: null });
  }

  async function applyCategory(ids: string[], cat: MeetingCategory) {
    const typeOf = (id: string) => folderTypeFor(cat.kind, folders.find((f) => f.id === id)?.type);
    const idSet = new Set(ids);
    setFolders((fs) => fs.map((f) => (idSet.has(f.id) ? { ...f, category_id: cat.id, type: typeOf(f.id) } : f)));
    try {
      await setFoldersCategory(ids, cat.id, typeOf);
    } catch (err) {
      console.error("Mappen verplaatsen mislukt:", err);
      toast("Mappen verplaatsen mislukt");
      load();
      throw err;
    }
  }

  const foldersIn = (categoryId: string) => folders.filter((f) => categoryIdOf(folders, categories, f) === categoryId).map((f) => f.id);

  async function addCategory(name: string, kind: MeetingCategoryKind, color: string) {
    try {
      const position = categories.reduce((max, c) => Math.max(max, c.position), -1) + 1;
      const cat = await createCategory({ name, kind, color, position });
      setCategories((cs) => [...cs, cat]);
      return cat;
    } catch (err) {
      console.error("Categorie toevoegen mislukt:", err);
      toast("Categorie toevoegen mislukt");
      return null;
    }
  }

  async function editCategory(id: string, updates: Partial<Pick<MeetingCategory, "name" | "kind" | "color">>) {
    const before = categories.find((c) => c.id === id);
    if (!before) return;
    setCategories((cs) => cs.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    try {
      await updateCategory(id, updates);
      // Ander soort → mappen erin krijgen het bijpassende gedrag
      if (updates.kind && updates.kind !== before.kind) await applyCategory(foldersIn(id), { ...before, ...updates });
    } catch (err) {
      console.error("Categorie bijwerken mislukt:", err);
      toast("Categorie bijwerken mislukt");
      load();
    }
  }

  /** Eén plek omhoog (-1) of omlaag (+1) in de lijst */
  async function moveCategory(id: string, direction: -1 | 1) {
    const sorted = [...categories].sort((a, b) => a.position - b.position);
    const i = sorted.findIndex((c) => c.id === id);
    const j = i + direction;
    if (i < 0 || j < 0 || j >= sorted.length) return;
    [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
    const renumbered = sorted.map((c, position) => ({ ...c, position }));
    setCategories(renumbered);
    try {
      await Promise.all(
        renumbered.filter((c) => categories.find((o) => o.id === c.id)?.position !== c.position).map((c) => updateCategory(c.id, { position: c.position })),
      );
    } catch (err) {
      console.error("Volgorde opslaan mislukt:", err);
      toast("Volgorde opslaan mislukt");
      load();
    }
  }

  /** Categorie weg; mappen erin gaan eerst naar targetId */
  async function removeCategory(id: string, targetId: string | null) {
    const ids = foldersIn(id);
    const target = categories.find((c) => c.id === targetId);
    if (ids.length > 0 && !target) return;
    try {
      if (target) await applyCategory(ids, target);
      await deleteCategory(id);
      setCategories((cs) => cs.filter((c) => c.id !== id));
      toast("Categorie verwijderd");
    } catch (err) {
      console.error("Categorie verwijderen mislukt:", err);
      toast("Categorie verwijderen mislukt");
      load();
    }
  }

  async function editFolder(id: string, updates: Partial<Pick<MeetingFolder, "name" | "type" | "category_id" | "parent_id" | "project_id">>) {
    setFolders((fs) => fs.map((f) => (f.id === id ? { ...f, ...updates } : f)));
    try {
      await updateFolder(id, updates);
    } catch (err) {
      console.error("Map bijwerken mislukt:", err);
      load();
    }
  }

  async function removeFolder(id: string) {
    try {
      await deleteFolder(id);
      // Database zet verwijzingen op null; lokaal hetzelfde doen
      setFolders((fs) => fs.filter((f) => f.id !== id).map((f) => (f.parent_id === id ? { ...f, parent_id: null } : f)));
      setMeetings((ms) =>
        ms.map((m) => ({
          ...m,
          folder_id: m.folder_id === id ? null : m.folder_id,
          suggested_folder_id: m.suggested_folder_id === id ? null : m.suggested_folder_id,
        })),
      );
    } catch (err) {
      console.error("Map verwijderen mislukt:", err);
    }
  }

  return {
    meetings,
    folders,
    categories,
    categoriesManaged,
    isLoading,
    reload: load,
    accept,
    acceptAll,
    undoAccept,
    reject,
    changeOwner,
    rejectAll,
    undoReject,
    finish,
    move,
    remove,
    findActions,
    saveSummary,
    generateSummary,
    generateMissingSummaries,
    setHeldAt,
    setProject,
    addFolder,
    editFolder,
    removeFolder,
    moveFolderToCategory,
    addCategory,
    editCategory,
    moveCategory,
    removeCategory,
  };
}
