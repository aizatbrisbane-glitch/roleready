"use client";

import { CheckCircle2, ChevronDown, CircleDot } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ApplicationStatus } from "@/types/database";

const STATUSES: ApplicationStatus[] = ["New", "Reviewed", "Ready", "Applied", "Interview", "Rejected"];

const buttonClass: Record<ApplicationStatus, string> = {
  New: "border-sky-100 bg-sky-50/70 text-sky-800 hover:border-sky-200 hover:bg-sky-100",
  Reviewed: "border-violet-100 bg-violet-50/70 text-violet-800 hover:border-violet-200 hover:bg-violet-100",
  Ready: "border-teal-100 bg-teal-50/70 text-teal-800 hover:border-teal-200 hover:bg-teal-100",
  Applied: "border-amber-100 bg-amber-50/70 text-amber-800 hover:border-amber-200 hover:bg-amber-100",
  Interview: "border-orange-100 bg-orange-50/70 text-orange-800 hover:border-orange-200 hover:bg-orange-100",
  Rejected: "border-rose-100 bg-rose-50/70 text-rose-700 hover:border-rose-200 hover:bg-rose-100",
};

const activeClass: Record<ApplicationStatus, string> = {
  New: "border-sky-500 bg-sky-500 text-white shadow-[0_12px_26px_rgba(14,165,233,0.18)]",
  Reviewed: "border-violet-500 bg-violet-500 text-white shadow-[0_12px_26px_rgba(139,92,246,0.18)]",
  Ready: "border-teal-600 bg-teal-600 text-white shadow-[0_12px_26px_rgba(13,148,136,0.2)]",
  Applied: "border-amber-500 bg-amber-500 text-white shadow-[0_12px_26px_rgba(245,158,11,0.2)]",
  Interview: "border-orange-500 bg-orange-500 text-white shadow-[0_12px_26px_rgba(249,115,22,0.18)]",
  Rejected: "border-rose-500 bg-rose-500 text-white shadow-[0_12px_26px_rgba(244,63,94,0.18)]",
};

const mobileSelectClass: Record<ApplicationStatus, string> = {
  New: "bg-sky-50 text-sky-800 ring-sky-100",
  Reviewed: "bg-violet-50 text-violet-800 ring-violet-100",
  Ready: "bg-teal-50 text-teal-800 ring-teal-100",
  Applied: "bg-amber-50 text-amber-800 ring-amber-100",
  Interview: "bg-orange-50 text-orange-800 ring-orange-100",
  Rejected: "bg-rose-50 text-rose-700 ring-rose-100",
};

type Props = {
  applicationId: string;
  currentStatus: ApplicationStatus;
};

export function StatusSelector({ applicationId, currentStatus }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<ApplicationStatus>(currentStatus);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function showToast(type: "success" | "error", text: string) {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleChange(next: ApplicationStatus) {
    if (next === status || saving) return;
    const prev = status;
    setStatus(next);
    setSaving(true);

    try {
      const res = await fetch(`/api/applications/${applicationId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        setStatus(prev);
        showToast("error", payload?.error ?? "Failed to update status.");
      } else {
        showToast("success", `Status updated to ${next}`);
        router.refresh();
      }
    } catch {
      setStatus(prev);
      showToast("error", "Network error - status not saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <label className={`relative block sm:hidden ${saving ? "opacity-60" : ""}`}>
        <span className="sr-only">Update application status</span>
        <select
          className={`min-h-12 w-full appearance-none rounded-2xl px-4 pr-11 text-base font-semibold outline-none ring-1 focus:ring-[#0f9f92]/30 ${mobileSelectClass[status]}`}
          disabled={saving}
          onChange={(event) => handleChange(event.target.value as ApplicationStatus)}
          value={status}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </label>

      <div className={`hidden min-w-0 gap-2 transition-opacity sm:grid sm:grid-cols-2 lg:grid-cols-3 ${saving ? "opacity-60" : ""}`}>
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            disabled={saving}
            onClick={() => handleChange(s)}
            className={`flex min-w-0 items-center justify-center rounded-2xl border px-3 py-3 text-center text-sm font-semibold transition hover:-translate-y-0.5 ${
              s === status ? activeClass[s] : buttonClass[s]
            }`}
          >
            <span>{s}</span>
          </button>
        ))}
      </div>

      {toast && (
        <p className={`text-sm font-medium ${toast.type === "success" ? "text-teal-700" : "text-red-600"}`}>
          {toast.type === "success" ? "Saved:" : "Error:"} {toast.text}
        </p>
      )}
    </div>
  );
}
