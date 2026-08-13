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

// _ga cookie format: GA1.X.XXXXXXXXXX.XXXXXXXXXX → client_id is the last two segments
function parseGa4ClientId(gaCookie: string): string {
  const parts = gaCookie.split(".");
  return parts.length >= 4 ? parts.slice(2).join(".") : gaCookie;
}

async function sendGA4Event(
  clientId: string,
  events: object[],
  userProperties?: Record<string, { value: string }>
) {
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
        body: JSON.stringify({
          client_id: clientId,
          ...(userProperties ? { user_properties: userProperties } : {}),
          events,
        }),
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
  conversionValue?: { valueCents: number; currency: string },
  liFatId?: string
) {
  if (!LINKEDIN_ACCESS_TOKEN) {
    console.warn("[server-analytics] LinkedIn CAPI: LINKEDIN_ACCESS_TOKEN not set — skipping");
    return;
  }

  const valueLabel = conversionValue
    ? ` | value: ${(conversionValue.valueCents / 100).toFixed(2)} ${conversionValue.currency.toUpperCase()}`
    : "";
  console.log(`[server-analytics] LinkedIn CAPI: sending conversion ${conversionId}${valueLabel}`);

  const userIds: Array<{ idType: string; idValue: string }> = [
    { idType: "SHA256_EMAIL", idValue: sha256(email) },
  ];
  if (liFatId) {
    userIds.push({ idType: "LINKEDIN_FIRST_PARTY_ADS_TRACKING_UUID", idValue: liFatId });
  }
  const body: Record<string, unknown> = {
    conversion: `urn:lla:llaPartnerConversion:${conversionId}`,
    conversionHappenedAt: Date.now(),
    user: { userIds },
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
        "LinkedIn-Version": "202607",
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

export type AttributionData = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer?: string;
  /** Real GA4 client_id parsed from the _ga cookie — ties the MP event to the browser session */
  ga_client_id?: string;
  /** Meta _fbp cookie — needed for proper deduplication and attribution */
  fbp?: string;
  /** Meta _fbc cookie or constructed from fbclid param */
  fbc?: string;
  /** LinkedIn click ID — li_fat_id URL param appended by LinkedIn ads */
  li_fat_id?: string;
};

export async function trackSignupServerSide(opts: {
  email: string;
  userId: string;
  method: string;
  attribution?: AttributionData;
}) {
  const attr = opts.attribution ?? {};
  console.log(`[server-analytics] trackSignupServerSide: method=${opts.method} userId=${opts.userId}`);

  // Warn explicitly about each missing attribution field so silent gaps are caught in logs
  if (!attr.utm_source) {
    console.warn(`[server-analytics] trackSignupServerSide: utm_source missing — sign_up event will have no traffic source (method=${opts.method})`);
  }
  if (!attr.referrer) {
    console.warn(`[server-analytics] trackSignupServerSide: referrer missing (method=${opts.method})`);
  }
  if (!attr.ga_client_id) {
    console.warn(`[server-analytics] trackSignupServerSide: ga_client_id missing — GA4 MP event will use a synthetic client_id and won't link to the browser session (method=${opts.method})`);
  }
  if (!attr.fbp) {
    console.warn(`[server-analytics] trackSignupServerSide: fbp missing — Meta CAPI deduplication and attribution will be degraded (method=${opts.method})`);
  }

  const eventTime = Math.floor(Date.now() / 1000);

  // Use the real browser client_id when available so the MP event links to the correct GA4 session
  const gaClientId = attr.ga_client_id ?? `server_${opts.userId}`;

  // Meta user data: include fbp/fbc for browser-side matching and attribution
  const metaUserData: Record<string, unknown> = { em: [sha256(opts.email)] };
  if (attr.fbp) metaUserData.fbp = attr.fbp;
  if (attr.fbc) metaUserData.fbc = attr.fbc;

  // Meta custom data: include UTM params so they appear in custom breakdowns
  const metaCustomData: Record<string, string> = { method: opts.method };
  if (attr.utm_source) metaCustomData.utm_source = attr.utm_source;
  if (attr.utm_medium) metaCustomData.utm_medium = attr.utm_medium;
  if (attr.utm_campaign) metaCustomData.utm_campaign = attr.utm_campaign;
  if (attr.referrer) metaCustomData.referrer_url = attr.referrer;

  // GA4 Measurement Protocol campaign params
  const ga4Params: Record<string, string> = { method: opts.method };
  if (attr.utm_source) ga4Params.campaign_source = attr.utm_source;
  if (attr.utm_medium) ga4Params.campaign_medium = attr.utm_medium;
  if (attr.utm_campaign) ga4Params.campaign_name = attr.utm_campaign;
  if (attr.utm_content) ga4Params.campaign_content = attr.utm_content;
  if (attr.utm_term) ga4Params.campaign_term = attr.utm_term;
  if (attr.referrer) ga4Params.page_referrer = attr.referrer;

  const results = await Promise.allSettled([
    sendMetaEvent([
      {
        event_name: "CompleteRegistration",
        event_time: eventTime,
        event_id: `signup_${opts.userId}`,
        action_source: "website",
        user_data: metaUserData,
        custom_data: metaCustomData,
      },
    ]),

    sendGA4Event(gaClientId, [
      {
        name: "sign_up",
        params: ga4Params,
      },
    ]),

    LINKEDIN_SIGNUP_CONVERSION_ID
      ? sendLinkedInConversion(opts.email, LINKEDIN_SIGNUP_CONVERSION_ID, undefined, attr.li_fat_id)
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
  gaClientId?: string;
  attrSource?: string;
  attrMedium?: string;
  attrCampaign?: string;
  attrContent?: string;
  attrTerm?: string;
  attrReferrer?: string;
  attrFbp?: string;
  attrFbc?: string;
  attrLiFatId?: string;
}) {
  console.log(`[server-analytics] trackPurchaseServerSide: txn=${opts.transactionId} userId=${opts.userId} source=${opts.attrSource ?? "(none)"} medium=${opts.attrMedium ?? "(none)"} campaign=${opts.attrCampaign ?? "(none)"}`);
  const eventTime = Math.floor(Date.now() / 1000);
  const value = opts.valueCents / 100;
  const userData: Record<string, unknown> = {};
  if (opts.email) userData.em = [sha256(opts.email)];
  if (opts.attrFbp) userData.fbp = opts.attrFbp;
  if (opts.attrFbc) userData.fbc = opts.attrFbc;

  // Use the real browser client_id so the purchase event links to the session that had the UTM params.
  // Fall back to a synthetic id only when the _ga cookie wasn't available at checkout time.
  const ga4ClientId = opts.gaClientId
    ? parseGa4ClientId(opts.gaClientId)
    : `server_${opts.userId}`;

  if (!opts.gaClientId) {
    console.warn("[server-analytics] trackPurchaseServerSide: ga_client_id missing — purchase event will use synthetic client_id and lose UTM attribution");
  }

  const ga4PurchaseParams: Record<string, unknown> = {
    transaction_id: opts.transactionId,
    value,
    currency: opts.currency.toUpperCase(),
    items: [{ item_name: opts.planType }],
  };
  if (opts.attrSource)   ga4PurchaseParams.campaign_source   = opts.attrSource;
  if (opts.attrMedium)   ga4PurchaseParams.campaign_medium   = opts.attrMedium;
  if (opts.attrCampaign) ga4PurchaseParams.campaign_name     = opts.attrCampaign;
  if (opts.attrContent)  ga4PurchaseParams.campaign_content  = opts.attrContent;
  if (opts.attrTerm)     ga4PurchaseParams.campaign_term     = opts.attrTerm;
  if (opts.attrReferrer) ga4PurchaseParams.page_referrer     = opts.attrReferrer;

  const metaCustomData: Record<string, unknown> = {
    currency: opts.currency.toUpperCase(),
    value,
    order_id: opts.transactionId,
    content_name: opts.planType,
    content_type: "product",
  };
  if (opts.attrSource)   metaCustomData.utm_source   = opts.attrSource;
  if (opts.attrMedium)   metaCustomData.utm_medium   = opts.attrMedium;
  if (opts.attrCampaign) metaCustomData.utm_campaign = opts.attrCampaign;

  const results = await Promise.allSettled([
    sendMetaEvent([
      {
        event_name: "Purchase",
        event_time: eventTime,
        event_id: `purchase_${opts.transactionId}`,
        action_source: "website",
        user_data: userData,
        custom_data: metaCustomData,
      },
    ]),

    sendGA4Event(
      ga4ClientId,
      [
        {
          name: "purchase",
          params: ga4PurchaseParams,
        },
      ],
      {
        user_type: { value: "paying" },
        plan: { value: opts.planType },
      }
    ),

    opts.email && LINKEDIN_PURCHASE_CONVERSION_ID
      ? sendLinkedInConversion(opts.email, LINKEDIN_PURCHASE_CONVERSION_ID, {
          valueCents: opts.valueCents,
          currency: opts.currency,
        }, opts.attrLiFatId)
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
