"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Plus, X } from "lucide-react";

export type AdminOrg = {
  id: string;
  name: string;
  status: string;
  seatLimit: number;
  createdAt: string;
  memberCount: number;
  ownerEmail: string | null;
};

type Props = {
  organizations: AdminOrg[];
};

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

export function AdminOrganizationsPanel({ organizations }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showCreate, setShowCreate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");
  const [editingSeatId, setEditingSeatId] = useState<string | null>(null);
  const [seatDraft, setSeatDraft] = useState("");
  const [rowMessage, setRowMessage] = useState<Record<string, string>>({});

  async function createOrg(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setCreateError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/organizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(form.get("name") ?? "").trim(),
        ownerEmail: String(form.get("ownerEmail") ?? "").trim(),
        seatLimit: Number(form.get("seatLimit") ?? 10),
        adminEmail: String(form.get("adminEmail") ?? "").trim() || undefined,
      }),
    });
    const payload = await response.json().catch(() => null);
    setIsSubmitting(false);
    if (!response.ok) {
      setCreateError(payload?.error ?? "Failed to create organisation.");
      return;
    }
    setShowCreate(false);
    startTransition(() => router.refresh());
  }

  async function updateOrg(id: string, updates: { seatLimit?: number; status?: string }) {
    setRowMessage((prev) => ({ ...prev, [id]: "" }));
    const response = await fetch(`/api/admin/organizations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setRowMessage((prev) => ({ ...prev, [id]: payload?.error ?? "Update failed." }));
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[1.8rem] border border-slate-100 bg-white p-5 shadow-sm md:p-7">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#ece8ff] text-[#2200ff]">
              <Building2 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">Koalapply Admin</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Organisations</h1>
              <p className="mt-1 text-sm text-slate-500">{organizations.length} total</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setShowCreate(true); setCreateError(""); }}
            className="inline-flex items-center gap-2 rounded-full bg-[#2200ff] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(34,0,255,0.22)] transition hover:-translate-y-0.5 hover:bg-[#1a00cc]"
          >
            <Plus className="h-4 w-4" />
            New Organisation
          </button>
        </div>
      </section>

      {showCreate && (
        <section className="rounded-[1.6rem] border border-[#ece8ff] bg-white p-5 shadow-sm md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">New Organisation</h2>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={createOrg} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label mb-1.5 block">Organisation Name</label>
              <input name="name" type="text" required className="field" placeholder="Acme Corp" />
            </div>
            <div>
              <label className="label mb-1.5 block">Seat Limit</label>
              <input name="seatLimit" type="number" min="1" defaultValue="10" className="field" />
            </div>
            <div>
              <label className="label mb-1.5 block">Primary Owner Email</label>
              <input name="ownerEmail" type="email" required className="field" placeholder="hr-lead@acme.com" />
            </div>
            <div>
              <label className="label mb-1.5 block">
                Co-admin Email <span className="normal-case font-normal text-slate-400">(optional)</span>
              </label>
              <input name="adminEmail" type="email" className="field" placeholder="hr-colleague@acme.com" />
            </div>
            {createError && <p className="text-sm text-rose-600 sm:col-span-2">{createError}</p>}
            <div className="sm:col-span-2">
              <button type="submit" disabled={isSubmitting || isPending} className="btn-primary">
                {isSubmitting ? "Creating…" : "Create Organisation"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="overflow-hidden rounded-[1.6rem] border border-slate-100 bg-white shadow-sm">
        <div className="hidden bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 md:grid md:grid-cols-[2fr_0.7fr_0.8fr_1.5fr_0.9fr_0.8fr]">
          <span>Organisation</span>
          <span>Status</span>
          <span>Seats</span>
          <span>Owner</span>
          <span>Created</span>
          <span className="text-right">Actions</span>
        </div>
        <div className="divide-y divide-slate-100">
          {organizations.length === 0 && (
            <p className="px-6 py-8 text-sm text-slate-500">No organisations yet.</p>
          )}
          {organizations.map((org) => (
            <div
              key={org.id}
              className="grid gap-3 px-6 py-4 text-sm md:grid-cols-[2fr_0.7fr_0.8fr_1.5fr_0.9fr_0.8fr] md:items-center"
            >
              <div>
                <p className="font-semibold text-slate-900">{org.name}</p>
                {rowMessage[org.id] && (
                  <p className="mt-0.5 text-xs text-rose-600">{rowMessage[org.id]}</p>
                )}
              </div>

              <p>
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${org.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {org.status}
                </span>
              </p>

              <div>
                {editingSeatId === org.id ? (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <input
                      type="number"
                      min="1"
                      value={seatDraft}
                      onChange={(e) => setSeatDraft(e.target.value)}
                      className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-sm outline-none focus:border-[#2200ff]"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        await updateOrg(org.id, { seatLimit: Number(seatDraft) });
                        setEditingSeatId(null);
                      }}
                      className="rounded-full bg-[#2200ff] px-3 py-1 text-xs font-semibold text-white"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingSeatId(null)}
                      className="rounded-full px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="text-slate-600 underline-offset-2 hover:text-[#2200ff] hover:underline"
                    onClick={() => { setEditingSeatId(org.id); setSeatDraft(String(org.seatLimit)); }}
                  >
                    {org.memberCount}/{org.seatLimit} seats
                  </button>
                )}
              </div>

              <p className="truncate text-slate-600" title={org.ownerEmail ?? undefined}>
                {org.ownerEmail ?? "-"}
              </p>

              <p className="text-slate-500">{formatDate(org.createdAt)}</p>

              <div className="flex justify-start md:justify-end">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => updateOrg(org.id, { status: org.status === "active" ? "inactive" : "active" })}
                  className={`inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    org.status === "active"
                      ? "border-slate-200 bg-white text-slate-600 hover:border-rose-100 hover:bg-rose-50 hover:text-rose-600"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  }`}
                >
                  {org.status === "active" ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
