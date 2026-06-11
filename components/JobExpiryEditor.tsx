"use client";

import { useState } from "react";
import { Calendar } from "lucide-react";

type Props = {
  jobId: string;
  expiresAt: string | null;
};

function urgencyClass(expiresAt: string | null): string {
  if (!expiresAt) return "bg-slate-100 text-slate-500";
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
  if (days < 0) return "bg-slate-100 text-slate-400 line-through";
  if (days <= 3) return "bg-rose-100 text-rose-700";
  if (days <= 7) return "bg-amber-100 text-amber-700";
  return "bg-emerald-50 text-emerald-700";
}

function urgencyLabel(expiresAt: string | null): string {
  if (!expiresAt) return "No closing date";
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
  const formatted = new Date(expiresAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
  if (days < 0) return `Closed ${formatted}`;
  if (days === 0) return "Closes today";
  if (days === 1) return "Closes tomorrow";
  if (days <= 7) return `Closes in ${days} days`;
  return `Closes ${formatted}`;
}

export function JobExpiryEditor({ jobId, expiresAt: initial }: Props) {
  const [expiresAt, setExpiresAt] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save(value: string) {
    setSaving(true);
    const newVal = value || null;
    await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expires_at: newVal }),
    });
    setExpiresAt(newVal);
    setSaving(false);
    setEditing(false);
  }

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <input
          type="date"
          defaultValue={expiresAt ?? ""}
          autoFocus
          disabled={saving}
          className="rounded-lg border border-slate-200 px-2 py-0.5 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-[#d4ccff]"
          onBlur={(e) => save(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save((e.target as HTMLInputElement).value);
            if (e.key === "Escape") setEditing(false);
          }}
        />
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition hover:opacity-80 ${urgencyClass(expiresAt)}`}
      title="Click to set closing date"
    >
      <Calendar className="h-3 w-3 shrink-0" />
      {urgencyLabel(expiresAt)}
    </button>
  );
}
