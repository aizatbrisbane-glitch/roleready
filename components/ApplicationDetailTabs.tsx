"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Banknote, BookOpen, CheckCircle2, ChevronDown, Download, Lightbulb, MapPin, Sparkles, TrendingUp, User } from "lucide-react";
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
          ? <strong key={i} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>
          : part
      )}
    </>
  );
}

function SectionIcon({ heading }: { heading: string }) {
  const h = heading.toLowerCase();
  if (h.includes("strength")) return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (h.includes("gap") || h.includes("missing") || h.includes("weak")) return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  if (h.includes("recommend")) return <Lightbulb className="h-4 w-4 text-[#2200ff]" />;
  return <TrendingUp className="h-4 w-4 text-slate-400" />;
}

function sectionColors(heading: string) {
  const h = heading.toLowerCase();
  if (h.includes("strength")) return "bg-emerald-50 border-emerald-100";
  if (h.includes("gap") || h.includes("missing") || h.includes("weak")) return "bg-amber-50 border-amber-100";
  if (h.includes("recommend")) return "bg-[#ece8ff] border-[#d4ccff]";
  return "bg-slate-50 border-slate-100";
}

export type Tab = "notes" | "analysis" | "resume" | "cover" | "jd";

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
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  openAccordion: Tab | null;
  onAccordionChange: (tab: Tab | null) => void;
  highlightKeyword?: string | null;
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
  activeTab,
  onTabChange,
  openAccordion,
  onAccordionChange,
  highlightKeyword,
}: Props) {

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
  const roleSummaryRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!highlightKeyword) return;
    if (activeTab !== "resume" && activeTab !== "cover") return;
    const timer = setTimeout(() => {
      const el = document.querySelector(".kw-highlight");
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
    return () => clearTimeout(timer);
  }, [highlightKeyword, activeTab]);

  useEffect(() => {
    const el = roleSummaryRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [roleSummary]);

  async function summariseRole() {
    setSummarising(true);
    setSummariseError("");
    try {
      const res = await fetch(`/api/applications/${applicationId}/summarise-role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ save: true }),
      });
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

  function renderContent(tab: Tab) {
    if (tab === "notes") return (
      <div className="space-y-4 p-5 md:p-6">
        {/* Role Summary */}
        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.13em] text-slate-400">Role Summary</p>
            <button
              type="button"
              onClick={summariseRole}
              disabled={summarising}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#ece8ff] px-3 py-1 text-xs font-semibold text-[#2200ff] transition hover:bg-[#d4ccff] disabled:opacity-60"
            >
              <Sparkles className="h-3 w-3" />
              {summarising ? "Summarising…" : "Summarise with AI"}
            </button>
          </div>
          <textarea
            ref={roleSummaryRef}
            value={roleSummary}
            onChange={(e) => setRoleSummary(e.target.value)}
            rows={3}
            className="field mt-2 resize-none overflow-hidden"
            placeholder="Brief summary of the role..."
          />
          {summariseError && <p className="mt-1 text-xs text-rose-600">{summariseError}</p>}
        </div>

        {/* Hiring Manager + Work Location */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#ece8ff] text-[#2200ff]">
              <User className="h-4 w-4" />
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
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#ece8ff] text-[#2200ff]">
              <MapPin className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.13em] text-slate-400">Work Location</p>
              <select value={locationType} onChange={(e) => setLocationType(e.target.value)} className="field mt-2">
                {LOCATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Salary + Helpful Info */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#ece8ff] text-[#2200ff]">
              <Banknote className="h-4 w-4" />
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
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
              <Lightbulb className="h-4 w-4" />
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

        {/* Your Notes */}
        <div className="flex items-start gap-3 rounded-2xl border border-slate-100 p-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#ece8ff] text-[#2200ff]">
            <BookOpen className="h-4 w-4" />
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
              <button onClick={saveKeyNotes} disabled={saving} className="btn-primary">
                {saving ? "Saving..." : "Save notes"}
              </button>
              {saveMessage && <span className="text-sm text-slate-500">{saveMessage}</span>}
            </div>
          </div>
        </div>
      </div>
    );

    if (tab === "analysis") return (
      <div className="p-5 md:p-6">
        {!matchExplanation ? (
          <p className="text-sm italic text-slate-400">Generate the application to see how your resume maps to this role.</p>
        ) : (() => {
          const sections = parseMatchExplanation(matchExplanation);
          if (!sections) return <p className="whitespace-pre-wrap text-sm leading-7 text-slate-600">{matchExplanation}</p>;
          return (
            <div className="space-y-4">
              {sections.map((section) => (
                <div key={section.heading} className={`rounded-2xl border px-5 py-4 ${sectionColors(section.heading)}`}>
                  <div className="flex items-center gap-2">
                    <SectionIcon heading={section.heading} />
                    <h3 className="text-sm font-semibold text-slate-900">{section.heading}</h3>
                  </div>
                  {section.body && <p className="mt-2 text-sm leading-6 text-slate-600"><InlineMarkdown text={section.body} /></p>}
                  {section.bullets.length > 0 && (
                    <ul className="mt-3 space-y-3">
                      {section.bullets.map((b, i) => {
                        const match = b.match(/^\*\*(.+?)\*\*:?\s*([\s\S]+)$/);
                        if (match) {
                          return (
                            <li key={i}>
                              <p className="text-sm font-semibold text-slate-900">{match[1]}</p>
                              <p className="mt-0.5 text-sm leading-6 text-slate-600">{match[2]}</p>
                            </li>
                          );
                        }
                        return (
                          <li key={i} className="flex items-start gap-2 text-sm leading-6 text-slate-600">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-40" />
                            <InlineMarkdown text={b} />
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    );

    if (tab === "resume") return (
      <div>
        {tailoredResume ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
              <span className="text-sm text-slate-500">Tailored resume</span>
              <div className="flex gap-2">
                <a href={`/api/applications/${applicationId}/export?type=resume&format=docx`} className="inline-flex items-center gap-1.5 rounded-full bg-[#2200ff] px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-[#1a00cc]">
                  <Download className="h-3.5 w-3.5" /> DOCX
                </a>
                <a href={`/api/applications/${applicationId}/export?type=resume&format=pdf`} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50">
                  <Download className="h-3.5 w-3.5" /> PDF
                </a>
              </div>
            </div>
            <div className="max-h-[680px] overflow-auto rounded-b-[1.6rem]">
              <ResumeRenderer content={tailoredResume} highlightKeyword={highlightKeyword} />
            </div>
          </>
        ) : (
          <p className="px-5 py-8 text-sm italic text-slate-400">Generate the application to see your tailored resume here.</p>
        )}
      </div>
    );

    if (tab === "cover") return (
      <div>
        {coverLetter ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
              <span className="text-sm text-slate-500">Cover letter</span>
              <div className="flex gap-2">
                <a href={`/api/applications/${applicationId}/export?type=cover&format=docx`} className="inline-flex items-center gap-1.5 rounded-full bg-[#2200ff] px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-[#1a00cc]">
                  <Download className="h-3.5 w-3.5" /> DOCX
                </a>
                <a href={`/api/applications/${applicationId}/export?type=cover&format=pdf`} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50">
                  <Download className="h-3.5 w-3.5" /> PDF
                </a>
              </div>
            </div>
            <div className="max-h-[680px] overflow-auto rounded-b-[1.6rem]">
              <CoverLetterRenderer content={coverLetter} highlightKeyword={highlightKeyword} />
            </div>
          </>
        ) : (
          <p className="px-5 py-8 text-sm italic text-slate-400">Generate the application to see your cover letter here.</p>
        )}
      </div>
    );

    if (tab === "jd") return (
      <div className="max-h-[680px] overflow-auto rounded-b-[1.6rem] bg-slate-50 px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto w-full max-w-[794px] bg-white px-10 py-10 shadow-[0_2px_16px_rgba(0,0,0,0.10)] md:px-16 md:py-14">
          <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{jobDescription}</p>
        </div>
      </div>
    );

    return null;
  }

  return (
    <div className="overflow-hidden rounded-[1.6rem] border border-slate-100 bg-white shadow-sm">

      {/* ── Mobile accordion (hidden md+) ── */}
      <div className="divide-y divide-slate-100 md:hidden">
        {TAB_LABELS.map(({ id, label }) => {
          const isOpen = openAccordion === id;
          return (
            <div key={id}>
              <button
                className={`flex w-full items-center justify-between px-5 py-4 text-left transition ${isOpen ? "bg-[#ece8ff]" : "hover:bg-slate-50"}`}
                onClick={() => onAccordionChange(isOpen ? null : id)}
              >
                <span className={`text-sm font-semibold ${isOpen ? "text-[#2200ff]" : "text-slate-900"}`}>{label}</span>
                <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180 text-[#2200ff]" : "text-slate-400"}`} />
              </button>
              {isOpen && (
                <div className="border-t border-slate-100">
                  {renderContent(id)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Desktop tabs (hidden below md) ── */}
      <div className="hidden md:block">
        <div className="flex gap-1 overflow-x-auto border-b border-slate-100 bg-white px-4 py-3 scrollbar-none">
          {TAB_LABELS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                activeTab === id ? "bg-[#2200ff] text-white shadow-sm" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {renderContent(activeTab)}
      </div>

    </div>
  );
}
