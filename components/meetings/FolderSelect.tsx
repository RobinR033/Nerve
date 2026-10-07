"use client";

import { useState } from "react";
import type { MeetingCategory, MeetingFolder } from "@/types/database";
import { categoryIdOf, flattenFolders } from "@/lib/utils/folderTree";

type Props = {
  folders: MeetingFolder[];
  categories: MeetingCategory[];
  value: string | null;
  onChange: (folderId: string | null) => void;
  // Maakt een nieuwe map aan en geeft die terug (wordt daarna direct gekozen)
  onCreate: (name: string, categoryId: string | null, parentId: string | null) => Promise<MeetingFolder>;
  highlight?: boolean;
};

const NEW = "__new__";

export function FolderSelect({ folders, categories, value, onChange, onCreate, highlight = false }: Props) {
  const sorted = [...categories].sort((a, b) => a.position - b.position);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  // Standaard de personen-categorie (meeste nieuwe mappen zijn bila's), anders de eerste
  const [categoryId, setCategoryId] = useState<string | null>(
    () => (sorted.find((c) => c.kind === "person") ?? sorted[0])?.id ?? null,
  );
  const [parentId, setParentId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const folder = await onCreate(name, categoryId, parentId);
      onChange(folder.id);
      setCreating(false);
      setName("");
      setParentId(null);
    } finally {
      setBusy(false);
    }
  }

  if (creating) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") setCreating(false);
          }}
          placeholder="Naam map, bijv. Bila Jan"
          className="h-8 px-2.5 rounded-lg text-[13px] min-w-0 flex-1"
          style={inputStyle}
        />
        {!parentId && (
          <select value={categoryId ?? ""} onChange={(e) => setCategoryId(e.target.value || null)} className="h-8 px-2 rounded-lg text-[13px]" style={inputStyle} title="Categorie">
            {sorted.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
        <select
          value={parentId ?? ""}
          onChange={(e) => setParentId(e.target.value || null)}
          className="h-8 px-2 rounded-lg text-[13px] max-w-[9rem]"
          style={inputStyle}
          title="Submap van"
        >
          <option value="">Geen bovenmap</option>
          {flattenFolders(folders).map(({ folder, depth }) => (
            <option key={folder.id} value={folder.id}>{"  ".repeat(depth)}{folder.name}</option>
          ))}
        </select>
        <button onClick={submit} disabled={busy || !name.trim()} className="h-8 px-3 rounded-lg text-[12.5px] font-semibold text-white disabled:opacity-50" style={{ background: "#FF5A1F" }}>
          Maak
        </button>
        <button onClick={() => setCreating(false)} className="h-8 px-2 rounded-lg text-[12.5px]" style={{ color: "#9A8F84" }}>
          Annuleer
        </button>
      </div>
    );
  }

  return (
    <select
      value={value ?? ""}
      onChange={(e) => {
        if (e.target.value === NEW) setCreating(true);
        else onChange(e.target.value || null);
      }}
      className="h-8 px-2.5 rounded-lg text-[13px] font-medium max-w-full"
      style={{
        ...inputStyle,
        ...(highlight ? { borderColor: "#FF8A5C", background: "#FFF6EE" } : {}),
      }}
    >
      <option value="">Ongesorteerd</option>
      {sorted.map((g) => {
        const items = flattenFolders(folders, (f) => categoryIdOf(folders, categories, f) === g.id);
        if (items.length === 0) return null;
        return (
          <optgroup key={g.id} label={g.name}>
            {items.map(({ folder, depth }) => (
              <option key={folder.id} value={folder.id}>
                {"  ".repeat(depth)}{depth > 0 ? "└ " : ""}{folder.name}
              </option>
            ))}
          </optgroup>
        );
      })}
      <option value={NEW}>+ Nieuwe map…</option>
    </select>
  );
}

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.8)",
  border: "0.5px solid rgba(0,0,0,0.12)",
  color: "#1A1410",
  outline: "none",
};
