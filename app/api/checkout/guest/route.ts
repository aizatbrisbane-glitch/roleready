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
              name: `Koalapply â€” ${plan.name}`,
              description: plan.desc,
            },
          },
        },
      ],
      metadata: { planType: planKey },
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&guest=true`,
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
