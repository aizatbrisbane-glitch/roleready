"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";

const startOptions = [
  "As soon as possible",
  "Within 2 weeks",
  "Within 1 month",
  "Within 3 months",
  "Just exploring",
];

export function EnterpriseRequestForm() {
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactRole, setContactRole] = useState("");
  const [requestedSeats, setRequestedSeats] = useState("50");
  const [expectedStartTimeframe, setExpectedStartTimeframe] = useState(startOptions[2]);
  const [notes, setNotes] = useState("");
  const [website, setWebsite] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submitRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const response = await fetch("/api/enterprise/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyName,
        contactName,
        contactEmail,
        contactRole,
        requestedSeats: Number(requestedSeats),
        expectedStartTimeframe,
        notes,
        website,
      }),
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setMessage(payload?.error ?? "Unable to submit your request.");
      setLoading(false);
      return;
    }

    setSubmitted(true);
    setLoading(false);
  }

  if (submitted) {
    return (
      <div className="rounded-[1.75rem] border border-emerald-100 bg-white p-6 shadow-sm sm:p-8">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="h-7 w-7" />
        </span>
        <h2 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">Request received.</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Thanks. We&apos;ll review your enterprise request and come back to you with next steps.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submitRequest} className="rounded-[1.75rem] border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5 sm:col-span-2">
          <span className="label">Company name</span>
          <input className="field" value={companyName} onChange={(event) => setCompanyName(event.target.value)} required />
        </label>

        <label className="block space-y-1.5">
          <span className="label">Contact name</span>
          <input className="field" value={contactName} onChange={(event) => setContactName(event.target.value)} required />
        </label>

        <label className="block space-y-1.5">
          <span className="label">Work email</span>
          <input className="field" type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} required />
        </label>

        <label className="block space-y-1.5">
          <span className="label">Role / title</span>
          <input className="field" value={contactRole} onChange={(event) => setContactRole(event.target.value)} placeholder="HR Manager, Talent Lead..." />
        </label>

        <label className="block space-y-1.5">
          <span className="label">Requested seats</span>
          <input
            className="field"
            type="number"
            min={1}
            max={5000}
            value={requestedSeats}
            onChange={(event) => setRequestedSeats(event.target.value)}
            required
          />
        </label>

        <label className="block space-y-1.5 sm:col-span-2">
          <span className="label">Expected start</span>
          <select className="field" value={expectedStartTimeframe} onChange={(event) => setExpectedStartTimeframe(event.target.value)}>
            {startOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5 sm:col-span-2">
          <span className="label">Notes / use case</span>
          <textarea
            className="field min-h-32 resize-y"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Tell us about the team, transition program, timing, or anything else useful."
          />
        </label>

        <label className="hidden">
          Website
          <input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
        </label>
      </div>

      {message ? <p className="mt-4 text-sm font-medium text-rose-600">{message}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#2200ff] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_35px_rgba(34,0,255,0.22)] transition hover:-translate-y-0.5 hover:bg-[#1a00cc] disabled:opacity-60"
      >
        {loading ? "Submitting..." : "Request enterprise access"}
        <ArrowRight className="h-4 w-4" />
      </button>
    </form>
  );
}
