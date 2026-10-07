"use client";
import { notifySignup } from "@/lib/analytics-browser";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, Eye, FileText, Loader2, UploadCloud, X } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { ErrorToast } from "@/components/ErrorToast";
import { analytics } from "@/lib/analytics";
import { signupAnalyticsMetadata } from "@/lib/analytics-identity";

export const HOMEPAGE_ONBOARDING_DRAFT_KEY = "Koalapply_home_onboarding_draft";
// Retained for DashboardTabs which reads this key to pre-fill the job search filter.
export const GRAB_PREFILL_STORAGE_KEY = "Koalapply_grab_prefill";

export type StoredDraft = {
  resumeFileName?: string;
  resumeFileKey?: string;
  email?: string;
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

function isAcceptedDocument(file: File) {
  const name = file.name.toLowerCase();
  return acceptedDocumentTypes.some((extension) => name.endsWith(extension));
}

function createFileKey(type: "resume") {
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
  const [step, setStep] = useState(1);
  const [resumeFile, setResumeFile] = useState<File | null>(initialResumeFile ?? null);
  const [resumeFileKey, setResumeFileKey] = useState(initialDraft?.resumeFileKey ?? "");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
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
    analytics.setSignupSource(window.location.pathname);
    setMessage(initialMessage ?? "");
    setEmail(initialDraft?.email ?? "");
    setStep(1);
    setConfirmEmail(false);
    setPassword("");
    setVerificationCode("");
    setLoading(false);
    setLoadingStep("");
    setShowPassword(false);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => setIsAuthenticated(Boolean(data.session)));
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

  const currentDraft = useMemo<StoredDraft>(
    () => ({
      resumeFileName: resumeFile?.name ?? initialDraft?.resumeFileName,
      resumeFileKey,
      email,
    }),
    [email, initialDraft?.resumeFileName, resumeFile, resumeFileKey]
  );

  if (!open) return null;

  async function setResumeFileHandler(file: File) {
    setMessage("");
    if (!isAcceptedDocument(file)) {
      setMessage("Please upload a PDF or DOCX file.");
      return;
    }
    const key = createFileKey("resume");
    await saveDraftFile(key, file);
    setResumeFile(file);
    setResumeFileKey(key);
    setExtracting(true);
    window.setTimeout(() => setExtracting(false), 650);
  }

  async function submitAuthenticated() {
    setMessage("");

    const file = resumeFile;
    if (!file) {
      setStep(1);
      setMessage("We couldn't find your resume. Please select it again.");
      return;
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (fullName) {
      await fetch("/api/profile/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: fullName }),
      }).catch(() => {});
    }

    setLoadingStep("Saving your resume…");
    const formData = new FormData();
    formData.append("resume_file", file);
    const res = await fetch("/api/profile/documents", { method: "POST", body: formData });
    const payload = await res.json().catch(() => ({})) as { error?: string };
    if (!res.ok) {
      throw new Error((payload as { error?: string }).error ?? "Unable to save your resume. Please try again.");
    }

    clearDraft();
    void deleteDraftFile(resumeFileKey);
    window.location.href = "/";
  }

  async function handleAccountGate(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setMessage("");

    if (!resumeFile && !initialDraft?.resumeFileName) {
      setStep(1);
      setMessage("Upload your resume first.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) throw new Error("Supabase is not configured.");

      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        await supabase.auth.refreshSession();
        await submitAuthenticated();
        return;
      }

      saveDraft(currentDraft);

      const { data: signInData } = await supabase.auth.signInWithPassword({ email, password });
      if (signInData?.session) {
        setIsAuthenticated(true);
        await submitAuthenticated();
        return;
      }

      if (password.length < 8 || !/(?=.*[a-zA-Z])(?=.*[0-9])/.test(password)) {
        throw new Error("Password must be at least 8 characters and include letters and numbers.");
      }

      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/`,
          data: { ...(fullName ? { full_name: fullName } : {}), ...signupAnalyticsMetadata() },
        },
      });

      if (signUpError) {
        if (signUpError.message.toLowerCase().includes("already registered")) {
          throw new Error("Incorrect password. Try signing in from the main menu.");
        }
        if (signUpError.message.toLowerCase().includes("password should")) {
          throw new Error("Password must be at least 8 characters and include letters and numbers.");
        }
        throw new Error(signUpError.message);
      }

      if (signUpData.user && Array.isArray(signUpData.user.identities) && signUpData.user.identities.length === 0) {
        throw new Error("Incorrect password. Try signing in from the main menu.");
      }

      if (signUpData.session) {
        if (newsletterOptIn) {
          fetch("/api/newsletter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }), keepalive: true }).catch(() => {});
        }
        const userId = signUpData.session.user.id;
        notifySignup("email");
        analytics.signupComplete({ method: "email", source: analytics.getSignupSource(), userId });
        setIsAuthenticated(true);
        await submitAuthenticated();
        return;
      }

      const { data: refreshedSessionData } = await supabase.auth.getSession();
      if (refreshedSessionData.session) {
        if (newsletterOptIn) {
          fetch("/api/newsletter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }), keepalive: true }).catch(() => {});
        }
        const userId = refreshedSessionData.session.user.id;
        notifySignup("email");
        analytics.signupComplete({ method: "email", source: analytics.getSignupSource(), userId });
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

      const { data: verifyData, error } = await supabase.auth.verifyOtp({
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
        fetch("/api/newsletter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }), keepalive: true }).catch(() => {});
      }

      const userId = verifyData?.user?.id;
      notifySignup("email_otp");
      analytics.signupComplete({ method: "email_otp", source: analytics.getSignupSource(), userId });
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

  const stepLabel = confirmEmail ? "Confirm email" : `Step ${step} of 2`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 px-3 py-4 backdrop-blur-sm sm:items-center sm:px-6">
      <div className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-white p-5 shadow-[0_36px_120px_rgba(15,23,42,0.28)] sm:p-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{stepLabel}</p>
        <div className="mt-3 flex gap-1.5">
          {[1, 2].map((i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                confirmEmail || i <= step ? "bg-[#2200ff]" : "bg-slate-200"
              }`}
            />
          ))}
        </div>

        {confirmEmail ? (
          <section className="mt-6">
            <div className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50 p-6">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-900">Enter your verification code</h2>
              <p className="mt-3 text-base leading-7 text-slate-600">
                We sent a {EMAIL_OTP_LENGTH}-digit code to <span className="font-bold text-slate-900">{email}</span>. This confirms the email belongs to you before we save your resume.
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Can&apos;t find it? Check your <span className="font-medium">junk or spam</span> folder.
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
                  After verification, we&apos;ll save your resume and take you to your dashboard.
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
              {message && (
                <p className={`text-center text-sm ${message.startsWith("New code") ? "text-emerald-600" : "text-rose-600"}`}>
                  {message}
                </p>
              )}
              {!loading && (
                <button type="button" onClick={() => setConfirmEmail(false)} className="w-full text-center text-sm font-medium text-slate-400 hover:text-slate-600">
                  ← Back to account details
                </button>
              )}
            </form>
          </section>
        ) : (
          <>
            {step === 1 && (
              <section className="mt-5">
                <h2 className="text-3xl font-black tracking-tight text-slate-900">{resumeFile ? "Resume uploaded" : "Upload your resume"}</h2>
                <p className="mt-2 text-base leading-7 text-slate-600">
                  {resumeFile ? "We'll save this once your account is ready." : "Add your CV or resume to get started."}
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
                      if (file) void setResumeFileHandler(file);
                    }}
                  />
                </div>

                {message && <p className="mt-3 text-sm text-rose-600">{message}</p>}

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
                <h2 className="text-3xl font-black tracking-tight text-slate-900">Create your free account</h2>
                <p className="mt-3 text-base leading-7 text-slate-600">
                  We&apos;ll save your resume and get your profile ready.
                </p>
                <form onSubmit={handleAccountGate} className="mt-6 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-600">First name</span>
                      <input type="text" required className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#d4ccff]" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jane" autoComplete="given-name" />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-600">Last name</span>
                      <input type="text" required className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#d4ccff]" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Smith" autoComplete="family-name" />
                    </label>
                  </div>
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-600">Email</span>
                    <input type="email" required className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#d4ccff]" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-600">Password</span>
                    <span className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:ring-2 focus-within:ring-[#d4ccff]">
                      <input type={showPassword ? "text" : "password"} required minLength={8} className="min-w-0 flex-1 bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a password" autoComplete="new-password" />
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
                    Get a 2nd free application — subscribe to career tips and job search advice (unsubscribe anytime)
                  </label>
                  <ErrorToast message={message} onDismiss={() => setMessage("")} />
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
                      <p className="mt-2 text-xs text-slate-500">Saving your resume and setting up your account…</p>
                    </div>
                  )}
                  {!loading && (
                    <button type="button" onClick={() => setStep(1)} className="w-full text-center text-sm font-medium text-slate-400 hover:text-slate-600">
                      ← Back
                    </button>
                  )}
                </form>
              </section>
            )}
          </>
        )}

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
      // Only reopen if there is a staged resume to recover.
      if (!parsed.resumeFileKey) return;

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
