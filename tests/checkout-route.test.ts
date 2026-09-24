import { flushAnalytics, background } from "./background-harness";
import { beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  create: vi.fn(), events: vi.fn(), guestAuthFailure: false,
}));
vi.mock("@/lib/ga4", () => ({ gaEnabled: () => true, requestIdentity: async () => ({ client_id: "123.456", session_id: "789", captured_at: 100 }), recordGAEvent: state.events }));
vi.mock("@/lib/stripe", () => ({ getStripeClient: () => ({ checkout: { sessions: { create: state.create } } }) }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({
  auth: { getUser: async () => { if (state.guestAuthFailure) throw Error("analytics classification unavailable"); return { data: { user: { id: "user", email: "private@example.com" } } }; } },
  from: () => { const chain = { select: () => chain, eq: () => chain, maybeSingle: async () => ({ data: { stripe_customer_id: "cus_existing", attr_ga_client_id: "GA1.1.OLD.VALUE" } }) }; return chain; },
}) }));
import { POST } from "../app/api/checkout/route";
const checkoutResponse = () => POST(new Request("https://www.koalapply.com/api/checkout", { method: "POST", headers: { cookie: `koala_ga=${encodeURIComponent(JSON.stringify({ client_id: "123.456", session_id: "789", captured_at: Date.now() }))}` }, body: JSON.stringify({ planType: "sprint_7_day" }) }));
const checkout = async () => { const response = await checkoutResponse(); await flushAnalytics(); return response; };
beforeEach(() => { state.guestAuthFailure = false; state.create.mockReset(); state.events.mockReset(); });

it("successful live checkout carries current identity and emits begin_checkout", async () => {
  state.create.mockResolvedValue({ id: "cs_live_1", url: "https://checkout.stripe.com/test", livemode: true });
  expect((await checkout()).status).toBe(200);
  expect(state.create.mock.calls[0][0].metadata).toMatchObject({ ga_client_id: "123.456", ga_session_id: "789" });
  expect(state.events).toHaveBeenCalledWith(expect.objectContaining({ name: "begin_checkout", key: "checkout:cs_live_1", params: expect.objectContaining({ value: 9, currency: "AUD" }) }));
});
it("failed checkout emits nothing", async () => {
  state.create.mockRejectedValue(Error("Stripe unavailable"));
  expect((await checkout()).status).toBe(500);
  expect(state.events).not.toHaveBeenCalled();
});
it("test checkout emits nothing", async () => {
  state.create.mockResolvedValue({ id: "cs_test_1", url: "https://checkout.stripe.com/test", livemode: false });
  await checkout();
  expect(state.events).not.toHaveBeenCalled();
});

it.each(["reject", "hang", "scheduler unavailable"])("checkout succeeds without waiting for analytics: %s", async (failure) => {
  state.create.mockResolvedValue({ id: "cs_live_1", url: "https://checkout.stripe.com/test", livemode: true });
  const telemetry = state.events;
  if (failure === "reject") telemetry.mockRejectedValue(Error("analytics unavailable"));
  if (failure === "hang") telemetry.mockImplementation(() => new Promise(() => {}));
  background.unavailable = failure === "scheduler unavailable";
  const response = await checkoutResponse();
  expect(response.status).toBe(200);
  expect(telemetry).not.toHaveBeenCalled();


  if (failure === "reject") await flushAnalytics();
  if (failure === "hang") { void flushAnalytics(); await Promise.resolve(); }
});

import { POST as guestCheckout } from "../app/api/checkout/guest/route";
it("guest checkout does not wait for or fail on the analytics-only auth lookup", async () => {
  state.guestAuthFailure = true;
  state.create.mockResolvedValue({ id: "cs_live_guest", url: "https://checkout.stripe.com/guest", livemode: true });
  const response = await guestCheckout(new Request("https://www.koalapply.com/api/checkout/guest", { method: "POST", body: JSON.stringify({ planType: "sprint_7_day" }) }));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({url:"https://checkout.stripe.com/guest"});
  await flushAnalytics();
});
