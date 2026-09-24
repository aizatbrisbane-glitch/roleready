import { beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ retrieve: vi.fn() }));
vi.mock("@/lib/stripe", () => ({ getStripeClient: () => ({ checkout: { sessions: { retrieve: state.retrieve } } }) }));
vi.mock("@/lib/ga4", () => ({ currentRequestIsProduction: async () => true, canTrackUser: async () => true }));
import SuccessPage from "../app/checkout/success/page";
import { GET } from "../app/api/analytics/purchase/route";
const verify = (id: string) => GET(new Request("https://www.koalapply.com/api/analytics/purchase?session_id="+id+"&plan=fake&value=999999"));
beforeEach(() => { state.retrieve.mockReset(); });
it("forged URL cannot create a verified purchase", async () => {
  state.retrieve.mockRejectedValue(Error("No such checkout session"));
  expect(await (await verify("cs_live_fake")).json()).toBe(null);
});
it("verification uses Stripe amounts, and return refresh never waits for tracking", async () => {
  state.retrieve.mockResolvedValue({ id: "cs_live_verified", livemode: true, mode: "payment", payment_status: "paid", amount_total: 900, currency: "aud", metadata: { planType: "sprint_7_day" } });
  for (let i=0;i<2;i++) {
    const page = await SuccessPage({ searchParams: Promise.resolve({ session_id: "cs_live_verified", plan: "fake", value: "999999" }) });
    expect(page.props.children[0].props).toEqual({ transactionId: "cs_live_verified" });
    expect(state.retrieve).not.toHaveBeenCalled();
  }
  expect(await (await verify("cs_live_verified")).json()).toEqual({ plan: "sprint_7_day", value: 9, currency: "AUD", transactionId: "cs_live_verified" });
});
it("Stripe test return cannot mount a conversion tracker or verify a purchase", async () => {
  const page = await SuccessPage({ searchParams: Promise.resolve({ session_id: "cs_test_test" }) });
  expect(page.props.children[0]).toBe(null);
  expect(await (await verify("cs_test_test")).json()).toBe(null);
  expect(state.retrieve).not.toHaveBeenCalled();
});
it("return page responds even if analytics verification would hang indefinitely", async () => {
  state.retrieve.mockImplementation(() => new Promise(() => {}));
  const page = await SuccessPage({ searchParams: Promise.resolve({ session_id: "cs_live_verified" }) });
  expect(page).toBeTruthy(); expect(state.retrieve).not.toHaveBeenCalled();
});
