import { beforeEach, describe, expect, it, vi } from "vitest";

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

const cronState = vi.hoisted(() => ({
  adminAvailable: true,
  resendKeySet: true,
  workerError: null as Error | null,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => (cronState.adminAvailable ? {} : null),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: async () => ({ data: { id: "msg-1" }, error: null }) };
  },
}));

vi.mock("@/lib/lifecycle-email-sender", () => ({
  runLifecycleEmailJob: async () => {
    if (cronState.workerError) throw cronState.workerError;
    return {
      scheduledNew: 1,
      uncertainResolved: 0,
      failedReset: 0,
      sent: 1,
      skipped: 0,
      failed: 0,
      results: [],
    };
  },
}));

import { GET } from "../app/api/cron/lifecycle-email/route";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeGet(authHeader?: string): Request {
  const headers: Record<string, string> = {};
  if (authHeader !== undefined) headers["authorization"] = authHeader;
  return new Request("https://koalapply.com/api/cron/lifecycle-email", { headers });
}

beforeEach(() => {
  cronState.adminAvailable = true;
  cronState.resendKeySet = true;
  cronState.workerError = null;
  process.env.CRON_SECRET = "test-cron-secret";
  process.env.RESEND_API_KEY = "test-resend-key";
  process.env.LIFECYCLE_EMAIL_SENDING_ENABLED = "true";
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION A — Auth
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/cron/lifecycle-email — auth", () => {
  it("no authorization header → 401", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
  });

  it("wrong secret → 401", async () => {
    const res = await GET(makeGet("Bearer wrong-secret"));
    expect(res.status).toBe(401);
  });

  it("correct secret → 200", async () => {
    const res = await GET(makeGet("Bearer test-cron-secret"));
    expect(res.status).toBe(200);
  });

  it("missing CRON_SECRET env → all requests rejected (no bypass)", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(makeGet("Bearer anything"));
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION B — Feature flag
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/cron/lifecycle-email — feature flag", () => {
  it("LIFECYCLE_EMAIL_SENDING_ENABLED unset → 200 with enabled:false", async () => {
    delete process.env.LIFECYCLE_EMAIL_SENDING_ENABLED;
    const res = await GET(makeGet("Bearer test-cron-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.enabled).toBe(false);
  });

  it("LIFECYCLE_EMAIL_SENDING_ENABLED=false → 200 with enabled:false", async () => {
    process.env.LIFECYCLE_EMAIL_SENDING_ENABLED = "false";
    const res = await GET(makeGet("Bearer test-cron-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.enabled).toBe(false);
  });

  it("LIFECYCLE_EMAIL_SENDING_ENABLED=true → job runs (ok:true in response)", async () => {
    const res = await GET(makeGet("Bearer test-cron-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("flag disabled: worker is never called (no side effects)", async () => {
    delete process.env.LIFECYCLE_EMAIL_SENDING_ENABLED;
    cronState.workerError = new Error("should not be called");
    const res = await GET(makeGet("Bearer test-cron-secret"));
    expect(res.status).toBe(200);
    // If worker was called it would throw → 500; 200 proves it was not called
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION C — Infrastructure failures
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/cron/lifecycle-email — infrastructure failures", () => {
  it("admin client unavailable → 500", async () => {
    cronState.adminAvailable = false;
    const res = await GET(makeGet("Bearer test-cron-secret"));
    expect(res.status).toBe(500);
  });

  it("RESEND_API_KEY missing → 500", async () => {
    delete process.env.RESEND_API_KEY;
    const res = await GET(makeGet("Bearer test-cron-secret"));
    expect(res.status).toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION D — Response shape
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/cron/lifecycle-email — response shape", () => {
  it("success response includes job report fields", async () => {
    const res = await GET(makeGet("Bearer test-cron-secret"));
    const body = await res.json();
    expect(body).toHaveProperty("ok", true);
    expect(body).toHaveProperty("scheduledNew");
    expect(body).toHaveProperty("sent");
    expect(body).toHaveProperty("failed");
    expect(body).toHaveProperty("skipped");
    expect(body).toHaveProperty("uncertainResolved");
  });
});
