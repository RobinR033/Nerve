"use client";

import { useState } from "react";
import type { MeetingFolder, MeetingFolderType } from "@/types/database";
import { FOLDER_GROUPS, flattenFolders } from "@/lib/utils/folderTree";

type Props = {
  folders: MeetingFolder[];
  value: string | null;
  onChange: (folderId: string | null) => void;
  // Maakt een nieuwe map aan en geeft die terug (wordt daarna direct gekozen)
  onCreate: (name: string, type: MeetingFolderType, parentId: string | null) => Promise<MeetingFolder>;
  highlight?: boolean;
};

const NEW = "__new__";

export function FolderSelect({ folders, value, onChange, onCreate, highlight = false }: Props) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<MeetingFolderType>("person");
  const [parentId, setParentId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const folder = await onCreate(name, type, parentId);
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
        <select value={type} onChange={(e) => setType(e.target.value as MeetingFolderType)} className="h-8 px-2 rounded-lg text-[13px]" style={inputStyle}>
          {FOLDER_GROUPS.map((g) => (
            <option key={g.type} value={g.type}>{g.single}</option>
          ))}
        </select>
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
      {FOLDER_GROUPS.map((g) => {
        const items = flattenFolders(folders, g.type);
        if (items.length === 0) return null;
        return (
          <optgroup key={g.type} label={g.label}>
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
