"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { inferCountry, marketLabel } from "@/lib/country-inference";

type Step = 1 | 2 | 3;

export interface CandidateOnboardingProps {
  initialTargetJobTitles: string[];
  initialLocation: string;
  hasExistingResume: boolean;
}

const TOTAL_STEPS = 3;

export function CandidateOnboarding({
  initialTargetJobTitles,
  initialLocation,
  hasExistingResume,
}: CandidateOnboardingProps) {
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1 — target job titles
  const [jobTitles, setJobTitles] = useState<string[]>(initialTargetJobTitles);
  const [titleInput, setTitleInput] = useState("");

  // Step 2 — location
  const [location, setLocation] = useState(initialLocation);

  // Step 3 — resume; true if pre-existing OR uploaded in this session
  const [resumeObtained, setResumeObtained] = useState(hasExistingResume);
  const resumeRef = useRef<HTMLInputElement>(null);

  function clearError() {
    setError("");
  }

  // Step 1 helpers
  function addTitle() {
    const trimmed = titleInput.trim();
    if (!trimmed) return;
    if (!jobTitles.includes(trimmed)) {
      setJobTitles((prev) => [...prev, trimmed]);
    }
    setTitleInput("");
  }

  function removeTitle(title: string) {
    setJobTitles((prev) => prev.filter((t) => t !== title));
  }

  async function handleStep1Continue() {
    if (jobTitles.length === 0) {
      setError("Add at least one job title before continuing.");
      return;
    }
    clearError();
    setLoading(true);
    const res = await fetch("/api/profile/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target_job_titles: jobTitles }),
    });
    const data = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) {
      setError(data?.error ?? "Could not save your job titles. Please try again.");
      return;
    }
    setStep(2);
  }

  // Step 2
  async function handleStep2Continue() {
    if (!location.trim()) {
      setError("Enter your location before continuing.");
      return;
    }
    clearError();
    setLoading(true);
    const res = await fetch("/api/profile/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location: location.trim() }),
    });
    const data = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) {
      setError(data?.error ?? "Could not save your location. Please try again.");
      return;
    }
    setStep(3);
  }

  // Step 3 — resume upload (optional)
  async function handleResumeFile(file: File) {
    clearError();
    setLoading(true);
    const fd = new FormData();
    fd.append("resume_file", file);
    const res = await fetch("/api/profile/documents", { method: "POST", body: fd });
    const data = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) {
      setError(data?.error ?? "Upload failed. Please try again.");
      return;
    }
    // Mark resume obtained before completing — if completion PATCH fails below,
    // the upload won't need to be repeated (retry button appears instead).
    setResumeObtained(true);
    await finishOnboarding();
  }

  // Completion — called from Step 3 (upload success, skip, or existing resume)
  async function finishOnboarding() {
    setLoading(true);
    const res = await fetch("/api/profile/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidate_onboarding_completed_at: new Date().toISOString() }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Something went wrong saving your progress. Please try again.");
      setLoading(false);
      return;
    }
    router.refresh();
  }

  const locationHint = location.trim()
    ? (() => {
        const info = inferCountry([location]);
        return `Searching ${marketLabel(info)} jobs`;
      })()
    : null;

  return (
    <div className="mx-auto max-w-lg px-4 py-10 md:py-16">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Step {step} of {TOTAL_STEPS}
          </span>
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                i + 1 <= step ? "bg-[#2200ff]" : "bg-slate-200"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Step card */}
      <div className="rounded-[1.75rem] bg-slate-50 p-6 shadow-sm sm:p-10">

        {/* Step 1 — Target jobs */}
        {step === 1 && (
          <>
            <h2 className="text-2xl font-bold text-slate-900">What jobs are you looking for?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              We&apos;ll use this to find relevant roles for you.
            </p>

            {/* Title input */}
            <div className="mt-6">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); addTitle(); }
                  }}
                  placeholder="e.g. Project Manager"
                  className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#2200ff] focus:ring-2 focus:ring-[#d4ccff]"
                />
                <button
                  type="button"
                  onClick={addTitle}
                  disabled={!titleInput.trim()}
                  className="shrink-0 rounded-2xl bg-[#ece8ff] px-4 py-3 text-sm font-semibold text-[#2200ff] transition hover:bg-[#d4ccff] disabled:opacity-40"
                >
                  Add
                </button>
              </div>

              {/* Title chips */}
              {jobTitles.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {jobTitles.map((title) => (
                    <span
                      key={title}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#2200ff] px-3 py-1.5 text-sm font-medium text-white"
                    >
                      {title}
                      <button
                        type="button"
                        onClick={() => removeTitle(title)}
                        aria-label={`Remove ${title}`}
                        className="flex h-4 w-4 items-center justify-center rounded-full opacity-70 transition hover:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}

            <div className="mt-6">
              <button
                type="button"
                onClick={handleStep1Continue}
                disabled={loading || jobTitles.length === 0}
                className="w-full rounded-full bg-[#2200ff] py-3.5 text-base font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#1a00cc] disabled:opacity-60 sm:w-auto sm:px-10"
              >
                {loading ? "Saving…" : "Continue"}
              </button>
            </div>
          </>
        )}

        {/* Step 2 — Location */}
        {step === 2 && (
          <>
            <h2 className="text-2xl font-bold text-slate-900">Where are you looking?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              We&apos;ll search the right job boards for your market.
            </p>

            <div className="mt-6">
              <input
                type="text"
                value={location}
                onChange={(e) => { clearError(); setLocation(e.target.value); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleStep2Continue(); }}
                placeholder="e.g. Sydney, London, Kuala Lumpur"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#2200ff] focus:ring-2 focus:ring-[#d4ccff]"
              />
              {locationHint && (
                <p className="mt-2 text-sm text-[#2200ff]">{locationHint}</p>
              )}
            </div>

            {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}

            <div className="mt-6">
              <button
                type="button"
                onClick={handleStep2Continue}
                disabled={loading || !location.trim()}
                className="w-full rounded-full bg-[#2200ff] py-3.5 text-base font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#1a00cc] disabled:opacity-60 sm:w-auto sm:px-10"
              >
                {loading ? "Saving…" : "Continue"}
              </button>
            </div>
          </>
        )}

        {/* Step 3 — Resume (optional) */}
        {step === 3 && (
          <>
            <h2 className="text-2xl font-bold text-slate-900">Want to add your resume?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Adding a resume enables better job matching and tailored applications.
            </p>

            {hasExistingResume ? (
              // Pre-existing resume: just complete onboarding
              <div className="mt-6">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="text-sm font-semibold text-emerald-700">Resume added ✓</p>
                  <p className="mt-0.5 text-xs text-emerald-600">Your master resume is already on file.</p>
                </div>
                {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => { clearError(); void finishOnboarding(); }}
                    disabled={loading}
                    className="w-full rounded-full bg-[#2200ff] py-3.5 text-base font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#1a00cc] disabled:opacity-60 sm:w-auto sm:px-10"
                  >
                    {loading ? "Saving…" : "Continue to dashboard"}
                  </button>
                </div>
              </div>
            ) : resumeObtained ? (
              // Resume was just uploaded; retry completion if PATCH failed
              <div className="mt-6">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                  Resume uploaded successfully.
                </div>
                {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => { clearError(); void finishOnboarding(); }}
                    disabled={loading}
                    className="w-full rounded-full bg-[#2200ff] py-3.5 text-base font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#1a00cc] disabled:opacity-60 sm:w-auto sm:px-10"
                  >
                    {loading ? "Saving…" : "Continue to dashboard"}
                  </button>
                </div>
              </div>
            ) : (
              // No resume yet: offer upload or skip
              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => resumeRef.current?.click()}
                  className="w-full rounded-full bg-[#2200ff] py-3.5 text-base font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#1a00cc] disabled:opacity-60"
                >
                  {loading ? "Uploading…" : "Add my resume"}
                </button>
                <input
                  ref={resumeRef}
                  type="file"
                  accept=".pdf,.docx"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleResumeFile(f);
                    e.target.value = "";
                  }}
                />
                <p className="text-center text-xs text-slate-400">PDF or Word document</p>

                {error && <p className="text-sm text-rose-600">{error}</p>}

                <div className="pt-1 text-center">
                  <button
                    type="button"
                    onClick={() => { clearError(); void finishOnboarding(); }}
                    disabled={loading}
                    className="text-sm text-slate-400 underline underline-offset-2 transition hover:text-slate-600"
                  >
                    I&apos;ll do this later
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
