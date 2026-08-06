"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronDown, Lightbulb, Loader2, Lock, RefreshCw, RotateCcw, Sparkles } from "lucide-react";
import type { EntitlementPlanType } from "@/types/database";
import type { DocumentUpdate } from "@/components/ApplicationDetailClient";
import { KeywordUpsellModal } from "@/components/KeywordUpsellModal";

type Target = "resume" | "cover_letter";

type KeywordState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "reviewing"; target: Target; tailoredResume: string | null; coverLetter: string | null; snippet: string; originalSnippet: string }
  | { phase: "saving" }
  | { phase: "success"; target: Target | null; snippet: string; originalSnippet: string; reverting?: boolean }
  | { phase: "present" }
  | { phase: "skipped" }
  | { phase: "not_found" }
  | { phase: "fallback" }
  | { phase: "no_master_resume" }
  | { phase: "free_limit" }
  | { phase: "error"; message: string };

type Importance = "required" | "preferred" | "unspecified";

type Props = {
  applicationId: string;
  matchScore: number | null;
  missingKeywords: string[];
  strengthenedKeywords: string[];
  strengthenedKeywordSnippets: Record<string, string>;
  strengthenedKeywordOriginals: Record<string, string>;
  strengthenedKeywordTargets: Record<string, "resume" | "cover_letter">;
  keywordImportance: Record<string, string>;
  skippedKeywords: string[];
  planType: EntitlementPlanType;
  hasTailoredResume: boolean;
  hasCoverLetter: boolean;
  tailoredResume: string | null;
  coverLetter: string | null;
  target: "resume" | "cover_letter";
  strengthenCount: number;
  onDocumentUpdate: (update: DocumentUpdate) => void;
};

const IMPORTANCE_ORDER: Record<string, number> = { required: 0, preferred: 1, unspecified: 2 };

// Snippets are stored as plain text (markdown stripped by the AI), but the document retains
// markdown formatting. Check both the raw doc and a markdown-stripped version of each line.
function docContainsSnippet(doc: string, snippet: string): boolean {
  if (!snippet || !doc) return false;
  if (doc.includes(snippet)) return true;
  const stripMd = (line: string) =>
    line.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/^[-*]\s+/, "").trim();
  return doc.split("\n").some(line => stripMd(line).includes(snippet));
}

