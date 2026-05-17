"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Mode = "signin" | "signup" | "forgot";

export function AuthPanel() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

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
    if (!supabase) { setLoading(false); return; }

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
    if (!supabase) { setLoading(false); return; }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Account created! Check your email to confirm, then sign in.");
    }
    setLoading(false);
  }

  async function sendResetLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const supabase = getSupabase();
    if (!supabase) { setLoading(false); return; }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`
    });

    setMessage(error ? error.message : "Password reset link sent — check your email.");
    setLoading(false);
  }

  return (
    <div className="w-full max-w-sm rounded-md border border-stone-200 bg-white p-6 shadow-sm">
      {mode === "signin" && (
        <>
          <h1 className="text-xl font-bold text-stone-950">Sign in</h1>
          <p className="mt-1 text-sm text-stone-500">Welcome back.</p>
          <form onSubmit={signIn} className="mt-5 space-y-4">
            <label className="block space-y-1.5">
              <span className="label">Email</span>
              <input className="field" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label className="block space-y-1.5">
              <span className="label">Password</span>
              <input className="field" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
            <button className="btn-primary w-full" disabled={loading} type="submit">
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <div className="mt-4 flex flex-col gap-2 text-center text-sm">
            <button className="text-stone-500 hover:text-stone-800" type="button" onClick={() => switchMode("forgot")}>
              Forgot password?
            </button>
            <span className="text-stone-400">
              No account?{" "}
              <button className="font-semibold text-teal-700 hover:text-teal-900" type="button" onClick={() => switchMode("signup")}>
                Create one
              </button>
            </span>
          </div>
        </>
      )}

      {mode === "signup" && (
        <>
          <h1 className="text-xl font-bold text-stone-950">Create account</h1>
          <p className="mt-1 text-sm text-stone-500">Pick an email and password to get started.</p>
          <form onSubmit={createAccount} className="mt-5 space-y-4">
            <label className="block space-y-1.5">
              <span className="label">Email</span>
              <input className="field" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label className="block space-y-1.5">
              <span className="label">Password</span>
              <input className="field" type="password" autoComplete="new-password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
            <button className="btn-primary w-full" disabled={loading} type="submit">
              {loading ? "Creating…" : "Create account"}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-stone-400">
            Already have an account?{" "}
            <button className="font-semibold text-teal-700 hover:text-teal-900" type="button" onClick={() => switchMode("signin")}>
              Sign in
            </button>
          </p>
        </>
      )}

      {mode === "forgot" && (
        <>
          <h1 className="text-xl font-bold text-stone-950">Reset password</h1>
          <p className="mt-1 text-sm text-stone-500">Enter your email and we&apos;ll send a reset link.</p>
          <form onSubmit={sendResetLink} className="mt-5 space-y-4">
            <label className="block space-y-1.5">
              <span className="label">Email</span>
              <input className="field" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <button className="btn-primary w-full" disabled={loading} type="submit">
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-stone-400">
            <button className="font-semibold text-teal-700 hover:text-teal-900" type="button" onClick={() => switchMode("signin")}>
              ← Back to sign in
            </button>
          </p>
        </>
      )}

      {message && <p className="mt-4 text-sm text-stone-700">{message}</p>}
    </div>
  );
}
