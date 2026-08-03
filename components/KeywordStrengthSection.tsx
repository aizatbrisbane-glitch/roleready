"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronDown, Lightbulb, Loader2, Lock, RotateCcw, Sparkles } from "lucide-react";
import type { EntitlementPlanType } from "@/types/database";
import type { DocumentUpdate } from "@/components/ApplicationDetailClient";

type Target = "resume" | "cover_letter" | "both";

type KeywordState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "reviewing"; target: Target; tailoredResume: string | null; coverLetter: string | null; snippet: string; originalSnippet: string }
  | { phase: "saving" }
  | { phase: "success"; target: Target | null; snippet: string; originalSnippet: string; reverting?: boolean }
  | { phase: "skipped" }
  | { phase: "not_found" }
  | { phase: "fallback" }
  | { phase: "no_master_resume" }
  | { phase: "error"; message: string };

type Importance = "required" | "preferred" | "unspecified";

type Props = {
  applicationId: string;
  missingKeywords: string[];
  matchScore: number | null;
  planType: EntitlementPlanType;
  hasTailoredResume: boolean;
  hasCoverLetter: boolean;
  tailoredResume: string | null;
  coverLetter: string | null;
  strengthenedKeywords: string[];
  strengthenedKeywordSnippets: Record<string, string>;
  strengthenedKeywordOriginals: Record<string, string>;
  keywordImportance: Record<string, string>;
  skippedKeywords: string[];
  onDocumentUpdate: (update: DocumentUpdate) => void;
};

const IMPORTANCE_ORDER: Record<string, number> = { required: 0, preferred: 1, unspecified: 2 };

