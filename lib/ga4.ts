import { cookies, headers } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { cleanIdentity, GA_MEASUREMENT_ID, internalUser, measurementPayload, productionAnalytics, type AnalyticsEvent, type GAIdentity } from "./analytics-policy";

export function gaEnabled(host?: string) {
  return productionAnalytics(process.env, host);
}

export async function requestIdentity(): Promise<GAIdentity> {
  try {
    const store = await cookies();
    const identity = cleanIdentity(JSON.parse(decodeURIComponent(store.get("koala_ga")?.value ?? "{}")));
    if (!identity.captured_at || Date.now() - identity.captured_at > 30 * 60_000 || identity.captured_at > Date.now() + 60_000) return {};
    return identity;
  } catch { return {}; }
}

export async function canTrackUser(userId?: string | null) {
  if (!gaEnabled()) return false;
  if (!userId) return true;
  const admin = createSupabaseAdminClient();
  if (!admin) throw new Error("Analytics admin client unavailable");
  const { data, error } = await admin.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (error || !data) throw new Error("Analytics user classification unavailable");
  return !internalUser(userId, data.role, process.env.GA4_INTERNAL_USER_IDS);
}

export async function recordGAEvent(event: {
  name: "resume_uploaded" | "job_added" | "analysis_completed" | "document_generated" | "begin_checkout" | "purchase";
  key: string; userId?: string | null; params?: Record<string, unknown>; identity?: GAIdentity;
  occurredAt?: string;
}) {
  try {
    if (!gaEnabled() || !await canTrackUser(event.userId)) return true;
    const admin = createSupabaseAdminClient();
    if (!admin) return false;
    const { error } = await admin.rpc("enqueue_ga4_event", {
      p_key: event.key, p_name: event.name, p_user: event.userId ?? null,
      p_params: event.params ?? {}, p_identity: cleanIdentity(event.identity ?? await requestIdentity()),
      p_occurred_at: event.occurredAt ?? new Date().toISOString(),
    });
    if (error) throw error;
    await dispatchGAEvents(event.key);
    return true;
  } catch { console.error("[ga4] Unable to record event", event.name); return false; }
}

// Discovery reads committed auth.users created after rollout; never inferred from login time.
export async function observeSignup(userId: string, identity?: GAIdentity, claimMarketing = false) {
  if (!await canTrackUser(userId)) return false;
  const admin = createSupabaseAdminClient();
  if (!admin) return false;
  const { data, error } = await admin.rpc("observe_ga4_signup", {
    p_user: userId, p_identity: cleanIdentity(identity ?? await requestIdentity()), p_claim_marketing: claimMarketing,
  });
  if (error) { console.error("[ga4] Signup observation failed"); return false; }
  await dispatchGAEvents(`signup:${userId}`);
  return data === true;
}

export async function dispatchGAEvents(key?: string) {
  if (!gaEnabled()) return;
  if (!process.env.GA4_API_SECRET) { console.error("[ga4] GA4_API_SECRET is missing; events remain queued"); return; }
  const admin = createSupabaseAdminClient();
  if (!admin) return;
  await admin.from("ga4_outbox").update({ status: "expired" }).eq("status", "pending")
    .lt("occurred_at", new Date(Date.now() - 72 * 3600_000).toISOString());
  let query = admin.from("ga4_outbox").select("*").eq("status", "pending")
    .not("identity->>client_id", "is", null).order("occurred_at").limit(20);
  if (key) query = query.eq("event_key", key);
  const { data, error } = await query;
  if (error) { console.error("[ga4] Outbox unavailable"); return; }
  for (const event of (data ?? []) as AnalyticsEvent[]) {
    let eligible: boolean;
    try { eligible = await canTrackUser(event.user_id); } catch { continue; }
    if (!eligible) {
      await admin.from("ga4_outbox").update({ status: "excluded" }).eq("event_key", event.event_key).eq("status", "pending");
      continue;
    }
    if (Date.now() - new Date(event.occurred_at).getTime() > 72 * 3600_000) {
      await admin.from("ga4_outbox").update({ status: "expired" }).eq("event_key", event.event_key).eq("status", "pending");
      continue;
    }
    const payload = measurementPayload(event);
    if (!payload) continue; // Remains visible as pending; no synthetic client IDs.
    // Atomic claim prevents parallel callbacks/webhook retries from double-sending.
    const { data: claimed, error: claimError } = await admin.from("ga4_outbox")
      .update({ status: "sending", attempted_at: new Date().toISOString() })
      .eq("event_key", event.event_key).eq("status", "pending").select("event_key");
    if (claimError || !claimed?.length) continue;
    let status = "uncertain";
    try {
      const response = await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${GA_MEASUREMENT_ID}&api_secret=${encodeURIComponent(process.env.GA4_API_SECRET)}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000),
      });
      status = response.ok ? "sent" : "rejected";
    } catch { /* Do not replay an ambiguously accepted conversion. */ }
    const { error: finishError } = await admin.from("ga4_outbox").update({ status }).eq("event_key", event.event_key).eq("status", "sending");
    if (finishError || status !== "sent") console.error("[ga4] Delivery needs review", event.event_key, status);
  }
}

export async function currentRequestIsProduction() {
  const h = await headers();
  return gaEnabled(h.get("host") ?? "invalid");
}
