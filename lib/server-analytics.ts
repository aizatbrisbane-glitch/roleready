import { createHash } from "crypto";

function sha256(value: string) {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

// ---------------------------------------------------------------------------
// Meta Conversions API (server-side)
// ---------------------------------------------------------------------------

const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "1740921460363763";
const META_CAPI_TOKEN = process.env.META_CONVERSIONS_API_TOKEN;
const META_TEST_EVENT_CODE = process.env.META_TEST_EVENT_CODE;

async function sendMetaEvent(events: object[]) {
  if (!META_CAPI_TOKEN) {
    console.warn("[server-analytics] META_CONVERSIONS_API_TOKEN not set — skipping Meta CAPI");
    return;
  }
  const body: Record<string, unknown> = { data: events, access_token: META_CAPI_TOKEN };
  if (META_TEST_EVENT_CODE) body.test_event_code = META_TEST_EVENT_CODE;
  const res = await fetch(`https://graph.facebook.com/v19.0/${META_PIXEL_ID}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.error("[server-analytics] Meta CAPI error:", await res.text());
  }
}

// ---------------------------------------------------------------------------
// GA4 Measurement Protocol (server-side)
// ---------------------------------------------------------------------------

const GA4_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "G-R1ZFGNBD6D";
const GA4_API_SECRET = process.env.GA4_API_SECRET;

async function sendGA4Event(clientId: string, events: object[]) {
  if (!GA4_API_SECRET) {
    console.warn("[server-analytics] GA4_API_SECRET not set — skipping GA4 Measurement Protocol");
    return;
  }
  const res = await fetch(
    `https://www.google-analytics.com/mp/collect?measurement_id=${GA4_MEASUREMENT_ID}&api_secret=${GA4_API_SECRET}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, events }),
    }
  );
  if (!res.ok) {
    console.error("[server-analytics] GA4 Measurement Protocol error:", await res.text());
  }
}

// ---------------------------------------------------------------------------
// LinkedIn Conversions API (server-side)
// Docs: https://learn.microsoft.com/en-us/linkedin/marketing/conversions/conversion-tracking
// Requires: LINKEDIN_ACCESS_TOKEN (OAuth token with rw_conversions scope)
//           LINKEDIN_SIGNUP_CONVERSION_ID (numeric ID from LinkedIn Campaign Manager)
// ---------------------------------------------------------------------------

const LINKEDIN_ACCESS_TOKEN = process.env.LINKEDIN_ACCESS_TOKEN;
const LINKEDIN_SIGNUP_CONVERSION_ID = process.env.LINKEDIN_SIGNUP_CONVERSION_ID;

async function sendLinkedInConversion(email: string, conversionId: string) {
  if (!LINKEDIN_ACCESS_TOKEN) {
    console.warn("[server-analytics] LINKEDIN_ACCESS_TOKEN not set — skipping LinkedIn CAPI");
    return;
  }
  const res = await fetch("https://api.linkedin.com/rest/conversionEvents", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LINKEDIN_ACCESS_TOKEN}`,
      "LinkedIn-Version": "202407",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      conversion: `urn:lla:llaPartnerConversion:${conversionId}`,
      conversionHappenedAt: Date.now(),
      user: {
        userIds: [{ idType: "SHA256_EMAIL", idValue: sha256(email) }],
      },
    }),
  });
  if (!res.ok) {
    console.error("[server-analytics] LinkedIn CAPI error:", await res.text());
  }
}

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

/**
 * Call from auth/callback after a confirmed new Google OAuth signup.
 * Fires Meta CAPI CompleteRegistration, GA4 sign_up, LinkedIn CAPI Lead conversion.
 */
export async function trackSignupServerSide(opts: {
  email: string;
  userId: string;
  method: string;
}) {
  const eventTime = Math.floor(Date.now() / 1000);

  await Promise.allSettled([
    sendMetaEvent([
      {
        event_name: "CompleteRegistration",
        event_time: eventTime,
        event_id: `signup_${opts.userId}`,
        action_source: "website",
        user_data: { em: [sha256(opts.email)] },
        custom_data: { method: opts.method },
      },
    ]),

    sendGA4Event(`server_${opts.userId}`, [
      {
        name: "sign_up",
        params: { method: opts.method },
      },
    ]),

    LINKEDIN_SIGNUP_CONVERSION_ID
      ? sendLinkedInConversion(opts.email, LINKEDIN_SIGNUP_CONVERSION_ID)
      : Promise.resolve(),
  ]);
}

/**
 * Call from the Stripe webhook after checkout.session.completed is processed.
 * Fires Meta CAPI Purchase and GA4 Measurement Protocol purchase.
 * event_id uses the Stripe session ID so Meta can deduplicate against the client-side pixel.
 */
export async function trackPurchaseServerSide(opts: {
  email?: string;
  userId: string;
  transactionId: string;
  valueCents: number;
  currency: string;
  planType: string;
}) {
  const eventTime = Math.floor(Date.now() / 1000);
  const value = opts.valueCents / 100;
  const userData: Record<string, unknown> = {};
  if (opts.email) userData.em = [sha256(opts.email)];

  await Promise.allSettled([
    sendMetaEvent([
      {
        event_name: "Purchase",
        event_time: eventTime,
        event_id: `purchase_${opts.transactionId}`,
        action_source: "website",
        user_data: userData,
        custom_data: {
          currency: opts.currency.toUpperCase(),
          value,
          order_id: opts.transactionId,
          content_name: opts.planType,
          content_type: "product",
        },
      },
    ]),

    sendGA4Event(`server_${opts.userId}`, [
      {
        name: "purchase",
        params: {
          transaction_id: opts.transactionId,
          value,
          currency: opts.currency.toUpperCase(),
          items: [{ item_name: opts.planType }],
        },
      },
    ]),
  ]);
}
