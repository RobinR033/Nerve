"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMeetings } from "@/hooks/useMeetings";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useProjectStore } from "@/stores/projectStore";
import { FolderTree, type Selection } from "@/components/meetings/FolderTree";
import { MeetingReviewCard, formatMeetingDate } from "@/components/meetings/MeetingReviewCard";
import { MeetingDetail } from "@/components/meetings/MeetingDetail";
import { NewNoteModal } from "@/components/meetings/NewNoteModal";
import { CategoryManager } from "@/components/meetings/CategoryManager";
import { AskBox } from "@/components/meetings/AskBox";
import { categoryIdOf, descendantIds, folderPath } from "@/lib/utils/folderTree";
import { personMatches } from "@/lib/utils/folderSuggestion";
import { groupByPeriod, summaryPreview } from "@/lib/utils/meetingList";
import type { MeetingWithSuggestions } from "@/types/database";

export function OverleggenClient() {
  const m = useMeetings("all");
  const projects = useProjectStore((s) => s.projects);
  // Niet zelf gekozen → "Te beoordelen" als daar iets staat, anders alle verslagen
  const [chosenSelection, setSelection] = useState<Selection | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [treeOpen, setTreeOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  // Brede schermen: drie kolommen zoals Outlook/OneNote (mappen | lijst | overleg)
  const desktop = useMediaQuery("(min-width: 1024px)");

  // Deeplink vanuit bijv. een projectdossier: /overleggen?overleg=<id>
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("overleg");
    if (id) setSelectedId(id);
  }, []);

  const toReview = m.meetings.filter((x) => !x.reviewed_at);
  const hasReview = toReview.length > 0;
  const selection = useMemo<Selection>(
    () => chosenSelection ?? (hasReview ? { kind: "review" } : { kind: "all" }),
    [chosenSelection, hasReview],
  );
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

  const meetingLabel = (id: string) => {
    const x = m.meetings.find((mm) => mm.id === id);
    return x ? `${x.title} · ${formatMeetingDate(x.held_at)}` : null;
  };
  const folderProject = selectedFolder?.project_id ? projects.find((p) => p.id === selectedFolder.project_id) ?? null : null;

  const withoutSummary = list.filter((x) => !x.summary?.trim());

  const selectedMeeting = selectedId ? m.meetings.find((x) => x.id === selectedId) ?? null : null;

  const heading =
    selection.kind === "review" ? "Te beoordelen"
    : selection.kind === "all" ? "Alle overleggen"
    : selection.kind === "unsorted" ? "Ongesorteerd"
    : selectedFolder ? folderPath(m.folders, selectedFolder.id) : "Map";

  // Verslag openen; op de telefoon bovenaan beginnen met lezen
  function openMeeting(id: string) {
    setSelectedId(id);
    window.scrollTo({ top: 0 });
  }

  function pick(s: Selection) {
    setSelection(s);
    setSelectedId(null);
    setTreeOpen(false);
  }

  // Meest gebruikte mappen als snelle tabjes op de telefoon
  const topFolders = useMemo(
    () =>
      [...m.folders]
        .map((f) => ({ f, n: counts.byFolder.get(f.id) ?? 0 }))
        .filter((x) => x.n > 0)
        .sort((a, b) => b.n - a.n)
        .slice(0, 6)
        .map((x) => x.f),
    [m.folders, counts],
  );

  const createFolderSimple = (name: string, categoryId: string | null, parentId: string | null) =>
    m.addFolder(name, categoryId, parentId);

  const tree = (
    <FolderTree
      folders={m.folders}
      categories={m.categories}
      categoriesManaged={m.categoriesManaged}
      projects={projects}
      selection={selection}
      counts={counts}
      onSelect={pick}
      onCreate={m.addFolder}
      onRename={(id, name) => m.editFolder(id, { name })}
      onMoveToCategory={m.moveFolderToCategory}
      onManageCategories={() => setCategoriesOpen(true)}
      onAddCategory={m.addCategory}
      onDelete={(f) => {
        if (window.confirm(`Map "${f.name}" verwijderen? Overleggen erin gaan naar Ongesorteerd; submappen blijven bestaan.`)) {
          m.removeFolder(f.id);
          if (selection.kind === "folder" && selection.id === f.id) setSelection({ kind: "all" });
        }
      }}
    />
  );

  const modals = (
    <>
      <NewNoteModal
        key={noteOpen ? "open" : "closed"}
        open={noteOpen}
        folders={m.folders}
        categories={m.categories}
        defaultFolderId={selectedFolder?.id ?? null}
        onClose={() => setNoteOpen(false)}
        onCreateFolder={createFolderSimple}
        onSaved={() => {
          m.reload();
          setSelection({ kind: "review" });
          setSelectedId(null);
        }}
      />

      <CategoryManager
        open={categoriesOpen}
        categories={m.categories}
        managed={m.categoriesManaged}
        folderCount={(id) => m.folders.filter((f) => categoryIdOf(m.folders, m.categories, f) === id).length}
        onClose={() => setCategoriesOpen(false)}
        onAdd={m.addCategory}
        onEdit={m.editCategory}
        onMove={m.moveCategory}
        onRemove={m.removeCategory}
      />
    </>
  );

  if (desktop) {
    const paneList = selection.kind === "review" ? toReview : list;
    // Net als Outlook: zonder keuze het bovenste overleg tonen
    const current = askOpen ? null : selectedMeeting ?? paneList[0] ?? null;
    return (
      <>
        <div className="grid grid-cols-[250px_340px_minmax(0,1fr)] h-[calc(100dvh-3rem)]">
          {/* 1. Mappen */}
          <aside className="min-w-0 overflow-y-auto px-3 py-5" style={{ borderRight: "0.5px solid rgba(60,40,30,0.1)", background: "rgba(255,253,250,0.45)" }}>
            <div className="flex items-center justify-between gap-2 px-2 mb-4">
              <h1 className="font-display text-[22px] font-semibold" style={{ color: "#1A1410", letterSpacing: "-.03em" }}>Overleggen</h1>
              <button
                onClick={() => setNoteOpen(true)}
                title="Nieuw overleg"
                aria-label="Nieuw overleg"
                className="w-8 h-8 rounded-lg text-white text-[18px] leading-none shrink-0"
                style={{ background: "linear-gradient(135deg, #FF7A45 0%, #FF5A1F 60%, #FF3D8B 110%)" }}
              >
                +
              </button>
            </div>
            {tree}
          </aside>

          {/* 2. Compacte lijst */}
          <section className="min-w-0 flex flex-col" style={{ borderRight: "0.5px solid rgba(60,40,30,0.1)", background: "rgba(255,253,250,0.3)" }}>
            <div className="px-4 pt-5 pb-3 space-y-2">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-[16px] font-semibold truncate flex-1" style={{ color: "#1A1410" }}>{heading}</h2>
                <button
                  onClick={() => setAskOpen((v) => !v)}
                  className="h-7 px-2 rounded-lg text-[12px] font-semibold shrink-0"
                  style={askOpen ? { background: "#2E6BFF", color: "#fff" } : { color: "#2E6BFF", background: "rgba(46,107,255,0.08)" }}
                  title="Vraag iets aan de overleggen in deze lijst"
                >
                  ✦ Vraag
                </button>
              </div>
              {folderProject && (
                <Link href={`/projecten/${folderProject.id}`} className="block text-[12px] font-semibold" style={{ color: folderProject.color }}>
                  Projectdossier {folderProject.name} →
                </Link>
              )}
              {selection.kind !== "review" && (
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Zoeken…"
                  className="w-full h-8 px-3 rounded-lg text-[13px]"
                  style={{ background: "rgba(255,255,255,0.85)", border: "0.5px solid rgba(0,0,0,0.1)", outline: "none" }}
                />
              )}
              {withoutSummary.length > 0 && selection.kind !== "review" && (
                <button
                  disabled={summarizing}
                  onClick={async () => {
                    setSummarizing(true);
                    try {
                      await m.generateMissingSummaries(withoutSummary.map((x) => x.id));
                    } finally {
                      setSummarizing(false);
                    }
                  }}
                  className="text-[12px] font-semibold disabled:opacity-60"
                  style={{ color: "#7C3AED" }}
                >
                  {summarizing ? "Verslagen maken…" : `✦ ${withoutSummary.length} zonder verslag — maak verslagen`}
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto px-2 pb-6">
              {m.isLoading ? (
                <Skeleton />
              ) : paneList.length === 0 && alsoPresent.length === 0 ? (
                <p className="px-2 py-6 text-[13px]" style={{ color: "#9A8F84" }}>
                  {selection.kind === "review" ? "Alles beoordeeld." : query ? "Niets gevonden." : "Nog geen overleggen in deze map."}
                </p>
              ) : (
                <>
                  {groupByPeriod(paneList).map((g) => (
                    <div key={g.label} className="mb-2">
                      <p className="px-2 pt-2 pb-1 text-[10.5px] font-bold uppercase tracking-wider" style={{ color: "#9A8F84" }}>{g.label}</p>
                      {g.items.map((x) => (
                        <PaneRow key={x.id} meeting={x} active={current?.id === x.id} onOpen={() => { setAskOpen(false); setSelectedId(x.id); }} />
                      ))}
                    </div>
                  ))}
                  {alsoPresent.length > 0 && (
                    <div className="mb-2">
                      <p className="px-2 pt-2 pb-1 text-[10.5px] font-bold uppercase tracking-wider" style={{ color: "#2E6BFF" }}>Ook bij aanwezig</p>
                      {alsoPresent.map((x) => (
                        <PaneRow key={x.id} meeting={x} active={current?.id === x.id} onOpen={() => { setAskOpen(false); setSelectedId(x.id); }} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          {/* 3. Overleg: verslag, acties, transcript */}
          <main className="min-w-0 overflow-y-auto px-6 xl:px-10 py-6">
            {askOpen ? (
              <div className="max-w-3xl">
                <AskBox
                  key={selection.kind === "folder" ? selection.id : selection.kind}
                  title={selection.kind === "folder" ? `Vraag over ${heading}` : "Vraag al je overleggen"}
                  placeholder="Bijv. Wat hebben we over de planning afgesproken?"
                  hint="Nerve zoekt in de verslagen en noemt de overleggen waar het staat."
                  mode={{ kind: "cross", meetingIds: selection.kind === "all" ? undefined : paneList.map((x) => x.id) }}
                  meetingLabel={meetingLabel}
                  onOpenMeeting={(id) => { setAskOpen(false); setSelectedId(id); }}
                />
              </div>
            ) : current ? (
              <MeetingDetail
                key={current.id}
                meeting={current}
                folders={m.folders}
                categories={m.categories}
                hideBack
                onBack={() => setSelectedId(null)}
                onFinishReview={() => m.finish(current.id, current.folder_id)}
                onMove={(folderId) => (current.reviewed_at ? m.move(current.id, folderId) : m.finish(current.id, folderId))}
                onDelete={() => {
                  m.remove(current.id);
                  setSelectedId(null);
                }}
                onAccept={m.accept}
                onReject={m.reject}
                onUndoReject={m.undoReject}
                onUndoAccept={m.undoAccept}
                onAcceptAll={m.acceptAll}
                onRejectAll={m.rejectAll}
                onChangeOwner={m.changeOwner}
                onCreateFolder={createFolderSimple}
                onFindActions={() => m.findActions(current.id)}
                onSaveSummary={(text) => m.saveSummary(current.id, text)}
                onGenerateSummary={() => m.generateSummary(current.id)}
                onChangeDate={(iso) => m.setHeldAt(current.id, iso)}
                onChangeProject={(project) => m.setProject(current.id, project)}
                onEnsureProjectFolder={m.ensureProjectFolder}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-[14px]" style={{ color: "#9A8F84" }}>
                {m.isLoading ? "Laden…" : "Kies links een overleg."}
              </div>
            )}
          </main>
        </div>
        {modals}
      </>
    );
  }

  return (
    <div className="max-w-[1680px] mx-auto px-4 md:px-6 2xl:px-10 py-6 md:py-10">
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

      {/* grid-cols-1 = minmax(0,1fr): de scrollende tabjesrij mag de kolom niet breder dan het scherm maken */}
      <div className="grid grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)] gap-6 xl:gap-8">
        {/* Mappen */}
        <aside className="min-w-0">
          {/* Telefoon: tabjes zoals OneNote-secties; volledige mappenboom achter "Mappen" */}
          <div className="md:hidden -mx-4 px-4 mb-2 flex gap-1.5 overflow-x-auto no-scrollbar">
            {counts.review > 0 && (
              <Tab active={selection.kind === "review"} accent="#7C3AED" onClick={() => pick({ kind: "review" })}>
                Te beoordelen <b>{counts.review}</b>
              </Tab>
            )}
            <Tab active={selection.kind === "all"} onClick={() => pick({ kind: "all" })}>
              Alle verslagen <b>{counts.all}</b>
            </Tab>
            {topFolders.map((f) => (
              <Tab key={f.id} active={selection.kind === "folder" && selection.id === f.id} onClick={() => pick({ kind: "folder", id: f.id })}>
                {f.name}
              </Tab>
            ))}
            <Tab active={treeOpen} onClick={() => setTreeOpen((v) => !v)}>
              Mappen {treeOpen ? "▴" : "▾"}
            </Tab>
          </div>
          <div className={`${treeOpen ? "block" : "hidden"} md:block rounded-2xl p-2 md:p-3`} style={{ background: "rgba(255,253,250,0.55)", border: "0.5px solid rgba(255,255,255,0.6)" }}>
            {tree}
          </div>
        </aside>

        {/* Inhoud */}
        <main className="min-w-0">
          {selectedMeeting ? (
            <MeetingDetail
              key={selectedMeeting.id}
              meeting={selectedMeeting}
              folders={m.folders}
              categories={m.categories}
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
              onChangeOwner={m.changeOwner}
              onCreateFolder={createFolderSimple}
              onFindActions={() => m.findActions(selectedMeeting.id)}
              onSaveSummary={(text) => m.saveSummary(selectedMeeting.id, text)}
              onGenerateSummary={() => m.generateSummary(selectedMeeting.id)}
              onChangeDate={(iso) => m.setHeldAt(selectedMeeting.id, iso)}
              onChangeProject={(project) => m.setProject(selectedMeeting.id, project)}
              onEnsureProjectFolder={m.ensureProjectFolder}
            />
          ) : selection.kind === "review" ? (
            <div className="space-y-3">
              <h2 className="hidden md:block font-display text-[18px] font-semibold mb-1" style={{ color: "#1A1410" }}>{heading}</h2>
              {m.isLoading ? (
                <Skeleton />
              ) : toReview.length === 0 ? (
                <Empty title="Alles beoordeeld" text="Nieuwe overleggen verschijnen hier vanzelf." />
              ) : (
                // Brede schermen: kaarten naast elkaar
                <div className="grid gap-3 2xl:grid-cols-2 items-start">
                  <AnimatePresence initial={false}>
                    {toReview.map((x) => (
                      <MeetingReviewCard
                        key={x.id}
                        meeting={x}
                        folders={m.folders}
                        categories={m.categories}
                        onAccept={m.accept}
                        onReject={m.reject}
                        onUndoReject={m.undoReject}
                        onUndoAccept={m.undoAccept}
                        onAcceptAll={m.acceptAll}
                        onRejectAll={m.rejectAll}
                        onChangeOwner={m.changeOwner}
                        onFinish={m.finish}
                        onCreateFolder={createFolderSimple}
                        onFindActions={m.findActions}
                        onChangeProject={m.setProject}
                        onEnsureProjectFolder={m.ensureProjectFolder}
                      />
                    ))}
                  </AnimatePresence>
                </div>
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
              {folderProject && (
                <Link
                  href={`/projecten/${folderProject.id}`}
                  className="mb-3 inline-flex items-center gap-1.5 text-[12.5px] font-semibold"
                  style={{ color: folderProject.color }}
                >
                  Projectdossier {folderProject.name} →
                </Link>
              )}

              {/* Vragen over alle overleggen in deze weergave */}
              <div className="mb-3 rounded-xl p-3" style={{ background: "rgba(255,253,250,0.78)", border: "0.5px solid rgba(255,255,255,0.65)" }}>
                {askOpen ? (
                  <AskBox
                    key={selection.kind === "folder" ? selection.id : selection.kind}
                    title={selection.kind === "folder" ? `Vraag over ${heading}` : "Vraag al je overleggen"}
                    placeholder="Bijv. Wat hebben we over de planning afgesproken?"
                    hint="Nerve zoekt in de verslagen en noemt de overleggen waar het staat."
                    mode={{ kind: "cross", meetingIds: selection.kind === "all" ? undefined : list.map((x) => x.id) }}
                    meetingLabel={meetingLabel}
                    onOpenMeeting={openMeeting}
                  />
                ) : (
                  <button onClick={() => setAskOpen(true)} className="w-full text-left text-[13px] font-semibold" style={{ color: "#2E6BFF" }}>
                    ✦ {selection.kind === "folder" ? `Vraag iets over ${heading}` : "Vraag iets aan al je overleggen"}
                  </button>
                )}
              </div>

              {!m.isLoading && withoutSummary.length > 0 && (
                <div className="mb-3 flex items-center gap-3 rounded-xl px-3 py-2" style={{ background: "rgba(124,58,237,0.07)" }}>
                  <p className="text-[12.5px] flex-1" style={{ color: "#5B3FA8" }}>
                    {summarizing
                      ? `Verslagen maken… (±1 min per overleg)`
                      : `${withoutSummary.length} ${withoutSummary.length === 1 ? "overleg" : "overleggen"} zonder verslag`}
                  </p>
                  <button
                    disabled={summarizing}
                    onClick={async () => {
                      setSummarizing(true);
                      try {
                        await m.generateMissingSummaries(withoutSummary.map((x) => x.id));
                      } finally {
                        setSummarizing(false);
                      }
                    }}
                    className="h-8 px-3 rounded-lg text-[12.5px] font-semibold text-white shrink-0 disabled:opacity-60"
                    style={{ background: "#7C3AED" }}
                  >
                    {summarizing ? "Bezig…" : "Maak verslagen"}
                  </button>
                </div>
              )}
              {m.isLoading ? (
                <Skeleton />
              ) : list.length === 0 && alsoPresent.length === 0 ? (
                <Empty title={query ? "Niets gevonden" : "Nog leeg"} text={query ? "Probeer een ander woord." : "Nog geen overleggen in deze map."} />
              ) : (
                <div className="space-y-2">
                  {groupByPeriod(list).map((g) => (
                    <div key={g.label}>
                      <p className="pt-2 pb-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: "#9A8F84" }}>
                        {g.label}
                      </p>
                      {/* Brede schermen: twee kolommen */}
                      <div className="grid gap-2 xl:grid-cols-2">
                        {g.items.map((x) => (
                          <MeetingRow key={x.id} meeting={x} folderLabel={selection.kind === "folder" ? null : folderPath(m.folders, x.folder_id)} onOpen={() => openMeeting(x.id)} />
                        ))}
                      </div>
                    </div>
                  ))}
                  {alsoPresent.length > 0 && (
                    <>
                      <p className="pt-4 pb-1 text-[11px] font-bold uppercase tracking-wider" style={{ color: "#2E6BFF" }}>
                        Ook bij aanwezig
                      </p>
                      {alsoPresent.map((x) => (
                        <MeetingRow key={x.id} meeting={x} folderLabel={folderPath(m.folders, x.folder_id)} onOpen={() => openMeeting(x.id)} />
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {modals}
    </div>
  );
}

/** Compacte regel in de middelste kolom: alleen titel en datum */
function PaneRow({ meeting, active, onOpen }: { meeting: MeetingWithSuggestions; active: boolean; onOpen: () => void }) {
  const open = meeting.action_suggestions.filter((s) => s.status === "suggested").length;
  return (
    <button
      onClick={onOpen}
      className="w-full text-left rounded-lg px-2.5 py-2 flex items-center gap-2 transition-colors hover:bg-white/60"
      style={active ? { background: "rgba(255,255,255,0.95)", boxShadow: "0 1px 4px rgba(60,40,30,0.08)" } : undefined}
    >
      {!meeting.reviewed_at && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#7C3AED" }} title="Te beoordelen" />}
      <span className="flex-1 min-w-0 truncate text-[13.5px]" style={{ color: "#1A1410", fontWeight: active ? 600 : 500 }}>{meeting.title}</span>
      {open > 0 && meeting.reviewed_at && <span className="text-[10.5px] font-semibold shrink-0" style={{ color: "#FF7A45" }}>{open}</span>}
      <span className="text-[11.5px] shrink-0 tabular-nums" style={{ color: "#9A8F84" }}>
        {new Date(meeting.held_at).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" })}
      </span>
    </button>
  );
}

function MeetingRow({ meeting, folderLabel, onOpen }: { meeting: MeetingWithSuggestions; folderLabel: string | null; onOpen: () => void }) {
  const accepted = meeting.action_suggestions.filter((s) => s.status === "accepted").length;
  const open = meeting.action_suggestions.filter((s) => s.status === "suggested").length;
  const rejected = meeting.action_suggestions.filter((s) => s.status === "rejected").length;
  const preview = summaryPreview(meeting.summary);
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
      {preview ? (
        <p className="text-[12.5px] leading-snug mt-1 line-clamp-2" style={{ color: "#6B6157" }}>{preview}</p>
      ) : (
        <p className="text-[12.5px] mt-1 italic" style={{ color: "#C7C0B8" }}>Nog geen verslag</p>
      )}
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

function Tab({ active, accent, onClick, children }: { active: boolean; accent?: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="h-9 px-3 rounded-xl text-[13px] font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5 [&>b]:font-bold [&>b]:opacity-70"
      style={
        active
          ? { background: accent ?? "#1A1410", color: "#fff" }
          : { background: "rgba(255,255,255,0.75)", color: accent ?? "#3D332C", border: "0.5px solid rgba(0,0,0,0.06)" }
      }
    >
      {children}
    </button>
  );
}

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="text-center py-16">
      <p className="font-display text-[17px] font-semibold mb-1" style={{ color: "#1A1410" }}>{title}</p>
      <p className="text-[13px]" style={{ color: "#9A8F84" }}>{text}</p>
    </div>
  );
}
