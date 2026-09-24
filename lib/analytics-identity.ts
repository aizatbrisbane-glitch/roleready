import { cleanIdentity, GA_MEASUREMENT_ID, type GAIdentity } from "./analytics-policy";

declare global {
  interface Window { koalapplyAnalyticsEnabled?: boolean }
}

let latestIdentity: GAIdentity = {};

export async function captureGAIdentity(): Promise<GAIdentity> {
  if (typeof window === "undefined" || !window.koalapplyAnalyticsEnabled) return {};
  const get = (field: string) => new Promise<unknown>((resolve) => {
    const timer = setTimeout(() => resolve(undefined), 600);
    try {
      window.gtag?.("get", GA_MEASUREMENT_ID, field, (value: unknown) => {
        clearTimeout(timer); resolve(value);
      });
    } catch { clearTimeout(timer); resolve(undefined); }
  });
  const [client, session] = await Promise.all([get("client_id"), get("session_id")]);
  const identity = cleanIdentity({ client_id: client, session_id: session, captured_at: Date.now() });
  if (identity.client_id) {
    latestIdentity = identity;
    try { document.cookie = `koala_ga=${encodeURIComponent(JSON.stringify(identity))}; Path=/; Max-Age=1800; SameSite=Lax; Secure`; } catch { /* Storage restrictions must not block signup. */ }
  }
  return identity;
}

export function signupAnalyticsMetadata() {
  return { analytics: {
    environment: typeof window !== "undefined" && window.koalapplyAnalyticsEnabled ? "production" : "excluded",
    identity: latestIdentity.captured_at && Date.now() - latestIdentity.captured_at < 30 * 60_000 ? cleanIdentity(latestIdentity) : {},
    source: typeof window !== "undefined" && window.location.pathname === "/claim-free-account" ? "claim_free_account" : typeof window !== "undefined" && window.location.pathname === "/resume-tools" ? "resume_tools" : "other",
  } };
}
