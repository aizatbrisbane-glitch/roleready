import { beforeEach, describe, expect, it, vi } from "vitest";

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

const endpointState = vi.hoisted(() => ({
  userId: "admin-user-id",
  userRole: "admin" as string | null,
  adminAvailable: true,
  workerError: null as Error | null,
  // Emails returned by the admin_get_user_emails RPC
  rpcEmails: [{ id: "user-test-123", email: "testuser@example.com" }] as { id: string; email: string }[],
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: {
      getUser: async () => ({
        data: {
          user: endpointState.userId ? { id: endpointState.userId } : null,
        },
      }),
    },
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: (_cols: string) => ({
            eq: (_k: string, _v: string) => ({
              maybeSingle: async () => ({
                data: endpointState.userRole
                  ? { role: endpointState.userRole }
                  : null,
              }),
            }),
          }),
        };
      }
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) };
    },
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => {
    if (!endpointState.adminAvailable) return null;
    return {
      rpc: (_fn: string) =>
        Promise.resolve({ data: endpointState.rpcEmails, error: null }),
    };
  },
}));

// Mock the worker so endpoint tests stay focused on auth/masking/plumbing.
vi.mock("@/lib/lifecycle-email-worker", () => ({
  runLifecycleDryRun: async (
    _admin: unknown,
    opts: { limit?: number; offset?: number } = {}
  ) => {
    if (endpointState.workerError) throw endpointState.workerError;
    return {
      _dryRun: true as const,
      evaluatedAt: "2026-10-15T00:00:00.000Z",
      batchOffset: opts.offset ?? 0,
      batchLimit: opts.limit ?? 25,
      candidatesQueried: 1,
      results: [
        {
          userId: "user-test-123",
          reminderType: "reminder_1",
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
            classifiedAt: "2026-10-15T00:00:00.000Z",
          },
          emailPreview: {
            subject: "Test subject",
            firstName: "Test",
            remaining: 1,
            ctaUrl: "https://koalapply.com/",
          },
          tokenStatus: "needs_provisioning",
          exclusionReason: null,
        },
      ],
      summary: {
        reminder1Eligible: 1,
        reminder2Eligible: 0,
        excluded: {},
        tokensMissing: 1,
        dataErrors: 0,
      },
    };
  },
}));

import { GET } from "../app/api/admin/lifecycle-email-dry-run/route";

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────

function makeGet(params: Record<string, string> = {}): Request {
  const url = new URL("https://koalapply.com/api/admin/lifecycle-email-dry-run");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Request(url.toString());
}

