"use client";

import { useState } from "react";
import { DndContext, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import type { MeetingCategory, MeetingCategoryKind, MeetingFolder } from "@/types/database";
import { CATEGORY_COLORS, categoryIdOf, flattenFolders } from "@/lib/utils/folderTree";

// Wat er in de rechterkolom getoond wordt
export type Selection =
  | { kind: "review" }
  | { kind: "all" }
  | { kind: "unsorted" }
  | { kind: "folder"; id: string };

type Props = {
  folders: MeetingFolder[];
  categories: MeetingCategory[];
  categoriesManaged: boolean;
  selection: Selection;
  counts: { review: number; all: number; unsorted: number; byFolder: Map<string, number> };
  onSelect: (s: Selection) => void;
  onCreate: (name: string, categoryId: string | null, parentId: string | null, projectId: string | null) => Promise<MeetingFolder>;
  onRename: (id: string, name: string) => void;
  onDelete: (folder: MeetingFolder) => void;
  onMoveToCategory: (folderId: string, categoryId: string) => void;
  onManageCategories: () => void;
  // Nieuwe kop direct toevoegen (zonder het beheerscherm)
  onAddCategory?: (name: string, kind: MeetingCategoryKind, color: string) => Promise<unknown>;
};

export function FolderTree({
  folders,
  categories,
  categoriesManaged,
  selection,
  counts,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  onMoveToCategory,
  onManageCategories,
  onAddCategory,
}: Props) {
  // Nieuwe map: in welke categorie (of als submap van welke map)
  const [adding, setAdding] = useState<{ categoryId: string; parentId: string | null } | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [moving, setMoving] = useState<string | null>(null);

  const isSel = (s: Selection) =>
    s.kind === selection.kind && (s.kind !== "folder" || (selection.kind === "folder" && selection.id === s.id));

  const sorted = [...categories].sort((a, b) => a.position - b.position);
  const canMove = categoriesManaged && categories.length > 1;
  const [addingCategory, setAddingCategory] = useState(false);

  // Slepen: muis na 6px beweging, touch na even vasthouden (zodat tikken gewoon werkt)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } }),
  );

  function onDragEnd(e: DragEndEvent) {
    const folderId = String(e.active.id).replace(/^folder:/, "");
    const target = e.over ? String(e.over.id).replace(/^cat:/, "") : null;
    const folder = folders.find((f) => f.id === folderId);
    if (!folder || !target || !canMove) return;
    if (categoryIdOf(folders, categories, folder) !== target) onMoveToCategory(folderId, target);
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
    <nav className="space-y-4 text-[13.5px]">
      <div className="space-y-0.5">
        <Row label="Te beoordelen" count={counts.review} active={isSel({ kind: "review" })} accent="#7C3AED" onClick={() => onSelect({ kind: "review" })} />
        <Row label="Alle overleggen" count={counts.all} active={isSel({ kind: "all" })} onClick={() => onSelect({ kind: "all" })} />
        <Row label="Ongesorteerd" count={counts.unsorted} active={isSel({ kind: "unsorted" })} onClick={() => onSelect({ kind: "unsorted" })} />
      </div>

      {sorted.map((g) => {
        const items = flattenFolders(folders, (f) => categoryIdOf(folders, categories, f) === g.id);
        return (
          <CategoryDrop key={g.id} id={g.id} color={g.color} enabled={canMove}>
            <div className="flex items-center justify-between px-2 mb-1">
              <span className="text-[10.5px] font-bold uppercase tracking-wider truncate" style={{ color: g.color }}>{g.name}</span>
              <button
                onClick={() => setAdding({ categoryId: g.id, parentId: null })}
                className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                style={{ color: g.color }}
                title={`Nieuwe map in ${g.name}`}
                aria-label={`Nieuwe map in ${g.name}`}
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
                    <DragHandle id={folder.id} enabled={canMove && depth === 0}>
                    <Row
                      label={folder.name}
                      depth={depth}
                      count={counts.byFolder.get(folder.id) ?? 0}
                      active={isSel({ kind: "folder", id: folder.id })}
                      accent={g.color}
                      onClick={() => onSelect({ kind: "folder", id: folder.id })}
                      actions={
                        <>
                          <MiniButton title="Submap" onClick={() => setAdding({ categoryId: g.id, parentId: folder.id })}>+</MiniButton>
                          <MiniButton title="Hernoemen" onClick={() => setRenaming(folder.id)}>✎</MiniButton>
                          {canMove && <MiniButton title="Naar andere categorie" onClick={() => setMoving(folder.id)}>⇄</MiniButton>}
                          <MiniButton title="Verwijderen" onClick={() => onDelete(folder)}>×</MiniButton>
                        </>
                      }
                    />
                    </DragHandle>
                  )}
                  {moving === folder.id && (
                    <div className="py-1" style={{ paddingLeft: 8 + (depth + 1) * 14 }}>
                      <select
                        autoFocus
                        value=""
                        onChange={(e) => {
                          setMoving(null);
                          if (e.target.value) onMoveToCategory(folder.id, e.target.value);
                        }}
                        onBlur={() => setMoving(null)}
                        className="w-full h-8 px-2 rounded-lg text-[12.5px]"
                        style={{ background: "#fff", border: "0.5px solid rgba(0,0,0,0.15)" }}
                      >
                        <option value="">Verplaats naar…</option>
                        {sorted.filter((c) => c.id !== g.id).map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {adding?.parentId === folder.id && (
                    <NewFolderInput
                      depth={depth + 1}
                      kind={g.kind}
                      onCancel={() => setAdding(null)}
                      onSubmit={async (name, projectId) => {
                        await onCreate(name, g.id, folder.id, projectId);
                        setAdding(null);
                      }}
                    />
                  )}
                </div>
              ))}
              {adding && adding.parentId === null && adding.categoryId === g.id && (
                <NewFolderInput
                  depth={0}
                  kind={g.kind}
                  onCancel={() => setAdding(null)}
                  onSubmit={async (name, projectId) => {
                    const f = await onCreate(name, g.id, null, projectId);
                    setAdding(null);
                    onSelect({ kind: "folder", id: f.id });
                  }}
                />
              )}
              {items.length === 0 && !(adding?.categoryId === g.id && adding.parentId === null) && (
                <p className="px-2 text-[12px]" style={{ color: "#C7C0B8" }}>Nog geen mappen</p>
              )}
            </div>
          </CategoryDrop>
        );
      })}

      {categoriesManaged && onAddCategory && (
        addingCategory ? (
          <NameInput
            initial=""
            depth={0}
            onDone={async (name) => {
              setAddingCategory(false);
              if (name) await onAddCategory(name, "other", CATEGORY_COLORS[categories.length % CATEGORY_COLORS.length]);
            }}
          />
        ) : (
          <button
            onClick={() => setAddingCategory(true)}
            className="w-full text-left px-2 py-1 text-[12px] font-semibold rounded-lg hover:bg-white/70"
            style={{ color: "#FF5A1F" }}
          >
            + Nieuwe kop
          </button>
        )
      )}

      <button
        onClick={onManageCategories}
        className="w-full text-left px-2 py-1 text-[12px] font-semibold rounded-lg hover:bg-white/70"
        style={{ color: "#9A8F84" }}
      >
        ⚙ Categorieën beheren
      </button>
      {canMove && (
        <p className="px-2 text-[11px]" style={{ color: "#C7C0B8" }}>Tip: sleep een map naar een andere kop om hem te verplaatsen.</p>
      )}
    </nav>
    </DndContext>
  );
}

