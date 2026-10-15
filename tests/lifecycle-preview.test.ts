import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Shared mutable state (hoisted so vi.mock factories can close over it) ──
const state = vi.hoisted(() => ({
  user: null as { id: string } | null,
  profileRole: "candidate" as string,
  adminAvailable: true,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: state.user } }),
    },
    from: () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chain: Record<string, any> = {};
      for (const m of ["select", "eq"]) chain[m] = () => chain;
      chain.maybeSingle = async () => ({
        data: state.user ? { role: state.profileRole } : null,
      });
      return chain;
    },
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => {
    if (!state.adminAvailable) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const makeChain = (resolvedData: unknown): Record<string, any> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chain: Record<string, any> = {};
      const result = { data: resolvedData, error: null };
      for (const m of ["select", "eq", "gte", "lte", "order", "limit", "not", "maybeSingle"]) {
        chain[m] = () => chain;
      }
      chain.maybeSingle = () => Promise.resolve(result);
      chain.then = (fn: (r: unknown) => unknown) => Promise.resolve(result).then(fn);
      return chain;
    };
    return {
      from: () => makeChain([]),
      rpc: (_name: string) => Promise.resolve({ data: [], error: null }),
    };
  },
}));

vi.mock("@/lib/lifecycle-eligibility", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    classifyUser: vi.fn().mockResolvedValue({
      classification: "new_never_used",
      snapshot: {
        totalAllowance: 1,
        used: 0,
        remaining: 1,
        accountAgeHours: 48,
        planType: "free",
        classification: "new_never_used",
        hasVerifiedHistoricalUsage: false,
        needsMonthlyReset: false,
        classifiedAt: new Date().toISOString(),
      },
    }),
  };
});

import { GET } from "../app/api/admin/lifecycle-email-preview/route";

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL("https://app.koalapply.com/api/admin/lifecycle-email-preview");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Request(url.toString());
}

beforeEach(() => {
  state.user = null;
  state.profileRole = "candidate";
  state.adminAvailable = true;
});

describe("GET /api/admin/lifecycle-email-preview — authorization", () => {
  it("401 when no authenticated user", async () => {
    state.user = null;
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("403 when authenticated but role is 'candidate'", async () => {
    state.user = { id: "u-candidate" };
    state.profileRole = "candidate";
    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("403 when authenticated but role is 'recruiter'", async () => {
    state.user = { id: "u-recruiter" };
    state.profileRole = "recruiter";
    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
  });

  it("200 with correct shape when role is 'admin'", async () => {
    state.user = { id: "u-admin" };
    state.profileRole = "admin";
    const res = await GET(makeRequest({ reminderType: "reminder_1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body._dryRun).toBe(true);
    expect(body.reminderType).toBe("reminder_1");
    expect(Array.isArray(body.users)).toBe(true);
    expect(typeof body.breakdown).toBe("object");
    expect(typeof body.total).toBe("number");
    expect(typeof body.page).toBe("number");
    expect(typeof body.limit).toBe("number");
  });

  it("200 with correct shape when role is 'founder'", async () => {
    state.user = { id: "u-founder" };
    state.profileRole = "founder";
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body._dryRun).toBe(true);
  });

  it("reminderType defaults to 'reminder_1' when param omitted", async () => {
    state.user = { id: "u-admin" };
    state.profileRole = "admin";
    const res = await GET(makeRequest());
    const body = await res.json();
    expect(body.reminderType).toBe("reminder_1");
  });

  it("reminderType accepts 'reminder_2'", async () => {
    state.user = { id: "u-admin" };
    state.profileRole = "admin";
    const res = await GET(makeRequest({ reminderType: "reminder_2" }));
    const body = await res.json();
    expect(body.reminderType).toBe("reminder_2");
  });

  it("invalid reminderType falls back to 'reminder_1'", async () => {
    state.user = { id: "u-admin" };
    state.profileRole = "admin";
    const res = await GET(makeRequest({ reminderType: "reminder_99" }));
    const body = await res.json();
    expect(body.reminderType).toBe("reminder_1");
  });
});
