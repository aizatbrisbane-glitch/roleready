import { background, flushAnalytics } from "./background-harness";
import { beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ observe: vi.fn(), marketing: vi.fn(), admin: vi.fn() }));
vi.mock("@/lib/ga4", () => ({ gaEnabled: () => true, observeSignup: state.observe }));
vi.mock("@/lib/server-analytics", () => ({ trackSignupServerSide: state.marketing }));
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: state.admin }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({
  auth: { exchangeCodeForSession: async () => ({ data: { session: { user: { id: "user", email: "private@example.invalid", app_metadata: { provider: "google" } } } } }) },
  rpc: async () => ({ error: null }),
}) }));
import { GET } from "../app/auth/callback/route";
beforeEach(() => { state.observe.mockReset(); state.marketing.mockReset(); state.admin.mockReset(); });
it.each(["reject", "hang", "scheduler unavailable"])("OAuth/confirmation redirects independently of analytics %s", async failure => {
  if (failure === "reject") { state.observe.mockRejectedValue(Error("GA down")); state.marketing.mockRejectedValue(Error("marketing down")); }
  if (failure === "hang") { state.observe.mockImplementation(() => new Promise(() => {})); state.marketing.mockImplementation(() => new Promise(() => {})); }
  background.unavailable = failure === "scheduler unavailable";
  const response = await GET(new Request("https://www.koalapply.com/auth/callback?code=valid&next=/"));
  expect(response.status).toBe(307); expect(response.headers.get("location")).toBe("https://www.koalapply.com/");
  expect(state.observe).not.toHaveBeenCalled(); expect(state.marketing).not.toHaveBeenCalled();
  if (failure === "reject") await flushAnalytics();
  if (failure === "hang") { void flushAnalytics(); await Promise.resolve(); }
});
