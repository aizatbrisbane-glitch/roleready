"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { JobSource } from "@/types/database";

const sources: JobSource[] = ["Manual", "SEEK", "LinkedIn", "Adzuna", "Other"];

export function AddJobForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/jobs", {
      method: "POST",
      body: formData
    });
    const payload = await response.json();

    if (!response.ok) {
      setMessage(payload.error ?? "Unable to add job.");
      setLoading(false);
      return;
    }

    router.push(`/applications/${payload.applicationId}`);
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="label">Job title</span>
          <input name="title" className="field" required />
        </label>
        <label className="space-y-2">
          <span className="label">Company</span>
          <input name="company" className="field" required />
        </label>
        <label className="space-y-2">
          <span className="label">Location</span>
          <input name="location" className="field" />
        </label>
        <label className="space-y-2">
          <span className="label">Salary</span>
          <input name="salary" className="field" />
        </label>
        <label className="space-y-2">
          <span className="label">Job URL</span>
          <input name="job_url" type="url" className="field" />
        </label>
        <label className="space-y-2">
          <span className="label">Source</span>
          <select name="source" className="field" defaultValue="Manual">
            {sources.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="space-y-2 block">
        <span className="label">Job description</span>
        <textarea name="description" className="field min-h-96" required />
      </label>
      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={loading} type="submit">
          {loading ? "Adding..." : "Add Job"}
        </button>
        {message ? <p className="text-sm text-red-700">{message}</p> : null}
      </div>
    </form>
  );
}
