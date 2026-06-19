"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2, UserCheck } from "lucide-react";
import type { Reference } from "@/types/database";

type RefForm = { name: string; position: string; company: string; phone: string; email: string };

const EMPTY_FORM: RefForm = { name: "", position: "", company: "", phone: "", email: "" };

function RefFormFields({ value, onChange }: { value: RefForm; onChange: (v: RefForm) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="block text-xs font-semibold text-slate-600">
          Full name <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          required
          className="field mt-1"
          placeholder="Troy Smith"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600">Position / Title</label>
        <input
          type="text"
          className="field mt-1"
          placeholder="Senior Manager"
          value={value.position}
          onChange={(e) => onChange({ ...value, position: e.target.value })}
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600">Company / Organisation</label>
        <input
          type="text"
          className="field mt-1"
          placeholder="Acme Corp"
          value={value.company}
          onChange={(e) => onChange({ ...value, company: e.target.value })}
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600">Phone</label>
        <input
          type="tel"
          className="field mt-1"
          placeholder="0400 000 000"
          value={value.phone}
          onChange={(e) => onChange({ ...value, phone: e.target.value })}
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600">Email</label>
        <input
          type="email"
          className="field mt-1"
          placeholder="troy@acme.com"
          value={value.email}
          onChange={(e) => onChange({ ...value, email: e.target.value })}
        />
      </div>
    </div>
  );
}

export function ReferencesForm({ initialRefs }: { initialRefs: Reference[] }) {
  const [refs, setRefs] = useState<Reference[]>(initialRefs);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<RefForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<RefForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function addRef(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/profile/references", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addForm),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) { setError(data?.error ?? "Failed to add."); setSaving(false); return; }
    setRefs((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    setAddForm(EMPTY_FORM);
    setShowAdd(false);
    setSaving(false);
  }

  function startEdit(ref: Reference) {
    setEditingId(ref.id);
    setEditForm({ name: ref.name, position: ref.position ?? "", company: ref.company ?? "", phone: ref.phone ?? "", email: ref.email ?? "" });
    setError("");
  }

  async function saveEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!editingId) return;
    setSaving(true);
    setError("");
    const res = await fetch(`/api/profile/references/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) { setError(data?.error ?? "Failed to save."); setSaving(false); return; }
    setRefs((prev) =>
      prev.map((r) => r.id === editingId ? { ...r, ...editForm } : r).sort((a, b) => a.name.localeCompare(b.name))
    );
    setEditingId(null);
    setSaving(false);
  }

  async function deleteRef(id: string) {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/profile/references/${id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json().catch(() => null); setError(d?.error ?? "Failed to delete."); setSaving(false); return; }
    setRefs((prev) => prev.filter((r) => r.id !== id));
    setSaving(false);
  }

  return (
    <div className="rounded-[1.6rem] border border-slate-100 bg-white p-5 shadow-sm md:p-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#ece8ff] text-[#2200ff]">
            <UserCheck className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-slate-900">References</h2>
            <p className="text-sm text-slate-500">Add your referees once, select them per application.</p>
          </div>
        </div>
        {!showAdd && (
          <button
            type="button"
            onClick={() => { setShowAdd(true); setError(""); }}
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#2200ff] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1a00cc]"
          >
            <Plus className="h-4 w-4" />
            Add referee
          </button>
        )}
      </div>

      {showAdd && (
        <form onSubmit={addRef} className="mt-5 rounded-2xl border border-[#d4ccff] bg-[#ece8ff]/40 p-4">
          <p className="mb-3 text-sm font-semibold text-slate-700">New referee</p>
          <RefFormFields value={addForm} onChange={setAddForm} />
          {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
          <div className="mt-4 flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving…" : "Save referee"}
            </button>
            <button type="button" onClick={() => { setShowAdd(false); setError(""); }} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      )}

      {refs.length === 0 && !showAdd ? (
        <p className="mt-5 text-sm italic text-slate-400">No referees saved yet. Add one above.</p>
      ) : (
        <div className="mt-5 space-y-3">
          {refs.map((ref) =>
            editingId === ref.id ? (
              <form key={ref.id} onSubmit={saveEdit} className="rounded-2xl border border-[#d4ccff] bg-[#ece8ff]/40 p-4">
                <p className="mb-3 text-sm font-semibold text-slate-700">Edit referee</p>
                <RefFormFields value={editForm} onChange={setEditForm} />
                {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
                <div className="mt-4 flex gap-2">
                  <button type="submit" disabled={saving} className="btn-primary">
                    {saving ? "Saving…" : "Save"}
                  </button>
                  <button type="button" onClick={() => setEditingId(null)} className="btn-secondary">
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div key={ref.id} className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{ref.name}</p>
                  {(ref.position || ref.company) && (
                    <p className="mt-0.5 text-sm text-slate-600">
                      {[ref.position, ref.company].filter(Boolean).join(", ")}
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-slate-400">
                    {[ref.phone, ref.email].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => startEdit(ref)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-[#ece8ff] hover:text-[#2200ff]"
                    aria-label="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteRef(ref.id)}
                    disabled={saving}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-rose-50 hover:text-rose-500 disabled:opacity-60"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
