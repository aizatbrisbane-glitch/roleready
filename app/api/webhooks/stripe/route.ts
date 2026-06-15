import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { Resend } from "resend";
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
  const planType = session.metadata?.planType as EntitlementPlanType | undefined;
  const sessionId = session.id;

  if (!planType) {
    console.error("[stripe-webhook] Missing planType metadata", { sessionId });
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

  // Resolve user ID — either from metadata (logged-in checkout) or email (guest checkout)
  let resolvedUserId = session.metadata?.userId ?? null;

  if (!resolvedUserId) {
    const customerEmail = session.customer_details?.email;
    if (!customerEmail) {
      console.error("[stripe-webhook] No userId or customer email", { sessionId });
      return NextResponse.json({ error: "Cannot identify purchaser." }, { status: 400 });
    }

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

    // Try to create a new user (email pre-confirmed — no Supabase email sent)
    const { data: createData, error: createError } = await adminSupabase.auth.admin.createUser({
      email: customerEmail,
      email_confirm: true,
    });

    if (createData?.user?.id) {
      // New user — generate a password-setup link and send a custom email via Resend
      resolvedUserId = createData.user.id;
      const { data: linkData } = await adminSupabase.auth.admin.generateLink({
        type: "recovery",
        email: customerEmail,
        options: { redirectTo: `${appUrl}/auth/reset-password` },
      });
      const setupLink = linkData?.properties?.action_link;
      if (setupLink) {
        await sendPasswordSetupEmail(customerEmail, setupLink);
      }
    } else {
      // User already exists — find their ID via recovery link (no email sent)
      const { data: linkData, error: linkError } = await adminSupabase.auth.admin.generateLink({
        type: "recovery",
        email: customerEmail,
        options: { redirectTo: `${appUrl}/auth/reset-password` },
      });
      if (linkError || !linkData?.user?.id) {
        console.error("[stripe-webhook] Could not resolve user", { createError, linkError });
        return NextResponse.json({ error: "Failed to resolve user account." }, { status: 500 });
      }
      resolvedUserId = linkData.user.id;
    }
  }

  // Revoke any existing active entitlement for this user
  await adminSupabase
    .from("entitlements")
    .update({ status: "revoked" })
    .eq("user_id", resolvedUserId)
    .eq("status", "active");

  // Grant the new entitlement
  const now = new Date();
  const validUntil = new Date(now);
  validUntil.setDate(validUntil.getDate() + planConfig.days);

  const { error: insertError } = await adminSupabase.from("entitlements").insert({
    user_id: resolvedUserId,
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

  console.log(`[stripe-webhook] Granted ${planType} to user ${resolvedUserId} (session ${sessionId})`);
  return NextResponse.json({ received: true });
}

async function sendPasswordSetupEmail(to: string, setupLink: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[stripe-webhook] RESEND_API_KEY not set — skipping password setup email");
    return;
  }
  const resend = new Resend(apiKey);
  await resend.emails.send({
    from: "Koalapply <noreply@koalapply.com>",
    to,
    subject: "Your Koalapply account is ready — set your password",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1e293b">
        <img src="https://koalapply.com.au/brand/koalapply-logo.png" alt="Koalapply" style="height:40px;margin-bottom:32px" />
        <h1 style="font-size:22px;font-weight:800;margin:0 0 12px">Your payment was successful.</h1>
        <p style="font-size:15px;line-height:1.6;margin:0 0 24px;color:#475569">
          Your access pass is active and ready to use. Click below to set your password and go straight to your dashboard.
        </p>
        <a href="${setupLink}" style="display:inline-block;background:#2200ff;color:#fff;font-weight:700;font-size:15px;padding:14px 28px;border-radius:9999px;text-decoration:none">
          Set my password
        </a>
        <p style="font-size:13px;color:#94a3b8;margin:32px 0 0">
          If you didn't make this purchase, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}
