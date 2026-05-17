"use client";

import { useRef, useState } from "react";
import { Download, FileText, Mail, UserRound } from "lucide-react";
import type { MasterCoverLetter, MasterResume, Profile } from "@/types/database";

function FileInputField({
  name,
  savedFileName,
  downloadUrl,
}: {
  name: string;
  savedFileName: string | null;
  downloadUrl: string | null;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const display = chosen ?? savedFileName;
  const isSaved = Boolean(savedFileName && !chosen);

  return (
    <div className="flex items-stretch gap-2">
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className={`flex-1 rounded-xl border px-4 py-3 text-left transition ${
          isSaved
            ? "border-teal-200 bg-teal-50 hover:bg-teal-100"
            : "border-stone-200 bg-stone-50 hover:bg-stone-100"
        }`}
      >
        <p className={`truncate text-sm font-semibold ${display ? "text-stone-800" : "text-stone-400"}`}>
          {display ?? "Tap to select a file…"}
        </p>
        <p className={`mt-0.5 text-xs ${isSaved ? "text-teal-600" : "text-stone-400"}`}>
          {isSaved ? "✓ Saved · tap to change" : chosen ? "Ready to upload" : "PDF, DOCX, TXT or MD"}
        </p>
      </button>

      {downloadUrl && (
        <a
          href={downloadUrl}
          title="Download current file"
          className="flex items-center justify-center rounded-xl border border-stone-200 bg-stone-50 px-3 text-stone-500 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
        >
          <Download className="h-4 w-4" />
        </a>
      )}

      <input
        ref={ref}
        type="file"
        name={name}
        accept=".pdf,.docx,.txt,.md"
        className="hidden"
        onChange={(e) => setChosen(e.target.files?.[0]?.name ?? null)}
      />
    </div>
  );
}

type Tab = "profile" | "resume" | "cover";

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "profile", label: "Profile",      icon: UserRound },
  { id: "resume",  label: "Resume",       icon: FileText },
  { id: "cover",   label: "Cover Letter", icon: Mail },
];

type Props = {
  profile: Profile | null;
  masterResume: MasterResume | null;
  masterCoverLetter?: MasterCoverLetter | null;
};

export function ProfileForm({ profile, masterResume, masterCoverLetter }: Props) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/profile", { method: "POST", body: formData });
    const payload = await response.json();

    setMessage(response.ok ? "Profile saved." : payload.error ?? "Unable to save profile.");
    setLoading(false);
  }

  const saveBtn = (
    <div className="flex items-center gap-3 pt-2">
      <button className="btn-primary" disabled={loading} type="submit">
        {loading ? "Saving…" : "Save Profile"}
      </button>
      {message && <p className="text-sm text-stone-700">{message}</p>}
    </div>
  );

  return (
    <form onSubmit={submit} className="pb-24 md:pb-0">

      {/* ── Desktop header ───────────────────────────────────── */}
      <div className="mb-8 hidden md:block">
        <h1 className="text-3xl font-bold text-stone-950">Profile Setup</h1>
        <p className="mt-2 text-sm text-stone-600">This becomes the source of truth for every tailored application.</p>
      </div>

      {/* ── Mobile sub-nav — segmented control ───────────────── */}
      <div className="mb-4 flex gap-1 rounded-xl bg-stone-100 p-1 md:hidden">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
              activeTab === id
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-500"
            }`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Personal details ─────────────────────────────────── */}
      <div className={activeTab === "profile" ? "block" : "hidden md:block"}>
        <section className="space-y-4 md:mb-8">
          <div className="hidden md:block">
            <h2 className="text-lg font-bold text-stone-950">Personal Details</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="label">Name</span>
              <input name="name" className="field" defaultValue={profile?.name ?? ""} />
            </label>
            <label className="space-y-2">
              <span className="label">Email</span>
              <input name="email" type="email" className="field" defaultValue={profile?.email ?? ""} />
            </label>
            <label className="space-y-2">
              <span className="label">Phone</span>
              <input name="phone" className="field" defaultValue={profile?.phone ?? ""} />
            </label>
            <label className="space-y-2">
              <span className="label">Location</span>
              <input name="location" className="field" defaultValue={profile?.location ?? ""} />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="label">LinkedIn URL</span>
              <input name="linkedin_url" type="url" className="field" defaultValue={profile?.linkedin_url ?? ""} />
            </label>
            <label className="space-y-2">
              <span className="label">Target job titles</span>
              <input name="target_job_titles" className="field" defaultValue={profile?.target_job_titles.join(", ") ?? ""} />
            </label>
            <label className="space-y-2">
              <span className="label">Preferred industries</span>
              <input name="preferred_industries" className="field" defaultValue={profile?.preferred_industries.join(", ") ?? ""} />
            </label>
            <label className="space-y-2">
              <span className="label">Salary range</span>
              <input name="salary_range" className="field" defaultValue={profile?.salary_range ?? ""} />
            </label>
            <label className="space-y-2">
              <span className="label">Preferred locations</span>
              <input name="preferred_locations" className="field" defaultValue={profile?.preferred_locations.join(", ") ?? ""} />
            </label>
          </div>
          {saveBtn}
        </section>
      </div>

      {/* ── Master Resume ─────────────────────────────────────── */}
      <div className={activeTab === "resume" ? "block" : "hidden md:block"}>
        <section className="space-y-4 md:mb-8">
          <div>
            <h2 className="text-lg font-bold text-stone-950">Master Resume</h2>
            <p className="mt-1 text-sm text-stone-600">Paste the resume text the AI is allowed to use. Upload the original file for storage.</p>
          </div>
          <div className="space-y-2">
            <span className="label">Resume file</span>
            <FileInputField
              name="resume_file"
              savedFileName={masterResume?.file_name ?? null}
              downloadUrl={masterResume ? "/api/profile/download?type=resume" : null}
            />
          </div>
          <label className="block space-y-2">
            <span className="label">Resume text</span>
            <textarea name="resume_text" className="field min-h-72" defaultValue={masterResume?.resume_text ?? ""} />
          </label>
          {saveBtn}
        </section>
      </div>

      {/* ── Master Cover Letter ───────────────────────────────── */}
      <div className={activeTab === "cover" ? "block" : "hidden md:block"}>
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-stone-950">Master Cover Letter</h2>
            <p className="mt-1 text-sm text-stone-600">Used as a tone and structure reference for concise tailored letters.</p>
          </div>
          <div className="space-y-2">
            <span className="label">Cover letter file</span>
            <FileInputField
              name="cover_letter_file"
              savedFileName={masterCoverLetter?.file_name ?? null}
              downloadUrl={masterCoverLetter ? "/api/profile/download?type=cover" : null}
            />
          </div>
          <label className="block space-y-2">
            <span className="label">Cover letter text</span>
            <textarea name="cover_letter_text" className="field min-h-56" defaultValue={masterCoverLetter?.cover_letter_text ?? ""} />
          </label>
          {saveBtn}
        </section>
      </div>

      {/* ── Desktop save (below all sections) ────────────────── */}
      <div className="hidden md:block">{saveBtn}</div>

    </form>
  );
}
