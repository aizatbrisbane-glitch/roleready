import { afterEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/ga4", () => ({ gaEnabled: () => true, canTrackUser: async () => true, observeSignup: () => { throw Error("GA ledger unavailable"); } }));
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: () => ({ rpc: state.rpc }) }));
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it("Meta and LinkedIn send independently of GA ledger failure and missing GA secret", async () => {
  vi.resetModules(); vi.stubEnv("GA4_API_SECRET", "");
  vi.stubEnv("META_CONVERSIONS_API_TOKEN", "test-token");
  vi.stubEnv("LINKEDIN_ACCESS_TOKEN", "test-token"); vi.stubEnv("LINKEDIN_SIGNUP_CONVERSION_ID", "123");
  state.rpc.mockImplementation(async (name: string) => {
    if (name !== "claim_signup_marketing") throw Error("GA tables unavailable");
    return { data: true, error: null };
  });
  const fetcher = vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => "{}", json: async () => ({}) });
  vi.stubGlobal("fetch", fetcher);
  const { trackSignupServerSide } = await import("../lib/server-analytics");
  await trackSignupServerSide({ email: "synthetic@example.invalid", userId: "user", method: "email" });
  expect(state.rpc).toHaveBeenCalledWith("claim_signup_marketing", { p_user: "user" });
  expect(fetcher.mock.calls.map(c => c[0])).toEqual(expect.arrayContaining([expect.stringContaining("graph.facebook.com"), expect.stringContaining("api.linkedin.com")]));
});
