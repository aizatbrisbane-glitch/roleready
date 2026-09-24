import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanIdentity, ecommerceParams, internalUser, measurementPayload, paidCandidateSession, productionAnalytics, signupMethod } from "../lib/analytics-policy";
import { captureGAIdentity } from "../lib/analytics-identity";
import { analytics } from "../lib/analytics";

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("production boundary", () => {
  it.each([
    ["development", "production", "localhost", false],
    ["production", "preview", "koalapply-git-test.vercel.app", false],
    ["production", undefined, "www.koalapply.com", false],
    ["production", "production", "localhost:3000", false],
    ["production", "production", "koalapply.vercel.app", false],
    ["production", "production", "www.koalapply.com", true],
    ["production", "production", "koalapply.com", true],
  ])("%s / %s / %s = %s", (NODE_ENV, VERCEL_ENV, host, expected) => {
    expect(productionAnalytics({ NODE_ENV, VERCEL_ENV }, host)).toBe(expected);
  });
  it("excludes internal roles and explicit IDs", () => {
    expect(internalUser("u", "admin")).toBe(true);
    expect(internalUser("u", "founder")).toBe(true);
    expect(internalUser("u", "user", "other, u")).toBe(true);
    expect(internalUser("u", "user")).toBe(false);
  });
});

it("normalizes identity without accepting PII or made-up client IDs", () => {
  expect(cleanIdentity({ client_id: "GA1.1.123.456", session_id: "789" })).toEqual({ client_id: "123.456", session_id: "789" });
  expect(cleanIdentity({ client_id: "person@example.com", session_id: "name", email: "secret" })).toEqual({});
  expect(cleanIdentity({ client_id: "server_user" })).toEqual({});
});

it.each([390, 1440])("captures current identity independently of first-touch storage at width %i", async (innerWidth) => {
  let session = "789";
  const gtag = vi.fn((_cmd, _id, field, callback) => callback(field === "client_id" ? "123.456" : session));
  vi.stubGlobal("window", { innerWidth, koalapplyAnalyticsEnabled: true, gtag });
  vi.stubGlobal("document", { cookie: "" });
  vi.stubGlobal("localStorage", { getItem: () => JSON.stringify({ source: "google" }) });
  expect(await captureGAIdentity()).toMatchObject({ client_id: "123.456", session_id: "789" });
  session = "790";
  expect(await captureGAIdentity()).toMatchObject({ session_id: "790" });
  expect(document.cookie).toContain("koala_ga=");
});

it("restricted cookie storage does not break signup", async () => {
  vi.stubGlobal("window", { koalapplyAnalyticsEnabled: true, gtag: (_c: unknown, _i: unknown, f: string, cb: (v: string) => void) => cb(f === "client_id" ? "123.456" : "789") });
  vi.stubGlobal("document", Object.defineProperty({}, "cookie", { set: () => { throw Error("blocked"); } }));
  await expect(captureGAIdentity()).resolves.toMatchObject({ client_id: "123.456" });
});

it("browser signup and success refresh never send GA4 conversions", async () => {
  const gtag = vi.fn(), fbq = vi.fn();
  vi.stubGlobal("window", { koalapplyAnalyticsEnabled: true, gtag, fbq });
  analytics.signupComplete({ method: "email", source: "claim", userId: "u" });
  for (let i = 0; i < 2; i++) analytics.purchaseComplete({ plan: "sprint_7_day", value: 9, currency: "AUD", transactionId: "cs_live_test" });
  expect(gtag).not.toHaveBeenCalled();
  await new Promise(resolve => setTimeout(resolve, 10));
  expect(fbq).toHaveBeenCalled(); // Separate Meta behaviour is retained.
});

it("diagnostics use fixed codes, never form contents", async () => {
  const gtag = vi.fn();
  vi.stubGlobal("window", { koalapplyAnalyticsEnabled: true, gtag });
  analytics.signupDiagnostic("signup_error", "hero", "validation");
  await new Promise(resolve => setTimeout(resolve, 10));
  expect(gtag).toHaveBeenCalledWith("event", "signup_error", { form_placement: "hero", error_code: "validation" });
  window.koalapplyAnalyticsEnabled = false;
  analytics.signupDiagnostic("signup_page_viewed", "page");
  expect(gtag).toHaveBeenCalledTimes(1);
});

it("email confirmation / OTP stay email, OAuth stays google", () => {
  expect(signupMethod("email")).toBe("email");
  expect(signupMethod(undefined)).toBe("email");
  expect(signupMethod("google")).toBe("google");
});

it("only live paid candidate sessions qualify", () => {
  const session = { livemode: true, mode: "payment", payment_status: "paid", metadata: { planType: "sprint_7_day" } };
  expect(paidCandidateSession(session)).toBe(true);
  expect(paidCandidateSession({ ...session, livemode: false })).toBe(false);
  expect(paidCandidateSession({ ...session, payment_status: "unpaid" })).toBe(false);
  expect(paidCandidateSession({ ...session, mode: "subscription" })).toBe(false);
});

it("builds valid ecommerce payload with shared user/client/session identity", () => {
  const payload = measurementPayload({ event_key: "purchase:cs", event_name: "purchase", user_id: "opaque-uuid", identity: { client_id: "123.456", session_id: "789" }, params: ecommerceParams("cs", "sprint_7_day", 900, "aud"), occurred_at: "2026-09-24T00:00:00Z" });
  expect(payload).toMatchObject({ client_id: "123.456", user_id: "opaque-uuid", events: [{ name: "purchase", params: { transaction_id: "cs", session_id: 789, value: 9, currency: "AUD", items: [{ quantity: 1, price: 9 }] } }] });
  expect(JSON.stringify(payload)).not.toContain("email");
});
