"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ApplicationStatus } from "@/types/database";

const STATUSES: ApplicationStatus[] = ["New", "Reviewed", "Ready", "Applied", "Interview", "Rejected"];

const buttonClass: Record<ApplicationStatus, string> = {
  New:       "border-sky-300 bg-sky-50 text-sky-800 hover:bg-sky-100",
  Reviewed:  "border-violet-300 bg-violet-50 text-violet-800 hover:bg-violet-100",
  Ready:     "border-teal-300 bg-teal-50 text-teal-800 hover:bg-teal-100",
  Applied:   "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100",
  Interview: "border-orange-300 bg-orange-50 text-orange-800 hover:bg-orange-100",
  Rejected:  "border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100",
};

const activeClass: Record<ApplicationStatus, string> = {
  New:       "border-sky-500 bg-sky-500 text-white",
  Reviewed:  "border-violet-500 bg-violet-500 text-white",
  Ready:     "border-teal-600 bg-teal-600 text-white",
  Applied:   "border-amber-500 bg-amber-500 text-white",
  Interview: "border-orange-500 bg-orange-500 text-white",
  Rejected:  "border-rose-500 bg-rose-500 text-white",
};

type Props = {
  applicationId: string;
  currentStatus: ApplicationStatus;
};

export function StatusSelector({ applicationId, currentStatus }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<ApplicationStatus>(currentStatus);
  const [saving, setSaving] = useState(false);

  async function handleChange(next: ApplicationStatus) {
    if (next === status || saving) return;
    setStatus(next);
    setSaving(true);

    await fetch(`/api/applications/${applicationId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next })
    });

    setSaving(false);
    router.refresh();
  }

  return (
    <div className={`flex flex-wrap gap-1.5 transition-opacity ${saving ? "opacity-50" : ""}`}>
      {STATUSES.map((s) => (
        <button
          key={s}
          type="button"
          disabled={saving}
          onClick={() => handleChange(s)}
          className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
            s === status ? activeClass[s] : buttonClass[s]
          }`}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
