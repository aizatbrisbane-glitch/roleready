import { NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe";

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
        ...(attr.ga_client_id ? { ga_client_id:  attr.ga_client_id } : {}),
        ...(attr.source       ? { attr_source:    attr.source }       : {}),
        ...(attr.medium       ? { attr_medium:    attr.medium }       : {}),
        ...(attr.campaign     ? { attr_campaign:  attr.campaign }     : {}),
        ...(attr.content      ? { attr_content:   attr.content }      : {}),
        ...(attr.term         ? { attr_term:      attr.term }         : {}),
        ...(attr.referrer     ? { attr_referrer:  attr.referrer }     : {}),
        ...(attr.fbp          ? { attr_fbp:       attr.fbp }          : {}),
        ...(attr.fbc          ? { attr_fbc:       attr.fbc }          : {}),
      },
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&guest=true&plan=${planKey}&value=${plan.amountAud}`,
      cancel_url: `${appUrl}/pricing`,
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