export function KeywordSidePanel({
  applicationId,
  matchScore,
  missingKeywords,
  strengthenedKeywords,
  strengthenedKeywordSnippets,
  strengthenedKeywordOriginals,
  strengthenedKeywordTargets,
  keywordImportance,
  skippedKeywords,
  planType,
  hasTailoredResume,
  hasCoverLetter,
  tailoredResume,
  coverLetter,
  target,
  strengthenCount,
  onDocumentUpdate,
}: Props) {
  // Initialise per-document state: mark success if snippet is in this document,
  // or "present" if the keyword name itself already appears in the document naturally.
  const [states, setStates] = useState<Record<string, KeywordState>>(() => {
    const doc = target === "resume" ? tailoredResume : coverLetter;
    const docLower = doc?.toLowerCase() ?? "";
    const initial: Record<string, KeywordState> = {};
    for (const kw of strengthenedKeywords) {
      const snippet = strengthenedKeywordSnippets[kw] ?? "";
      const savedTarget = strengthenedKeywordTargets[kw];
      // Only mark Added if this keyword was added to this specific document
      if (snippet && doc && docContainsSnippet(doc, snippet) && (!savedTarget || savedTarget === target)) {
        initial[kw] = { phase: "success", target, snippet, originalSnippet: strengthenedKeywordOriginals[kw] ?? "" };
      }
    }
    for (const kw of skippedKeywords) {
      if (!initial[kw]) initial[kw] = { phase: "skipped" };
    }
    // Keywords already in the document but not added via strengthen panel
    for (const kw of missingKeywords) {
      if (!initial[kw] && docLower.includes(kw.toLowerCase())) {
        initial[kw] = { phase: "present" };
      }
    }
    return initial;
  });

  const router = useRouter();
  const [sessionDelta, setSessionDelta] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [upsellModal, setUpsellModal] = useState<{ scoreWas: number; scoreNow: number; remaining: number } | null>(null);
  const prevStrengthCountRef = useRef(strengthenedKeywords.length);

  // When router.refresh() brings back updated strengthenedKeywords, drain sessionDelta
  // so we don't double-count keywords that are now reflected in the server props.
  useEffect(() => {
    const newCount = strengthenedKeywords.length;
    const prev = prevStrengthCountRef.current;
    if (newCount > prev) {
      setSessionDelta(d => Math.max(0, d - (newCount - prev)));
    }
    prevStrengthCountRef.current = newCount;
  }, [strengthenedKeywords.length]);
  const [expandedSnippets, setExpandedSnippets] = useState<Set<string>>(new Set());
  const [evidenceMap, setEvidenceMap] = useState<Record<string, string>>({});
  const [snippetEditMap, setSnippetEditMap] = useState<Record<string, string>>({});

  const accumulatedRef = useRef({
    keywords: [...strengthenedKeywords],
    snippets: { ...strengthenedKeywordSnippets },
    originals: { ...strengthenedKeywordOriginals },
    targets: { ...strengthenedKeywordTargets },
  });
  const skippedRef = useRef([...skippedKeywords]);

  const isPremium = planType !== "free";
  const hasAnyDoc = hasTailoredResume || hasCoverLetter;
  // Free users get 1 resume strengthen per application, tracked by strengthen_count.
  // Do NOT fall back to strengthenedKeywords.length — that field is also written by the
  // generate route (keywordsAddressed) and would incorrectly trigger the limit for every
  // brand-new application even before the user has clicked Add once.
  // Cover letter strengthening is premium-only.
  const freeLimitReached = !isPremium && (target === "cover_letter" || strengthenCount + sessionDelta >= 1);

  const sortedKeywords = [...missingKeywords].sort((a, b) => {
    const aRank = IMPORTANCE_ORDER[keywordImportance[a] ?? "unspecified"] ?? 2;
    const bRank = IMPORTANCE_ORDER[keywordImportance[b] ?? "unspecified"] ?? 2;
    return aRank - bRank;
  });

  const pendingCount = sortedKeywords.filter(kw => {
    const s = states[kw];
    return !s || (s.phase !== "success" && s.phase !== "skipped" && s.phase !== "present");
  }).length;

  const anyBusy = Object.values(states).some(s => s.phase === "loading" || s.phase === "reviewing" || s.phase === "saving");

  const totalKeywords = sortedKeywords.length;
  const base = matchScore ?? 0;
  const effectiveStrengthened = Math.max(0, strengthenedKeywords.length + sessionDelta);
  const pageLoadScore = totalKeywords === 0 ? base : Math.min(100, Math.round(base + strengthenedKeywords.length * (100 - base) / totalKeywords));
  const liveScore = totalKeywords === 0 ? base : Math.min(100, Math.round(base + effectiveStrengthened * (100 - base) / totalKeywords));
  const scoreImproved = liveScore > pageLoadScore;

  function getState(kw: string): KeywordState { return states[kw] ?? { phase: "idle" }; }
  function setState(kw: string, s: KeywordState) { setStates(p => ({ ...p, [kw]: s })); }
  function getSnippetEdit(kw: string) { return snippetEditMap[kw] ?? ""; }
  function setSnippetEdit(kw: string, v: string) { setSnippetEditMap(p => ({ ...p, [kw]: v })); }
  function getEvidence(kw: string) { return evidenceMap[kw] ?? ""; }
  function setEvidence(kw: string, v: string) { setEvidenceMap(p => ({ ...p, [kw]: v })); }

  function importanceBadge(kw: string) {
    const level = (keywordImportance[kw] ?? "unspecified") as Importance;
    if (level === "required") return <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600">Required</span>;
    if (level === "preferred") return <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600">Preferred</span>;
    return null;
  }

  // Single strengthen API call for one target document.
  // Pass the current in-memory document so the AI works from the latest version —
  // it may include keywords accepted since the last DB save.
  async function callStrengthen(singleTarget: "resume" | "cover_letter", body: Record<string, string>) {
    const res = await fetch(`/api/applications/${applicationId}/strengthen?preview=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...body,
        target: singleTarget,
        ...(singleTarget === "resume" && tailoredResume ? { currentTailoredResume: tailoredResume } : {}),
        ...(singleTarget === "cover_letter" && coverLetter ? { currentCoverLetter: coverLetter } : {}),
      }),
    });
    const data = await res.json();
    return { ok: res.ok, data };
  }

  async function fetchStrengthen(kw: string, t: Target, evidence?: string): Promise<
    | { phase: "not_found" }
    | { phase: "no_master_resume" }
    | { phase: "free_limit" }
    | { phase: "error"; message: string }
    | { tailoredResume: string | null; coverLetter: string | null; snippet: string; originalSnippet: string }
  > {
    const body: Record<string, string> = { keyword: kw, ...(evidence ? { evidence } : {}) };
    const r = await callStrengthen(t, body);
    if (!r.ok) {
      if (r.data.error === "no_master_resume") return { phase: "no_master_resume" };
      if (r.data.error === "free_limit_reached") return { phase: "free_limit" };
      return { phase: "error", message: r.data.error ?? "Something went wrong." };
    }
    if (!r.data.hasRelevantExperience) return { phase: "not_found" };
    return {
      tailoredResume: r.data.tailoredResume ?? null,
      coverLetter: r.data.coverLetter ?? null,
      snippet: r.data.changedSnippet ?? "",
      originalSnippet: r.data.originalSnippet ?? "",
    };
  }

  async function handleAutoStrengthen(kw: string) {
    const t = target;
    setState(kw, { phase: "loading" });
    try {
      const result = await fetchStrengthen(kw, t);
      if ("phase" in result) { setState(kw, result as KeywordState); return; }
      setSnippetEdit(kw, result.snippet);
      setState(kw, { phase: "reviewing", target: t, tailoredResume: result.tailoredResume, coverLetter: result.coverLetter, snippet: result.snippet, originalSnippet: result.originalSnippet });
    } catch {
      setState(kw, { phase: "error", message: "Network error. Please try again." });
    }
  }

  async function handleManualStrengthen(kw: string) {
    const evidence = getEvidence(kw).trim();
    if (!evidence) return;
    const t = target;
    setState(kw, { phase: "loading" });
    try {
      const result = await fetchStrengthen(kw, t, evidence);
      if ("phase" in result) { setState(kw, result as KeywordState); return; }
      setSnippetEdit(kw, result.snippet);
      setState(kw, { phase: "reviewing", target: t, tailoredResume: result.tailoredResume, coverLetter: result.coverLetter, snippet: result.snippet, originalSnippet: result.originalSnippet });
    } catch {
      setState(kw, { phase: "error", message: "Network error. Please try again." });
    }
  }

  async function acceptDraft(kw: string) {
    const state = getState(kw);
    if (state.phase !== "reviewing") return;
    setState(kw, { phase: "saving" });

    // Destructure to preserve TypeScript narrowing inside the nested applyChange function.
    const { snippet: aiSnippet, originalSnippet, tailoredResume: aiResume, coverLetter: aiCover } = state;
    const editedSnippet = getSnippetEdit(kw).trim() || aiSnippet;

    // Apply the keyword change to the current document (which includes any other keywords
    // accepted since this AI snapshot was fetched), not the AI's full snapshot document.
    // This prevents a keyword accepted from an older DB snapshot from overwriting a keyword
    // that was accepted in the meantime.
    function applyChange(currentDoc: string | null, aiDoc: string | null): string | null {
      if (!aiDoc) return null;
      // AI replaced an existing sentence — find it in the current doc and swap
      if (originalSnippet && currentDoc && docContainsSnippet(currentDoc, originalSnippet)) {
        return currentDoc.replace(originalSnippet, editedSnippet);
      }
      // AI added a new sentence and current doc already has it — apply any user textarea edit
      if (!originalSnippet && aiSnippet && currentDoc && docContainsSnippet(currentDoc, aiSnippet)) {
        return editedSnippet !== aiSnippet ? currentDoc.replace(aiSnippet, editedSnippet) : currentDoc;
      }
      // Fallback: apply user edit to AI doc (e.g. new sentence and current doc is unchanged)
      return aiSnippet && editedSnippet !== aiSnippet ? aiDoc.replace(aiSnippet, editedSnippet) : aiDoc;
    }

    const finalResume = aiResume ? applyChange(tailoredResume, aiResume) : null;
    const finalCover = aiCover ? applyChange(coverLetter, aiCover) : null;

    accumulatedRef.current = {
      keywords: [...new Set([...accumulatedRef.current.keywords, kw])],
      snippets: { ...accumulatedRef.current.snippets, [kw]: editedSnippet },
      originals: { ...accumulatedRef.current.originals, [kw]: originalSnippet },
      targets: { ...accumulatedRef.current.targets, [kw]: target },
    };
    const body: Record<string, unknown> = {
      strengthened_keywords: accumulatedRef.current.keywords,
      strengthened_keyword_snippets: accumulatedRef.current.snippets,
      strengthened_keyword_originals: accumulatedRef.current.originals,
      strengthened_keyword_targets: accumulatedRef.current.targets,
      strengthen_count: strengthenCount + sessionDelta + 1,
    };
    if (finalResume) body.tailored_resume = finalResume;
    if (finalCover) body.cover_letter = finalCover;

    try {
      await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      onDocumentUpdate({ resume: finalResume ?? null, cover: finalCover ?? null, keyword: kw, snippet: editedSnippet });
      setState(kw, { phase: "success", target: state.target, snippet: editedSnippet, originalSnippet });
      setSessionDelta(d => d + 1);
      // Delay modal so user sees the keyword go green and score tick up first
      if (!isPremium) {
        const scoreWas = pageLoadScore;
        const scoreNow = totalKeywords === 0 ? base : Math.min(100, Math.round(base + (strengthenedKeywords.length + 1) * (100 - base) / totalKeywords));
        const remaining = pendingCount - 1;
        setTimeout(() => {
          setUpsellModal({ scoreWas, scoreNow, remaining: Math.max(0, remaining) });
        }, 5000);
      }
    } catch {
      setState(kw, { phase: "error", message: "Failed to save. Please try again." });
    }
  }

  async function handleRevert(kw: string) {
    const state = getState(kw);
    if (state.phase !== "success") return;
    setState(kw, { ...state, reverting: true });

    const swap = (doc: string | null): string | null => {
      if (!doc || !state.snippet || !doc.includes(state.snippet)) return null;
      return doc.replace(state.snippet, state.originalSnippet);
    };
    const revertedResume = hasTailoredResume ? swap(tailoredResume) : null;
    const revertedCover = hasCoverLetter ? swap(coverLetter) : null;

    const newSnippets = { ...accumulatedRef.current.snippets };
    delete newSnippets[kw];
    const newOriginals = { ...accumulatedRef.current.originals };
    delete newOriginals[kw];
    const newTargets = { ...accumulatedRef.current.targets };
    delete newTargets[kw];
    const newStrengthened = accumulatedRef.current.keywords.filter(k => k !== kw);
    accumulatedRef.current = { keywords: newStrengthened, snippets: newSnippets, originals: newOriginals, targets: newTargets };

    try {
      await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strengthened_keywords: newStrengthened,
          strengthened_keyword_snippets: newSnippets,
          strengthened_keyword_originals: newOriginals,
          strengthened_keyword_targets: newTargets,
          strengthen_count: Math.max(0, strengthenCount + sessionDelta - 1),
          ...(revertedResume ? { tailored_resume: revertedResume } : {}),
          ...(revertedCover ? { cover_letter: revertedCover } : {}),
        }),
      });
      onDocumentUpdate({ resume: revertedResume ?? null, cover: revertedCover ?? null, keyword: kw, snippet: "", isRevert: true });
      setState(kw, { phase: "idle" });
      setSessionDelta(d => d - 1);
    } catch {
      setState(kw, { ...state, reverting: false });
    }
  }

  async function handleSkip(kw: string) {
    skippedRef.current = [...new Set([...skippedRef.current, kw])];
    setState(kw, { phase: "skipped" });
    await fetch(`/api/applications/${applicationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skipped_keywords: skippedRef.current }),
    }).catch(() => {});
  }

  const list = (
    <div className="divide-y divide-slate-100">
      {sortedKeywords.length === 0 ? (
        <p className="px-4 py-6 text-center text-xs text-slate-400">No keyword gaps identified.</p>
      ) : (
        sortedKeywords.map((kw) => {
          const state = getState(kw);
          const isSuccess = state.phase === "success";
          const isPresent = state.phase === "present";
          const isSkipped = state.phase === "skipped";
          const isLoading = state.phase === "loading";
          const isReviewing = state.phase === "reviewing";
          const isSaving = state.phase === "saving";
          const isNotFound = state.phase === "not_found";
          const isFallback = state.phase === "fallback";
          const isNoMasterResume = state.phase === "no_master_resume";
          const isError = state.phase === "error";
          const isExpanded = isReviewing || isSaving || isNotFound || isFallback || isNoMasterResume;

          return (
            <div
              key={kw}
              className={`px-3 py-2.5 transition-colors ${
                isExpanded ? "bg-amber-50"
                : isSuccess ? "bg-green-50/50"
                : isPresent ? "bg-slate-50/60"
                : isSkipped ? "opacity-50"
                : ""
              }`}
            >
              {/* Top row: icon + name + right action */}
              <div className="flex items-start gap-2">
                <div className="mt-0.5 shrink-0">
                  {isSuccess ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  ) : isPresent ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-slate-400" />
                  ) : isLoading || isSaving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                  ) : isError ? (
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                  ) : (
                    <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-semibold leading-4 ${isSuccess ? "text-green-700" : isPresent ? "text-slate-500" : isSkipped ? "text-slate-400 line-through" : "text-slate-800"}`}>
                    {kw}
                  </p>
                  {/* Status / badge row */}
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    {isSuccess ? (
                      <span className="text-[10px] font-semibold text-green-600">Added</span>
                    ) : isPresent ? (
                      <span className="text-[10px] text-slate-400">Already in {target === "resume" ? "resume" : "letter"}</span>
                    ) : isSkipped ? (
                      <span className="text-[10px] text-slate-400">Skipped</span>
                    ) : isLoading ? (
                      <span className="text-[10px] text-slate-400">Checking…</span>
                    ) : isError && state.phase === "error" ? (
                      <span className="text-[10px] text-rose-500">{state.message}</span>
                    ) : !isExpanded && (
                      importanceBadge(kw)
                    )}
                  </div>
                </div>
                {/* Right-side action button */}
                <div className="shrink-0">
                  {isSuccess && state.phase === "success" ? (
                    state.snippet ? (
                      <button
                        type="button"
                        disabled={state.reverting}
                        onClick={() => handleRevert(kw)}
                        className="inline-flex items-center gap-0.5 text-[10px] text-slate-400 underline underline-offset-2 hover:text-slate-600 disabled:opacity-50"
                      >
                        {state.reverting ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <RotateCcw className="h-2.5 w-2.5" />}
                        Revert
                      </button>
                    ) : null
                  ) : isPresent ? null
                  : isSkipped ? (
                    <button type="button" onClick={() => setState(kw, { phase: "idle" })} className="text-[10px] text-slate-400 underline underline-offset-2 hover:text-slate-600">
                      Undo
                    </button>
                  ) : isError ? (
                    <button type="button" onClick={() => handleAutoStrengthen(kw)} disabled={anyBusy} className="text-[10px] font-semibold text-rose-500 hover:text-rose-700 disabled:opacity-40 disabled:cursor-not-allowed">
                      Retry
                    </button>
                  ) : !isExpanded && !isLoading ? (
                    (isPremium || !freeLimitReached) && hasAnyDoc ? (
                      <button
                        type="button"
                        onClick={() => handleAutoStrengthen(kw)}
                        disabled={anyBusy}
                        className="inline-flex items-center gap-1 rounded-full border border-[#2200ff]/20 bg-white px-2 py-0.5 text-[10px] font-semibold text-[#2200ff] transition hover:bg-[#ece8ff] disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Sparkles className="h-2.5 w-2.5" />
                        Add
                      </button>
                    ) : freeLimitReached ? (
                      <Link href="/pricing" className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-[10px] text-slate-500 hover:text-[#2200ff]">
                        <Lock className="h-2.5 w-2.5" />
                        Upgrade
                      </Link>
                    ) : null
                  ) : null}
                </div>
              </div>

              {/* Success snippet */}
              {isSuccess && state.phase === "success" && state.snippet && (() => {
                const snippetOpen = expandedSnippets.has(kw);
                return (
                  <button
                    type="button"
                    onClick={() => setExpandedSnippets(prev => {
                      const next = new Set(prev);
                      next.has(kw) ? next.delete(kw) : next.add(kw);
                      return next;
                    })}
                    className="ml-5 mt-1.5 w-[calc(100%-1.25rem)] rounded-lg bg-green-100 px-2.5 py-1.5 text-left transition hover:bg-green-200"
                  >
                    <p className={`text-[10px] italic leading-4 text-green-800 ${snippetOpen ? "" : "line-clamp-2"}`}>
                      &ldquo;{state.snippet}&rdquo;
                    </p>
                    <span className="mt-1 block text-[9px] font-semibold text-green-600">
                      {snippetOpen ? "Show less" : "Show more"}
                    </span>
                  </button>
                );
              })()}

              {/* Expanded: reviewing / saving */}
              {(isReviewing || isSaving) && (
                <div className="mt-2 space-y-2">
                  <div className="flex items-start gap-1.5 rounded-lg bg-amber-100 px-2.5 py-2">
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-600" />
                    <p className="text-[10px] leading-4 text-amber-800">Only save if this genuinely reflects your experience.</p>
                  </div>
                  {isReviewing && (
                    <>
                      <textarea
                        className="w-full resize-none rounded-lg border border-amber-200 bg-white px-2.5 py-2 text-[10px] leading-4 text-slate-900 outline-none focus:ring-2 focus:ring-amber-300"
                        rows={4}
                        value={getSnippetEdit(kw)}
                        onChange={(e) => setSnippetEdit(kw, e.target.value)}
                      />
                    </>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => acceptDraft(kw)}
                      className="inline-flex items-center gap-1 rounded-full bg-green-600 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <CheckCircle2 className="h-2.5 w-2.5" />}
                      {isSaving ? "Saving…" : "Save it"}
                    </button>
                    {!isSaving && (
                      <button type="button" onClick={() => setState(kw, { phase: "idle" })} className="text-[10px] text-slate-400 hover:text-slate-600">
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Expanded: not found */}
              {isNotFound && (
                <div className="mt-2 space-y-2">
                  <p className="text-[10px] leading-4 text-slate-500">Nothing in your master resume matched this keyword.</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setState(kw, { phase: "fallback" })}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-700 hover:border-slate-400"
                    >
                      Add my own note
                    </button>
                    <button type="button" onClick={() => handleSkip(kw)} className="text-[10px] text-slate-400 underline underline-offset-2 hover:text-slate-600">
                      Skip
                    </button>
                  </div>
                </div>
              )}

              {/* Expanded: fallback (manual evidence) */}
              {isFallback && (
                <div className="mt-2 space-y-2">
                  <textarea
                    className="w-full resize-none rounded-lg border border-slate-200 px-2.5 py-2 text-[10px] text-slate-900 outline-none focus:ring-2 focus:ring-[#d4ccff]"
                    rows={3}
                    placeholder={`Your experience with "${kw}"…`}
                    value={getEvidence(kw)}
                    onChange={(e) => setEvidence(kw, e.target.value)}
                    autoFocus
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!getEvidence(kw).trim() || anyBusy}
                      onClick={() => handleManualStrengthen(kw)}
                      className="inline-flex items-center gap-1 rounded-full bg-[#2200ff] px-2.5 py-1 text-[10px] font-bold text-white disabled:opacity-50"
                    >
                      <Sparkles className="h-2.5 w-2.5" />
                      Weave it in
                    </button>
                    <button type="button" onClick={() => setState(kw, { phase: "not_found" })} className="text-[10px] text-slate-400 hover:text-slate-600">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Expanded: no master resume */}
              {isNoMasterResume && (
                <div className="mt-2 space-y-1">
                  <p className="text-[10px] leading-4 text-slate-500">
                    Add your master resume in{" "}
                    <Link href="/resume" className="underline underline-offset-2 hover:text-slate-700">Resume settings</Link>{" "}
                    to use this feature.
                  </p>
                  <button type="button" onClick={() => setState(kw, { phase: "idle" })} className="text-[10px] text-slate-400 underline underline-offset-2 hover:text-slate-600">
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );

  const header = (
    <div className="px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-bold text-slate-800">Fix missing keywords</span>
        {pendingCount > 0 && (
          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 shrink-0">
            {pendingCount}
          </span>
        )}
      </div>
      <p className="mt-1 text-[10px] leading-[1.4] text-slate-400">
        {sortedKeywords.length > 0
          ? <>Click &ldquo;Add&rdquo; &mdash; we&rsquo;ll check your master resume and draft a suggestion for you to review.</>
          : <>No keyword gaps identified.</>}
      </p>
      {!isPremium && (
        <p className={`mt-1.5 text-[10px] font-semibold ${freeLimitReached ? "text-rose-500" : "text-[#2200ff]"}`}>
          {freeLimitReached
            ? <><Link href="/pricing" className="underline underline-offset-2">Upgrade</Link> to add more keywords.</>
            : "1 free AI assist included — upgrade for unlimited."}
        </p>
      )}
      {target === "cover_letter" && matchScore !== null && (
        <p className="mt-2 text-[10px] leading-[1.4] text-slate-400">
          Adding keywords here improves your letter but won&rsquo;t change the keyword match score &mdash; that reflects your resume only.
        </p>
      )}
      {target === "resume" && matchScore !== null && totalKeywords > 0 && (
        <div className="mt-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-1.5">
              <span className={`text-base font-bold ${scoreImproved ? "text-green-600" : "text-slate-800"}`}>{liveScore}%</span>
              <span className="text-[10px] text-slate-400">keyword match</span>
              {scoreImproved && <span className="text-[10px] text-slate-400">was {pageLoadScore}%</span>}
            </div>
            {scoreImproved && (
              <button
                type="button"
                disabled={refreshing}
                onClick={() => {
                  setRefreshing(true);
                  router.refresh();
                  setTimeout(() => setRefreshing(false), 1500);
                }}
                className="inline-flex items-center gap-1 rounded-full bg-green-600 px-2 py-0.5 text-[10px] font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
              >
                <RefreshCw className={`h-2.5 w-2.5 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Updating…" : "Update score"}
              </button>
            )}
          </div>
          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-[#2200ff] transition-all duration-500"
              style={{ width: `${liveScore}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop: header fixed, list scrolls */}
      <div className="hidden md:flex md:h-full md:flex-col">
        <div className="shrink-0 border-b border-slate-100">{header}</div>
        <div className="flex-1 overflow-y-auto">{list}</div>
      </div>

      {/* Mobile: collapsible above document */}
      <details className="group border-b border-slate-100 md:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3">
          <span className="text-xs font-semibold text-slate-700">
            Keywords to add
            {pendingCount > 0 && (
              <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                {pendingCount} missing
              </span>
            )}
          </span>
          <ChevronDown className="h-4 w-4 text-slate-400 transition-transform duration-200 group-open:rotate-180" />
        </summary>
        {list}
      </details>

      {/* Upsell modal — shown once to free users after their first keyword save */}
      {upsellModal && (
        <KeywordUpsellModal
          scoreWas={upsellModal.scoreWas}
          scoreNow={upsellModal.scoreNow}
          remainingKeywords={upsellModal.remaining}
          onClose={() => setUpsellModal(null)}
        />
      )}
    </>
  );
}
