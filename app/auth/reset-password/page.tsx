"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

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
      <div className="w-full max-w-sm rounded-md border border-stone-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-stone-950">Set new password</h1>
        <p className="mt-1 text-sm text-stone-500">Choose a new password for your account.</p>

        {done ? (
          <p className="mt-5 text-sm font-semibold text-teal-700">Password updated! Redirecting…</p>
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
