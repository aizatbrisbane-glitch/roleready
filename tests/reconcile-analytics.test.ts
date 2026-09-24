import { afterEach, beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ enabled: true, rpc: vi.fn(), retrieve: vi.fn(), record: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: () => ({ rpc: state.rpc }) }));
vi.mock("@/lib/ga4", () => ({ gaEnabled: () => state.enabled, recordGAEvent: state.record }));
vi.mock("@/lib/stripe", () => ({ getStripeClient: () => ({ checkout: { sessions: { retrieve: state.retrieve } } }) }));
import { reconcileAnalytics } from "../lib/analytics-reconcile";
beforeEach(() => {
  state.enabled = true; state.record.mockReset().mockResolvedValue(true); state.retrieve.mockReset();
  state.rpc.mockReset().mockImplementation(async name => ({ error: null, data: name === "ga4_purchase_candidates" ? [{ user_id: "u", stripe_payment_id: "cs_live_1" }] : null }));
  state.retrieve.mockResolvedValue({ id: "cs_live_1", livemode: true, mode: "payment", payment_status: "paid", amount_total: 900, currency: "aud", created: 100,
    payment_intent: { latest_charge: { created: 200 } }, metadata: { planType: "sprint_7_day", analytics_environment: "production", ga_client_id: "123.456" } });
});
afterEach(() => { vi.restoreAllMocks(); });
it("discovers committed accounts and repairs a missed paid webhook enqueue using the same key", async () => {
  await reconcileAnalytics(); await reconcileAnalytics();
  expect(state.rpc).toHaveBeenCalledWith("discover_ga4_accounts", { p_user: null });
  expect(state.record).toHaveBeenCalledWith(expect.objectContaining({ key: "purchase:cs_live_1", userId: "u", occurredAt: new Date(200000).toISOString() }));
  expect(state.record.mock.calls.map(c => c[0].key)).toEqual(["purchase:cs_live_1", "purchase:cs_live_1"]);
});
it.each([{livemode:false},{payment_status:"unpaid"},{mode:"subscription"}])("does not record ineligible recovered sessions %j", async overrides => {
  state.retrieve.mockResolvedValue({ ...(await state.retrieve()), ...overrides });
  await reconcileAnalytics(); expect(state.record).not.toHaveBeenCalled();
});
it("Stripe unavailability is confined to the analytics worker", async () => {
  state.retrieve.mockRejectedValue(Error("Stripe offline"));
  await expect(reconcileAnalytics()).resolves.toBeUndefined(); expect(state.record).not.toHaveBeenCalled();
});
it("preview/development reconciliation does nothing", async () => {
  state.enabled = false; await reconcileAnalytics(); expect(state.rpc).not.toHaveBeenCalled();
});
