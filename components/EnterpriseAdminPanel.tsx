"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, RefreshCw, ShieldCheck, UserPlus } from "lucide-react";

export type EnterpriseAdminRow = {
  row_type: "member" | "invitation";
  organization_id: string;
  organization_name: string;
  organization_status: string;
  seat_limit: number;
  member_id: string | null;
  invitation_id: string | null;
  user_id: string | null;
  email: string;
  role: "owner" | "admin" | "employee";
  member_created_at: string;
  invitation_status: "pending" | "accepted" | "revoked" | "expired" | null;
  invitation_expires_at: string | null;
  entitlement_id: string | null;
  plan_type: string | null;
  application_limit: number | null;
  applications_used: number | null;
  valid_from: string | null;
  valid_until: string | null;
  entitlement_status: "active" | "expired" | "revoked" | null;
};

type Props = {
  rows: EnterpriseAdminRow[];
  currentUserId: string;
};

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function statusClass(status: EnterpriseAdminRow["entitlement_status"]) {
  if (status === "active") return "bg-emerald-50 text-emerald-700";
  if (status === "revoked") return "bg-rose-50 text-rose-600";
  if (status === "expired") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-500";
}

function rowStatus(row: EnterpriseAdminRow) {
  if (row.row_type === "invitation") return row.invitation_status ?? "pending";
  return row.entitlement_status ?? "No access";
}

function rowStatusClass(row: EnterpriseAdminRow) {
  if (row.row_type === "invitation") return "bg-violet-50 text-[#2200ff]";
  return statusClass(row.entitlement_status);
}

