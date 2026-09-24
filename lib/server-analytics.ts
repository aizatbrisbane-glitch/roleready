import { gaEnabled, canTrackUser } from "@/lib/ga4";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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
  try {
    if (!gaEnabled() || !await canTrackUser(opts.userId)) return;
    const admin = createSupabaseAdminClient();
    if (!admin) return;
    const { data, error } = await admin.rpc("claim_signup_marketing", { p_user: opts.userId });
    if (error || data !== true) return;
  } catch { console.error("[analytics] Marketing signup claim unavailable"); return; }
  const attr = opts.attribution ?? {};
  console.log(`[server-analytics] trackSignupServerSide: method=${opts.method} userId=${opts.userId}`);

  // Warn explicitly about each missing attribution field so silent gaps are caught in logs
  if (!attr.utm_source) {
    console.warn(`[server-analytics] trackSignupServerSide: utm_source missing — sign_up event will have no traffic source (method=${opts.method})`);
  }
  if (!attr.referrer) {
    console.warn(`[server-analytics] trackSignupServerSide: referrer missing (method=${opts.method})`);
  }
  if (!attr.fbp) {
    console.warn(`[server-analytics] trackSignupServerSide: fbp missing — Meta CAPI deduplication and attribution will be degraded (method=${opts.method})`);
  }

  const eventTime = Math.floor(Date.now() / 1000);

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
