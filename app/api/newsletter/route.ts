import { NextResponse } from "next/server";
import { Resend } from "resend";

const TOPIC_ID = "906daf0c-8eaa-43e3-8273-f297022c386a";

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email required." }, { status: 400 });
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.contacts.create({
    email,
    unsubscribed: false,
    topics: [{ id: TOPIC_ID, subscription: "opt_in" }],
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
