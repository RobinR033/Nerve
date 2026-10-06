"use client";

import { useState } from "react";
import type { MeetingFolder, MeetingFolderType, Project } from "@/types/database";
import { FOLDER_GROUPS, flattenFolders } from "@/lib/utils/folderTree";

// Wat er in de rechterkolom getoond wordt
export type Selection =
  | { kind: "review" }
  | { kind: "all" }
  | { kind: "unsorted" }
  | { kind: "folder"; id: string };

type Props = {
  folders: MeetingFolder[];
  projects: Project[];
  selection: Selection;
  counts: { review: number; all: number; unsorted: number; byFolder: Map<string, number> };
  onSelect: (s: Selection) => void;
  onCreate: (name: string, type: MeetingFolderType, parentId: string | null, projectId: string | null) => Promise<MeetingFolder>;
  onRename: (id: string, name: string) => void;
  onDelete: (folder: MeetingFolder) => void;
};

export function FolderTree({ folders, projects, selection, counts, onSelect, onCreate, onRename, onDelete }: Props) {
  // Nieuwe map: in welke groep (of als submap van welke map)
  const [adding, setAdding] = useState<{ type: MeetingFolderType; parentId: string | null } | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);

  const isSel = (s: Selection) =>
    s.kind === selection.kind && (s.kind !== "folder" || (selection.kind === "folder" && selection.id === s.id));

  return (
    <nav className="space-y-4 text-[13.5px]">
      <div className="space-y-0.5">
        <Row label="Te beoordelen" count={counts.review} active={isSel({ kind: "review" })} accent="#7C3AED" onClick={() => onSelect({ kind: "review" })} />
        <Row label="Alle overleggen" count={counts.all} active={isSel({ kind: "all" })} onClick={() => onSelect({ kind: "all" })} />
        <Row label="Ongesorteerd" count={counts.unsorted} active={isSel({ kind: "unsorted" })} onClick={() => onSelect({ kind: "unsorted" })} />
      </div>

      {FOLDER_GROUPS.map((g) => {
        const items = flattenFolders(folders, g.type);
        return (
          <div key={g.type}>
            <div className="flex items-center justify-between px-2 mb-1">
              <span className="text-[10.5px] font-bold uppercase tracking-wider" style={{ color: g.color }}>{g.label}</span>
              <button
                onClick={() => setAdding({ type: g.type, parentId: null })}
                className="w-6 h-6 rounded-md flex items-center justify-center"
                style={{ color: g.color }}
                title={`Nieuwe map in ${g.label}`}
                aria-label={`Nieuwe map in ${g.label}`}
              >
                +
              </button>
            </div>
            <div className="space-y-0.5">
              {items.map(({ folder, depth }) => (
                <div key={folder.id}>
                  {renaming === folder.id ? (
                    <NameInput
                      initial={folder.name}
                      depth={depth}
                      onDone={(name) => {
                        setRenaming(null);
                        if (name && name !== folder.name) onRename(folder.id, name);
                      }}
                    />
                  ) : (
                    <Row
                      label={folder.name}
                      depth={depth}
                      count={counts.byFolder.get(folder.id) ?? 0}
                      active={isSel({ kind: "folder", id: folder.id })}
                      accent={g.color}
                      onClick={() => onSelect({ kind: "folder", id: folder.id })}
                      actions={
                        <>
                          <MiniButton title="Submap" onClick={() => setAdding({ type: folder.type, parentId: folder.id })}>+</MiniButton>
                          <MiniButton title="Hernoemen" onClick={() => setRenaming(folder.id)}>✎</MiniButton>
                          <MiniButton title="Verwijderen" onClick={() => onDelete(folder)}>×</MiniButton>
                        </>
                      }
                    />
                  )}
                  {adding?.parentId === folder.id && (
                    <NewFolderInput
                      depth={depth + 1}
                      type={adding.type}
                      projects={projects}
                      onCancel={() => setAdding(null)}
                      onSubmit={async (name, projectId) => {
                        await onCreate(name, adding.type, folder.id, projectId);
                        setAdding(null);
                      }}
                    />
                  )}
                </div>
              ))}
              {adding && adding.parentId === null && adding.type === g.type && (
                <NewFolderInput
                  depth={0}
                  type={g.type}
                  projects={projects}
                  onCancel={() => setAdding(null)}
                  onSubmit={async (name, projectId) => {
                    const f = await onCreate(name, g.type, null, projectId);
                    setAdding(null);
                    onSelect({ kind: "folder", id: f.id });
                  }}
                />
              )}
              {items.length === 0 && !(adding?.type === g.type && adding.parentId === null) && (
                <p className="px-2 text-[12px]" style={{ color: "#C7C0B8" }}>Nog geen mappen</p>
              )}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

function Row({
  label,
  count,
  active,
  onClick,
  depth = 0,
  accent = "#FF5A1F",
  actions,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  depth?: number;
  accent?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div
      className="group flex items-center gap-1 rounded-lg pr-1 transition-colors"
      style={{
        paddingLeft: 8 + depth * 14,
        background: active ? "rgba(255,255,255,0.9)" : "transparent",
        boxShadow: active ? "0 1px 4px rgba(60,40,30,0.08)" : undefined,
      }}
    >
      <button onClick={onClick} className="flex-1 min-w-0 flex items-center gap-2 py-1.5 text-left">
        {depth > 0 && <span style={{ color: "#C7C0B8" }}>└</span>}
        <span className="truncate" style={{ color: active ? "#1A1410" : "#3D332C", fontWeight: active ? 600 : 500 }}>{label}</span>
        {count > 0 && (
          <span className="ml-auto text-[11px] font-semibold tabular-nums" style={{ color: active ? accent : "#9A8F84" }}>{count}</span>
        )}
      </button>
      {actions && <div className="flex md:hidden md:group-hover:flex items-center">{actions}</div>}
    </div>
  );
}

function MiniButton({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button title={title} aria-label={title} onClick={onClick} className="w-6 h-6 rounded-md text-[13px] flex items-center justify-center hover:bg-white" style={{ color: "#9A8F84" }}>
      {children}
    </button>
  );
}

function NameInput({ initial, depth, onDone }: { initial: string; depth: number; onDone: (name: string | null) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <input
      autoFocus
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => onDone(value.trim() || null)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onDone(value.trim() || null);
        if (e.key === "Escape") onDone(null);
      }}
      className="w-full h-8 px-2 rounded-lg text-[13px]"
      style={{ marginLeft: depth * 14, width: `calc(100% - ${depth * 14}px)`, background: "#fff", border: "0.5px solid rgba(0,0,0,0.15)", outline: "none" }}
    />
  );
}

function NewFolderInput({
  depth,
  type,
  projects,
  onSubmit,
  onCancel,
}: {
  depth: number;
  type: MeetingFolderType;
  projects: Project[];
  onSubmit: (name: string, projectId: string | null) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const placeholder = type === "person" ? "Naam, bijv. Jan" : type === "series" ? "Bijv. Weekly MT" : "Naam map";

  async function submit() {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      await onSubmit(name.trim(), projectId);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1 py-1" style={{ paddingLeft: depth * 14 }}>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") onCancel();
        }}
        placeholder={placeholder}
        className="w-full h-8 px-2 rounded-lg text-[13px]"
        style={{ background: "#fff", border: "0.5px solid rgba(0,0,0,0.15)", outline: "none" }}
      />
      {type === "project" && projects.length > 0 && (
        <select
          value={projectId ?? ""}
          onChange={(e) => {
            setProjectId(e.target.value || null);
            const p = projects.find((p) => p.id === e.target.value);
            if (p && !name.trim()) setName(p.name);
          }}
          className="w-full h-8 px-2 rounded-lg text-[12.5px]"
          style={{ background: "#fff", border: "0.5px solid rgba(0,0,0,0.15)" }}
          title="Taken uit overleggen in deze map krijgen dit project"
        >
          <option value="">Geen Nerve-project koppelen</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>Koppel aan: {p.name}</option>
          ))}
        </select>
      )}
      <div className="flex gap-1">
        <button onClick={submit} disabled={!name.trim() || busy} className="h-7 px-2.5 rounded-md text-[12px] font-semibold text-white disabled:opacity-50" style={{ background: "#FF5A1F" }}>
          Maak map
        </button>
        <button onClick={onCancel} className="h-7 px-2 text-[12px]" style={{ color: "#9A8F84" }}>Annuleer</button>
      </div>
    </div>
  );
}
