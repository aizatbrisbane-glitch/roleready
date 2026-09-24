import { flushAnalytics, background } from "./background-harness";
import { beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  signatureValid: true, fulfilled: false, test: false, asyncPaid: false, guest: false, createdUser: vi.fn(),
  record: vi.fn(), marketing: vi.fn(), inserts: vi.fn(),
}));
vi.mock("@/lib/env", () => ({ getStripeWebhookSecret: () => "test-webhook-secret" }));
vi.mock("@/lib/stripe", () => ({ getStripeClient: () => ({ webhooks: { constructEvent: () => {
  if (!state.signatureValid) throw Error("bad signature");
  return { type: state.asyncPaid ? "checkout.session.async_payment_succeeded" : "checkout.session.completed", created: 1234567890, data: { object: {
    id: "cs_live_1", mode: "payment", livemode: !state.test, payment_status: "paid", customer: "cus_1", amount_total: 900, currency: "aud",
    metadata: { ...(state.guest ? {} : { userId: "user" }), planType: "sprint_7_day", analytics_environment: "production", ga_client_id: "123.456", ga_session_id: "789" }, customer_details: { email: "private@example.com" },
  } } };
} } }) }));
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: () => ({
  auth: { admin: { createUser: async (v: unknown) => { state.createdUser(v); return { data: { user: { id: "user" } }, error: null }; }, generateLink: async () => ({ data: { properties: {} } }) } },
  from: (table: string) => {
    const chain = {
      select: () => chain, eq: () => chain, is: () => chain,
      update: () => chain,
      insert: (data: unknown) => { state.inserts(data); if (table === "entitlements") state.fulfilled = true; return chain; },
      maybeSingle: async () => ({ data: state.fulfilled ? { id: "entitlement", user_id: "user" } : null, error: null }),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ error: null }).then(resolve),
    };
    return chain;
  },
}) }));
vi.mock("@/lib/ga4", () => ({ gaEnabled: () => true, dispatchGAEvents: vi.fn(), recordGAEvent: state.record }));
vi.mock("@/lib/server-analytics", () => ({ trackPurchaseServerSide: state.marketing }));
vi.mock("@/lib/events", () => ({ logEvent: vi.fn() }));
import { POST } from "../app/api/webhooks/stripe/route";
const webhookResponse = () => POST(new Request("https://www.koalapply.com/api/webhooks/stripe", { method: "POST", headers: { "stripe-signature": "signature" }, body: "signed-body" }));
const webhook = async () => { const response = await webhookResponse(); await flushAnalytics(); return response; };
beforeEach(() => {
  state.guest = false; state.createdUser.mockClear();
  state.signatureValid = true; state.fulfilled = false; state.test = false; state.asyncPaid = false;
  state.record.mockReset().mockResolvedValue(true); state.inserts.mockReset(); state.marketing.mockReset();
});
it("invalid signature never reaches purchase analytics or entitlements", async () => {
  state.signatureValid = false;
  expect((await webhook()).status).toBe(400);
  expect(state.record).not.toHaveBeenCalled(); expect(state.inserts).not.toHaveBeenCalled();
});
it("completed checkout and retry share one purchase key and only one entitlement insert", async () => {
  expect((await webhook()).status).toBe(200);
  expect((await webhook()).status).toBe(200);
  expect(state.inserts).toHaveBeenCalledTimes(1);
  expect(state.record.mock.calls.map(([e]) => e.key)).toEqual(["purchase:cs_live_1", "purchase:cs_live_1"]);
});
it("Stripe test transactions preserve existing fulfillment but emit no production conversions", async () => {
  state.test = true;
  await webhook();
  expect(state.inserts).toHaveBeenCalledTimes(1);
  expect(state.record).not.toHaveBeenCalled(); expect(state.marketing).not.toHaveBeenCalled();
});
it("retry can persist analytics after prior entitlement success", async () => {
  state.fulfilled = true;
  await webhook();
  expect(state.record).toHaveBeenCalledTimes(1);
  expect(state.inserts).not.toHaveBeenCalled();
});
it("delayed payment success records purchase without granting another entitlement", async () => {
  state.fulfilled = true; state.asyncPaid = true;
  await webhook();
  expect(state.record).toHaveBeenCalledTimes(1);
  expect(state.inserts).not.toHaveBeenCalled();
});

it.each(["reject", "hang", "scheduler unavailable"])("webhook succeeds without waiting for analytics: %s", async (failure) => {

  const telemetry = state.record;
  if (failure === "reject") telemetry.mockRejectedValue(Error("analytics unavailable"));
  if (failure === "hang") telemetry.mockImplementation(() => new Promise(() => {}));
  background.unavailable = failure === "scheduler unavailable";
  const response = await webhookResponse();
  expect(response.status).toBe(200);
  expect(telemetry).not.toHaveBeenCalled();
  expect(state.inserts).toHaveBeenCalledTimes(1);

  if (failure === "reject") await flushAnalytics();
  if (failure === "hang") { void flushAnalytics(); await Promise.resolve(); }
});

it.each(["reject", "hang", "scheduler unavailable"])("guest account and entitlement fulfilment succeed with analytics %s", async failure => {
  state.guest = true;
  if (failure === "reject") state.record.mockRejectedValue(Error("analytics offline"));
  if (failure === "hang") state.record.mockImplementation(() => new Promise(() => {}));
  background.unavailable = failure === "scheduler unavailable";
  expect((await webhookResponse()).status).toBe(200);
  expect(state.createdUser).toHaveBeenCalledTimes(1);
  expect(state.inserts).toHaveBeenCalledTimes(1);
  expect(state.record).not.toHaveBeenCalled();
  if (failure === "reject") await flushAnalytics();
  if (failure === "hang") { void flushAnalytics(); await Promise.resolve(); }
});
