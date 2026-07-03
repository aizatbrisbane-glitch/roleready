"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Props = {
  isOAuthOnly: boolean;
};

export function PasswordSection({ isOAuthOnly }: Props) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!/(?=.*[a-zA-Z])(?=.*[0-9])/.test(password)) {
      setError("Password must contain both letters and numbers.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("Unable to connect. Try refreshing the page.");
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
    } else {
      setMessage(isOAuthOnly ? "Password set. You can now sign in with your email too." : "Password updated.");
      setPassword("");
      setConfirm("");
    }
    setLoading(false);
  }

  return (
    <aside className="rounded-[1.8rem] border border-slate-100 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
        {isOAuthOnly ? "Set a password" : "Change password"}
      </p>
      {isOAuthOnly && (
        <p className="mt-2 text-xs leading-5 text-slate-500">
          Add email + password sign-in to your account alongside Google.
        </p>
      )}
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
        <label className="space-y-1.5">
          <span className="label">New password</span>
          <input
            type="password"
            className="field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="8+ chars, letters and numbers"
            autoComplete="new-password"
          />
        </label>
        <label className="space-y-1.5">
          <span className="label">Confirm password</span>
          <input
            type="password"
            className="field"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
        </label>
        {error && <p className="text-xs text-red-600">{error}</p>}
        {message && <p className="text-xs text-[#2200ff]">{message}</p>}
        <button
          type="submit"
          disabled={loading}
          className="btn-primary min-h-11 w-full"
        >
          {loading ? "Saving…" : isOAuthOnly ? "Set password" : "Update password"}
        </button>
      </form>
    </aside>
  );
}
