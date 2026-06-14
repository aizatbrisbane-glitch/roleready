import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const MAX_TEXT_LENGTH = 1200;

type EnterpriseRequestPayload = {
  companyName?: unknown;
  contactName?: unknown;
  contactEmail?: unknown;
  contactRole?: unknown;
  requestedSeats?: unknown;
  expectedStartTimeframe?: unknown;
  notes?: unknown;
  website?: unknown;
};

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function invalid(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

async function sendSalesEmail({
  companyName,
  contactName,
  contactEmail,
  contactRole,
  requestedSeats,
  expectedStartTimeframe,
  notes,
}: {
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactRole: string;
  requestedSeats: number;
  expectedStartTimeframe: string;
  notes: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const to = process.env.ENTERPRISE_SALES_EMAIL;

  if (!apiKey || !from || !to) {
    return { skipped: true };
  }

  const lines = [
    `Company: ${companyName}`,
    `Contact: ${contactName}`,
    `Email: ${contactEmail}`,
    `Role: ${contactRole || "-"}`,
    `Requested seats: ${requestedSeats}`,
    `Expected start: ${expectedStartTimeframe || "-"}`,
    "",
    "Notes:",
    notes || "-",
  ];

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject: `New Koalapply enterprise request: ${companyName}`,
        text: lines.join("\n"),
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error("Unable to send enterprise request email", body);
    }
  } catch (error) {
    console.error("Unable to reach Resend for enterprise request email", error);
  }

  return { skipped: false };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as EnterpriseRequestPayload | null;

  if (!body) {
    return invalid("Please complete the enterprise request form.");
  }

  if (cleanText(body.website)) {
    return NextResponse.json({ ok: true });
  }

  const companyName = cleanText(body.companyName);
  const contactName = cleanText(body.contactName);
  const contactEmail = cleanText(body.contactEmail).toLowerCase();
  const contactRole = cleanText(body.contactRole);
  const expectedStartTimeframe = cleanText(body.expectedStartTimeframe);
  const notes = cleanText(body.notes);
  const requestedSeats = Number(body.requestedSeats);

  if (!companyName || !contactName || !contactEmail) {
    return invalid("Company, contact name, and email are required.");
  }

  if (!isEmail(contactEmail)) {
    return invalid("Enter a valid contact email.");
  }

  if (!Number.isInteger(requestedSeats) || requestedSeats < 1 || requestedSeats > 5000) {
    return invalid("Requested seats must be between 1 and 5000.");
  }

  if ([companyName, contactName, contactEmail, contactRole, expectedStartTimeframe, notes].some((value) => value.length > MAX_TEXT_LENGTH)) {
    return invalid("Please shorten the request details.");
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const { data: requestId, error } = await supabase.rpc("submit_enterprise_request", {
    p_company_name: companyName,
    p_contact_name: contactName,
    p_contact_email: contactEmail,
    p_contact_role: contactRole,
    p_requested_seats: requestedSeats,
    p_expected_start_timeframe: expectedStartTimeframe,
    p_notes: notes,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await sendSalesEmail({
    companyName,
    contactName,
    contactEmail,
    contactRole,
    requestedSeats,
    expectedStartTimeframe,
    notes,
  });

  return NextResponse.json({ ok: true, requestId });
}
