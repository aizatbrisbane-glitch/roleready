"use client";

import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ApplicationStatus } from "@/types/database";

const STATUSES: ApplicationStatus[] = ["New", "Ready", "Applied", "Interview", "Rejected"];

const statusStyle: Record<ApplicationStatus, { select: string; dot: string; label: string }> = {
  New:       { select: "bg-sky-50      text-sky-800      ring-sky-200",      dot: "bg-sky-400",      label: "Generate your tailored resume and cover letter" },
  Ready:     { select: "bg-teal-50     text-teal-800     ring-teal-200",     dot: "bg-teal-500",     label: "Download, submit, then mark as Applied" },
  Applied:   { select: "bg-amber-50    text-amber-800    ring-amber-200",    dot: "bg-amber-400",    label: "Keep it here while you wait for a response" },
  Interview: { select: "bg-orange-50   text-orange-800   ring-orange-200",   dot: "bg-orange-400",   label: "Review the role and prepare your talking points" },
  Rejected:  { select: "bg-rose-50     text-rose-700     ring-rose-200",     dot: "bg-rose-400",     label: "Keep as a reference for future applications" },
};

type Props = {
  applicationId: string;
  currentStatus: ApplicationStatus;
};

export function StatusSelector({ applicationId, currentStatus }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<ApplicationStatus>(currentStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleChange(next: ApplicationStatus) {
    if (next === status || saving) return;
    const prev = status;
    setStatus(next);
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/applications/${applicationId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        setStatus(prev);
        setError(payload?.error ?? "Failed to update status.");
      } else {
        router.refresh();
      }
    } catch {
      setStatus(prev);
      setError("Network error — status not saved.");
    } finally {
      setSaving(false);
    }
  }

  const style = statusStyle[status];

  return (
    <div className="space-y-2">
      <label className="relative block">
        <span className="sr-only">Update application status</span>
        {/* Coloured dot overlay */}
        <span className={`pointer-events-none absolute left-4 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full ${style.dot}`} />
        <select
          value={status}
          disabled={saving}
          onChange={(e) => handleChange(e.target.value as ApplicationStatus)}
          className={`w-full appearance-none rounded-2xl py-3 pl-8 pr-10 text-sm font-semibold outline-none ring-1 transition disabled:opacity-60 ${style.select}`}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />
      </label>
      <p className="pl-1 text-xs text-slate-500">{style.label}</p>
      {error && <p className="pl-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
