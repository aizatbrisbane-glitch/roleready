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
    console.warn("[server-analytics] Meta CAPI: META_CONVERSIONS_API_TOKEN not set — skipping");
    return;
  }

  console.log(
    `[server-analytics] Meta CAPI: sending ${events.length} event(s) to pixel ${META_PIXEL_ID}` +
    ` | token prefix: ${META_CAPI_TOKEN.slice(0, 8)}...` +
    (META_TEST_EVENT_CODE ? ` | test_event_code: ${META_TEST_EVENT_CODE}` : " | NO test_event_code (live mode)")
  );

  const body: Record<string, unknown> = { data: events, access_token: META_CAPI_TOKEN };
  if (META_TEST_EVENT_CODE) body.test_event_code = META_TEST_EVENT_CODE;

  let res: Response;
  try {
    res = await fetch(`https://graph.facebook.com/v19.0/${META_PIXEL_ID}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error("[server-analytics] Meta CAPI: fetch() threw (network error):", err);
    return;
  }

  const responseText = await res.text();
  if (res.ok) {
    console.log(`[server-analytics] Meta CAPI: ${res.status} OK — response: ${responseText}`);
  } else {
    console.error(`[server-analytics] Meta CAPI: ${res.status} ERROR — response: ${responseText}`);
  }
}

// ---------------------------------------------------------------------------
// GA4 Measurement Protocol (server-side)
// ---------------------------------------------------------------------------

const GA4_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "G-R1ZFGNBD6D";
const GA4_API_SECRET = process.env.GA4_API_SECRET;

async function sendGA4Event(clientId: string, events: object[]) {
  if (!GA4_API_SECRET) {
    console.warn("[server-analytics] GA4 MP: GA4_API_SECRET not set — skipping");
    return;
  }

  console.log(
    `[server-analytics] GA4 MP: sending ${events.length} event(s) to ${GA4_MEASUREMENT_ID}` +
    ` | secret prefix: ${GA4_API_SECRET.slice(0, 4)}... | client_id: ${clientId}`
  );

  let res: Response;
  try {
    res = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${GA4_MEASUREMENT_ID}&api_secret=${GA4_API_SECRET}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId, events }),
      }
    );
  } catch (err) {
    console.error("[server-analytics] GA4 MP: fetch() threw (network error):", err);
    return;
  }

  const responseText = await res.text();
  if (res.ok) {
    // GA4 Measurement Protocol returns 204 No Content on success — empty body is expected
    console.log(`[server-analytics] GA4 MP: ${res.status} OK — response: "${responseText}"`);
  } else {
    console.error(`[server-analytics] GA4 MP: ${res.status} ERROR — response: ${responseText}`);
  }
}

// ---------------------------------------------------------------------------
// LinkedIn Conversions API (server-side)
// ---------------------------------------------------------------------------

const LINKEDIN_ACCESS_TOKEN = process.env.LINKEDIN_ACCESS_TOKEN;
const LINKEDIN_SIGNUP_CONVERSION_ID = process.env.LINKEDIN_SIGNUP_CONVERSION_ID;
const LINKEDIN_PURCHASE_CONVERSION_ID = process.env.LINKEDIN_PURCHASE_CONVERSION_ID;

async function sendLinkedInConversion(
  email: string,
  conversionId: string,
  conversionValue?: { valueCents: number; currency: string }
) {
  if (!LINKEDIN_ACCESS_TOKEN) {
    console.warn("[server-analytics] LinkedIn CAPI: LINKEDIN_ACCESS_TOKEN not set — skipping");
    return;
  }

  const valueLabel = conversionValue
    ? ` | value: ${(conversionValue.valueCents / 100).toFixed(2)} ${conversionValue.currency.toUpperCase()}`
    : "";
  console.log(`[server-analytics] LinkedIn CAPI: sending conversion ${conversionId}${valueLabel}`);

  const body: Record<string, unknown> = {
    conversion: `urn:lla:llaPartnerConversion:${conversionId}`,
    conversionHappenedAt: Date.now(),
    user: {
      userIds: [{ idType: "SHA256_EMAIL", idValue: sha256(email) }],
    },
  };

  if (conversionValue) {
    body.conversionValue = {
      currencyCode: conversionValue.currency.toUpperCase(),
      amount: (conversionValue.valueCents / 100).toFixed(2),
    };
  }

  let res: Response;
  try {
    res = await fetch("https://api.linkedin.com/rest/conversionEvents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LINKEDIN_ACCESS_TOKEN}`,
        "LinkedIn-Version": "202407",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error("[server-analytics] LinkedIn CAPI: fetch() threw (network error):", err);
    return;
  }

  const responseText = await res.text();
  if (res.ok) {
    console.log(`[server-analytics] LinkedIn CAPI: ${res.status} OK — response: "${responseText}"`);
  } else {
    console.error(`[server-analytics] LinkedIn CAPI: ${res.status} ERROR — response: ${responseText}`);
  }
}

// ---------------------------------------------------------------------------
// Helpers to surface Promise.allSettled rejections
// ---------------------------------------------------------------------------

function logSettledResults(label: string, results: PromiseSettledResult<unknown>[]) {
  results.forEach((result, i) => {
    if (result.status === "rejected") {
      console.error(`[server-analytics] ${label}: promise[${i}] rejected —`, result.reason);
    }
  });
}

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

export async function trackSignupServerSide(opts: {
  email: string;
  userId: string;
  method: string;
}) {
  console.log(`[server-analytics] trackSignupServerSide: method=${opts.method} userId=${opts.userId}`);
  const eventTime = Math.floor(Date.now() / 1000);

  const results = await Promise.allSettled([
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

  logSettledResults("trackSignupServerSide", results);
}

export async function trackPurchaseServerSide(opts: {
  email?: string;
  userId: string;
  transactionId: string;
  valueCents: number;
  currency: string;
  planType: string;
}) {
  console.log(`[server-analytics] trackPurchaseServerSide: txn=${opts.transactionId} userId=${opts.userId}`);
  const eventTime = Math.floor(Date.now() / 1000);
  const value = opts.valueCents / 100;
  const userData: Record<string, unknown> = {};
  if (opts.email) userData.em = [sha256(opts.email)];

  const results = await Promise.allSettled([
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

    opts.email && LINKEDIN_PURCHASE_CONVERSION_ID
      ? sendLinkedInConversion(opts.email, LINKEDIN_PURCHASE_CONVERSION_ID, {
          valueCents: opts.valueCents,
          currency: opts.currency,
        })
      : Promise.resolve(),
  ]);

  if (!opts.email) {
    console.warn("[server-analytics] trackPurchaseServerSide: no email — LinkedIn CAPI skipped");
  }
  if (!LINKEDIN_PURCHASE_CONVERSION_ID) {
    console.warn("[server-analytics] trackPurchaseServerSide: LINKEDIN_PURCHASE_CONVERSION_ID not set — LinkedIn CAPI skipped");
  }

  logSettledResults("trackPurchaseServerSide", results);
}
