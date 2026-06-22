"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronDown, Lightbulb, Loader2, Lock, Sparkles } from "lucide-react";
import type { EntitlementPlanType } from "@/types/database";
import type { DocumentUpdate } from "@/components/ApplicationDetailClient";

type Target = "resume" | "cover_letter" | "both";

type KeywordState =
  | { phase: "idle" }
  | { phase: "expanding" }
  | { phase: "loading" }
  | { phase: "reviewing"; target: Target; tailoredResume: string | null; coverLetter: string | null; snippet: string }
  | { phase: "saving" }
  | { phase: "success"; target: Target | null; snippet: string }
  | { phase: "error"; message: string };

type Props = {
  applicationId: string;
  missingKeywords: string[];
  matchScore: number | null;
  planType: EntitlementPlanType;
  hasTailoredResume: boolean;
  hasCoverLetter: boolean;
  strengthenedKeywords: string[];
  strengthenedKeywordSnippets: Record<string, string>;
  onDocumentUpdate: (update: DocumentUpdate) => void;
};

export function KeywordStrengthSection({
  applicationId,
  missingKeywords,
  matchScore,
  planType,
  hasTailoredResume,
  hasCoverLetter,
  strengthenedKeywords,
  strengthenedKeywordSnippets,
  onDocumentUpdate,
}: Props) {
  const [isOpen, setIsOpen] = useState(missingKeywords.length > 0);
  const [showAll, setShowAll] = useState(false);
  const [states, setStates] = useState<Record<string, KeywordState>>(() => {
    const initial: Record<string, KeywordState> = {};
    for (const kw of strengthenedKeywords) {
      initial[kw] = { phase: "success", target: null, snippet: strengthenedKeywordSnippets[kw] ?? "" };
    }
    return initial;
  });
  const [evidenceMap, setEvidenceMap] = useState<Record<string, string>>({});
  const [targetMap, setTargetMap] = useState<Record<string, Target>>({});
  const [snippetEditMap, setSnippetEditMap] = useState<Record<string, string>>({});

  const hasRealKeywords = missingKeywords.length > 0;
  const isPremium = planType !== "free";
  const hasBothDocs = hasTailoredResume && hasCoverLetter;
  const hasAnyDoc = hasTailoredResume || hasCoverLetter;
  const defaultTarget: Target = hasBothDocs ? "both" : hasTailoredResume ? "resume" : "cover_letter";

  const displayItems = hasRealKeywords
    ? missingKeywords
    : ["Review job requirements", "Check resume emphasis", "Personalise your opening"];

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

  async function handleStrengthen(keyword: string) {
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

    const body: Record<string, unknown> = {
      strengthened_keywords: [...new Set([...strengthenedKeywords, keyword])],
      strengthened_keyword_snippets: { ...strengthenedKeywordSnippets, [keyword]: editedSnippet },
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
      setState(keyword, { phase: "success", target: state.target, snippet: editedSnippet });
    } catch {
      setState(keyword, { phase: "error", message: "Failed to save. Please try again." });
    }
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
          {hasRealKeywords && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
              {missingKeywords.length} keyword{missingKeywords.length !== 1 ? "s" : ""}
            </span>
          )}
          {matchScore !== null && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              Match: {matchScore}%
            </span>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="border-t border-slate-100 px-5 pb-5 pt-4 md:px-6 md:pb-6">
          <p className="mb-4 text-sm text-slate-500">
            {hasRealKeywords
              ? "Based on your master documents, these keywords are missing from your application. Review them and see if any are genuinely relevant to your experience — if so, add them to your master resume first, then regenerate."
              : "No major keyword gaps were identified yet."}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(showAll ? displayItems : displayItems.slice(0, 3)).map((item) => {
              const state = getState(item);
              const isSuccess = state.phase === "success";
              const isExpanding = state.phase === "expanding";
              const isLoading = state.phase === "loading";
              const isReviewing = state.phase === "reviewing";
              const isSaving = state.phase === "saving";
              const isError = state.phase === "error";

              return (
                <div
                  key={item}
                  className={`rounded-2xl px-4 py-3 transition-colors ${
                    isSuccess ? "bg-green-50" : isError ? "bg-rose-50" : isReviewing || isSaving ? "bg-amber-50" : "bg-slate-50"
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
                  </div>

                  {isSuccess && state.phase === "success" ? (
                    <>
                      <p className="mt-1 text-xs font-semibold leading-5 text-green-600">Added to {targetLabel(state.target)}</p>
                      {state.snippet ? (
                        <p className="mt-2 rounded-xl bg-green-100 px-3 py-2 text-xs italic leading-5 text-green-800">
                          &ldquo;{state.snippet}&rdquo;
                        </p>
                      ) : null}
                    </>
                  ) : isError && state.phase === "error" ? (
                    <>
                      <p className="mt-1 text-xs leading-5 text-rose-600">{state.message}</p>
                      <button
                        type="button"
                        onClick={() => setState(item, { phase: "expanding" })}
                        className="mt-2 text-xs font-semibold text-rose-500 hover:text-rose-700"
                      >
                        Retry
                      </button>
                    </>
                  ) : isReviewing || isSaving ? (
                    <div className="mt-3 space-y-3">
                      <p className="text-xs font-semibold text-amber-700">Edit the change if needed, then save:</p>
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
                            onClick={() => setState(item, { phase: "expanding" })}
                            className="text-xs text-slate-400 hover:text-slate-600"
                          >
                            Try again
                          </button>
                        )}
                      </div>
                    </div>
                  ) : isExpanding || isLoading ? (
                    <div className="mt-3 space-y-2">
                      <textarea
                        className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-[#d4ccff]"
                        rows={3}
                        placeholder={`Describe your experience with "${item}"...`}
                        value={getEvidence(item)}
                        onChange={(e) => setEvidence(item, e.target.value)}
                        disabled={isLoading}
                        autoFocus
                      />
                      {hasBothDocs && (
                        <div className="flex flex-wrap gap-1">
                          {(["resume", "cover_letter", "both"] as Target[]).map((t) => (
                            <button
                              key={t}
                              type="button"
                              disabled={isLoading}
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
                          disabled={isLoading || !getEvidence(item).trim()}
                          onClick={() => handleStrengthen(item)}
                          className="inline-flex items-center gap-1.5 rounded-full bg-[#2200ff] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                        >
                          {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                          {isLoading ? "Weaving in..." : "Weave it in"}
                        </button>
                        {!isLoading && (
                          <button
                            type="button"
                            onClick={() => setState(item, { phase: "idle" })}
                            className="text-xs text-slate-400 hover:text-slate-600"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
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
                            <button
                              type="button"
                              onClick={() => setState(item, { phase: "expanding" })}
                              className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[#2200ff]/20 bg-white px-3 py-1.5 text-xs font-semibold text-[#2200ff] transition hover:bg-[#ece8ff]"
                            >
                              <Sparkles className="h-3 w-3" />
                              {addButtonLabel()}
                            </button>
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
