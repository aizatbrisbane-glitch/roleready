import { NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe";
import { paidCandidateSession } from "@/lib/analytics-policy";
import { currentRequestIsProduction, canTrackUser } from "@/lib/ga4";

// Browser Meta verification only. No GA event or business mutation occurs here.
export async function GET(request: Request) {
  try {
    if (!await currentRequestIsProduction()) return NextResponse.json(null);
    const sessionId = new URL(request.url).searchParams.get("session_id");
    if (!sessionId || !/^cs_live_[a-zA-Z0-9]+$/.test(sessionId)) return NextResponse.json(null);
    const session = await getStripeClient().checkout.sessions.retrieve(sessionId);
    if (!paidCandidateSession(session) || !await canTrackUser(session.metadata?.userId)) return NextResponse.json(null);
    return NextResponse.json({ plan: session.metadata!.planType, value: (session.amount_total ?? 0) / 100, currency: (session.currency ?? "aud").toUpperCase(), transactionId: session.id }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json(null, { status: 503 }); }
}
