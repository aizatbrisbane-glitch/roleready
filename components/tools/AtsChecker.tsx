"use client";

import { useState } from "react";
import { analytics } from "@/lib/analytics";

const STOPWORDS = new Set(
  "a about above after again against all am an and any are aren't as at be because been before being below between both but by can't cannot could couldn't did didn't do does doesn't doing don't down during each few for from further had hadn't has hasn't have haven't having he he'd he'll he's her here here's hers herself him himself his how how's i i'd i'll i'm i've if in into is isn't it it's its itself let's me more most mustn't my myself no nor not of off on once only or other ought our ours ourselves out over own same shan't she she'd she'll she's should shouldn't so some such than that that's the their theirs them themselves then there there's these they they'd they'll they're they've this those through to too under until up very was wasn't we we'd we'll we're we've were weren't what what's when when's where where's which while who who's whom why why's with won't would wouldn't you you'd you'll you're you've your yours yourself yourselves will shall etc job role team using strong across ensure ability including experience years work working".split(
    " "
  )
);

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z][a-z0-9+#.]*/g) ?? []).filter(
    (w) => w.length > 2 && !STOPWORDS.has(w)
  );
}

function extractKeywords(jdText: string, limit = 40): string[] {
  const counts: Record<string, number> = {};
  tokenize(jdText).forEach((w) => {
    counts[w] = (counts[w] ?? 0) + 1;
  });
  return Object.keys(counts)
    .sort((a, b) => counts[b] - counts[a])
    .slice(0, limit);
}

type Result = {
  score: number;
  matched: string[];
  missing: string[];
};

const CIRCUMFERENCE = 2 * Math.PI * 36;

function ScoreRing({ score }: { score: number }) {
  const offset = CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE;
  const color =
    score < 50 ? "#ef4444" : score < 75 ? "#f59e0b" : "#2200ff";

  return (
    <div className="relative h-[84px] w-[84px] shrink-0">
      <svg width="84" height="84" viewBox="0 0 84 84" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="42" cy="42" r="36" fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle
          cx="42" cy="42" r="36" fill="none"
          stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease, stroke 0.3s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-xl font-black text-slate-900">
        {score}%
      </div>
    </div>
  );
}

function Chip({ word, variant }: { word: string; variant: "matched" | "missing" }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        variant === "matched"
          ? "bg-[#ece8ff] text-[#2200ff]"
          : "bg-red-50 text-red-600"
      }`}
    >
      {word}
    </span>
  );
}

export function AtsChecker() {
  const [resume, setResume] = useState("");
  const [jd, setJd] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  function check() {
    setError("");
    if (!resume.trim() || !jd.trim()) {
      setError("Paste both your resume and a job description first.");
      return;
    }
    analytics.atsCheck({ resumeLength: resume.length, jdLength: jd.length });
    const resumeSet = new Set(tokenize(resume));
    const jdKeywords = extractKeywords(jd, 40);
    const matched = jdKeywords.filter((w) => resumeSet.has(w));
    const missing = jdKeywords.filter((w) => !resumeSet.has(w));
    const score = jdKeywords.length
      ? Math.round((matched.length / jdKeywords.length) * 100)
      : 0;
    setResult({ score, matched: matched.slice(0, 20), missing: missing.slice(0, 20) });
  }

  const scoreDesc = result
    ? result.score < 50
      ? "Your resume is missing a lot of language from this job description. Add relevant missing keywords where genuinely accurate."
      : result.score < 75
      ? "Decent overlap, but a few more relevant keywords would strengthen your match."
      : "Strong match. Your resume speaks the same language as this job description."
    : "";

  return (
    <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-[0_24px_70px_rgba(34,0,255,0.08)] sm:p-8 lg:p-10">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="ats-resume" className="text-sm font-bold text-slate-900">
            Your resume text
          </label>
          <textarea
            id="ats-resume"
            value={resume}
            onChange={(e) => setResume(e.target.value)}
            placeholder="Paste your resume text here..."
            rows={12}
            className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700 outline-none placeholder:text-slate-400 focus:border-[#2200ff] focus:ring-4 focus:ring-[#ece8ff]"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="ats-jd" className="text-sm font-bold text-slate-900">
            Job description
          </label>
          <textarea
            id="ats-jd"
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder="Paste the job description here..."
            rows={12}
            className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700 outline-none placeholder:text-slate-400 focus:border-[#2200ff] focus:ring-4 focus:ring-[#ece8ff]"
          />
        </div>
      </div>

      <div className="mt-5 flex flex-col items-start gap-2">
        <button
          type="button"
          onClick={check}
          className="inline-flex items-center justify-center rounded-full bg-[#2200ff] px-6 py-3 text-sm font-bold text-white shadow-[0_8px_24px_rgba(34,0,255,0.3)] transition hover:-translate-y-0.5 hover:bg-[#1a00cc]"
        >
          Check my score
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {result && (
        <div className="mt-8 space-y-5">
          {/* Score summary */}
          <div className="flex items-center gap-5 rounded-2xl border border-slate-100 bg-slate-50 p-5">
            <ScoreRing score={result.score} />
            <div>
              <p className="text-base font-black text-slate-900">{result.score}% keyword match</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">{scoreDesc}</p>
            </div>
          </div>

          {/* Matched / missing chips */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-white p-5">
              <p className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                Matched keywords
              </p>
              <div className="flex flex-wrap gap-2">
                {result.matched.length === 0 ? (
                  <span className="text-sm text-slate-400">None found</span>
                ) : (
                  result.matched.map((w) => <Chip key={w} word={w} variant="matched" />)
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-5">
              <p className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                Missing keywords
              </p>
              <div className="flex flex-wrap gap-2">
                {result.missing.length === 0 ? (
                  <span className="text-sm text-slate-400">None found</span>
                ) : (
                  result.missing.map((w) => <Chip key={w} word={w} variant="missing" />)
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
