import { NextResponse } from "next/server";

const MAX_LENGTH = 2000;

function clean(v: unknown) {
  return String(v ?? "").trim().slice(0, MAX_LENGTH);
}

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const name    = clean(body.name);
  const email   = clean(body.email);
  const subject = clean(body.subject);
  const message = clean(body.message);

  if (!name)              return NextResponse.json({ error: "Name is required." }, { status: 400 });
  if (!isEmail(email))    return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
  if (!message)           return NextResponse.json({ error: "Message is required." }, { status: 400 });

  const apiKey = process.env.RESEND_API_KEY;
  const from   = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    return NextResponse.json({ error: "Email not configured." }, { status: 500 });
  }

  const text = [
    `From: ${name} <${email}>`,
    subject ? `Subject: ${subject}` : "",
    "",
    message,
  ].filter(Boolean).join("\n");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: "hello@koalapply.com",
      reply_to: email,
      subject: subject ? `Contact: ${subject}` : `New message from ${name}`,
      text,
    }),
  });

  if (!response.ok) {
    return NextResponse.json({ error: "Failed to send. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
