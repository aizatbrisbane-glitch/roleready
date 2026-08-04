"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApplicationDetailTabs } from "@/components/ApplicationDetailTabs";
import type { Tab } from "@/components/ApplicationDetailTabs";
import type { ApplicationStatus, EntitlementPlanType, InterviewQuestion } from "@/types/database";

export type DocumentUpdate = {
  resume: string | null;
  cover: string | null;
  keyword: string;
  snippet: string;
  isRevert?: boolean;
};

type Props = {
  applicationId: string;
  missingKeywords: string[];
  matchScore: number | null;
  tailoredResume: string | null;
  coverLetter: string | null;
  jobDescription: string;
  initialSalary: string;
  matchExplanation: string | null;
  initialRoleSummary: string | null;
  initialHiringManager: string | null;
  initialLocationType: string | null;
  initialOtherNotes: string | null;
  initialNotes: string | null;
  initialReferenceIds: string[];
  initialIncludeReferencesInCv: boolean;
  status: ApplicationStatus;
  initialInterviewQuestions: InterviewQuestion[] | null;
  planType: EntitlementPlanType;
  hasTailoredResume: boolean;
  hasCoverLetter: boolean;
  strengthenedKeywords: string[];
  strengthenedKeywordSnippets: Record<string, string>;
  strengthenedKeywordOriginals: Record<string, string>;
  strengthenedKeywordTargets: Record<string, "resume" | "cover_letter">;
  keywordImportance: Record<string, string>;
  skippedKeywords: string[];
  strengthenCount: number;
};

export function ApplicationDetailClient({
  applicationId,
  missingKeywords,
  matchScore,
  tailoredResume: initialTailoredResume,
  coverLetter: initialCoverLetter,
  jobDescription,
  initialSalary,
  matchExplanation,
  initialRoleSummary,
  initialHiringManager,
  initialLocationType,
  initialOtherNotes,
  initialNotes,
  initialReferenceIds,
  initialIncludeReferencesInCv,
  status,
  initialInterviewQuestions,
  planType,
  hasTailoredResume,
  hasCoverLetter,
  strengthenedKeywords,
  strengthenedKeywordSnippets,
  strengthenedKeywordOriginals,
  strengthenedKeywordTargets,
  keywordImportance,
  skippedKeywords,
  strengthenCount,
}: Props) {
  const defaultTab: Tab = initialTailoredResume ? "resume" : "notes";
  const [activeTab, setActiveTab] = useState<Tab>(defaultTab);
  const [openAccordion, setOpenAccordion] = useState<Tab | null>(defaultTab);
  const [tailoredResume, setTailoredResume] = useState(initialTailoredResume);
  const [coverLetter, setCoverLetter] = useState(initialCoverLetter);
  const [highlightKeyword, setHighlightKeyword] = useState<string | null>(null);
  const [allSnippets, setAllSnippets] = useState<Record<string, string>>(strengthenedKeywordSnippets ?? {});
  const isMounted = useRef(false);
  const prevStatusRef = useRef(status);

  useEffect(() => {
    if (prevStatusRef.current !== "Interview" && status === "Interview") {
      setActiveTab("interview");
      setOpenAccordion("interview");
    }
    prevStatusRef.current = status;
  }, [status]);

  useEffect(() => {
    if (!isMounted.current) { isMounted.current = true; return; }
    setTailoredResume(initialTailoredResume);
    if (initialTailoredResume) {
      setActiveTab("resume");
      setOpenAccordion("resume");
    }
  }, [initialTailoredResume]);

  useEffect(() => {
    if (!isMounted.current) return;
    setCoverLetter(initialCoverLetter);
  }, [initialCoverLetter]);

  const clearHighlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (clearHighlightTimer.current) clearTimeout(clearHighlightTimer.current); }, []);

  const handleDocumentUpdate = useCallback((update: DocumentUpdate) => {
    setHighlightKeyword(update.keyword);
    if (clearHighlightTimer.current) clearTimeout(clearHighlightTimer.current);
    clearHighlightTimer.current = setTimeout(() => setHighlightKeyword(null), 8000);

    if (update.isRevert) {
      setAllSnippets(prev => { const next = { ...prev }; delete next[update.keyword]; return next; });
    } else if (update.snippet) {
      setAllSnippets(prev => ({ ...prev, [update.keyword]: update.snippet }));
    }

    if (!update.isRevert) {
      if (update.resume !== null) {
        setTailoredResume(update.resume);
        setActiveTab("resume");
        setOpenAccordion("resume");
      }
      if (update.cover !== null) {
        setCoverLetter(update.cover);
        if (update.resume === null) {
          setActiveTab("cover");
          setOpenAccordion("cover");
        }
      }
    } else {
      if (update.resume !== null) setTailoredResume(update.resume);
      if (update.cover !== null) setCoverLetter(update.cover);
    }
  }, []);

  return (
    <ApplicationDetailTabs
      applicationId={applicationId}
      missingKeywords={missingKeywords}
      matchScore={matchScore}
      jobDescription={jobDescription}
      initialSalary={initialSalary}
      matchExplanation={matchExplanation}
      tailoredResume={tailoredResume}
      coverLetter={coverLetter}
      initialRoleSummary={initialRoleSummary}
      initialHiringManager={initialHiringManager}
      initialLocationType={initialLocationType}
      initialOtherNotes={initialOtherNotes}
      initialNotes={initialNotes}
      initialReferenceIds={initialReferenceIds}
      initialIncludeReferencesInCv={initialIncludeReferencesInCv}
      status={status}
      initialInterviewQuestions={initialInterviewQuestions}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      openAccordion={openAccordion}
      onAccordionChange={setOpenAccordion}
      highlightKeyword={highlightKeyword}
      snippets={allSnippets}
      onDocumentSaved={(field, content) => {
        if (field === "tailored_resume") setTailoredResume(content);
        else setCoverLetter(content);
      }}
      strengthenedKeywords={strengthenedKeywords}
      strengthenedKeywordSnippets={strengthenedKeywordSnippets}
      strengthenedKeywordOriginals={strengthenedKeywordOriginals}
      strengthenedKeywordTargets={strengthenedKeywordTargets}
      keywordImportance={keywordImportance}
      skippedKeywords={skippedKeywords}
      planType={planType}
      hasTailoredResume={hasTailoredResume}
      hasCoverLetter={hasCoverLetter}
      strengthenCount={strengthenCount}
      onDocumentUpdate={handleDocumentUpdate}
    />
  );
}
