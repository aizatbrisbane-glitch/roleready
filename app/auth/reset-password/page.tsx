"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [expired, setExpired] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setExpired(true);
      return;
    }

    let resolved = false;
    let fallback: ReturnType<typeof setTimeout> | undefined;

    function resolve() {
      if (resolved) return;
      resolved = true;
      clearTimeout(fallback);
      setReady(true);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        resolve();
      }
    });

    const queryParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const code = queryParams.get("code");
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");

    if (code) {
      // PKCE flow — exchange code for session
      window.history.replaceState({}, "", window.location.pathname);
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) setExpired(true);
      });
    } else if (accessToken && refreshToken) {
      // Implicit flow — set session directly from hash tokens
      window.history.replaceState({}, "", window.location.pathname);
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(({ error }) => {
        if (error) setExpired(true);
      });
    } else {
      // No tokens — check for an existing session
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          resolve();
        } else {
          fallback = setTimeout(() => {
            if (!resolved) setExpired(true);
          }, 5000);
        }
      });
    }

    return () => {
      clearTimeout(fallback);
      subscription.unsubscribe();
    };
  }, []);

  async function updatePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password !== confirm) {
      setMessage("Passwords don't match.");
      return;
    }

    setLoading(true);
    setMessage("");

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setMessage("Supabase is not configured.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setDone(true);
    setTimeout(() => { window.location.href = "/"; }, 2000);
  }

  return (
    <main className="mx-auto flex max-w-6xl justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Set new password</h1>
        <p className="mt-1 text-sm text-slate-500">Choose a new password for your account.</p>

        {done ? (
          <p className="mt-5 text-sm font-semibold text-[#2200ff]">Password updated! Redirecting…</p>
        ) : expired ? (
          <div className="mt-5 space-y-3">
            <p className="text-sm text-red-700">This reset link has expired or is invalid.</p>
            <a href="/" className="inline-block text-sm font-semibold text-[#2200ff] hover:underline">
              Request a new reset link →
            </a>
          </div>
        ) : !ready ? (
          <p className="mt-5 text-sm text-slate-500 animate-pulse">Verifying reset link…</p>
        ) : (
          <form onSubmit={updatePassword} className="mt-5 space-y-4">
            <label className="block space-y-1.5">
              <span className="label">New password</span>
              <input
                className="field"
                type="password"
                autoComplete="new-password"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            <label className="block space-y-1.5">
              <span className="label">Confirm password</span>
              <input
                className="field"
                type="password"
                autoComplete="new-password"
                minLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </label>
            <button className="btn-primary w-full" disabled={loading} type="submit">
              {loading ? "Updating…" : "Update password"}
            </button>
            {message && <p className="text-sm text-red-700">{message}</p>}
          </form>
        )}
      </div>
    </main>
  );
}
