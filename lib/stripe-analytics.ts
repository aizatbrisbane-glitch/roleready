import type Stripe from "stripe";
import { cleanIdentity, ecommerceParams, paidCandidateSession } from "./analytics-policy";
import { gaEnabled, recordGAEvent } from "./ga4";

export function checkoutIdentity(session: Stripe.Checkout.Session) {
  return cleanIdentity({
    client_id: session.metadata?.ga_client_id,
    session_id: session.metadata?.ga_session_id,
    captured_at: session.metadata?.ga_captured_at,
  });
}

export async function recordVerifiedPurchase(session: Stripe.Checkout.Session, userId: string, occurredAt: number) {
  if (!gaEnabled() || !paidCandidateSession(session) || session.metadata?.analytics_environment !== "production") return;
  const recorded = await recordGAEvent({
    name: "purchase", key: `purchase:${session.id}`, userId,
    identity: checkoutIdentity(session), occurredAt: new Date(occurredAt * 1000).toISOString(),
    params: ecommerceParams(session.id, session.metadata!.planType, session.amount_total ?? 0, session.currency ?? "aud"),
  });
  if (!recorded) console.error("[ga4] Purchase analytics pending reconciliation");
}
