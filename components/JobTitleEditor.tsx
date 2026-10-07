"use client";

import { useRef, useState } from "react";
import { Pencil } from "lucide-react";

type Props = {
  jobId: string;
  initialTitle: string;
};

export function JobTitleEditor({ jobId, initialTitle }: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialTitle);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setDraft(title);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  async function save() {
    const value = draft.trim();
    if (!value || value === title) { setEditing(false); return; }
    setSaving(true);
    await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: value }),
    });
    setTitle(value);
    setSaving(false);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        autoFocus
        value={draft}
        disabled={saving}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); void save(); }
          if (e.key === "Escape") setEditing(false);
        }}
        className="w-full rounded-xl border border-[#d4ccff] bg-white px-3 py-1 text-3xl font-bold tracking-tight text-slate-900 outline-none focus:ring-2 focus:ring-[#d4ccff] md:text-4xl"
        placeholder="Enter job title"
      />
    );
  }

  const display = title.trim() || "Untitled role";

  return (
    <button
      type="button"
      onClick={startEdit}
      className="group flex items-center gap-2 text-left"
      title="Click to edit job title"
    >
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
        {display}
      </h1>
      <Pencil className="h-4 w-4 shrink-0 text-slate-300 opacity-0 transition group-hover:opacity-100" />
    </button>
  );
}
