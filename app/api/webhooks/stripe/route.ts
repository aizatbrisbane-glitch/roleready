import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripeClient } from "@/lib/stripe";
import { getStripeWebhookSecret } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { EntitlementPlanType } from "@/types/database";

export const dynamic = "force-dynamic";

const PLAN_LIMITS: Record<string, { days: number; limit: number }> = {
  sprint_7_day:   { days: 7,  limit: 12  },
  focus_30_day:   { days: 30, limit: 50  },
  partner_90_day: { days: 90, limit: 150 },
};

export async function POST(request: Request) {
  const webhookSecret = getStripeWebhookSecret();
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured." }, { status: 500 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripeClient().webhooks.constructEvent(
      Buffer.from(rawBody),
      signature,
      webhookSecret
    );
  } catch (err) {
    console.error("[stripe-webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Webhook signature verification failed." }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const userId = session.metadata?.userId;
  const planType = session.metadata?.planType as EntitlementPlanType | undefined;
  const sessionId = session.id;

  if (!userId || !planType) {
    console.error("[stripe-webhook] Missing metadata", { userId, planType, sessionId });
    return NextResponse.json({ error: "Missing metadata." }, { status: 400 });
  }

  const planConfig = PLAN_LIMITS[planType];
  if (!planConfig) {
    console.error("[stripe-webhook] Unknown planType", planType);
    return NextResponse.json({ error: "Unknown plan type." }, { status: 400 });
  }

  const adminSupabase = createSupabaseAdminClient();
  if (!adminSupabase) {
    return NextResponse.json({ error: "Admin client unavailable." }, { status: 500 });
  }

  // Idempotency — prevent double-grant if Stripe retries
  const { data: existing } = await adminSupabase
    .from("entitlements")
    .select("id")
    .eq("stripe_payment_id", sessionId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ received: true });
  }

  // Revoke any existing active entitlement for this user
  await adminSupabase
    .from("entitlements")
    .update({ status: "revoked" })
    .eq("user_id", userId)
    .eq("status", "active");

  // Grant the new entitlement
  const now = new Date();
  const validUntil = new Date(now);
  validUntil.setDate(validUntil.getDate() + planConfig.days);

  const { error: insertError } = await adminSupabase.from("entitlements").insert({
    user_id: userId,
    plan_type: planType,
    application_limit: planConfig.limit,
    applications_used: 0,
    valid_from: now.toISOString(),
    valid_until: validUntil.toISOString(),
    status: "active",
    stripe_payment_id: sessionId,
  });

  if (insertError) {
    console.error("[stripe-webhook] Failed to insert entitlement:", insertError);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  console.log(`[stripe-webhook] Granted ${planType} to user ${userId} (session ${sessionId})`);
  return NextResponse.json({ received: true });
}
