"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, MousePointer2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function InviteSetupPage() {
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

    async function verifyInvite(activeSupabase: NonNullable<ReturnType<typeof createSupabaseBrowserClient>>) {
      const queryParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const code = queryParams.get("code") ?? hashParams.get("code");
      const tokenHash = queryParams.get("token_hash") ?? hashParams.get("token_hash");
      const accessToken = queryParams.get("access_token") ?? hashParams.get("access_token");
      const refreshToken = queryParams.get("refresh_token") ?? hashParams.get("refresh_token");
      let isNew = false;

      if (tokenHash) {
        window.history.replaceState({}, "", window.location.pathname);
        const { error } = await activeSupabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "invite",
        });

        if (error) {
          setMessage(error.message);
          setExpired(true);
          return;
        }
        isNew = true;
      } else if (code) {
        window.history.replaceState({}, "", window.location.pathname);
        const { error } = await activeSupabase.auth.exchangeCodeForSession(code);

        if (error) {
          setMessage(error.message);
          setExpired(true);
          return;
        }
        isNew = true;
      } else if (accessToken && refreshToken) {
        window.history.replaceState({}, "", window.location.pathname);
        const { error } = await activeSupabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          setMessage(error.message);
          setExpired(true);
          return;
        }
        isNew = true;
      }

      const { data: { session } } = await activeSupabase.auth.getSession();

      if (!session) {
        window.location.href = `/login?redirect=/auth/invite`;
        return;
      }

      const response = await fetch("/api/enterprise/invitations/accept", { method: "POST" });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setMessage(payload?.error ?? "Unable to accept this enterprise invite.");
        setExpired(true);
        return;
      }

      if (isNew) {
        setReady(true);
      } else {
        // Existing user â€” no password setup needed, just redirect to dashboard
        setDone(true);
        setTimeout(() => { window.location.href = "/"; }, 1800);
      }
    }

    verifyInvite(supabase);
  }, []);

  async function finishSetup(event: React.FormEvent<HTMLFormElement>) {
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
    setTimeout(() => {
      window.location.href = "/";
    }, 1600);
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-5 py-12 text-slate-900">
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-[#d4ccff]/60 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full bg-violet-100/50 blur-3xl" />

      <section className="relative w-full max-w-md rounded-[2rem] border border-slate-100 bg-white p-7 shadow-[0_32px_100px_rgba(34,0,255,0.1)] sm:p-9">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#ece8ff] text-[#2200ff]">
            {done ? <CheckCircle2 className="h-8 w-8" /> : <MousePointer2 className="h-8 w-8 fill-[#d4ccff]" />}
          </div>
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900">
            {done ? "You're all set." : "Set up your Koalapply account"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {done
              ? "Your enterprise access is active."
              : "Create a password to finish accepting your enterprise invite."}
          </p>
        </div>

        {expired ? (
          <div className="mt-7 rounded-2xl bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
            {message || "This invite link is expired or invalid. Ask your organisation admin to send a new invite."}
          </div>
        ) : done ? (
          <p className="mt-7 rounded-2xl bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-700">
            Redirecting to Koalapply...
          </p>
        ) : !ready ? (
          <p className="mt-7 text-center text-sm text-slate-500 animate-pulse">Verifying invite...</p>
        ) : (
          <form onSubmit={finishSetup} className="mt-7 space-y-4">
            <label className="block space-y-1.5">
              <span className="label">Password</span>
              <input
                className="field"
                type="password"
                autoComplete="new-password"
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
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
                onChange={(event) => setConfirm(event.target.value)}
                required
              />
            </label>
            <button className="btn-primary w-full" disabled={loading} type="submit">
              {loading ? "Saving..." : "Finish setup"}
            </button>
            {message ? <p className="text-sm text-rose-700">{message}</p> : null}
          </form>
        )}
      </section>
    </main>
  );
}
