import { scheduleAnalytics } from "@/lib/analytics-background";
﻿import { NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe";
import { gaEnabled, recordGAEvent } from "@/lib/ga4";
import { ecommerceParams, identityFromCookie } from "@/lib/analytics-policy";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const PLAN_CONFIG: Record<string, { name: string; amountAud: number; desc: string }> = {
  sprint_7_day:   { name: "7-Day Sprint",   amountAud: 900,  desc: "12 applications, valid for 7 days" },
  focus_30_day:   { name: "30-Day Focus",   amountAud: 1900, desc: "50 applications, valid for 30 days" },
  partner_90_day: { name: "90-Day Partner", amountAud: 4900, desc: "150 applications, valid for 90 days" },
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const planKey = typeof body?.planType === "string" ? body.planType : null;
  const plan = planKey ? PLAN_CONFIG[planKey] : null;

  if (!plan) {
    return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  // For guest checkout, attribution comes from localStorage via the client (more reliable than server cookies)
  const attr = (typeof body?.attribution === "object" && body.attribution !== null) ? body.attribution as Record<string, string> : {};

  try {
    const identity = identityFromCookie(request.headers.get("cookie") ?? "");
    const stripe = getStripeClient();
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
        planType: planKey,
        analytics_environment: gaEnabled() ? "production" : "excluded",
        ...(identity.client_id ? { ga_client_id: identity.client_id } : {}),
        ...(identity.session_id ? { ga_session_id: identity.session_id } : {}),
        ...(identity.captured_at ? { ga_captured_at: String(identity.captured_at) } : {}),
        ...(attr.source       ? { attr_source:    attr.source }       : {}),
        ...(attr.medium       ? { attr_medium:    attr.medium }       : {}),
        ...(attr.campaign     ? { attr_campaign:  attr.campaign }     : {}),
        ...(attr.content      ? { attr_content:   attr.content }      : {}),
        ...(attr.term         ? { attr_term:      attr.term }         : {}),
        ...(attr.referrer     ? { attr_referrer:  attr.referrer }     : {}),
        ...(attr.fbp          ? { attr_fbp:       attr.fbp }          : {}),
        ...(attr.fbc          ? { attr_fbc:       attr.fbc }          : {}),
        ...(attr.li_fat_id    ? { attr_li_fat_id: attr.li_fat_id }    : {}),
      },
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&guest=true&plan=${planKey}&value=${plan.amountAud}`,
      cancel_url: `${appUrl}/pricing`,
    });

    if (session.url && session.livemode) scheduleAnalytics(async () => {
      const supabase = await createSupabaseServerClient();
      const user = supabase ? (await supabase.auth.getUser()).data.user : null;
      await recordGAEvent({
        name: "begin_checkout", key: `checkout:${session.id}`, userId: user?.id, identity,
        params: ecommerceParams(session.id, planKey!, plan.amountAud, "AUD"),
      });
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[checkout/guest] Stripe session creation failed:", err);
    return NextResponse.json(
      { error: "Unable to create checkout session. Please try again." },
      { status: 500 }
    );
  }
}