/** Kop waar een map op gesleept kan worden */
function CategoryDrop({ id, color, enabled, children }: { id: string; color: string; enabled: boolean; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `cat:${id}`, disabled: !enabled });
  return (
    <div
      ref={setNodeRef}
      className="rounded-xl transition-colors"
      style={isOver ? { background: `${color}14`, outline: `2px dashed ${color}`, outlineOffset: 2 } : undefined}
    >
      {children}
    </div>
  );
}

/** Map die je kunt oppakken (alleen bovenste niveau; submappen gaan mee met hun bovenmap) */
function DragHandle({ id, enabled, children }: { id: string; enabled: boolean; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `folder:${id}`, disabled: !enabled });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        position: "relative",
        zIndex: isDragging ? 50 : undefined,
        opacity: isDragging ? 0.85 : 1,
        touchAction: enabled ? "manipulation" : undefined,
        cursor: enabled ? "grab" : undefined,
      }}
    >
      {children}
    </div>
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
  kind,
  onSubmit,
  onCancel,
}: {
  depth: number;
  kind: MeetingCategoryKind;
  onSubmit: (name: string, projectId: string | null) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const placeholder = kind === "person" ? "Naam, bijv. Jan" : kind === "project" ? "Naam project" : "Naam map";

  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      // Onder een projectkop wordt automatisch een Nerve-project met deze naam gemaakt of gekoppeld
      await onSubmit(name.trim(), null);
    } catch (err) {
      // Niet stil mislukken: laat zien wat er misging
      setError(err instanceof Error ? err.message : "Map maken mislukt");
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
      <div className="flex gap-1">
        <button onClick={submit} disabled={!name.trim() || busy} className="h-7 px-2.5 rounded-md text-[12px] font-semibold text-white disabled:opacity-50" style={{ background: "#FF5A1F" }}>
          {busy ? "Bezig…" : "Maak map"}
        </button>
        <button onClick={onCancel} className="h-7 px-2 text-[12px]" style={{ color: "#9A8F84" }}>Annuleer</button>
      </div>
      {error && <p className="text-[11.5px]" style={{ color: "#E5484D" }}>{error}</p>}
    </div>
  );
}
