"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export default function ContactPage() {
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, subject, message }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Something went wrong. Please try again.");
    } else {
      setSent(true);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="mb-8 text-center">
          <Link href="/">
            <img src="/brand/koalapply-favicon-wordmark.png" alt="Koalapply" className="h-9 mx-auto mb-6" />
          </Link>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Get in touch</h1>
          <p className="mt-2 text-slate-500">We&apos;ll get back to you as soon as we can.</p>
        </div>

        {sent ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900">Message sent!</h2>
            <p className="mt-2 text-slate-500">Thanks for reaching out. We&apos;ll be in touch shortly.</p>
            <Link
              href="/"
              className="mt-6 inline-block text-sm font-semibold text-[#2200ff] hover:underline"
            >
              Back to Koalapply →
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 space-y-5"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <label className="block space-y-1.5">
                <span className="text-sm font-semibold text-slate-700">Name</span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#2200ff] focus:outline-none focus:ring-2 focus:ring-[#2200ff]/10 transition"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-semibold text-slate-700">Email</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#2200ff] focus:outline-none focus:ring-2 focus:ring-[#2200ff]/10 transition"
                />
              </label>
            </div>

            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-slate-700">Subject <span className="font-normal text-slate-400">(optional)</span></span>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="What's this about?"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#2200ff] focus:outline-none focus:ring-2 focus:ring-[#2200ff]/10 transition"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-slate-700">Message</span>
              <textarea
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="How can we help?"
                rows={5}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#2200ff] focus:outline-none focus:ring-2 focus:ring-[#2200ff]/10 transition resize-none"
              />
            </label>

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[#2200ff] px-6 py-3 text-base font-bold text-white shadow-[0_8px_24px_rgba(34,0,255,0.25)] transition hover:bg-[#1a00cc] disabled:opacity-60"
            >
              {loading ? "Sending…" : "Send message"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
