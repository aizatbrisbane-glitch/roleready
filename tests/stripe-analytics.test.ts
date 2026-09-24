import type Stripe from "stripe";
import { beforeEach, expect, it, vi } from "vitest";
const record = vi.hoisted(() => vi.fn());
vi.mock("@/lib/ga4", () => ({ gaEnabled: () => true, recordGAEvent: record }));
import { recordVerifiedPurchase } from "../lib/stripe-analytics";

const session = {
  id: "cs_live_1", livemode: true, mode: "payment", payment_status: "paid", amount_total: 900, currency: "aud",
  metadata: { planType: "sprint_7_day", analytics_environment: "production", ga_client_id: "123.456", ga_session_id: "789" },
} as unknown as Stripe.Checkout.Session;
beforeEach(() => { record.mockReset().mockResolvedValue(true); });
it("verified purchase retries use the same durable transaction key", async () => {
  await recordVerifiedPurchase(session, "user", 1234567890);
  await recordVerifiedPurchase(session, "user", 1234567891);
  expect(record.mock.calls.map(([e]) => e.key)).toEqual(["purchase:cs_live_1", "purchase:cs_live_1"]);
  expect(record.mock.calls[0][0]).toMatchObject({ name: "purchase", params: { value: 9, currency: "AUD", transaction_id: "cs_live_1", items: [{ item_id: "sprint_7_day", quantity: 1 }] }, identity: { client_id: "123.456", session_id: "789" } });
});
it.each([
  { livemode: false }, { payment_status: "unpaid" }, { mode: "subscription" },
  { metadata: { ...session.metadata, analytics_environment: "excluded" } },
])("ineligible purchase emits nothing: %j", async (overrides) => {
  await recordVerifiedPurchase({ ...session, ...overrides } as Stripe.Checkout.Session, "user", 1234567890);
  expect(record).not.toHaveBeenCalled();
});
it("outbox persistence failure is left for background reconciliation", async () => {
  record.mockResolvedValue(false);
  await expect(recordVerifiedPurchase(session, "user", 1234567890)).resolves.toBeUndefined();
});
