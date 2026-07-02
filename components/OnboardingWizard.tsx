"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Step = 1 | 2 | 3 | 4 | 5;

const STEP_LABELS = [
  "Your situation",
  "Upload CV",
  "Upload master cover letter",
  "Paste job URL",
  "Confirm location",
];

const INTENT_OPTIONS = [
  { value: "just_starting", label: "Just starting out", sub: "I'm beginning my job search from scratch" },
  { value: "actively_hunting", label: "Actively hunting", sub: "I need a job and I'm searching hard" },
  { value: "employed_browsing", label: "Employed, just browsing", sub: "Happy enough but open to better offers" },
  { value: "levelling_up", label: "Looking to level up", sub: "I want a bigger role or a promotion" },
  { value: "career_tips_only", label: "Not searching yet", sub: "I just want career advice for now" },
];

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [jobSearchIntent, setJobSearchIntent] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [location, setLocation] = useState("");
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [descText, setDescText] = useState("");
  const [descOpen, setDescOpen] = useState(false);

  const resumeRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File, field: "resume_file" | "cover_letter_file") {
    setLoading(true);
    setError("");
    const fd = new FormData();
    fd.append(field, file);
    const res = await fetch("/api/profile/documents", { method: "POST", body: fd });
    const data = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) {
      setError(data?.error ?? "Upload failed. Please try again.");
      return false;
    }
    return true;
  }

  async function handleIntentNext() {
    setLoading(true);
    setError("");
    await fetch("/api/profile/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_search_intent: jobSearchIntent }),
    }).catch(() => {});
    setLoading(false);
    setStep(2);
  }

  async function handleResumeFile(file: File) {
    const ok = await uploadFile(file, "resume_file");
    if (!ok) return;
    setSuccess(true);
    setTimeout(() => { setSuccess(false); setStep(3); }, 1500);
  }

  async function handleCoverFile(file: File) {
    const ok = await uploadFile(file, "cover_letter_file");
    if (!ok) return;
    setSuccess(true);
    setTimeout(() => { setSuccess(false); setStep(4); }, 1500);
  }

  async function handleJobUrl() {
    if (!jobUrl.trim() && !descText.trim()) { setStep(5); return; }
    setLoading(true);
    setError("");
    const fd = new FormData();
    if (jobUrl.trim()) fd.append("job_url", jobUrl);
    if (descText.trim()) fd.append("job_description_fallback", descText);
    const res = await fetch("/api/quick-start", { method: "POST", body: fd });
    const data = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) {
      if (data?.errorCode === "JOB_TEXT_UNAVAILABLE") {
        setDescOpen(true);
        setError("We couldn't read that page — paste the job description below and try again.");
      } else {
        setError(data?.error ?? "Something went wrong. You can skip and add jobs from the dashboard.");
      }
      return;
    }
    if (data?.applicationId) setApplicationId(data.applicationId);
    setStep(5);
  }

  async function handleFinish() {
    if (location.trim()) {
      setLoading(true);
      await fetch("/api/profile/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: location.trim() }),
      });
      setLoading(false);
    }
    if (applicationId) {
      router.push(`/applications/${applicationId}?generate=true`);
    } else {
      router.refresh();
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 md:py-16">
      <h1 className="mb-10 text-center text-3xl font-bold text-slate-900 md:text-4xl">
        Customise your first CV and cover letter in seconds
      </h1>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex gap-1.5">
          {STEP_LABELS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i + 1 <= step ? "bg-[#2200ff]" : "bg-slate-200"}`}
            />
          ))}
        </div>
        <div className="mt-2.5 flex">
          {STEP_LABELS.map((label, i) => (
            <p key={i} className="flex-1 px-1 text-center text-xs text-slate-500">
              {i + 1}. {label}
            </p>
          ))}
        </div>
      </div>

      {/* Step card */}
      <div className="rounded-[1.75rem] bg-slate-100 px-8 py-14 text-center shadow-sm">

        {/* Step 1 — Job search intent */}
        {step === 1 && (
          <>
            <h2 className="text-2xl font-bold text-slate-900">Where are you in your job search?</h2>
            <p className="mt-2 text-slate-500">This helps us tailor your experience.</p>
            <div className="mt-8 space-y-3 text-left">
              {INTENT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setJobSearchIntent(opt.value)}
                  className={`w-full rounded-2xl border px-5 py-4 text-left transition ${
                    jobSearchIntent === opt.value
                      ? "border-[#2200ff] bg-[#ece8ff]"
                      : "border-slate-200 bg-white hover:border-[#d4ccff]"
                  }`}
                >
                  <p className={`font-semibold ${jobSearchIntent === opt.value ? "text-[#2200ff]" : "text-slate-900"}`}>{opt.label}</p>
                  <p className="mt-0.5 text-sm text-slate-500">{opt.sub}</p>
                </button>
              ))}
            </div>
            {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
            <div className="mt-6">
              <button
                type="button"
                disabled={!jobSearchIntent || loading}
                onClick={handleIntentNext}
                className="inline-flex items-center gap-2 rounded-full bg-[#2200ff] px-8 py-3.5 text-base font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#1a00cc] disabled:opacity-60"
              >
                {loading ? "Saving..." : "Next"}
              </button>
            </div>
          </>
        )}

        {/* Step 2 — Upload CV */}
        {step === 2 && (
          <>
            <h2 className="text-2xl font-bold text-slate-900">First, upload your CV here</h2>
            {success ? (
              <p className="mt-10 text-2xl font-semibold text-[#2200ff]">👍 Nice!</p>
            ) : (
              <>
                <div className="mt-10">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => resumeRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-full bg-[#2200ff] px-8 py-3.5 text-base font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#1a00cc] disabled:opacity-60"
                  >
                    {loading ? "Uploading..." : "Upload CV"}
                  </button>
                  <input
                    ref={resumeRef}
                    type="file"
                    accept=".pdf,.docx"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleResumeFile(f); e.target.value = ""; }}
                  />
                </div>
                <p className="mt-4 text-sm text-slate-500">File must be in Word document or PDF format.</p>
                {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
              </>
            )}
          </>
        )}

        {/* Step 3 — Upload cover letter */}
        {step === 3 && (
          <>
            <h2 className="text-2xl font-bold text-slate-900">Now, upload your current cover letter</h2>
            <p className="mt-2 text-slate-500">We'll fine tune it to match the job you want.</p>
            {success ? (
              <p className="mt-10 text-2xl font-semibold text-[#2200ff]">👍 Great work!</p>
            ) : (
              <>
                <div className="mt-10">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => coverRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-full bg-[#2200ff] px-8 py-3.5 text-base font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#1a00cc] disabled:opacity-60"
                  >
                    {loading ? "Uploading..." : "Upload cover letter"}
                  </button>
                  <input
                    ref={coverRef}
                    type="file"
                    accept=".pdf,.docx"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverFile(f); e.target.value = ""; }}
                  />
                </div>
                <p className="mt-4 text-sm text-slate-500">File must be in Word document or PDF format.</p>
                {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="mt-5 text-sm text-slate-400 underline underline-offset-2 hover:text-slate-600"
                >
                  Skip for now
                </button>
              </>
            )}
          </>
        )}

        {/* Step 4 — Job URL */}
        {step === 4 && (
          <>
            <h2 className="text-2xl font-bold text-slate-900">Which job are you applying for?</h2>
            <p className="mt-2 text-slate-500">Paste a Seek or LinkedIn link — or paste the full job description below.</p>
            <div className="mt-8 space-y-3 text-left">
              <input
                type="url"
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                placeholder="https://www.seek.com.au/job/..."
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#2200ff] focus:ring-2 focus:ring-[#d4ccff]"
              />
              {!descOpen && (
                <button
                  type="button"
                  onClick={() => setDescOpen(true)}
                  className="text-sm text-slate-400 underline underline-offset-2 hover:text-slate-600"
                >
                  Or paste the job description instead
                </button>
              )}
              {descOpen && (
                <textarea
                  value={descText}
                  onChange={(e) => setDescText(e.target.value)}
                  placeholder="Paste the full job description here..."
                  rows={6}
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                  className="w-full resize-y rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#2200ff] focus:ring-2 focus:ring-[#d4ccff]"
                />
              )}
            </div>
            {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
            <div className="mt-6 flex flex-col items-center gap-3">
              <button
                type="button"
                disabled={loading}
                onClick={handleJobUrl}
                className="inline-flex items-center gap-2 rounded-full bg-[#2200ff] px-8 py-3.5 text-base font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#1a00cc] disabled:opacity-60"
              >
                {loading ? "Checking..." : "Next"}
              </button>
              <button
                type="button"
                onClick={() => { setError(""); setStep(5); }}
                className="text-sm text-slate-400 underline underline-offset-2 hover:text-slate-600"
              >
                Skip for now
              </button>
            </div>
          </>
        )}

        {/* Step 5 — Location */}
        {step === 5 && (
          <>
            <h2 className="text-2xl font-bold text-slate-900">Where is the job located?</h2>
            <p className="mt-2 text-slate-500">So we can show you more local opportunities.</p>
            <div className="mt-8">
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleFinish(); }}
                placeholder="Sydney"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#2200ff] focus:ring-2 focus:ring-[#d4ccff]"
              />
            </div>
            <div className="mt-6">
              <button
                type="button"
                disabled={loading}
                onClick={handleFinish}
                className="inline-flex items-center gap-2 rounded-full bg-[#2200ff] px-8 py-3.5 text-base font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#1a00cc] disabled:opacity-60"
              >
                {loading ? "Saving..." : "Finish ✨"}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
