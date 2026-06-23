"use client";

import { useState } from "react";

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || state === "loading") return;
    setState("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Something went wrong.");
        setState("error");
      } else {
        setState("success");
        setEmail("");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
      setState("error");
    }
  }

  return (
    <section className="rounded-[2rem] bg-[#2200ff] px-6 py-10 text-white shadow-[0_24px_70px_rgba(34,0,255,0.18)] sm:px-8 lg:px-10">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Stay Ahead In Your Career</h2>
        <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-white/80">
          Get practical job search and career advice delivered to your inbox.
        </p>

        {state === "success" ? (
          <p className="mx-auto mt-7 max-w-xl rounded-full bg-white/20 px-6 py-4 text-sm font-semibold text-white">
            You're in! We'll be in touch soon.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mx-auto mt-7 flex max-w-xl flex-col gap-3 sm:flex-row">
            <label className="sr-only" htmlFor="newsletter-email">Email address</label>
            <input
              id="newsletter-email"
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setState("idle"); }}
              required
              className="min-h-12 flex-1 rounded-full border border-white/20 bg-white px-5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-4 focus:ring-white/25"
            />
            <button
              type="submit"
              disabled={state === "loading"}
              className="min-h-12 rounded-full bg-[#c8ff00] px-6 text-sm font-bold text-slate-900 shadow-[0_12px_28px_rgba(200,255,0,0.3)] transition hover:-translate-y-0.5 disabled:opacity-60"
            >
              {state === "loading" ? "Subscribing..." : "Subscribe"}
            </button>
          </form>
        )}

        {state === "error" && (
          <p className="mt-3 text-sm text-white/70">{errorMsg}</p>
        )}
      </div>
    </section>
  );
}
