"use client";

import { useState } from "react";
import { AlertTriangle, Banknote, BookOpen, CheckCircle2, Download, Lightbulb, MapPin, Sparkles, TrendingUp, User } from "lucide-react";
import { CoverLetterRenderer, ResumeRenderer } from "@/components/ResumeRenderer";

type AnalysisSection = { heading: string; bullets: string[]; body: string };

function parseMatchExplanation(text: string): AnalysisSection[] | null {
  const normalised = text.replace(/\r\n/g, "\n");
  if (!normalised.includes("## ")) return null;

  const seen = new Set<string>();
  const sections: AnalysisSection[] = [];

  for (const chunk of normalised.split(/(?=^## )/m)) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;
    const [first, ...rest] = trimmed.split("\n");
    // Strip any parenthetical instructions the AI may have appended to the heading
    const heading = first.replace(/^## /, "").replace(/\s*\(.*?\)\s*$/, "").trim();
    if (!heading || seen.has(heading.toLowerCase())) continue;
    seen.add(heading.toLowerCase());

    const body = rest.join("\n").trim();
    const bullets = body
      .split("\n")
      .filter((l) => l.startsWith("- "))
      .map((l) => l.replace(/^- /, "").trim())
      .filter(Boolean);
    sections.push({ heading, bullets, body: bullets.length > 0 ? "" : body });
  }

  return sections.length > 0 ? sections : null;
}

function InlineMarkdown({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**")
          ? <strong key={i} className="font-semibold text-[#14213d]">{part.slice(2, -2)}</strong>
          : part
      )}
    </>
  );
}

function SectionIcon({ heading }: { heading: string }) {
  const h = heading.toLowerCase();
  if (h.includes("strength")) return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (h.includes("gap") || h.includes("missing") || h.includes("weak")) return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  if (h.includes("recommend")) return <Lightbulb className="h-4 w-4 text-[#0f9f92]" />;
  return <TrendingUp className="h-4 w-4 text-slate-400" />;
}

function sectionColors(heading: string) {
  const h = heading.toLowerCase();
  if (h.includes("strength")) return "bg-emerald-50 border-emerald-100";
  if (h.includes("gap") || h.includes("missing") || h.includes("weak")) return "bg-amber-50 border-amber-100";
  if (h.includes("recommend")) return "bg-teal-50 border-teal-100";
  return "bg-slate-50 border-stone-100";
}

type Tab = "notes" | "analysis" | "resume" | "cover" | "jd";

type Props = {
  applicationId: string;
  jobDescription: string;
  initialSalary: string;
  matchExplanation: string | null;
  missingKeywords: string[];
  tailoredResume: string | null;
  coverLetter: string | null;
  initialRoleSummary: string | null;
  initialHiringManager: string | null;
  initialLocationType: string | null;
  initialOtherNotes: string | null;
  initialNotes: string | null;
};

const LOCATION_TYPES = ["Not specified", "Remote", "Hybrid", "On-site"];

const TAB_LABELS: { id: Tab; label: string }[] = [
  { id: "notes", label: "Key Notes" },
  { id: "analysis", label: "Match Analysis" },
  { id: "resume", label: "Tailored Resume" },
  { id: "cover", label: "Cover Letter" },
  { id: "jd", label: "Job Description" },
];

export function ApplicationDetailTabs({
  applicationId,
  jobDescription,
  initialSalary,
  matchExplanation,
  missingKeywords,
  tailoredResume,
  coverLetter,
  initialRoleSummary,
  initialHiringManager,
  initialLocationType,
  initialOtherNotes,
  initialNotes,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("notes");

  const [roleSummary, setRoleSummary] = useState(initialRoleSummary ?? "");
  const [hiringManager, setHiringManager] = useState(initialHiringManager ?? "");
  const [locationType, setLocationType] = useState(initialLocationType ?? "Not specified");
  const [salary, setSalary] = useState(initialSalary ?? "");
  const [otherNotes, setOtherNotes] = useState(initialOtherNotes ?? "");
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [summarising, setSummarising] = useState(false);
  const [summariseError, setSummariseError] = useState("");

  async function summariseRole() {
    setSummarising(true);
    setSummariseError("");
    try {
      const res = await fetch(`/api/applications/${applicationId}/summarise-role`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setSummariseError(data?.error ?? "Could not summarise. Try again.");
      } else {
        setRoleSummary(data.summary ?? "");
      }
    } catch {
      setSummariseError("Network error. Try again.");
    } finally {
      setSummarising(false);
    }
  }

  async function saveKeyNotes() {
    setSaving(true);
    setSaveMessage("");
    try {
      const res = await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role_summary: roleSummary || null,
          hiring_manager: hiringManager || null,
          location_type: locationType === "Not specified" ? null : locationType,
          other_notes: otherNotes || null,
          notes: notes || null,
          salary: salary || "",
        }),
      });
      setSaveMessage(res.ok ? "Saved." : "Failed to save. Try again.");
    } catch {
      setSaveMessage("Failed to save. Try again.");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMessage(""), 2500);
    }
  }

  return (
    <div className="overflow-hidden rounded-[1.6rem] bg-white/82 shadow-[0_16px_54px_rgba(20,33,61,0.055)]">
      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto border-b border-stone-100 bg-white/60 px-4 py-3 scrollbar-none">
        {TAB_LABELS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              activeTab === id
                ? "bg-[#0f9f92] text-white shadow-sm"
                : "text-slate-500 hover:bg-stone-100 hover:text-[#14213d]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Key Notes tab */}
      {activeTab === "notes" && (
        <div className="space-y-4 p-5 md:p-6">

          {/* Role Summary — full width, no icon */}
          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.13em] text-slate-400">Role Summary</p>
              <button
                type="button"
                onClick={summariseRole}
                disabled={summarising}
                className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-[#0f8f83] transition hover:bg-teal-100 disabled:opacity-60"
              >
                <Sparkles className="h-3 w-3" />
                {summarising ? "Summarising…" : "Summarise with AI"}
              </button>
            </div>
            <textarea
              value={roleSummary}
              onChange={(e) => setRoleSummary(e.target.value)}
              rows={3}
              className="field mt-2 resize-none"
              placeholder="Brief summary of the role..."
            />
            {summariseError && <p className="mt-1 text-xs text-rose-600">{summariseError}</p>}
          </div>

          {/* Hiring Manager + Work Location */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0f9f92] text-white">
                <User className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.13em] text-slate-400">Hiring Manager / Recruiter</p>
                <input
                  type="text"
                  value={hiringManager}
                  onChange={(e) => setHiringManager(e.target.value)}
                  className="field mt-2"
                  placeholder="Name, title, or contact details..."
                />
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0f9f92] text-white">
                <MapPin className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.13em] text-slate-400">Work Location</p>
                <select
                  value={locationType}
                  onChange={(e) => setLocationType(e.target.value)}
                  className="field mt-2"
                >
                  {LOCATION_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Salary + Helpful Info */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0f9f92] text-white">
                <Banknote className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.13em] text-slate-400">Salary Range</p>
                <input
                  type="text"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  placeholder="e.g. $120,000 – $140,000"
                  className="field mt-2"
                />
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-400 text-white">
                <Lightbulb className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.13em] text-amber-500">Helpful Information</p>
                <textarea
                  value={otherNotes}
                  onChange={(e) => setOtherNotes(e.target.value)}
                  rows={3}
                  className="field mt-2 resize-none"
                  placeholder="Perks, deadlines, specific requirements..."
                />
              </div>
            </div>
          </div>

          {/* Your Notes — full width */}
          <div className="flex items-start gap-3 rounded-2xl border border-stone-100 p-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0f9f92] text-white">
              <BookOpen className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.13em] text-slate-400">Your Notes</p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="field mt-2 resize-none"
                placeholder="Any personal notes about this application..."
              />
              <div className="mt-3 flex items-center gap-3">
                <button
                  onClick={saveKeyNotes}
                  disabled={saving}
                  className="btn-primary"
                >
                  {saving ? "Saving..." : "Save notes"}
                </button>
                {saveMessage && (
                  <span className="text-sm text-slate-500">{saveMessage}</span>
                )}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Match Analysis tab */}
      {activeTab === "analysis" && (
        <div className="p-5 md:p-6">
          {(() => {
            if (!matchExplanation) {
              return (
                <p className="text-sm italic text-slate-400">
                  Generate the application to see how your resume maps to this role.
                </p>
              );
            }
            const sections = parseMatchExplanation(matchExplanation);
            if (!sections) {
              return (
                <p className="whitespace-pre-wrap text-sm leading-7 text-slate-600">{matchExplanation}</p>
              );
            }
            return (
              <div className="space-y-4">
                {sections.map((section) => (
                  <div
                    key={section.heading}
                    className={`rounded-2xl border px-5 py-4 ${sectionColors(section.heading)}`}
                  >
                    <div className="flex items-center gap-2">
                      <SectionIcon heading={section.heading} />
                      <h3 className="text-sm font-semibold text-[#14213d]">{section.heading}</h3>
                    </div>
                    {section.body && (
                      <p className="mt-2 text-sm leading-6 text-slate-600"><InlineMarkdown text={section.body} /></p>
                    )}
                    {section.bullets.length > 0 && (
                      <ul className="mt-3 space-y-2">
                        {section.bullets.map((b, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm leading-6 text-slate-600">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-40" />
                            <InlineMarkdown text={b} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* Tailored Resume tab */}
      {activeTab === "resume" && (
        <div>
          {tailoredResume ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 px-5 py-3">
                <span className="text-sm text-slate-500">Tailored resume</span>
                <div className="flex gap-2">
                  <a
                    href={`/api/applications/${applicationId}/export?type=resume&format=docx`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#0f9f92] px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-[#0b8f83]"
                  >
                    <Download className="h-3.5 w-3.5" />
                    DOCX
                  </a>
                  <a
                    href={`/api/applications/${applicationId}/export?type=resume&format=pdf`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-4 py-1.5 text-sm font-semibold text-[#14213d] transition hover:bg-stone-50"
                  >
                    <Download className="h-3.5 w-3.5" />
                    PDF
                  </a>
                </div>
              </div>
              <div className="max-h-[680px] overflow-auto rounded-b-[1.6rem]">
                <ResumeRenderer content={tailoredResume} />
              </div>
            </>
          ) : (
            <p className="px-5 py-8 text-sm italic text-slate-400">
              Generate the application to see your tailored resume here.
            </p>
          )}
        </div>
      )}

      {/* Cover Letter tab */}
      {activeTab === "cover" && (
        <div>
          {coverLetter ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 px-5 py-3">
                <span className="text-sm text-slate-500">Cover letter</span>
                <div className="flex gap-2">
                  <a
                    href={`/api/applications/${applicationId}/export?type=cover&format=docx`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#0f9f92] px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-[#0b8f83]"
                  >
                    <Download className="h-3.5 w-3.5" />
                    DOCX
                  </a>
                  <a
                    href={`/api/applications/${applicationId}/export?type=cover&format=pdf`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-4 py-1.5 text-sm font-semibold text-[#14213d] transition hover:bg-stone-50"
                  >
                    <Download className="h-3.5 w-3.5" />
                    PDF
                  </a>
                </div>
              </div>
              <div className="max-h-[680px] overflow-auto rounded-b-[1.6rem]">
                <CoverLetterRenderer content={coverLetter} />
              </div>
            </>
          ) : (
            <p className="px-5 py-8 text-sm italic text-slate-400">
              Generate the application to see your cover letter here.
            </p>
          )}
        </div>
      )}

      {/* Job Description tab */}
      {activeTab === "jd" && (
        <div className="max-h-[680px] overflow-auto rounded-b-[1.6rem] bg-stone-100 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-[794px] bg-white px-10 py-10 shadow-[0_2px_16px_rgba(0,0,0,0.10)] md:px-16 md:py-14">
            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{jobDescription}</p>
          </div>
        </div>
      )}
    </div>
  );
}