export function KeywordStrengthSection({
  applicationId,
  missingKeywords,
  matchScore,
  planType,
  hasTailoredResume,
  hasCoverLetter,
  tailoredResume,
  coverLetter,
  strengthenedKeywords,
  strengthenedKeywordSnippets,
  strengthenedKeywordOriginals,
  keywordImportance,
  skippedKeywords,
  onDocumentUpdate,
}: Props) {
  const [isOpen, setIsOpen] = useState(missingKeywords.length > 0);
  const [showAll, setShowAll] = useState(false);
  const [states, setStates] = useState<Record<string, KeywordState>>(() => {
    const initial: Record<string, KeywordState> = {};
    for (const kw of strengthenedKeywords) {
      initial[kw] = { phase: "success", target: null, snippet: strengthenedKeywordSnippets[kw] ?? "", originalSnippet: strengthenedKeywordOriginals[kw] ?? "" };
    }
    for (const kw of skippedKeywords) {
      if (!initial[kw]) initial[kw] = { phase: "skipped" };
    }
    return initial;
  });
  const [evidenceMap, setEvidenceMap] = useState<Record<string, string>>({});
  const [targetMap, setTargetMap] = useState<Record<string, Target>>({});
  const [snippetEditMap, setSnippetEditMap] = useState<Record<string, string>>({});

  // Refs accumulate keyword/snippet/skipped state synchronously so concurrent
  // saves don't overwrite each other (the props are frozen at page-load).
  const accumulatedRef = useRef({
    keywords: [...strengthenedKeywords],
    snippets: { ...strengthenedKeywordSnippets },
    originals: { ...strengthenedKeywordOriginals },
  });
  const skippedRef = useRef([...skippedKeywords]);

  const hasRealKeywords = missingKeywords.length > 0;
  const pendingCount = missingKeywords.filter(
    (kw) => states[kw]?.phase !== "success" && states[kw]?.phase !== "skipped"
  ).length;
  const isPremium = planType !== "free";
  const hasBothDocs = hasTailoredResume && hasCoverLetter;
  const hasAnyDoc = hasTailoredResume || hasCoverLetter;
  const defaultTarget: Target = hasBothDocs ? "both" : hasTailoredResume ? "resume" : "cover_letter";

  const totalKeywords = missingKeywords.length;
  const base = matchScore ?? 0;
  // base is effectiveMatchScore — already includes DB-strengthened keywords.
  // Only count keywords newly added in this session to avoid double-counting.
  const localStrengthenedCount = Object.values(states).filter((s) => s.phase === "success").length;
  const sessionDelta = localStrengthenedCount - strengthenedKeywords.length;
  const liveScore = totalKeywords === 0
    ? base
    : Math.min(100, Math.round(base + sessionDelta * (100 - base) / totalKeywords));
  const scoreImproved = liveScore > base;

  const sortedKeywords = hasRealKeywords
    ? [...missingKeywords].sort((a, b) => {
        const aRank = IMPORTANCE_ORDER[keywordImportance[a] ?? "unspecified"] ?? 2;
        const bRank = IMPORTANCE_ORDER[keywordImportance[b] ?? "unspecified"] ?? 2;
        return aRank - bRank;
      })
    : missingKeywords;

  const displayItems = hasRealKeywords
    ? sortedKeywords
    : ["Review job requirements", "Check resume emphasis", "Personalise your opening"];

  function importanceBadge(keyword: string) {
    const level = (keywordImportance[keyword] ?? "unspecified") as Importance;
    if (level === "required") return <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600">Required</span>;
    if (level === "preferred") return <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600">Preferred</span>;
    return null;
  }

  function getState(keyword: string): KeywordState {
    return states[keyword] ?? { phase: "idle" };
  }

  function setState(keyword: string, state: KeywordState) {
    setStates((prev) => ({ ...prev, [keyword]: state }));
  }

  function getEvidence(keyword: string) {
    return evidenceMap[keyword] ?? "";
  }

  function setEvidence(keyword: string, value: string) {
    setEvidenceMap((prev) => ({ ...prev, [keyword]: value }));
  }

  function getTarget(keyword: string): Target {
    return targetMap[keyword] ?? defaultTarget;
  }

  function setTarget(keyword: string, value: Target) {
    setTargetMap((prev) => ({ ...prev, [keyword]: value }));
  }

  function getSnippetEdit(keyword: string) {
    return snippetEditMap[keyword] ?? "";
  }

  function setSnippetEdit(keyword: string, value: string) {
    setSnippetEditMap((prev) => ({ ...prev, [keyword]: value }));
  }

  function targetLabel(target: Target | null) {
    if (target === "resume") return "resume";
    if (target === "cover_letter") return "cover letter";
    if (target === "both") return "both documents";
    return "documents";
  }

  function addButtonLabel() {
    if (hasTailoredResume && !hasCoverLetter) return "Add to resume";
    if (!hasTailoredResume && hasCoverLetter) return "Add to cover letter";
    return "Add to documents";
  }

  async function handleAutoStrengthen(keyword: string) {
    const target = getTarget(keyword);
    setState(keyword, { phase: "loading" });

    try {
      const res = await fetch(`/api/applications/${applicationId}/strengthen?preview=true`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword, target }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.error === "no_master_resume") {
          setState(keyword, { phase: "no_master_resume" });
          return;
        }
        setState(keyword, { phase: "error", message: data.error ?? "Something went wrong." });
        return;
      }

      if (!data.hasRelevantExperience) {
        setState(keyword, { phase: "not_found" });
        return;
      }

      const snippet = data.changedSnippet ?? "";
      setSnippetEdit(keyword, snippet);
      setState(keyword, {
        phase: "reviewing",
        target,
        tailoredResume: data.tailoredResume ?? null,
        coverLetter: data.coverLetter ?? null,
        snippet,
        originalSnippet: data.originalSnippet ?? "",
      });
    } catch {
      setState(keyword, { phase: "error", message: "Network error. Please try again." });
    }
  }

  async function handleManualStrengthen(keyword: string) {
    const evidence = getEvidence(keyword).trim();
    if (!evidence) return;
    const target = getTarget(keyword);
    setState(keyword, { phase: "loading" });

    try {
      const res = await fetch(`/api/applications/${applicationId}/strengthen?preview=true`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword, evidence, target }),
      });
      const data = await res.json();
      if (!res.ok) {
        setState(keyword, { phase: "error", message: data.error ?? "Something went wrong." });
        return;
      }
      const snippet = data.changedSnippet ?? "";
      setSnippetEdit(keyword, snippet);
      setState(keyword, {
        phase: "reviewing",
        target,
        tailoredResume: data.tailoredResume ?? null,
        coverLetter: data.coverLetter ?? null,
        snippet,
        originalSnippet: data.originalSnippet ?? "",
      });
    } catch {
      setState(keyword, { phase: "error", message: "Network error. Please try again." });
    }
  }

  async function acceptDraft(keyword: string) {
    const state = getState(keyword);
    if (state.phase !== "reviewing") return;
    setState(keyword, { phase: "saving" });

    const editedSnippet = getSnippetEdit(keyword).trim() || state.snippet;
    const applyEdit = (doc: string | null) =>
      doc && state.snippet && editedSnippet !== state.snippet
        ? doc.replace(state.snippet, editedSnippet)
        : doc;

    const finalResume = applyEdit(state.tailoredResume);
    const finalCover = applyEdit(state.coverLetter);

    accumulatedRef.current = {
      keywords: [...new Set([...accumulatedRef.current.keywords, keyword])],
      snippets: { ...accumulatedRef.current.snippets, [keyword]: editedSnippet },
      originals: { ...accumulatedRef.current.originals, [keyword]: state.originalSnippet },
    };
    const body: Record<string, unknown> = {
      strengthened_keywords: accumulatedRef.current.keywords,
      strengthened_keyword_snippets: accumulatedRef.current.snippets,
      strengthened_keyword_originals: accumulatedRef.current.originals,
    };
    if (finalResume) body.tailored_resume = finalResume;
    if (finalCover) body.cover_letter = finalCover;

    try {
      await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      onDocumentUpdate({
        resume: finalResume ?? null,
        cover: finalCover ?? null,
        keyword,
        snippet: editedSnippet,
      });
      setState(keyword, { phase: "success", target: state.target, snippet: editedSnippet, originalSnippet: state.originalSnippet });
    } catch {
      setState(keyword, { phase: "error", message: "Failed to save. Please try again." });
    }
  }

  async function handleRevert(keyword: string) {
    const state = getState(keyword);
    if (state.phase !== "success") return;
    setState(keyword, { ...state, reverting: true });

    const swap = (doc: string | null) =>
      doc && state.snippet ? doc.replace(state.snippet, state.originalSnippet) : doc;

    const revertedResume = hasTailoredResume ? swap(tailoredResume) : null;
    const revertedCover = hasCoverLetter ? swap(coverLetter) : null;

    const newSnippets = { ...accumulatedRef.current.snippets };
    delete newSnippets[keyword];
    const newOriginals = { ...accumulatedRef.current.originals };
    delete newOriginals[keyword];
    const newStrengthened = accumulatedRef.current.keywords.filter((k) => k !== keyword);
    accumulatedRef.current = { keywords: newStrengthened, snippets: newSnippets, originals: newOriginals };

    try {
      await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strengthened_keywords: newStrengthened,
          strengthened_keyword_snippets: newSnippets,
          strengthened_keyword_originals: newOriginals,
          ...(revertedResume ? { tailored_resume: revertedResume } : {}),
          ...(revertedCover ? { cover_letter: revertedCover } : {}),
        }),
      });
      onDocumentUpdate({ resume: revertedResume ?? null, cover: revertedCover ?? null, keyword, snippet: "" });
      setState(keyword, { phase: "idle" });
    } catch {
      setState(keyword, { ...state, reverting: false });
    }
  }

  async function handleSkip(keyword: string) {
    skippedRef.current = [...new Set([...skippedRef.current, keyword])];
    setState(keyword, { phase: "skipped" });
    await fetch(`/api/applications/${applicationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skipped_keywords: skippedRef.current }),
    }).catch(() => {});
  }

  return (
    <section className="rounded-[1.6rem] border border-slate-100 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => { setIsOpen((o) => !o); setShowAll(false); }}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left md:px-6"
      >
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-base font-bold text-slate-900">Opportunities to strengthen</span>
          {hasRealKeywords && pendingCount > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
              {pendingCount} to review
            </span>
          )}
          {matchScore !== null && totalKeywords > 0 && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${scoreImproved ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>
              {liveScore}% keyword match
            </span>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="border-t border-slate-100 px-5 pb-5 pt-4 md:px-6 md:pb-6">
          {matchScore !== null && totalKeywords > 0 && (
            <div className="mb-4 rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Keyword match with this job description</p>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">{liveScore}%</span>
                {scoreImproved && (
                  <span className="text-xs text-slate-400">was {base}%</span>
                )}
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-[#2200ff] transition-all duration-500"
                  style={{ width: `${liveScore}%` }}
                />
              </div>
            </div>
          )}
          <p className="mb-4 text-sm text-slate-500">
            {hasRealKeywords
              ? "These keywords are missing from your application. Click to check if your master resume has relevant experience — we'll draft it for you to review."
              : "No major keyword gaps were identified yet."}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(showAll ? displayItems : displayItems.slice(0, 3)).map((item) => {
              const state = getState(item);
              const isSuccess = state.phase === "success";
              const isSkipped = state.phase === "skipped";
              const isLoading = state.phase === "loading";
              const isReviewing = state.phase === "reviewing";
              const isSaving = state.phase === "saving";
              const isNotFound = state.phase === "not_found";
              const isFallback = state.phase === "fallback";
              const isNoMasterResume = state.phase === "no_master_resume";
              const isError = state.phase === "error";

              return (
                <div
                  key={item}
                  className={`rounded-2xl px-4 py-3 transition-colors ${
                    isSuccess ? "bg-green-50"
                    : isSkipped ? "bg-slate-50 opacity-60"
                    : isError ? "bg-rose-50"
                    : isReviewing || isSaving ? "bg-amber-50"
                    : "bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isSuccess ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                    ) : isError ? (
                      <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
                    ) : (
                      <Lightbulb className="h-4 w-4 shrink-0 text-amber-500" />
                    )}
                    <p className="text-sm font-semibold text-slate-900">{item}</p>
                    {hasRealKeywords && !isSuccess && importanceBadge(item)}
                  </div>

                  {isSkipped ? (
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <p className="text-xs text-slate-400">Not applicable</p>
                      <button
                        type="button"
                        onClick={() => setState(item, { phase: "idle" })}
                        className="text-xs text-slate-400 underline underline-offset-2 hover:text-slate-600"
                      >
                        Undo
                      </button>
                    </div>
                  ) : isSuccess && state.phase === "success" ? (
                    <>
                      <p className="mt-1 text-xs font-semibold leading-5 text-green-600">Added to {targetLabel(state.target)}</p>
                      {state.snippet ? (
                        <p className="mt-2 rounded-xl bg-green-100 px-3 py-2 text-xs italic leading-5 text-green-800">
                          &ldquo;{state.snippet}&rdquo;
                        </p>
                      ) : null}
                      {state.originalSnippet ? (
                        <button
                          type="button"
                          disabled={state.reverting}
                          onClick={() => handleRevert(item)}
                          className="mt-2 inline-flex items-center gap-1 text-xs text-slate-400 underline underline-offset-2 hover:text-slate-600 disabled:opacity-50"
                        >
                          {state.reverting ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                          {state.reverting ? "Reverting..." : "Revert"}
                        </button>
                      ) : null}
                    </>
                  ) : isError && state.phase === "error" ? (
                    <>
                      <p className="mt-1 text-xs leading-5 text-rose-600">{state.message}</p>
                      <button
                        type="button"
                        onClick={() => handleAutoStrengthen(item)}
                        className="mt-2 text-xs font-semibold text-rose-500 hover:text-rose-700"
                      >
                        Retry
                      </button>
                    </>
                  ) : isReviewing || isSaving ? (
                    <div className="mt-3 space-y-3">
                      <div className="flex items-start gap-2 rounded-xl bg-amber-100 px-3 py-2">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                        <p className="text-xs leading-5 text-amber-800">Only save if this genuinely reflects your experience. Don&apos;t include skills you don&apos;t have.</p>
                      </div>
                      {state.phase === "reviewing" && (
                        <textarea
                          className="w-full resize-none rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs leading-5 text-slate-900 outline-none focus:ring-2 focus:ring-amber-300"
                          rows={3}
                          value={getSnippetEdit(item)}
                          onChange={(e) => setSnippetEdit(item, e.target.value)}
                          disabled={isSaving}
                        />
                      )}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => acceptDraft(item)}
                          className="inline-flex items-center gap-1.5 rounded-full bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                          {isSaving ? "Saving..." : "Looks good, save it"}
                        </button>
                        {!isSaving && (
                          <button
                            type="button"
                            onClick={() => setState(item, { phase: "idle" })}
                            className="text-xs text-slate-400 hover:text-slate-600"
                          >
                            Try again
                          </button>
                        )}
                      </div>
                    </div>
                  ) : isLoading ? (
                    <div className="mt-3 flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                      <p className="text-xs text-slate-500">Checking your master resume...</p>
                    </div>
                  ) : isNotFound ? (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs leading-5 text-slate-500">Nothing in your master resume matched this keyword.</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setState(item, { phase: "fallback" })}
                          className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400"
                        >
                          Add my own note
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSkip(item)}
                          className="text-xs text-slate-400 underline underline-offset-2 hover:text-slate-600"
                        >
                          Skip
                        </button>
                      </div>
                    </div>
                  ) : isFallback ? (
                    <div className="mt-3 space-y-2">
                      <textarea
                        className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-[#d4ccff]"
                        rows={3}
                        placeholder={`Describe your experience with "${item}"... e.g. "led a team of 5", "reduced load time by 30%", "managed $2M budget"`}
                        value={getEvidence(item)}
                        onChange={(e) => setEvidence(item, e.target.value)}
                        autoFocus
                      />
                      {hasBothDocs && (
                        <div className="flex flex-wrap gap-1">
                          {(["resume", "cover_letter", "both"] as Target[]).map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setTarget(item, t)}
                              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold transition ${
                                getTarget(item) === t
                                  ? "bg-[#2200ff] text-white"
                                  : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                              }`}
                            >
                              {t === "resume" ? "Resume" : t === "cover_letter" ? "Cover letter" : "Both"}
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={!getEvidence(item).trim()}
                          onClick={() => handleManualStrengthen(item)}
                          className="inline-flex items-center gap-1.5 rounded-full bg-[#2200ff] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                        >
                          <Sparkles className="h-3 w-3" />
                          Weave it in
                        </button>
                        <button
                          type="button"
                          onClick={() => setState(item, { phase: "not_found" })}
                          className="text-xs text-slate-400 hover:text-slate-600"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : isNoMasterResume ? (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs leading-5 text-slate-500">
                        Add your master resume in{" "}
                        <Link href="/resume" className="underline underline-offset-2 hover:text-slate-700">
                          Resume settings
                        </Link>{" "}
                        to use this feature.
                      </p>
                      <button
                        type="button"
                        onClick={() => setState(item, { phase: "idle" })}
                        className="text-xs text-slate-400 underline underline-offset-2 hover:text-slate-600"
                      >
                        Dismiss
                      </button>
                    </div>
                  ) : (
                    <>
                      {!hasRealKeywords && (
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Use the generated documents as a starting point, then add context where it is true.
                        </p>
                      )}
                      {hasRealKeywords && (
                        isPremium ? (
                          hasAnyDoc ? (
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleAutoStrengthen(item)}
                                className="inline-flex items-center gap-1.5 rounded-full border border-[#2200ff]/20 bg-white px-3 py-1.5 text-xs font-semibold text-[#2200ff] transition hover:bg-[#ece8ff]"
                              >
                                <Sparkles className="h-3 w-3" />
                                {addButtonLabel()}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSkip(item)}
                                className="text-xs text-slate-400 underline underline-offset-2 hover:text-slate-500"
                              >
                                Skip — not applicable
                              </button>
                            </div>
                          ) : (
                            <p className="mt-2 text-xs text-slate-400">Generate your application first.</p>
                          )
                        ) : (
                          <Link
                            href="/pricing"
                            className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-[#d4ccff] hover:text-[#2200ff]"
                          >
                            <Lock className="h-3 w-3" />
                            Upgrade to add
                          </Link>
                        )
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
          {displayItems.length > 3 && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700"
            >
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${showAll ? "rotate-180" : ""}`} />
              {showAll ? "Show less" : `Show ${displayItems.length - 3} more`}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
