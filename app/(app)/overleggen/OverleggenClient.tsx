"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMeetings } from "@/hooks/useMeetings";
import { useProjectStore } from "@/stores/projectStore";
import { FolderTree, type Selection } from "@/components/meetings/FolderTree";
import { MeetingReviewCard, formatMeetingDate } from "@/components/meetings/MeetingReviewCard";
import { MeetingDetail } from "@/components/meetings/MeetingDetail";
import { NewNoteModal } from "@/components/meetings/NewNoteModal";
import { descendantIds, folderPath } from "@/lib/utils/folderTree";
import { personMatches } from "@/lib/utils/folderSuggestion";
import type { MeetingWithSuggestions } from "@/types/database";

export function OverleggenClient() {
  const m = useMeetings("all");
  const projects = useProjectStore((s) => s.projects);
  const [selection, setSelection] = useState<Selection>({ kind: "review" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [treeOpen, setTreeOpen] = useState(false);

  const toReview = m.meetings.filter((x) => !x.reviewed_at);
  const reviewed = m.meetings.filter((x) => x.reviewed_at);

  const counts = useMemo(() => {
    const byFolder = new Map<string, number>();
    for (const x of m.meetings) if (x.folder_id) byFolder.set(x.folder_id, (byFolder.get(x.folder_id) ?? 0) + 1);
    return {
      review: m.meetings.filter((x) => !x.reviewed_at).length,
      all: m.meetings.length,
      unsorted: m.meetings.filter((x) => x.reviewed_at && !x.folder_id).length,
      byFolder,
    };
  }, [m.meetings]);

  const selectedFolder = selection.kind === "folder" ? m.folders.find((f) => f.id === selection.id) ?? null : null;

  // Overleggen in de huidige selectie (map telt inclusief submappen)
  const { list, alsoPresent } = useMemo(() => {
    let list: MeetingWithSuggestions[] = [];
    let alsoPresent: MeetingWithSuggestions[] = [];
    if (selection.kind === "all") list = m.meetings;
    else if (selection.kind === "unsorted") list = reviewed.filter((x) => !x.folder_id);
    else if (selection.kind === "folder" && selectedFolder) {
      const ids = descendantIds(m.folders, selectedFolder.id);
      list = m.meetings.filter((x) => x.folder_id && ids.has(x.folder_id));
      // Persoonsmap: ook overleggen elders waar deze persoon bij was
      if (selectedFolder.type === "person") {
        alsoPresent = m.meetings.filter(
          (x) => !list.includes(x) && x.participants.some((p) => personMatches(selectedFolder.name, p)),
        );
      }
    }
    const q = query.trim().toLocaleLowerCase("nl");
    const match = (x: MeetingWithSuggestions) =>
      !q ||
      x.title.toLocaleLowerCase("nl").includes(q) ||
      (x.summary ?? "").toLocaleLowerCase("nl").includes(q) ||
      x.participants.some((p) => p.toLocaleLowerCase("nl").includes(q));
    return { list: list.filter(match), alsoPresent: alsoPresent.filter(match) };
  }, [selection, selectedFolder, m.meetings, m.folders, reviewed, query]);

  const selectedMeeting = selectedId ? m.meetings.find((x) => x.id === selectedId) ?? null : null;

  const heading =
    selection.kind === "review" ? "Te beoordelen"
    : selection.kind === "all" ? "Alle overleggen"
    : selection.kind === "unsorted" ? "Ongesorteerd"
    : selectedFolder ? folderPath(m.folders, selectedFolder.id) : "Map";

  const createFolderSimple = (name: string, type: Parameters<typeof m.addFolder>[1], parentId: string | null) =>
    m.addFolder(name, type, parentId);

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-10">
      <div className="flex items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-[30px] md:text-[34px] font-semibold leading-none" style={{ color: "#1A1410", letterSpacing: "-.035em" }}>
            Overleggen
          </h1>
          <p className="text-[13px] mt-1.5" style={{ color: "#9A8F84" }}>
            Verslagen, aantekeningen en de acties die eruit komen.
          </p>
        </div>
        <button
          onClick={() => setNoteOpen(true)}
          className="h-10 px-4 rounded-xl text-[13.5px] font-semibold text-white shrink-0 active:scale-95 transition-transform"
          style={{ background: "linear-gradient(135deg, #FF7A45 0%, #FF5A1F 60%, #FF3D8B 110%)", boxShadow: "0 6px 18px -6px rgba(255,90,31,.5)" }}
        >
          + Nieuw overleg
        </button>
      </div>

      <div className="grid md:grid-cols-[250px_1fr] gap-6">
        {/* Mappen */}
        <aside>
          <button onClick={() => setTreeOpen((v) => !v)} className="md:hidden w-full flex items-center justify-between h-10 px-3 rounded-xl mb-2 text-[13.5px] font-semibold" style={{ background: "rgba(255,255,255,0.7)", color: "#1A1410" }}>
            <span>{heading}</span>
            <span style={{ color: "#9A8F84" }}>{treeOpen ? "▴" : "Mappen ▾"}</span>
          </button>
          <div className={`${treeOpen ? "block" : "hidden"} md:block rounded-2xl p-2 md:p-3`} style={{ background: "rgba(255,253,250,0.55)", border: "0.5px solid rgba(255,255,255,0.6)" }}>
            <FolderTree
              folders={m.folders}
              projects={projects}
              selection={selection}
              counts={counts}
              onSelect={(s) => {
                setSelection(s);
                setSelectedId(null);
                setTreeOpen(false);
              }}
              onCreate={m.addFolder}
              onRename={(id, name) => m.editFolder(id, { name })}
              onDelete={(f) => {
                if (window.confirm(`Map "${f.name}" verwijderen? Overleggen erin gaan naar Ongesorteerd; submappen blijven bestaan.`)) {
                  m.removeFolder(f.id);
                  if (selection.kind === "folder" && selection.id === f.id) setSelection({ kind: "all" });
                }
              }}
            />
          </div>
        </aside>

        {/* Inhoud */}
        <main className="min-w-0">
          {selectedMeeting ? (
            <MeetingDetail
              meeting={selectedMeeting}
              folders={m.folders}
              onBack={() => setSelectedId(null)}
              onMove={(folderId) => (selectedMeeting.reviewed_at ? m.move(selectedMeeting.id, folderId) : m.finish(selectedMeeting.id, folderId))}
              onDelete={() => {
                m.remove(selectedMeeting.id);
                setSelectedId(null);
              }}
              onAccept={m.accept}
              onReject={m.reject}
              onUndoReject={m.undoReject}
              onUndoAccept={m.undoAccept}
              onAcceptAll={m.acceptAll}
              onRejectAll={m.rejectAll}
              onCreateFolder={createFolderSimple}
              onFindActions={() => m.findActions(selectedMeeting.id)}
              onSaveSummary={(text) => m.saveSummary(selectedMeeting.id, text)}
              onGenerateSummary={() => m.generateSummary(selectedMeeting.id)}
              onChangeDate={(iso) => m.setHeldAt(selectedMeeting.id, iso)}
            />
          ) : selection.kind === "review" ? (
            <div className="space-y-3">
              <h2 className="hidden md:block font-display text-[18px] font-semibold mb-1" style={{ color: "#1A1410" }}>{heading}</h2>
              {m.isLoading ? (
                <Skeleton />
              ) : toReview.length === 0 ? (
                <Empty text="Alles beoordeeld. Nieuwe overleggen verschijnen hier vanzelf." />
              ) : (
                <AnimatePresence initial={false}>
                  {toReview.map((x) => (
                    <MeetingReviewCard
                      key={x.id}
                      meeting={x}
                      folders={m.folders}
                      onAccept={m.accept}
                      onReject={m.reject}
                      onUndoReject={m.undoReject}
                      onUndoAccept={m.undoAccept}
                      onAcceptAll={m.acceptAll}
                      onRejectAll={m.rejectAll}
                      onFinish={m.finish}
                      onCreateFolder={createFolderSimple}
                      onFindActions={m.findActions}
                    />
                  ))}
                </AnimatePresence>
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <h2 className="hidden md:block font-display text-[18px] font-semibold truncate" style={{ color: "#1A1410" }}>{heading}</h2>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Zoek in titel, verslag, deelnemers…"
                  className="ml-auto w-full md:w-72 h-9 px-3 rounded-xl text-[13.5px]"
                  style={{ background: "rgba(255,255,255,0.8)", border: "0.5px solid rgba(0,0,0,0.1)", outline: "none" }}
                />
              </div>
              {m.isLoading ? (
                <Skeleton />
              ) : list.length === 0 && alsoPresent.length === 0 ? (
                <Empty text={query ? "Niets gevonden." : "Nog geen overleggen in deze map."} />
              ) : (
                <div className="space-y-2">
                  {list.map((x) => (
                    <MeetingRow key={x.id} meeting={x} folderLabel={selection.kind === "all" ? folderPath(m.folders, x.folder_id) : null} onOpen={() => setSelectedId(x.id)} />
                  ))}
                  {alsoPresent.length > 0 && (
                    <>
                      <p className="pt-4 pb-1 text-[11px] font-bold uppercase tracking-wider" style={{ color: "#2E6BFF" }}>
                        Ook bij aanwezig
                      </p>
                      {alsoPresent.map((x) => (
                        <MeetingRow key={x.id} meeting={x} folderLabel={folderPath(m.folders, x.folder_id)} onOpen={() => setSelectedId(x.id)} />
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      <NewNoteModal
        key={noteOpen ? "open" : "closed"}
        open={noteOpen}
        folders={m.folders}
        defaultFolderId={selectedFolder?.id ?? null}
        onClose={() => setNoteOpen(false)}
        onCreateFolder={createFolderSimple}
        onSaved={() => {
          m.reload();
          setSelection({ kind: "review" });
          setSelectedId(null);
        }}
      />
    </div>
  );
}

function MeetingRow({ meeting, folderLabel, onOpen }: { meeting: MeetingWithSuggestions; folderLabel: string | null; onOpen: () => void }) {
  const accepted = meeting.action_suggestions.filter((s) => s.status === "accepted").length;
  const open = meeting.action_suggestions.filter((s) => s.status === "suggested").length;
  const rejected = meeting.action_suggestions.filter((s) => s.status === "rejected").length;
  const firstLine = (meeting.summary ?? "").replace(/[#*_>-]/g, " ").replace(/\s+/g, " ").trim().slice(0, 140);
  return (
    <motion.button
      layout
      onClick={onOpen}
      className="w-full text-left rounded-xl px-4 py-3 transition-shadow hover:shadow-md"
      style={{ background: "rgba(255,253,250,0.78)", border: "0.5px solid rgba(255,255,255,0.65)", boxShadow: "0 2px 10px -6px rgba(60,40,30,0.15)" }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-semibold text-[14.5px] truncate" style={{ color: "#1A1410" }}>{meeting.title}</p>
        <p className="text-[11.5px] shrink-0" style={{ color: "#9A8F84" }}>{formatMeetingDate(meeting.held_at)}</p>
      </div>
      {firstLine && <p className="text-[12.5px] mt-0.5 truncate" style={{ color: "#6B6157" }}>{firstLine}</p>}
      <div className="flex flex-wrap gap-x-3 mt-1 text-[11px] font-semibold">
        {folderLabel && <span style={{ color: "#9A8F84" }}>{folderLabel}</span>}
        {!meeting.reviewed_at && <span style={{ color: "#7C3AED" }}>te beoordelen</span>}
        {accepted > 0 && <span style={{ color: "#1F9D55" }}>{accepted} {accepted === 1 ? "taak" : "taken"}</span>}
        {open > 0 && meeting.reviewed_at && <span style={{ color: "#FF7A45" }}>{open} open suggestie{open === 1 ? "" : "s"}</span>}
        {rejected > 0 && <span style={{ color: "#9A8F84" }}>{rejected} verworpen</span>}
      </div>
    </motion.button>
  );
}

function Skeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.5)" }} />
      ))}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="text-center py-16">
      <p className="font-display text-[17px] font-semibold mb-1" style={{ color: "#1A1410" }}>Rustig hier</p>
      <p className="text-[13px]" style={{ color: "#9A8F84" }}>{text}</p>
    </div>
  );
}
