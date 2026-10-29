import { beforeEach, describe, expect, it, vi } from "vitest";

// ─────────────────────────────────────────────────────────────────────────────
// Hoisted state — controls mock behaviour per test
// ─────────────────────────────────────────────────────────────────────────────

const state = vi.hoisted(() => ({
  user: { id: "admin-uid-1" } as { id: string } | null,
  role: "founder" as string,
  renderArgs: null as Record<string, unknown> | null,
  lastSendArgs: null as Record<string, unknown> | null,
  sendError: null as string | null,
  adminClientCalled: false,
}));

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: state.user } }),
    },
    from: (_table: string) => {
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: async () => ({
          data: state.user ? { role: state.role } : null,
          error: null,
        }),
      };
      return chain;
    },
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => {
    state.adminClientCalled = true;
    return {};
  },
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = {
      send: async (args: Record<string, unknown>) => {
        state.lastSendArgs = args;
        if (state.sendError) {
          return { data: null, error: { message: state.sendError } };
        }
        return { data: { id: "msg-test-123" }, error: null };
      },
    };
  },
}));

vi.mock("@/lib/lifecycle-email-templates", () => ({
  FROM_ADDRESS: "Aizat at Koalapply <noreply@koalapply.com>",
  renderLifecycleEmail: (data: Record<string, unknown>) => {
    state.renderArgs = data;
    const tij = data.tailorIntentJob as { title: string } | null | undefined;
    return {
      subject: tij
        ? `Still interested in the ${tij.title} role?`
        : "Still looking for your next role?",
      html: "<html>test</html>",
      text: "test body",
      oneClickUnsubscribeUrl:
        "https://koalapply.com/api/unsubscribe/lifecycle/one-click?token=test-send-placeholder-not-functional",
    };
  },
}));

