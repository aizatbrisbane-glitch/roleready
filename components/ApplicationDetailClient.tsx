"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { KeywordStrengthSection } from "@/components/KeywordStrengthSection";
import { ApplicationDetailTabs } from "@/components/ApplicationDetailTabs";
import type { Tab } from "@/components/ApplicationDetailTabs";
import type { EntitlementPlanType } from "@/types/database";

export type DocumentUpdate = {
  resume: string | null;
  cover: string | null;
  keyword: string;
  snippet: string;
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
  planType: EntitlementPlanType;
  hasTailoredResume: boolean;
  hasCoverLetter: boolean;
  strengthenedKeywords: string[];
  strengthenedKeywordSnippets: Record<string, string>;
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
  planType,
  hasTailoredResume,
  hasCoverLetter,
  strengthenedKeywords,
  strengthenedKeywordSnippets,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("notes");
  const [openAccordion, setOpenAccordion] = useState<Tab | null>("notes");
  const [tailoredResume, setTailoredResume] = useState(initialTailoredResume);
  const [coverLetter, setCoverLetter] = useState(initialCoverLetter);
  const [highlightKeyword, setHighlightKeyword] = useState<string | null>(null);
  const isMounted = useRef(false);

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
  }, []);

  return (
    <>
      <KeywordStrengthSection
        applicationId={applicationId}
        missingKeywords={missingKeywords}
        matchScore={matchScore}
        planType={planType}
        hasTailoredResume={hasTailoredResume}
        hasCoverLetter={hasCoverLetter}
        strengthenedKeywords={strengthenedKeywords}
        strengthenedKeywordSnippets={strengthenedKeywordSnippets}
        onDocumentUpdate={handleDocumentUpdate}
      />
      <ApplicationDetailTabs
        applicationId={applicationId}
        missingKeywords={missingKeywords}
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
        activeTab={activeTab}
        onTabChange={setActiveTab}
        openAccordion={openAccordion}
        onAccordionChange={setOpenAccordion}
        highlightKeyword={highlightKeyword}
      />
    </>
  );
}
