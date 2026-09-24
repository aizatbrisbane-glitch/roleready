export const GA_MEASUREMENT_ID = "G-R1ZFGNBD6D";
export const GOOGLE_ADS_ID = "AW-18405510825";
export const PRODUCTION_HOSTS = ["koalapply.com", "www.koalapply.com"];

export function productionAnalytics(env: { NODE_ENV?: string; VERCEL_ENV?: string }, host?: string) {
  return env.NODE_ENV === "production" && env.VERCEL_ENV === "production" &&
    (!host || PRODUCTION_HOSTS.includes(host.split(":")[0].toLowerCase()));
}

export function internalUser(userId?: string | null, role?: string | null, excludedIds = "") {
  return role === "admin" || role === "founder" ||
    (!!userId && excludedIds.split(",").map((id) => id.trim()).includes(userId));
}

export type GAIdentity = { client_id?: string; session_id?: string; captured_at?: number };

export function cleanIdentity(value: unknown): GAIdentity {
  if (!value || typeof value !== "object") return {};
  const v = value as Record<string, unknown>;
  const client = String(v.client_id ?? "").replace(/^GA\d+\.\d+\./, "");
  const session = String(v.session_id ?? "");
  const captured = Number(v.captured_at);
  return {
    ...(/^\d{1,20}\.\d{1,20}$/.test(client) ? { client_id: client } : {}),
    ...(/^\d{1,16}$/.test(session) && Number(session) > 0 && Number.isSafeInteger(Number(session)) ? { session_id: session } : {}),
    ...(Number.isFinite(captured) && captured > 0 ? { captured_at: captured } : {}),
  };
}

export function signupMethod(provider: unknown): "email" | "google" {
  return provider === "google" ? "google" : "email";
}

export function paidCandidateSession(session: {
  livemode: boolean; mode: string | null; payment_status: string;
  metadata: Record<string, string> | null;
}) {
  return session.livemode && session.mode === "payment" && session.payment_status === "paid" &&
    ["sprint_7_day", "focus_30_day", "partner_90_day"].includes(session.metadata?.planType ?? "");
}

export function ecommerceParams(id: string, plan: string, cents: number, currency: string) {
  const value = cents / 100;
  return {
    transaction_id: id, value, currency: currency.toUpperCase(),
    items: [{ item_id: plan, item_name: plan, price: value, quantity: 1 }],
  };
}

export type AnalyticsEvent = {
  event_key: string; event_name: string; user_id: string | null;
  identity: GAIdentity; params: Record<string, unknown>; occurred_at: string;
};

export function measurementPayload(event: AnalyticsEvent) {
  const identity = cleanIdentity(event.identity);
  if (!identity.client_id) return null; // Never invent a browser identity.
  return {
    client_id: identity.client_id,
    ...(event.user_id ? { user_id: event.user_id } : {}),
    timestamp_micros: new Date(event.occurred_at).getTime() * 1000,
    ...(event.event_name === "purchase" ? { user_properties: { user_type: { value: "paying" } } } : {}),
    events: [{ name: event.event_name, params: {
      ...event.params,
      identity_status: identity.session_id ? "client_and_session" : "client_only",
      ...(identity.session_id ? { session_id: Number(identity.session_id) } : {}),
      // Backend processing is not browser engagement time.
      engagement_time_msec: 0,
    } }],
  };
}

// Local parsing only: checkout never waits for an analytics service.
export function identityFromCookie(cookie: string): GAIdentity {
  try {
    const raw = cookie.match(/(?:^|;\s*)koala_ga=([^;]+)/)?.[1];
    const identity = cleanIdentity(JSON.parse(decodeURIComponent(raw ?? "{}")));
    if (!identity.captured_at || Date.now() - identity.captured_at > 30 * 60_000 || identity.captured_at > Date.now() + 60_000) return {};
    return identity;
  } catch { return {}; }
}
