"use client";

import { useState } from "react";
import { ArrowRight, Eye, Mail, MousePointer2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Mode = "signin" | "signup" | "forgot";

export function AuthPanel() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function getSupabase() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setMessage("Add Supabase environment variables first.");
      return null;
    }
    return supabase;
  }

  function switchMode(next: Mode) {
    setMode(next);
    setMessage("");
  }

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }
    window.location.href = "/";
  }

  async function createAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Account created. Check your email to confirm, then sign in.");
    }
    setLoading(false);
  }

  async function signInWithGoogle() {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  async function sendResetLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    });

    setMessage(error ? error.message : "Password reset link sent. Check your email.");
    setLoading(false);
  }

  const isSignin = mode === "signin";
  const isSignup = mode === "signup";

  return (
    <div className="rounded-[2rem] bg-white/86 p-6 shadow-[0_32px_100px_rgba(20,33,61,0.13)] backdrop-blur sm:p-9 lg:p-12">
      <div className="text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-teal-50 text-[#0f9f92]">
          <MousePointer2 className="h-9 w-9 fill-[#0f9f92]/20" />
        </div>
        <h1 className="mt-7 font-serif text-3xl font-semibold text-[#14213d]">
          {mode === "forgot" ? "Reset your password" : isSignup ? "Create your account" : "Welcome back! 👋"}
        </h1>
        <p className="mt-3 text-base leading-7 text-slate-600">
          {mode === "forgot"
            ? "Enter your email and we’ll send a reset link."
            : isSignup
              ? "Start tailoring stronger applications today."
              : "Sign in to continue your journey"}
        </p>
      </div>

      <form onSubmit={isSignin ? signIn : isSignup ? createAccount : sendResetLink} className="mt-9 space-y-5">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-600">Email</span>
          <span className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm focus-within:border-teal-300 focus-within:ring-3 focus-within:ring-teal-100">
            <Mail className="h-5 w-5 text-slate-400" />
            <input
              className="min-w-0 flex-1 bg-transparent text-base text-[#14213d] outline-none placeholder:text-slate-400"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </span>
        </label>

        {mode !== "forgot" && (
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-600">Password</span>
            <span className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm focus-within:border-teal-300 focus-within:ring-3 focus-within:ring-teal-100">
              <input
                className="min-w-0 flex-1 bg-transparent text-base text-[#14213d] outline-none placeholder:text-slate-400"
                type={showPassword ? "text" : "password"}
                autoComplete={isSignup ? "new-password" : "current-password"}
                minLength={isSignup ? 6 : undefined}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="text-slate-400 transition hover:text-[#0f8f83]"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <Eye className="h-5 w-5" />
              </button>
            </span>
          </label>
        )}

        {isSignin && (
          <div className="flex items-center justify-between gap-3 text-sm">
            <label className="flex items-center gap-2 text-slate-500">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-[#0f9f92] focus:ring-teal-100" />
              Remember me
            </label>
            <button type="button" onClick={() => switchMode("forgot")} className="font-semibold text-[#0f8f83] hover:text-[#0b7d73]">
              Forgot password?
            </button>
          </div>
        )}

        <button
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0f9f92] px-6 py-4 text-base font-semibold text-white shadow-[0_18px_48px_rgba(15,159,146,0.22)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#0b8f83] disabled:cursor-not-allowed disabled:opacity-70"
          disabled={loading}
          type="submit"
        >
          {loading ? (mode === "forgot" ? "Sending..." : isSignup ? "Creating..." : "Signing in...") : mode === "forgot" ? "Send reset link" : isSignup ? "Create account" : "Sign in"}
        </button>
      </form>

      <div className="mt-8 flex items-center gap-4 text-sm text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        <span>or continue with</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <div className="mt-5">
        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:text-[#0f8f83] disabled:opacity-70"
        >
          <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>
      </div>

      <div className="mt-8 text-center text-base text-slate-500">
        {mode === "signin" ? (
          <>
            New here?{" "}
            <button className="inline-flex items-center gap-2 font-semibold text-[#0f8f83] hover:text-[#0b7d73]" type="button" onClick={() => switchMode("signup")}>
              Create an account <ArrowRight className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button className="font-semibold text-[#0f8f83] hover:text-[#0b7d73]" type="button" onClick={() => switchMode("signin")}>
              Sign in
            </button>
          </>
        )}
      </div>

      {message && <p className="mt-5 rounded-2xl bg-teal-50 px-4 py-3 text-sm leading-6 text-[#0f8f83]">{message}</p>}
    </div>
  );
}