export function EnterpriseAdminPanel({ rows, currentUserId }: Props) {
  const router = useRouter();
  const [selectedOrgId, setSelectedOrgId] = useState(rows[0]?.organization_id ?? "");
  const [email, setEmail] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const organizations = useMemo(() => {
    const byId = new Map<string, { id: string; name: string; status: string; seatLimit: number }>();
    for (const row of rows) {
      byId.set(row.organization_id, {
        id: row.organization_id,
        name: row.organization_name,
        status: row.organization_status,
        seatLimit: row.seat_limit,
      });
    }
    return Array.from(byId.values());
  }, [rows]);

  const selectedRows = rows.filter((row) => row.organization_id === selectedOrgId);
  const selectedOrg = organizations.find((org) => org.id === selectedOrgId);
  const isOwner = selectedRows.find((row) => row.user_id === currentUserId)?.role === "owner";
  const seatLimit = selectedOrg?.seatLimit ?? 0;
  const allocatedEmployeeRows = selectedRows.filter((row) => row.role === "employee" && row.entitlement_id);
  const pendingInviteRows = selectedRows.filter((row) => row.row_type === "invitation" && row.invitation_status === "pending");
  const activeEmployeeRows = selectedRows.filter((row) => row.role === "employee" && row.entitlement_status === "active");
  const revokedEmployeeRows = selectedRows.filter((row) => row.role === "employee" && row.entitlement_status === "revoked");
  const allocatedSeats = allocatedEmployeeRows.length + pendingInviteRows.length;
  const activeSeats = activeEmployeeRows.length;
  const pendingInvites = pendingInviteRows.length;
  const revokedSeats = revokedEmployeeRows.length;
  const seatsRemaining = Math.max(0, seatLimit - allocatedSeats);
  const totalApplicationsUsed = activeEmployeeRows.reduce((sum, row) => sum + (row.applications_used ?? 0), 0);
  const totalApplicationLimit = activeEmployeeRows.reduce((sum, row) => sum + (row.application_limit ?? 0), 0);
  const latestActiveExpiry = activeEmployeeRows
    .map((row) => row.valid_until)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null;

  async function addEmployee(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const response = await fetch("/api/enterprise/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId: selectedOrgId, email }),
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setMessage(payload?.error ?? "Unable to add employee.");
      return;
    }

    setEmail("");
    setMessage(
      payload?.action === "invite_sent"
        ? "Employee invite sent. Access activates after they accept."
        : payload?.action === "invite_recorded"
          ? payload?.warning ?? "Employee invite saved."
          : "Employee invite saved. Access activates after they accept."
    );
    startTransition(() => router.refresh());
  }

  async function revokeEmployee(userId: string) {
    setMessage("");

    const response = await fetch("/api/enterprise/members/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId: selectedOrgId, userId }),
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setMessage(payload?.error ?? "Unable to revoke access.");
      return;
    }

    setMessage("Employee access revoked.");
    startTransition(() => router.refresh());
  }

  async function addAdmin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const response = await fetch("/api/enterprise/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId: selectedOrgId, email: adminEmail }),
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setMessage(payload?.error ?? "Unable to add admin.");
      return;
    }

    setAdminEmail("");
    setMessage(
      payload?.action === "invited"
        ? "Admin invite sent. They'll have dashboard access after signing up."
        : payload?.action === "promoted"
          ? "Employee promoted to admin."
          : "Admin added successfully."
    );
    startTransition(() => router.refresh());
  }

  async function changeRole(userId: string, role: "admin" | "employee") {
    setMessage("");
    const response = await fetch(`/api/enterprise/members/${userId}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId: selectedOrgId, role }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setMessage(payload?.error ?? "Unable to change role.");
      return;
    }
    setMessage(role === "admin" ? "Promoted to admin." : "Removed admin access.");
    startTransition(() => router.refresh());
  }

  async function cancelInvitation(invitationId: string) {
    setMessage("");

    const response = await fetch("/api/enterprise/invitations/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId: selectedOrgId, invitationId }),
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setMessage(payload?.error ?? "Unable to cancel invite.");
      return;
    }

    setMessage("Employee invite cancelled.");
    startTransition(() => router.refresh());
  }

  const adminRows = selectedRows.filter((row) => row.row_type === "member" && (row.role === "owner" || row.role === "admin"));
  const employeeRows = selectedRows.filter((row) => row.role === "employee" || row.row_type === "invitation");
  const isDeactivated = selectedOrg?.status !== "active";

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-[1.8rem] border border-slate-100 bg-white p-5 shadow-sm md:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#ece8ff] text-[#2200ff]">
              <Building2 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">Enterprise Admin</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 md:text-5xl">
                {selectedRows[0]?.organization_name ?? "Organisation"}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Manage employee access and usage without viewing private resumes, cover letters, applications or notes.
              </p>
            </div>
          </div>
          {organizations.length > 1 ? (
            <label className="block min-w-64">
              <span className="label">Organisation</span>
              <select className="field mt-2" value={selectedOrgId} onChange={(event) => setSelectedOrgId(event.target.value)}>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      </section>

      {/* Deactivated banner */}
      {isDeactivated && (
        <div className="rounded-2xl bg-amber-50 px-5 py-4 text-sm text-amber-800">
          <strong>This organisation is deactivated.</strong> All employee access has been suspended. Contact Koalapply to reactivate.
        </div>
      )}

      {/* Stats */}
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[1.4rem] border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Employee seats</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{allocatedSeats}/{seatLimit} used</p>
          <p className="mt-1 text-xs text-slate-400">
            {seatsRemaining} remaining{revokedSeats ? ` | ${revokedSeats} revoked` : ""}
          </p>
        </div>
        {[
          ["Active seats", activeSeats],
          ["Pending invites", pendingInvites],
          ["Application credits", totalApplicationLimit],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[1.4rem] border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </section>

      {/* Admins table */}
      <section className="rounded-[1.6rem] border border-slate-100 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">HR Managers</h2>
            <p className="mt-0.5 text-sm text-slate-500">Manage dashboard access — not visible to employees.</p>
          </div>
          {isOwner && !isDeactivated && (
            <form onSubmit={addAdmin} className="flex gap-2">
              <label className="min-w-0 flex-1 sm:w-64">
                <span className="sr-only">Admin email</span>
                <input
                  type="email"
                  required
                  className="field"
                  placeholder="hr-colleague@company.com"
                  value={adminEmail}
                  onChange={(event) => setAdminEmail(event.target.value)}
                />
              </label>
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#2200ff] bg-white px-4 py-2.5 text-sm font-semibold text-[#2200ff] transition hover:-translate-y-0.5 hover:bg-[#ece8ff] disabled:opacity-60"
              >
                <ShieldCheck className="h-4 w-4" />
                Add admin
              </button>
            </form>
          )}
        </div>

        <div className="mt-4 overflow-hidden rounded-[1.2rem] border border-slate-100">
          <div className="hidden bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 md:grid md:grid-cols-[1fr_0.5fr_0.8fr_0.6fr]">
            <span>Name</span>
            <span>Role</span>
            <span>Since</span>
            <span className="text-right">Action</span>
          </div>
          <div className="divide-y divide-slate-100">
            {adminRows.map((row) => (
              <div key={row.user_id} className="grid gap-2 px-4 py-3.5 text-sm md:grid-cols-[1fr_0.5fr_0.8fr_0.6fr] md:items-center">
                <p className="truncate font-semibold text-slate-900">{row.email}</p>
                <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${row.role === "owner" ? "bg-[#ece8ff] text-[#2200ff]" : "bg-violet-100 text-violet-800"}`}>
                  {row.role}
                </span>
                <p className="text-slate-500 text-xs">{formatDate(row.member_created_at)}</p>
                <div className="flex justify-start md:justify-end">
                  {isOwner && !isDeactivated && row.role === "admin" && row.user_id ? (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => changeRole(row.user_id!, "employee")}
                      className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-rose-100 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60"
                    >
                      Remove
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400">-</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Employees table */}
      <section className="rounded-[1.6rem] border border-slate-100 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Employees</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {employeeRows.length} member{employeeRows.length === 1 ? "" : "s"} · Latest active expiry: {formatDate(latestActiveExpiry)}
            </p>
          </div>
          {!isDeactivated && (
            <form onSubmit={addEmployee} className="flex gap-2">
              <label className="min-w-0 flex-1 sm:w-64">
                <span className="sr-only">Employee email</span>
                <input
                  type="email"
                  required
                  className="field"
                  placeholder="employee@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#2200ff] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(34,0,255,0.18)] transition hover:-translate-y-0.5 hover:bg-[#1a00cc] disabled:opacity-60"
              >
                <UserPlus className="h-4 w-4" />
                Add employee
              </button>
            </form>
          )}
        </div>

        {message ? <p className="mt-4 text-sm font-medium text-slate-600">{message}</p> : null}

        <div className="mt-4 overflow-hidden rounded-[1.2rem] border border-slate-100">
          <div className="hidden bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 md:grid md:grid-cols-[1.6fr_0.8fr_0.9fr_0.9fr_0.6fr]">
            <span>Employee</span>
            <span>Status</span>
            <span>Usage</span>
            <span>Expires</span>
            <span className="text-right">Action</span>
          </div>
          <div className="divide-y divide-slate-100">
            {employeeRows.length === 0 && (
              <p className="px-4 py-6 text-sm text-slate-400">No employees added yet.</p>
            )}
            {employeeRows.map((row) => {
              const remaining = Math.max(0, (row.application_limit ?? 0) - (row.applications_used ?? 0));
              const hasActiveAccess = row.entitlement_status === "active";
              const expiresAt = row.row_type === "invitation" ? row.invitation_expires_at : hasActiveAccess ? row.valid_until : null;
              return (
                <div
                  key={`${row.organization_id}-${row.row_type}-${row.user_id ?? row.invitation_id}`}
                  className="grid gap-3 px-4 py-4 text-sm md:grid-cols-[1.6fr_0.8fr_0.9fr_0.9fr_0.6fr] md:items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{row.email}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {row.row_type === "invitation" ? "Invited" : "Joined"} {formatDate(row.member_created_at)}
                    </p>
                  </div>
                  <p>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${rowStatusClass(row)}`}>
                      {rowStatus(row)}
                    </span>
                  </p>
                  <p className="text-slate-600">
                    {row.row_type === "invitation" ? "-" : `${row.applications_used ?? 0} used`}
                    <span className="block text-xs text-slate-400">
                      {row.row_type === "invitation" ? "Awaiting signup" : hasActiveAccess ? `${remaining} remaining` : "Access not active"}
                    </span>
                  </p>
                  <p className="text-slate-600">{formatDate(expiresAt)}</p>
                  <div className="flex justify-start md:justify-end">
                    {isDeactivated ? (
                      <span className="text-xs text-slate-400">-</span>
                    ) : row.row_type === "invitation" && row.invitation_id ? (
                      <button type="button" disabled={isPending} onClick={() => cancelInvitation(row.invitation_id as string)}
                        className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-rose-100 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60">
                        Cancel
                      </button>
                    ) : row.entitlement_status === "active" && row.user_id ? (
                      <button type="button" disabled={isPending} onClick={() => revokeEmployee(row.user_id as string)}
                        className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-rose-100 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60">
                        Revoke
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-500">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#2200ff]" />
          Admins can see seat status and usage only. Employee job search content remains private.
        </p>
      </section>

      {isPending ? (
        <p className="inline-flex items-center gap-2 text-sm text-slate-500">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Refreshing...
        </p>
      ) : null}
    </div>
  );
}