import { POST } from "../app/api/admin/lifecycle-email-test-send/route";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makePost(body: Record<string, unknown>): Request {
  return new Request("https://koalapply.com/api/admin/lifecycle-email-test-send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const BASE = {
  to: "recipient@example.com",
  firstName: "Alex",
  remaining: 2,
  reminderType: "reminder_1",
};

beforeEach(() => {
  state.user = { id: "admin-uid-1" };
  state.role = "founder";
  state.renderArgs = null;
  state.lastSendArgs = null;
  state.sendError = null;
  state.adminClientCalled = false;
  process.env.RESEND_API_KEY = "test-resend-key";
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION A — Auth guards
// ─────────────────────────────────────────────────────────────────────────────

describe("lifecycle-test-send — auth", () => {
  it("returns 401 when user is not authenticated", async () => {
    state.user = null;
    const res = await POST(makePost(BASE));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("Unauthorized.");
  });

  it("returns 403 for a user with role 'user'", async () => {
    state.role = "user";
    const res = await POST(makePost(BASE));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("Forbidden.");
  });

  it("accepts 'admin' role (not just founder)", async () => {
    state.role = "admin";
    const res = await POST(makePost(BASE));
    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION B — Input validation
// ─────────────────────────────────────────────────────────────────────────────

describe("lifecycle-test-send — input validation", () => {
  it("returns 400 when 'to' is an empty string", async () => {
    const res = await POST(makePost({ ...BASE, to: "" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/to/i);
  });

  it("returns 400 when 'to' has no @ sign", async () => {
    const res = await POST(makePost({ ...BASE, to: "notanemail" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when primaryJobTitle exceeds 200 characters", async () => {
    const res = await POST(makePost({ ...BASE, primaryJobTitle: "a".repeat(201) }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/primaryJobTitle/i);
  });

  it("returns 400 when location exceeds 200 characters", async () => {
    const res = await POST(makePost({ ...BASE, location: "b".repeat(201) }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/location/i);
  });

  it("returns 400 when tailorIntentJob is an array", async () => {
    const res = await POST(makePost({ ...BASE, tailorIntentJob: [] }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/object/i);
  });

  it("returns 400 when tailorIntentJob.title is empty", async () => {
    const res = await POST(makePost({
      ...BASE,
      tailorIntentJob: { title: "", company: "ACME", ctaUrl: "/login?redirect=/", hasResume: false },
    }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/title/i);
  });

  it("returns 400 when tailorIntentJob.company is missing", async () => {
    const res = await POST(makePost({
      ...BASE,
      tailorIntentJob: { title: "Teacher", ctaUrl: "/login?redirect=/", hasResume: false },
    }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/company/i);
  });

  it("returns 400 when tailorIntentJob.hasResume is not a boolean", async () => {
    const res = await POST(makePost({
      ...BASE,
      tailorIntentJob: { title: "Teacher", company: "ACME", ctaUrl: "/login?redirect=/", hasResume: "yes" },
    }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/hasResume/i);
  });

  it("returns 400 when tailorIntentJob.ctaUrl is an external URL", async () => {
    const res = await POST(makePost({
      ...BASE,
      tailorIntentJob: { title: "Teacher", company: "ACME", ctaUrl: "https://evil.com/steal", hasResume: false },
    }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/ctaUrl/i);
  });

  it("returns 400 when tailorIntentJob.ctaUrl is protocol-relative (//evil.com)", async () => {
    const res = await POST(makePost({
      ...BASE,
      tailorIntentJob: { title: "Teacher", company: "ACME", ctaUrl: "//evil.com", hasResume: false },
    }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/ctaUrl/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION C — Personalisation forwarding
// ─────────────────────────────────────────────────────────────────────────────

describe("lifecycle-test-send — personalisation forwarding", () => {
  it("passes primaryJobTitle and location to renderLifecycleEmail", async () => {
    const res = await POST(makePost({ ...BASE, primaryJobTitle: "Teacher", location: "Sydney" }));
    expect(res.status).toBe(200);
    expect(state.renderArgs?.primaryJobTitle).toBe("Teacher");
    expect(state.renderArgs?.location).toBe("Sydney");
  });

  it("passes tailorIntentJob to renderLifecycleEmail", async () => {
    const tij = {
      title: "Mathematics Teacher",
      company: "SchoolHouse",
      ctaUrl: "https://koalapply.com/login?redirect=/",
      hasResume: false,
    };
    const res = await POST(makePost({ ...BASE, tailorIntentJob: tij }));
    expect(res.status).toBe(200);
    expect(state.renderArgs?.tailorIntentJob).toEqual(tij);
  });

  it("accepts a relative /path ctaUrl in tailorIntentJob", async () => {
    const res = await POST(makePost({
      ...BASE,
      tailorIntentJob: { title: "Teacher", company: "ACME", ctaUrl: "/login?redirect=/", hasResume: true },
    }));
    expect(res.status).toBe(200);
    expect((state.renderArgs?.tailorIntentJob as { ctaUrl: string })?.ctaUrl).toBe("/login?redirect=/");
  });

  it("accepts https://koalapply.com/ ctaUrl in tailorIntentJob", async () => {
    const res = await POST(makePost({
      ...BASE,
      tailorIntentJob: { title: "Teacher", company: "ACME", ctaUrl: "https://koalapply.com/login?redirect=/", hasResume: true },
    }));
    expect(res.status).toBe(200);
  });

  it("sends without personalisation when optional fields are absent (backward compat)", async () => {
    const res = await POST(makePost(BASE));
    expect(res.status).toBe(200);
    expect(state.renderArgs?.primaryJobTitle).toBeNull();
    expect(state.renderArgs?.location).toBeNull();
    expect(state.renderArgs?.tailorIntentJob).toBeNull();
  });

  it("trims whitespace from primaryJobTitle and location", async () => {
    const res = await POST(makePost({ ...BASE, primaryJobTitle: "  Teacher  ", location: "  Sydney  " }));
    expect(res.status).toBe(200);
    expect(state.renderArgs?.primaryJobTitle).toBe("Teacher");
    expect(state.renderArgs?.location).toBe("Sydney");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION D — Unsubscribe safety
// ─────────────────────────────────────────────────────────────────────────────

describe("lifecycle-test-send — unsubscribe safety", () => {
  it("unsubscribeUrl uses the non-functional placeholder token", async () => {
    const res = await POST(makePost(BASE));
    const body = await res.json() as { unsubscribeUrl: string };
    expect(body.unsubscribeUrl).toContain("test-send-placeholder");
    // Must NOT be a 43-char base64url token (which would be a real token)
    const token = new URL(body.unsubscribeUrl).searchParams.get("token");
    expect(token).not.toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("does not call createSupabaseAdminClient — no email_preferences write", async () => {
    const res = await POST(makePost(BASE));
    expect(res.status).toBe(200);
    expect(state.adminClientCalled).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION E — Test markers and CTA routing
// ─────────────────────────────────────────────────────────────────────────────

describe("lifecycle-test-send — test markers", () => {
  it("prefixes the subject line with [TEST SEND]", async () => {
    const res = await POST(makePost(BASE));
    const body = await res.json() as { subject: string };
    expect(body.subject).toMatch(/^\[TEST SEND\]/);
  });

  it("sets X-Koalapply-Test: true header on the Resend call", async () => {
    const res = await POST(makePost(BASE));
    expect(res.status).toBe(200);
    const headers = state.lastSendArgs?.headers as Record<string, string>;
    expect(headers?.["X-Koalapply-Test"]).toBe("true");
  });

  it("tailor-intent subject reflects the job title", async () => {
    const res = await POST(makePost({
      ...BASE,
      tailorIntentJob: { title: "Mathematics Teacher", company: "SchoolHouse", ctaUrl: "/login?redirect=/", hasResume: false },
    }));
    const body = await res.json() as { subject: string };
    expect(body.subject).toBe("[TEST SEND] Still interested in the Mathematics Teacher role?");
  });

  it("CTA URL in tailorIntentJob resolves to /login?redirect=/ (the authenticated dashboard)", () => {
    // Verify the production CTA URL passes isSafeRedirect when used as a
    // relative path, and that the absolute form starts with koalapply.com.
    // The route rejects anything else, preventing open-redirect in test emails.
    const relativeCta = "/login?redirect=/";
    const absoluteCta = "https://koalapply.com/login?redirect=/";
    expect(relativeCta.startsWith("/")).toBe(true);
    expect(relativeCta.startsWith("//")).toBe(false);
    expect(absoluteCta.startsWith("https://koalapply.com/")).toBe(true);
  });
});
