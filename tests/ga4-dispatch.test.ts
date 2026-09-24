import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { AnalyticsEvent } from "../lib/analytics-policy";

type Row = AnalyticsEvent & { status: string; attempted_at?: string };
const state = vi.hoisted(() => ({ rows: [] as Row[], role: "user", cookie: "", enqueueError: false }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: state.cookie }) }), headers: async () => ({ get: () => "www.koalapply.com" }) }));
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: () => ({
  rpc: async (_name: string, args: Record<string, unknown>) => {
    if (state.enqueueError) return { error: { message: "DB unavailable" } };
    if (!state.rows.some(r => r.event_key === args.p_key)) state.rows.push({
      event_key: args.p_key as string, event_name: args.p_name as string, user_id: args.p_user as string,
      params: args.p_params as Record<string, unknown>, identity: args.p_identity as Row["identity"], occurred_at: args.p_occurred_at as string, status: "pending",
    });
    return { error: null };
  },
  from: (table: string) => {
    const filters: ((r: Row) => boolean)[] = [];
    let updates: Partial<Row> | null = null;
    const q = {
      select: () => q, order: () => q, limit: () => q,
      eq: (key: keyof Row, value: unknown) => { filters.push(r => r[key] === value); return q; },
      lt: (key: keyof Row, value: string) => { filters.push(r => String(r[key]) < value); return q; },
      not: () => { filters.push(r => !!r.identity.client_id); return q; },
      update: (value: Partial<Row>) => { updates = value; return q; },
      maybeSingle: async () => ({ data: { role: state.role }, error: null }),
      then: (resolve: (value: unknown) => unknown) => {
        if (table !== "ga4_outbox") throw Error(table);
        const rows = state.rows.filter(r => filters.every(f => f(r)));
        if (updates) rows.forEach(r => Object.assign(r, updates));
        return Promise.resolve({ data: rows.map(r => ({ ...r })), error: null }).then(resolve);
      },
    };
    return q;
  },
}) }));
import { dispatchGAEvents, recordGAEvent, requestIdentity } from "../lib/ga4";

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("VERCEL_ENV", "production"); vi.stubEnv("GA4_API_SECRET", "test-secret");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  state.role = "user"; state.cookie = ""; state.enqueueError = false;
  state.rows = [{ event_key: "signup:u", event_name: "sign_up", user_id: "u", identity: { client_id: "123.456", session_id: "789" }, params: { method: "email" }, occurred_at: new Date().toISOString(), status: "pending" }];
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

it("concurrent dispatchers send a signup only once", async () => {
  await Promise.all([dispatchGAEvents(), dispatchGAEvents(), dispatchGAEvents()]);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(state.rows[0].status).toBe("sent");
  const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);
  expect(body).toMatchObject({ user_id: "u", client_id: "123.456", events: [{ name: "sign_up", params: { session_id: 789 } }] });
});
it("ambiguous transport errors are quarantined, never automatically replayed", async () => {
  vi.mocked(fetch).mockRejectedValue(Error("timeout after potential acceptance"));
  await dispatchGAEvents(); await dispatchGAEvents();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(state.rows[0].status).toBe("uncertain");
});
it("HTTP rejection is visible and not silently retried", async () => {
  vi.mocked(fetch).mockResolvedValue({ ok: false } as Response);
  await dispatchGAEvents(); await dispatchGAEvents();
  expect(state.rows[0].status).toBe("rejected");
  expect(fetch).toHaveBeenCalledTimes(1);
});
it.each(["admin", "founder"])("%s events are excluded", async (role) => {
  state.role = role;
  await dispatchGAEvents();
  expect(fetch).not.toHaveBeenCalled();
  expect(state.rows[0].status).toBe("excluded");
});
it("preview deployment cannot transmit production GA4", async () => {
  vi.stubEnv("VERCEL_ENV", "preview");
  await dispatchGAEvents();
  expect(fetch).not.toHaveBeenCalled();
});
it("missing identity is retained without inventing users or starving eligible events", async () => {
  state.rows.unshift({ ...state.rows[0], event_key: "signup:no-identity", identity: {} });
  await dispatchGAEvents();
  expect(state.rows[0].status).toBe("pending");
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("events beyond GA backdating window are visibly expired", async () => {
  state.rows[0].occurred_at = new Date(Date.now() - 73 * 3600_000).toISOString();
  await dispatchGAEvents();
  expect(state.rows[0].status).toBe("expired");
  expect(fetch).not.toHaveBeenCalled();
});
it("current request cookie is decoded; stale identity is rejected", async () => {
  state.cookie = encodeURIComponent(JSON.stringify({ client_id: "123.456", session_id: "789", captured_at: Date.now() }));
  expect(await requestIdentity()).toMatchObject({ client_id: "123.456", session_id: "789" });
  state.cookie = JSON.stringify({ client_id: "123.456", captured_at: Date.now() - 31 * 60_000 });
  expect(await requestIdentity()).toEqual({});
});
it("failure to persist a purchase is reported to the caller", async () => {
  state.enqueueError = true;
  expect(await recordGAEvent({ name: "purchase", key: "purchase:x", userId: "u" })).toBe(false);
  expect(fetch).not.toHaveBeenCalled();
});
