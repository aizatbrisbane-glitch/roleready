"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, Eye, FileText, Loader2, UploadCloud, X } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { ErrorToast } from "@/components/ErrorToast";

export const HOMEPAGE_ONBOARDING_DRAFT_KEY = "Koalapply_home_onboarding_draft";
export const GRAB_PREFILL_STORAGE_KEY = "Koalapply_grab_prefill";

type JobMode = "url" | "browse";

export type StoredDraft = {
  resumeFileName?: string;
  resumeFileKey?: string;
  coverLetterFileName?: string;
  coverLetterFileKey?: string;
  email?: string;
  jobMode?: JobMode | "description";
  jobUrl?: string;
  jobDescription?: string;
  browse?: {
    keywords?: string;
    location?: string;
    workType?: string;
    salaryMin?: string;
  };
};

type Props = {
  open: boolean;
  initialResumeFile?: File | null;
  initialDraft?: StoredDraft | null;
  initialMessage?: string;
  onClose: () => void;
};

const acceptedDocumentTypes = [".pdf", ".docx"];
const EMAIL_OTP_LENGTH = 6;
const DRAFT_DB_NAME = "Koalapply-onboarding-drafts";
const DRAFT_STORE_NAME = "files";
const JOB_TEXT_UNAVAILABLE = "JOB_TEXT_UNAVAILABLE";

function isAcceptedDocument(file: File) {
  const name = file.name.toLowerCase();
  return acceptedDocumentTypes.some((extension) => name.endsWith(extension));
}

function createFileKey(type: "resume" | "cover") {
  return `${type}-${Date.now()}-${crypto.randomUUID()}`;
}

function openDraftDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DRAFT_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DRAFT_STORE_NAME)) {
        db.createObjectStore(DRAFT_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveDraftFile(key: string, file: File) {
  const db = await openDraftDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(DRAFT_STORE_NAME, "readwrite");
    transaction.objectStore(DRAFT_STORE_NAME).put(file, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}

async function getDraftFile(key: string): Promise<File | null> {
  const db = await openDraftDb();
  const file = await new Promise<File | null>((resolve, reject) => {
    const request = db.transaction(DRAFT_STORE_NAME, "readonly").objectStore(DRAFT_STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result instanceof File ? request.result : null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return file;
}

async function deleteDraftFile(key?: string) {
  if (!key) return;
  const db = await openDraftDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(DRAFT_STORE_NAME, "readwrite");
    transaction.objectStore(DRAFT_STORE_NAME).delete(key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}

function saveDraft(draft: StoredDraft) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(HOMEPAGE_ONBOARDING_DRAFT_KEY, JSON.stringify(draft));
}

function clearDraft() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(HOMEPAGE_ONBOARDING_DRAFT_KEY);
}

export function HomepageOnboardingModal({ open, initialResumeFile, initialDraft, initialMessage, onClose }: Props) {
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [resumeFile, setResumeFile] = useState<File | null>(initialResumeFile ?? null);
  const [resumeFileKey, setResumeFileKey] = useState(initialDraft?.resumeFileKey ?? "");
  const [coverLetterFile, setCoverLetterFile] = useState<File | null>(null);
  const [coverLetterFileKey, setCoverLetterFileKey] = useState(initialDraft?.coverLetterFileKey ?? "");
  const [jobMode, setJobMode] = useState<JobMode>(initialDraft?.jobMode === "browse" ? "browse" : "url");
  const [jobUrl, setJobUrl] = useState(initialDraft?.jobUrl ?? "");
  const [browseKeywords, setBrowseKeywords] = useState(initialDraft?.browse?.keywords ?? "");
  const [browseLocation, setBrowseLocation] = useState(initialDraft?.browse?.location ?? "");
  const [browseWorkType, setBrowseWorkType] = useState(initialDraft?.browse?.workType ?? "");
  const [browseSalaryMin, setBrowseSalaryMin] = useState(initialDraft?.browse?.salaryMin ?? "");
  const [email, setEmail] = useState(initialDraft?.email ?? "");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [message, setMessage] = useState(initialMessage ?? "");
  const [confirmEmail, setConfirmEmail] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newsletterOptIn, setNewsletterOptIn] = useState(true);

  useEffect(() => {
    if (!open) return;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => setIsAuthenticated(Boolean(data.session)));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setMessage(initialMessage ?? "");
    setEmail(initialDraft?.email ?? "");
  }, [initialDraft?.email, initialMessage, open]);

  useEffect(() => {
    if (initialResumeFile) {
      setResumeFile(initialResumeFile);
      setExtracting(true);
      const key = resumeFileKey || createFileKey("resume");
      setResumeFileKey(key);
      void saveDraftFile(key, initialResumeFile);
      const timeout = window.setTimeout(() => setExtracting(false), 650);
      return () => window.clearTimeout(timeout);
    }
  }, [initialResumeFile, resumeFileKey]);

  useEffect(() => {
    if (!open || resumeFile || !initialDraft?.resumeFileKey) return;
    setExtracting(true);
    void getDraftFile(initialDraft.resumeFileKey)
      .then((file) => {
        if (file) setResumeFile(file);
      })
      .finally(() => setExtracting(false));
  }, [initialDraft?.resumeFileKey, open, resumeFile]);

  useEffect(() => {
    if (!open || coverLetterFile || !initialDraft?.coverLetterFileKey) return;
    void getDraftFile(initialDraft.coverLetterFileKey).then((file) => {
      if (file) setCoverLetterFile(file);
    });
  }, [coverLetterFile, initialDraft?.coverLetterFileKey, open]);

  const currentDraft = useMemo<StoredDraft>(
    () => ({
      resumeFileName: resumeFile?.name ?? initialDraft?.resumeFileName,
      resumeFileKey,
      coverLetterFileName: coverLetterFile?.name ?? initialDraft?.coverLetterFileName,
      coverLetterFileKey,
      email,
      jobMode,
      jobUrl,
      browse: {
        keywords: browseKeywords,
        location: browseLocation,
        workType: browseWorkType,
        salaryMin: browseSalaryMin,
      },
    }),
    [
      browseKeywords,
      browseLocation,
      browseSalaryMin,
      browseWorkType,
      coverLetterFile,
      coverLetterFileKey,
      email,
      initialDraft?.coverLetterFileName,
      initialDraft?.resumeFileName,
      jobMode,
      jobUrl,
      resumeFile,
      resumeFileKey,
    ]
  );

  if (!open) return null;

  async function setDocumentFile(file: File, type: "resume" | "cover") {
    setMessage("");
    if (!isAcceptedDocument(file)) {
      setMessage("Please upload a PDF or DOCX file.");
      return;
    }
    const key = createFileKey(type);
    await saveDraftFile(key, file);
    if (type === "resume") {
      setResumeFile(file);
      setResumeFileKey(key);
      setExtracting(true);
      window.setTimeout(() => setExtracting(false), 650);
    } else {
      setCoverLetterFile(file);
      setCoverLetterFileKey(key);
    }
  }

  function validateJobIntent() {
    if (jobMode === "url" && !jobUrl.trim()) {
      setMessage("Paste the job URL first.");
      return false;
    }
    if (jobMode === "browse" && !browseKeywords.trim()) {
      setMessage("Add at least a keyword so we can prepare your job search.");
      return false;
    }
    return true;
  }

  async function submitAuthenticated() {
    setMessage("");

    if (jobMode === "browse") {
      if (!resumeFile) {
        setStep(1);
        setMessage("Upload your resume again to continue. We could not recover the temporary browser copy.");
        return;
      }

      const documentData = new FormData();
      documentData.append("resume_file", resumeFile);
      if (coverLetterFile) documentData.append("cover_letter_file", coverLetterFile);

      setLoadingStep("Saving your resume…");
      const documentResponse = await fetch("/api/profile/documents", {
        method: "POST",
        body: documentData,
      });
      const documentPayload = await documentResponse.json();
      if (!documentResponse.ok) {
        throw new Error(documentPayload.error ?? "Unable to save your resume.");
      }

      window.localStorage.setItem(
        GRAB_PREFILL_STORAGE_KEY,
        JSON.stringify({
          keywords: browseKeywords,
          location: browseLocation,
          workType: browseWorkType,
          salaryMin: browseSalaryMin,
        })
      );
      clearDraft();
      void deleteDraftFile(resumeFileKey);
      void deleteDraftFile(coverLetterFileKey);
      window.location.href = "/";
      return;
    }

    if (!resumeFile) {
      setStep(1);
      setMessage("Upload your resume again to continue. We could not recover the temporary browser copy.");
      return;
    }

    const formData = new FormData();
    formData.append("resume_file", resumeFile);
    if (coverLetterFile) formData.append("cover_letter_file", coverLetterFile);
    if (jobMode === "url") formData.append("job_url", jobUrl.trim());

    setLoadingStep("Saving your resume…");
    if (jobMode === "url") {
      window.setTimeout(() => {
        setLoadingStep("Reading the job ad...");
      }, 500);
    }
    const response = await fetch("/api/quick-start", {
      method: "POST",
      body: formData,
    });
    setLoadingStep("Creating your application…");
    const payload = await response.json();

    if (response.status === 401) {
      throw new Error("Your session expired — please sign in again and retry.");
    }
    if (payload?.errorCode === JOB_TEXT_UNAVAILABLE) {
      setConfirmEmail(false);
      setStep(3);
      setJobMode("url");
      saveDraft({ ...currentDraft, jobMode: "url" });
      setMessage("We could not read that job link. Try the direct job ad URL instead of a search results page.");
      return;
    }
    if (!response.ok || !payload.applicationId) {
      throw new Error(payload.error ?? "Unable to create your first application.");
    }

    clearDraft();
    void deleteDraftFile(resumeFileKey);
    void deleteDraftFile(coverLetterFileKey);
    setLoadingStep("Opening your application...");
    window.location.href = `/applications/${payload.applicationId}?generate=true`;
  }

  async function handleAccountGate(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setMessage("");

    if (!resumeFile && !initialDraft?.resumeFileName) {
      setStep(1);
      setMessage("Upload your resume first.");
      return;
    }
    if (!validateJobIntent()) return;

    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) throw new Error("Supabase is not configured.");

      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        // Refresh to ensure server-side cookies are current before calling the API.
        await supabase.auth.refreshSession();
        await submitAuthenticated();
        return;
      }

      saveDraft(currentDraft);

      // Try signing in first — handles returning users without sending an OTP.
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInData?.session) {
        // Returning user successfully signed in — skip OTP.
        setIsAuthenticated(true);
        await submitAuthenticated();
        return;
      }

      // New user (or wrong password for returning user) — attempt sign-up.
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/` },
      });

      if (signUpError) {
        if (signInError && signUpError.message.toLowerCase().includes("already registered")) {
          throw new Error("Incorrect password. Try signing in from the main menu.");
        }
        if (signUpError.message.toLowerCase().includes("password should contain")) {
          throw new Error("Password must be at least 8 characters and include letters and numbers.");
        }
        throw new Error(signUpError.message);
      }

      if (signUpData.user && Array.isArray(signUpData.user.identities) && signUpData.user.identities.length === 0) {
        throw new Error("Incorrect password. Try signing in from the main menu.");
      }

      if (signUpData.session) {
        if (newsletterOptIn) {
          fetch("/api/newsletter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) }).catch(() => {});
        }
        setIsAuthenticated(true);
        await submitAuthenticated();
        return;
      }

      const { data: refreshedSessionData } = await supabase.auth.getSession();
      if (refreshedSessionData.session) {
        setIsAuthenticated(true);
        await submitAuthenticated();
        return;
      }

      setConfirmEmail(true);
      setVerificationCode("");
      setMessage("Enter the verification code from your email to continue.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyEmailCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const cleanCode = verificationCode.replace(/\D/g, "");
    if (cleanCode.length !== EMAIL_OTP_LENGTH) {
      setMessage(`Enter the ${EMAIL_OTP_LENGTH}-digit code from your email.`);
      return;
    }

    setLoading(true);
    setLoadingStep("Verifying your code…");
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) throw new Error("Supabase is not configured.");

      const { error } = await supabase.auth.verifyOtp({
        email,
        token: cleanCode,
        type: "signup",
      });

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("expired") || msg.includes("invalid")) {
          setVerificationCode("");
          throw new Error("That code has expired or was replaced by a newer email. Click Resend and use the newest code only.");
        }
        throw new Error(error.message);
      }

      if (newsletterOptIn) {
        fetch("/api/newsletter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) }).catch(() => {});
      }
      setIsAuthenticated(true);
      await submitAuthenticated();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not verify that code.");
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  }

  async function resendVerificationCode() {
    setMessage("");
    setVerificationCode("");
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) throw new Error("Supabase is not configured.");
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/` },
      });
      if (error) throw new Error(error.message);
      setMessage("New code sent. Check your inbox (and spam). It may take up to 30 seconds to arrive.");
      setResendCooldown(60);
      const interval = window.setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) { window.clearInterval(interval); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not resend the code.");
    } finally {
      setLoading(false);
    }
  }

  function continueFromJobStep() {
    setMessage("");
    if (!validateJobIntent()) return;
    if (isAuthenticated) {
      void handleAccountGate();
    } else {
      saveDraft(currentDraft);
      setStep(4);
    }
  }

  const stepLabel = confirmEmail ? "Confirm email" : isAuthenticated && step === 4 ? "Ready" : `Step ${step} of 4`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 px-3 py-4 backdrop-blur-sm sm:items-center sm:px-6">
      <div className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-white p-5 shadow-[0_36px_120px_rgba(15,23,42,0.28)] sm:p-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          aria-label="Close onboarding"
        >
          <X className="h-5 w-5" />
        </button>

        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{stepLabel}</p>

        {confirmEmail ? (
          <section className="mt-6">
            <div className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50 p-6">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-900">Enter your verification code</h2>
              <p className="mt-3 text-base leading-7 text-slate-600">
                We sent a {EMAIL_OTP_LENGTH}-digit code to <span className="font-bold text-slate-900">{email}</span>. This confirms the email belongs to you before we save your application.
              </p>
            </div>

            <form onSubmit={verifyEmailCode} className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-600">Verification code</span>
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  maxLength={EMAIL_OTP_LENGTH}
                  required
                  className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-center text-2xl font-black tracking-[0.35em] text-slate-900 outline-none focus:ring-2 focus:ring-[#d4ccff]"
                  value={verificationCode}
                  onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, EMAIL_OTP_LENGTH))}
                  placeholder={"0".repeat(EMAIL_OTP_LENGTH)}
                />
              </label>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#2200ff] px-6 py-4 text-base font-bold text-white shadow-[0_12px_32px_rgba(34,0,255,0.22)] disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
                {loading && loadingStep ? loadingStep : "Verify and continue"}
              </button>
              {loading && (
                <p className="text-center text-xs leading-5 text-slate-500">
                  After verification, we save your resume, read the job ad, then open your application while documents generate.
                </p>
              )}
              <button
                type="button"
                disabled={loading || resendCooldown > 0}
                onClick={resendVerificationCode}
                className="w-full rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-600 transition hover:border-[#d4ccff] hover:text-[#2200ff] disabled:opacity-60"
              >
                {resendCooldown > 0 ? `Resend available in ${resendCooldown}s` : "Resend code"}
              </button>
            </form>
          </section>
        ) : (
          <>
            {step === 1 && (
              <section className="mt-5">
                <h2 className="text-3xl font-black tracking-tight text-slate-900">Resume uploaded</h2>
                <p className="mt-2 text-base leading-7 text-slate-600">
                  We will save and extract this after your account is ready.
                </p>

                <div className="mt-6 rounded-[1.5rem] border border-dashed border-[#d4ccff] bg-[#f7f5ff] p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#2200ff] shadow-sm">
                        <FileText className="h-6 w-6" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-bold text-slate-900">{resumeFile?.name ?? initialDraft?.resumeFileName ?? "No resume selected yet"}</p>
                        <p className="text-sm text-slate-500">{extracting ? "Checking file..." : "PDF or DOCX"}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => resumeInputRef.current?.click()}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-[#d4ccff] bg-white px-5 py-3 text-sm font-bold text-[#2200ff] shadow-sm"
                    >
                      <UploadCloud className="h-4 w-4" />
                      {resumeFile ? "Replace resume" : "Upload resume"}
                    </button>
                  </div>
                  <input
                    ref={resumeInputRef}
                    type="file"
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void setDocumentFile(file, "resume");
                    }}
                  />
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    disabled={!resumeFile || extracting}
                    onClick={() => { setMessage(""); setStep(2); }}
                    className="inline-flex items-center gap-2 rounded-full bg-[#2200ff] px-6 py-3 text-sm font-bold text-white shadow-[0_12px_32px_rgba(34,0,255,0.22)] disabled:opacity-50"
                  >
                    Continue <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </section>
            )}

            {step === 2 && (
              <section className="mt-5">
                <h2 className="text-3xl font-black tracking-tight text-slate-900">Do you have a master cover letter?</h2>
                <p className="mt-2 text-base leading-7 text-slate-600">Optional, but helpful if you already have one.</p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    className="rounded-[1.4rem] border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-[#d4ccff] hover:bg-[#f7f5ff]"
                  >
                    <UploadCloud className="h-7 w-7 text-[#2200ff]" />
                    <p className="mt-4 font-bold text-slate-900">Upload Cover Letter</p>
                    <p className="mt-1 text-sm text-slate-500">{coverLetterFile?.name ?? "PDF or DOCX"}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="rounded-[1.4rem] border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-[#d4ccff] hover:bg-[#f7f5ff]"
                  >
                    <ArrowRight className="h-7 w-7 text-[#2200ff]" />
                    <p className="mt-4 font-bold text-slate-900">Skip For Now</p>
                    <p className="mt-1 text-sm text-slate-500">You can add one later.</p>
                  </button>
                </div>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      void setDocumentFile(file, "cover");
                      setStep(3);
                    }
                  }}
                />
              </section>
            )}

            {step === 3 && (
              <section className="mt-5">
                <h2 className="text-3xl font-black tracking-tight text-slate-900">What role do you want to apply for?</h2>
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  {[
                    ["url", "Paste Job URL"],
                    ["browse", "Browse Jobs With Koalapply"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setJobMode(value as JobMode);
                        setMessage("");
                      }}
                      className={`rounded-2xl border px-4 py-3 text-sm font-bold transition ${
                        jobMode === value
                          ? "border-[#2200ff] bg-[#ece8ff] text-[#2200ff]"
                          : "border-slate-200 bg-white text-slate-600 hover:border-[#d4ccff]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {jobMode === "url" && (
                  <label className="mt-5 block">
                    <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Job URL</span>
                    <input
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-[#d4ccff]"
                      placeholder="https://..."
                      value={jobUrl}
                      onChange={(event) => setJobUrl(event.target.value)}
                    />
                  </label>
                )}

                {jobMode === "browse" && (
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Keywords</span>
                      <input className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#d4ccff]" value={browseKeywords} onChange={(e) => setBrowseKeywords(e.target.value)} placeholder="Governance manager" />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Preferred location</span>
                      <input className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#d4ccff]" value={browseLocation} onChange={(e) => setBrowseLocation(e.target.value)} placeholder="Sydney" />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Work type</span>
                      <select className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#d4ccff]" value={browseWorkType} onChange={(e) => setBrowseWorkType(e.target.value)}>
                        <option value="">Any</option>
                        <option value="full_time">Full-time</option>
                        <option value="part_time">Part-time</option>
                        <option value="hybrid">Hybrid</option>
                        <option value="onsite">Onsite</option>
                        <option value="contract">Contract</option>
                        <option value="permanent">Permanent</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Minimum salary</span>
                      <input type="number" min={0} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#d4ccff]" value={browseSalaryMin} onChange={(e) => setBrowseSalaryMin(e.target.value)} placeholder="100000" />
                    </label>
                  </div>
                )}

                <div className="mt-6 space-y-3">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={continueFromJobStep}
                      disabled={loading}
                      className="inline-flex items-center gap-2 rounded-full bg-[#2200ff] px-6 py-3 text-sm font-bold text-white shadow-[0_12px_32px_rgba(34,0,255,0.22)] disabled:opacity-60"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                      {loading ? (loadingStep || "Working...") : isAuthenticated ? "Create application" : "Continue"}
                    </button>
                  </div>
                  {loading && (
                    <div className="rounded-2xl bg-[#ece8ff]/60 px-4 py-3">
                      <div className="h-1 w-full overflow-hidden rounded-full bg-[#d4ccff]">
                        <div className="h-full w-1/3 rounded-full bg-[#2200ff] animate-[indeterminate_1.8s_ease-in-out_infinite]" />
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        {loadingStep === "Reading the job ad..." ? "Reading the job ad can take 15–30 seconds — hang tight!" : "This usually takes less than a minute."}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {step === 4 && (
              <section className="mt-5">
                <h2 className="text-3xl font-black tracking-tight text-slate-900">Your first application is almost ready</h2>
                <p className="mt-3 text-base leading-7 text-slate-600">
                  Create a free account to save your resume and generate your first tailored application for free.
                </p>
                <form onSubmit={handleAccountGate} className="mt-6 space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-600">Email</span>
                    <input type="email" required className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#d4ccff]" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-600">Password</span>
                    <span className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:ring-2 focus-within:ring-[#d4ccff]">
                      <input type={showPassword ? "text" : "password"} required minLength={6} className="min-w-0 flex-1 bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a password" autoComplete="new-password" />
                      <button type="button" onClick={() => setShowPassword((v) => !v)} className="text-slate-400 transition hover:text-[#2200ff]" aria-label={showPassword ? "Hide password" : "Show password"}>
                        <Eye className="h-5 w-5" />
                      </button>
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-500">
                    <input
                      type="checkbox"
                      checked={newsletterOptIn}
                      onChange={(e) => setNewsletterOptIn(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-[#2200ff] focus:ring-[#d4ccff]"
                    />
                    Send me career tips and job search advice (unsubscribe anytime)
                  </label>
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#2200ff] px-6 py-4 text-base font-bold text-white shadow-[0_12px_32px_rgba(34,0,255,0.22)] disabled:opacity-60"
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
                    {loading ? (loadingStep || "Setting things up...") : "Create free account"}
                  </button>
                  {loading && (
                    <div className="rounded-2xl bg-[#ece8ff]/60 px-4 py-3">
                      <div className="h-1 w-full overflow-hidden rounded-full bg-[#d4ccff]">
                        <div className="h-full w-1/3 rounded-full bg-[#2200ff] animate-[indeterminate_1.8s_ease-in-out_infinite]" />
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        {loadingStep === "Reading the job ad..." ? "Reading the job ad can take 15–30 seconds — hang tight!" : "This usually takes less than a minute."}
                      </p>
                    </div>
                  )}
                </form>
              </section>
            )}
          </>
        )}

        <ErrorToast message={message} onDismiss={() => setMessage("")} />
      </div>
    </div>
  );
}

export function DeferredOnboardingResume() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<StoredDraft | null>(null);
  const [initialMessage, setInitialMessage] = useState("");

  useEffect(() => {
    const raw = window.localStorage.getItem(HOMEPAGE_ONBOARDING_DRAFT_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as StoredDraft;
      if (!parsed.jobMode) return;

      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        setDraft(parsed);
        setInitialMessage("That confirmation link expired or was already used. Re-upload your resume and continue to send a fresh confirmation email.");
        setOpen(true);
        return;
      }

      supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          window.localStorage.removeItem(HOMEPAGE_ONBOARDING_DRAFT_KEY);
        } else {
          setDraft(parsed);
          setInitialMessage("That confirmation link expired or was already used. Re-upload your resume and continue to send a fresh confirmation email.");
          setOpen(true);
        }
      });
    } catch {
      window.localStorage.removeItem(HOMEPAGE_ONBOARDING_DRAFT_KEY);
    }
  }, []);

  return (
    <HomepageOnboardingModal
      open={open}
      initialDraft={draft}
      initialMessage={initialMessage}
      onClose={() => setOpen(false)}
    />
  );
}