beforeEach(() => {
  endpointState.userId = "admin-user-id";
  endpointState.userRole = "admin";
  endpointState.adminAvailable = true;
  endpointState.workerError = null;
  endpointState.rpcEmails = [{ id: "user-test-123", email: "testuser@example.com" }];
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION A — Auth gates
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/admin/lifecycle-email-dry-run — auth", () => {
  it("no session → 401", async () => {
    endpointState.userId = "";
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
  });

  it("candidate role → 403", async () => {
    endpointState.userRole = "candidate";
    const res = await GET(makeGet());
    expect(res.status).toBe(403);
  });

  it("unknown role → 403", async () => {
    endpointState.userRole = "moderator";
    const res = await GET(makeGet());
    expect(res.status).toBe(403);
  });

  it("null profile → 403", async () => {
    endpointState.userRole = null;
    const res = await GET(makeGet());
    expect(res.status).toBe(403);
  });

  it("admin role → 200", async () => {
    endpointState.userRole = "admin";
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
  });

  it("founder role → 200", async () => {
    endpointState.userRole = "founder";
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
  });

  it("admin client unavailable → 500", async () => {
    endpointState.adminAvailable = false;
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION B — Email masking
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/admin/lifecycle-email-dry-run — email masking", () => {
  it("result has maskedEmail field (not raw userId)", async () => {
    const res = await GET(makeGet());
    const body = await res.json();
    const result = body.results[0];

    expect(result).toHaveProperty("maskedEmail");
    expect(result).not.toHaveProperty("userId");
  });

  it("masked email shows first char + *** + domain", async () => {
    endpointState.rpcEmails = [{ id: "user-test-123", email: "testuser@example.com" }];
    const res = await GET(makeGet());
    const body = await res.json();
    expect(body.results[0].maskedEmail).toBe("t***@example.com");
  });

  it("user without email in RPC result → maskedEmail is (unknown)", async () => {
    endpointState.rpcEmails = [];
    const res = await GET(makeGet());
    const body = await res.json();
    expect(body.results[0].maskedEmail).toBe("(unknown)");
  });

  it("raw user ID does not appear anywhere in the response body", async () => {
    endpointState.rpcEmails = [{ id: "user-test-123", email: "testuser@example.com" }];
    const res = await GET(makeGet());
    const text = await res.text();
    expect(text).not.toContain("user-test-123");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION C — Report passthrough
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/admin/lifecycle-email-dry-run — report shape", () => {
  it("response carries _dryRun: true", async () => {
    const res = await GET(makeGet());
    const body = await res.json();
    expect(body._dryRun).toBe(true);
  });

  it("response carries summary with correct fields", async () => {
    const res = await GET(makeGet());
    const body = await res.json();
    expect(body.summary).toHaveProperty("reminder1Eligible");
    expect(body.summary).toHaveProperty("reminder2Eligible");
    expect(body.summary).toHaveProperty("excluded");
    expect(body.summary).toHaveProperty("tokensMissing");
    expect(body.summary).toHaveProperty("dataErrors");
  });

  it("response carries evaluatedAt ISO string", async () => {
    const res = await GET(makeGet());
    const body = await res.json();
    expect(body.evaluatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("result preserves reminderType, classification, snapshot, emailPreview, tokenStatus, exclusionReason", async () => {
    const res = await GET(makeGet());
    const body = await res.json();
    const r = body.results[0];

    expect(r).toHaveProperty("reminderType", "reminder_1");
    expect(r).toHaveProperty("classification", "new_never_used");
    expect(r).toHaveProperty("snapshot");
    expect(r).toHaveProperty("emailPreview");
    expect(r).toHaveProperty("tokenStatus", "needs_provisioning");
    expect(r).toHaveProperty("exclusionReason", null);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION D — Pagination params
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/admin/lifecycle-email-dry-run — pagination", () => {
  it("limit param is forwarded to worker (reflected in batchLimit)", async () => {
    const res = await GET(makeGet({ limit: "10" }));
    const body = await res.json();
    expect(body.batchLimit).toBe(10);
  });

  it("offset param is forwarded to worker (reflected in batchOffset)", async () => {
    const res = await GET(makeGet({ offset: "50" }));
    const body = await res.json();
    expect(body.batchOffset).toBe(50);
  });

  it("default limit is 25 when not specified", async () => {
    const res = await GET(makeGet());
    const body = await res.json();
    expect(body.batchLimit).toBe(25);
  });

  it("default offset is 0 when not specified", async () => {
    const res = await GET(makeGet());
    const body = await res.json();
    expect(body.batchOffset).toBe(0);
  });

  it("limit > 50 is capped to 50 by the endpoint", async () => {
    const res = await GET(makeGet({ limit: "200" }));
    const body = await res.json();
    // The endpoint clamps before passing to the worker; worker also clamps.
    // Either way the result must not exceed 50.
    expect(body.batchLimit).toBeLessThanOrEqual(50);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION E — Worker error handling
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/admin/lifecycle-email-dry-run — worker errors", () => {
  it("unhandled worker error propagates as a 500 (no silent swallow)", async () => {
    endpointState.workerError = new Error("DB unavailable");
    await expect(GET(makeGet())).rejects.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION F — No PII in response
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/admin/lifecycle-email-dry-run — PII safety", () => {
  it("full email address is not present in the response", async () => {
    endpointState.rpcEmails = [{ id: "user-test-123", email: "testuser@example.com" }];
    const res = await GET(makeGet());
    const text = await res.text();
    expect(text).not.toContain("testuser@example.com");
  });
});
