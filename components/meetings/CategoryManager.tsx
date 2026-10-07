"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { MeetingCategory, MeetingCategoryKind } from "@/types/database";
import { CATEGORY_COLORS, CATEGORY_KINDS } from "@/lib/utils/folderTree";

type Props = {
  open: boolean;
  categories: MeetingCategory[];
  managed: boolean;
  // Aantal mappen per categorie (incl. submappen), om bij verwijderen te waarschuwen
  folderCount: (categoryId: string) => number;
  onClose: () => void;
  onAdd: (name: string, kind: MeetingCategoryKind, color: string) => Promise<unknown>;
  onEdit: (id: string, updates: Partial<Pick<MeetingCategory, "name" | "kind" | "color">>) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onRemove: (id: string, targetId: string | null) => void;
};

/** Hoofdcategorieën van overlegmappen toevoegen, hernoemen, herschikken en verwijderen. */
export function CategoryManager({ open, categories, managed, folderCount, onClose, onAdd, onEdit, onMove, onRemove }: Props) {
  const sorted = [...categories].sort((a, b) => a.position - b.position);
  const [newName, setNewName] = useState("");
  const [newKind, setNewKind] = useState<MeetingCategoryKind>("other");
  const [busy, setBusy] = useState(false);
  // Categorie die verwijderd wordt + waar de mappen heen gaan
  const [removing, setRemoving] = useState<{ id: string; targetId: string | null } | null>(null);

  async function add() {
    if (!newName.trim() || busy) return;
    setBusy(true);
    try {
      const color = CATEGORY_COLORS[categories.length % CATEGORY_COLORS.length];
      await onAdd(newName.trim(), newKind, color);
      setNewName("");
      setNewKind("other");
    } finally {
      setBusy(false);
    }
  }

  function startRemove(c: MeetingCategory) {
    const count = folderCount(c.id);
    if (count === 0) {
      if (window.confirm(`Categorie "${c.name}" verwijderen?`)) onRemove(c.id, null);
      return;
    }
    setRemoving({ id: c.id, targetId: sorted.find((o) => o.id !== c.id)?.id ?? null });
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6"
          style={{ background: "rgba(26,20,16,0.28)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full md:max-w-lg rounded-t-2xl md:rounded-2xl p-5 space-y-4 max-h-[92vh] overflow-y-auto"
            style={{ background: "#FFFDFA", boxShadow: "0 24px 64px -16px rgba(60,40,30,0.35)" }}
          >
            <div>
              <h2 className="font-display text-[20px] font-semibold" style={{ color: "#1A1410", letterSpacing: "-.02em" }}>
                Categorieën
              </h2>
              <p className="text-[12.5px] mt-0.5" style={{ color: "#9A8F84" }}>
                De groepen waaronder je overlegmappen vallen.
              </p>
            </div>

            {!managed ? (
              <p className="text-[13px] rounded-xl px-3 py-2.5" style={{ background: "#FFF6EE", color: "#6B6157" }}>
                Categorieën beheren kan zodra migratie <code>005_meeting_categories.sql</code> in Supabase is uitgevoerd.
              </p>
            ) : (
              <>
                <ul className="space-y-2">
                  {sorted.map((c, i) => (
                    <li key={c.id} className="rounded-xl p-2.5 space-y-2" style={{ background: "#fff", border: "0.5px solid rgba(0,0,0,0.1)" }}>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ background: c.color }} />
                        <NameField
                          key={c.name}
                          initial={c.name}
                          onSave={(name) => name !== c.name && onEdit(c.id, { name })}
                        />
                        <IconButton title="Omhoog" disabled={i === 0} onClick={() => onMove(c.id, -1)}>↑</IconButton>
                        <IconButton title="Omlaag" disabled={i === sorted.length - 1} onClick={() => onMove(c.id, 1)}>↓</IconButton>
                        <IconButton title="Verwijderen" disabled={sorted.length <= 1} onClick={() => startRemove(c)}>×</IconButton>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 pl-5">
                        <select
                          value={c.kind}
                          onChange={(e) => onEdit(c.id, { kind: e.target.value as MeetingCategoryKind })}
                          className="h-8 px-2 rounded-lg text-[12.5px]"
                          style={field}
                          title={CATEGORY_KINDS.find((k) => k.kind === c.kind)?.hint}
                        >
                          {CATEGORY_KINDS.map((k) => (
                            <option key={k.kind} value={k.kind}>Soort: {k.label}</option>
                          ))}
                        </select>
                        <div className="flex gap-1">
                          {CATEGORY_COLORS.map((col) => (
                            <button
                              key={col}
                              onClick={() => onEdit(c.id, { color: col })}
                              className="w-5 h-5 rounded-full"
                              style={{ background: col, outline: c.color === col ? `2px solid ${col}` : "none", outlineOffset: 2 }}
                              title="Kleur"
                              aria-label={`Kleur ${col}`}
                            />
                          ))}
                        </div>
                      </div>
                      {removing?.id === c.id && (
                        <div className="pl-5 space-y-2">
                          <p className="text-[12.5px]" style={{ color: "#6B6157" }}>
                            {folderCount(c.id)} {folderCount(c.id) === 1 ? "map gaat" : "mappen gaan"} naar:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <select
                              value={removing.targetId ?? ""}
                              onChange={(e) => setRemoving({ id: c.id, targetId: e.target.value || null })}
                              className="h-8 px-2 rounded-lg text-[12.5px]"
                              style={field}
                            >
                              {sorted.filter((o) => o.id !== c.id).map((o) => (
                                <option key={o.id} value={o.id}>{o.name}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => {
                                onRemove(c.id, removing.targetId);
                                setRemoving(null);
                              }}
                              disabled={!removing.targetId}
                              className="h-8 px-3 rounded-lg text-[12.5px] font-semibold text-white disabled:opacity-50"
                              style={{ background: "#E5484D" }}
                            >
                              Verwijder categorie
                            </button>
                            <button onClick={() => setRemoving(null)} className="h-8 px-2 text-[12.5px]" style={{ color: "#9A8F84" }}>
                              Annuleer
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>

                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#9A8F84" }}>Nieuwe categorie</p>
                  <div className="flex flex-wrap gap-2">
                    <input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && add()}
                      placeholder="Naam, bijv. Klanten"
                      className="flex-1 min-w-[10rem] h-10 px-3 rounded-xl text-[14px]"
                      style={field}
                    />
                    <select value={newKind} onChange={(e) => setNewKind(e.target.value as MeetingCategoryKind)} className="h-10 px-2 rounded-xl text-[13px]" style={field}>
                      {CATEGORY_KINDS.map((k) => (
                        <option key={k.kind} value={k.kind}>Soort: {k.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={add}
                      disabled={busy || !newName.trim()}
                      className="h-10 px-4 rounded-xl text-[14px] font-semibold text-white disabled:opacity-50"
                      style={{ background: "#FF5A1F" }}
                    >
                      Toevoegen
                    </button>
                  </div>
                  <p className="text-[12px]" style={{ color: "#9A8F84" }}>
                    {CATEGORY_KINDS.map((k) => `${k.label}: ${k.hint.toLocaleLowerCase("nl")}`).join(" · ")}
                  </p>
                </div>
              </>
            )}

            <div className="flex justify-end">
              <button onClick={onClose} className="h-10 px-4 rounded-xl text-[14px] font-semibold" style={{ color: "#6B6157" }}>
                Klaar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function NameField({ initial, onSave }: { initial: string; onSave: (name: string) => void }) {
  const [value, setValue] = useState(initial);
  const commit = () => {
    const name = value.trim();
    if (name) onSave(name);
    else setValue(initial);
  };
  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") setValue(initial);
      }}
      className="flex-1 min-w-0 h-8 px-2 rounded-lg text-[14px] font-semibold"
      style={{ ...field, border: "0.5px solid transparent" }}
      aria-label="Naam categorie"
    />
  );
}

function IconButton({ title, disabled, onClick, children }: { title: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className="w-7 h-7 rounded-md text-[14px] flex items-center justify-center hover:bg-black/5 disabled:opacity-30"
      style={{ color: "#6B6157" }}
    >
      {children}
    </button>
  );
}

const field: React.CSSProperties = {
  background: "#fff",
  border: "0.5px solid rgba(0,0,0,0.12)",
  color: "#1A1410",
  outline: "none",
};
