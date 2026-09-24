import { scheduleAnalytics } from "@/lib/analytics-background";
﻿import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe";
import type { EntitlementPlanType } from "@/types/database";
import { gaEnabled, recordGAEvent } from "@/lib/ga4";
import { ecommerceParams, identityFromCookie } from "@/lib/analytics-policy";

type PlanConfig = {
  name: string;
  amountAud: number;
  desc: string;
  planType: EntitlementPlanType;
};

const PLAN_CONFIG: Record<string, PlanConfig> = {
  sprint_7_day: {
    name: "7-Day Sprint",
    amountAud: 900,
    desc: "12 applications, valid for 7 days",
    planType: "sprint_7_day",
  },
  focus_30_day: {
    name: "30-Day Focus",
    amountAud: 1900,
    desc: "50 applications, valid for 30 days",
    planType: "focus_30_day",
  },
  partner_90_day: {
    name: "90-Day Partner",
    amountAud: 4900,
    desc: "150 applications, valid for 90 days",
    planType: "partner_90_day",
  },
};

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in before purchasing." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const planKey = typeof body?.planType === "string" ? body.planType : null;
  const plan = planKey ? PLAN_CONFIG[planKey] : null;

  if (!plan) {
    return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

  // Read first-touch attribution and existing Stripe customer ID from the user's profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id,attr_source,attr_medium,attr_campaign,attr_content,attr_term,attr_referrer,attr_ga_client_id,attr_fbp,attr_fbc,attr_li_fat_id")
    .eq("id", user.id)
    .maybeSingle();

  try {
    const identity = identityFromCookie(request.headers.get("cookie") ?? "");
    const stripe = getStripeClient();

    // Create-or-fetch Stripe customer so we can lock the email and tie purchases to one record
    let stripeCustomerId = profile?.stripe_customer_id ?? null;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { userId: user.id },
      });
      stripeCustomerId = customer.id;
      // Best-effort — non-fatal if this fails; webhook will also stamp it
      const { error: saveError } = await supabase
        .from("profiles")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("id", user.id);
      if (saveError) {
        console.warn("[checkout] Best-effort stripe_customer_id save failed:", saveError.message);
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      currency: "aud",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "aud",
            unit_amount: plan.amountAud,
            product_data: {
              name: `Koalapply — ${plan.name}`,
              description: plan.desc,
            },
          },
        },
      ],
      metadata: {
        userId:   user.id,
        planType: plan.planType,
        analytics_environment: gaEnabled() ? "production" : "excluded",
        ...(identity.client_id ? { ga_client_id: identity.client_id } : {}),
        ...(identity.session_id ? { ga_session_id: identity.session_id } : {}),
        ...(identity.captured_at ? { ga_captured_at: String(identity.captured_at) } : {}),
        ...(profile?.attr_source       ? { attr_source:     profile.attr_source }       : {}),
        ...(profile?.attr_medium       ? { attr_medium:     profile.attr_medium }       : {}),
        ...(profile?.attr_campaign     ? { attr_campaign:   profile.attr_campaign }     : {}),
        ...(profile?.attr_content      ? { attr_content:    profile.attr_content }      : {}),
        ...(profile?.attr_term         ? { attr_term:       profile.attr_term }         : {}),
        ...(profile?.attr_referrer     ? { attr_referrer:   profile.attr_referrer }     : {}),
        ...(profile?.attr_fbp          ? { attr_fbp:        profile.attr_fbp }          : {}),
        ...(profile?.attr_fbc          ? { attr_fbc:        profile.attr_fbc }          : {}),
        ...(profile?.attr_li_fat_id    ? { attr_li_fat_id:  profile.attr_li_fat_id }    : {}),
      },
      customer: stripeCustomerId,
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&plan=${plan.planType}&value=${plan.amountAud}`,
      cancel_url: `${appUrl}/pricing`,
    });

    if (session.url && session.livemode) scheduleAnalytics(() => recordGAEvent({
      name: "begin_checkout", key: `checkout:${session.id}`, userId: user.id, identity,
      params: ecommerceParams(session.id, plan.planType, plan.amountAud, "AUD"),
    }));
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[checkout] Stripe session creation failed:", err);
    return NextResponse.json(
      { error: "Unable to create checkout session. Please try again." },
      { status: 500 }
    );
  }
}
