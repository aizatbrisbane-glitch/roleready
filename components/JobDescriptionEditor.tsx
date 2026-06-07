"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  applicationId: string;
  initialDescription: string;
};

export function JobDescriptionEditor({ applicationId, initialDescription }: Props) {
  const router = useRouter();
  const [description, setDescription] = useState(initialDescription);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    setLoading(true);
    setMessage("");

    const response = await fetch(`/api/applications/${applicationId}/job-description`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ description })
    });
    const payload = await response.json();

    if (!response.ok) {
      setMessage(payload.error ?? "Unable to save job description.");
      setLoading(false);
      return;
    }

    setMessage("Saved. You can generate tailored documents now.");
    setLoading(false);
    router.refresh();
  }

  return (
    <section className="rounded-md border border-amber-300 bg-amber-50 p-4">
      <h2 className="font-bold text-slate-900">Paste the full job description to get started</h2>
      <p className="mt-1 text-sm leading-6 text-amber-950">
        We only got a snippet from the job site — the AI needs the full ad to tailor your resume and cover letter properly. Paste it below, then generate.
      </p>
      <textarea
        className="field mt-3 min-h-64 bg-white"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        placeholder="Paste the full job description here…"
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button className="btn-primary" disabled={loading || description.trim().length < 100} onClick={save} type="button">
          {loading ? "Saving..." : "Save Job Ad Text"}
        </button>
        {description.trim().length < 100 ? <p className="text-sm text-amber-950">Paste more of the job ad before saving.</p> : null}
        {message ? <p className="text-sm text-slate-700">{message}</p> : null}
      </div>
    </section>
  );
}
