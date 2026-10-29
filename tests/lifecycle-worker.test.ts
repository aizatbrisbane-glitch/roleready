import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EligibilityClassification, EligibilitySnapshot } from "../lib/lifecycle-eligibility";

// ─────────────────────────────────────────────────────────────────────────────
// Module mocks
// ─────────────────────────────────────────────────────────────────────────────

// classifyUser is the expensive per-user call — mocked to return configurable results.
const classifyState = vi.hoisted(() => ({
  results: {} as Record<string, Record<string, { classification: EligibilityClassification; snapshot: EligibilitySnapshot }>>,
}));

vi.mock("../lib/lifecycle-eligibility", () => ({
  classifyUser: async (
    _admin: unknown,
    userId: string,
    reminderType: string,
    _now: Date
  ) => {
    const result = classifyState.results[userId]?.[reminderType];
    if (result) return result;
    return { classification: "data_error" as EligibilityClassification, snapshot: makeSnapshot("data_error") };
  },
}));

vi.mock("../lib/lifecycle-email-templates", () => ({
  renderLifecycleEmail: ({
    reminderType,
    firstName,
  }: {
    reminderType: string;
    firstName: string | null;
  }) => ({
    subject: `Test subject — ${reminderType}`,
    html: `<p>Hi ${firstName ?? "there"}</p>`,
    text: `Hi ${firstName ?? "there"}`,
  }),
}));

import { runLifecycleDryRun } from "../lib/lifecycle-email-worker";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeSnapshot(
  classification: EligibilityClassification | string,
  overrides: Partial<EligibilitySnapshot> = {}
): EligibilitySnapshot {
  return {
    totalAllowance: 1,
    used: 0,
    remaining: 1,
    accountAgeHours: 48,
    planType: "free",
    classification: classification as EligibilityClassification,
    hasVerifiedHistoricalUsage: false,
    needsMonthlyReset: false,
    classifiedAt: "2026-10-15T00:00:00.000Z",
    ...overrides,
  };
}

// Sets up mock classify results for both reminder types for a given user.
function setEligible(
  userId: string,
  eligibleType: "reminder_1" | "reminder_2" | null,
  fallbackClassification: EligibilityClassification = "active_paid"
) {
  classifyState.results[userId] = {
    reminder_1:
      eligibleType === "reminder_1"
        ? { classification: "new_never_used", snapshot: makeSnapshot("new_never_used") }
        : { classification: fallbackClassification, snapshot: makeSnapshot(fallbackClassification) },
    reminder_2:
      eligibleType === "reminder_2"
        ? { classification: "new_partially_used", snapshot: makeSnapshot("new_partially_used", { used: 1, remaining: 1 }) }
        : { classification: fallbackClassification, snapshot: makeSnapshot(fallbackClassification) },
  };
}

function setExcluded(
  userId: string,
  classification: EligibilityClassification
) {
  classifyState.results[userId] = {
    reminder_1: { classification, snapshot: makeSnapshot(classification) },
    reminder_2: { classification, snapshot: makeSnapshot(classification) },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Fake admin client
// ─────────────────────────────────────────────────────────────────────────────
//
// Handles the exact query patterns used by the worker:
//   - email_preferences (discovery): select("user_id", ...).eq.eq.range
//   - email_preferences (token check): select("unsubscribe_token_hash").eq.eq.maybeSingle
//   - profiles (profile fetch): select("name, email").eq.maybeSingle

type FakeAdminConfig = {
  candidates?: string[];
  candidateCount?: number;
  discoveryError?: { message: string } | null;
  tokenHashes?: Record<string, string | null>;
  profileNames?: Record<string, string | null>;
};

function makeFakeAdmin(config: FakeAdminConfig = {}) {
  const writeCalls: string[] = [];

  const admin = {
    writeCalls,
    from(table: string) {
      if (table === "email_preferences") {
        return {
          select(col: string, _opts?: unknown) {
            if (col === "user_id") {
              // Discovery query chain (terminals with .range())
              const chain: Record<string, unknown> = {
                eq: (_k: string, _v: unknown) => chain,
                range: (_start: number, _end: number) => {
                  if (config.discoveryError) {
                    return Promise.resolve({ data: null, error: config.discoveryError, count: 0 });
                  }
                  return Promise.resolve({
                    data: (config.candidates ?? []).map((id) => ({ user_id: id })),
                    error: null,
                    count: config.candidateCount ?? (config.candidates?.length ?? 0),
                  });
                },
              };
              return chain;
            }

            // Token check query (select("unsubscribe_token_hash"), terminals with .maybeSingle())
            let capturedUserId = "";
            const chain: Record<string, unknown> = {
              eq(k: string, v: string) {
                if (k === "user_id") capturedUserId = v;
                return chain;
              },
              maybeSingle() {
                const hash = (config.tokenHashes ?? {})[capturedUserId] ?? null;
                return Promise.resolve({
                  data: { unsubscribe_token_hash: hash },
                  error: null,
                });
              },
            };
            return chain;
          },

          insert(data: unknown) {
            writeCalls.push("insert");
            return Promise.resolve({ error: null });
          },
          update(data: unknown) {
            writeCalls.push("update");
            return {
              eq: () => ({ eq: () => ({ or: () => Promise.resolve({ error: null }) }) }),
            };
          },
          upsert(data: unknown) {
            writeCalls.push("upsert");
            return Promise.resolve({ error: null });
          },
        };
      }

      if (table === "profiles") {
        let capturedUserId = "";
        return {
          select(_cols: string) {
            const chain: Record<string, unknown> = {
              eq(k: string, v: string) {
                if (k === "id") capturedUserId = v;
                return chain;
              },
              maybeSingle() {
                return Promise.resolve({
                  data: {
                    name: (config.profileNames ?? {})[capturedUserId] ?? null,
                    email: `${capturedUserId}@example.com`,
                  },
                });
              },
            };
            return chain;
          },
        };
      }

      // applications + master_resumes — used by fetchTailorIntentJob (returns null = no tailor-intent job)
      if (table === "applications" || table === "master_resumes") {
        const chain: Record<string, unknown> = {
          select: () => chain,
          eq: () => chain,
          in: () => chain,
          is: () => chain,
          order: () => chain,
          limit: () => chain,
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
        };
        return chain;
      }

      // Fallback — should not be reached by the dry-run worker
      return {
        select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
        insert: () => { writeCalls.push("insert:unknown"); return Promise.resolve({ error: null }); },
        update: () => { writeCalls.push("update:unknown"); return Promise.resolve({ error: null }); },
        upsert: () => { writeCalls.push("upsert:unknown"); return Promise.resolve({ error: null }); },
      };
    },
  };

  return admin;
}

// ─────────────────────────────────────────────────────────────────────────────
// Reset state between tests
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  classifyState.results = {};
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION A — Empty candidate pool
// ─────────────────────────────────────────────────────────────────────────────

describe("runLifecycleDryRun — empty pool", () => {
  it("returns zeroed report when no candidates are found", async () => {
    const admin = makeFakeAdmin({ candidates: [] });
    const report = await runLifecycleDryRun(admin as unknown as Parameters<typeof runLifecycleDryRun>[0]);

    expect(report._dryRun).toBe(true);
    expect(report.candidatesQueried).toBe(0);
    expect(report.results).toHaveLength(0);
    expect(report.summary.reminder1Eligible).toBe(0);
    expect(report.summary.reminder2Eligible).toBe(0);
    expect(report.summary.tokensMissing).toBe(0);
    expect(report.summary.dataErrors).toBe(0);
    expect(report.summary.excluded).toEqual({});
  });

  it("discovery error returns empty results (does not throw)", async () => {
    const admin = makeFakeAdmin({
      candidates: [],
      discoveryError: { message: "DB connection failed" },
    });
    const report = await runLifecycleDryRun(admin as unknown as Parameters<typeof runLifecycleDryRun>[0]);
    expect(report.candidatesQueried).toBe(0);
    expect(report.results).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION B — Reminder eligibility
// ─────────────────────────────────────────────────────────────────────────────

describe("runLifecycleDryRun — reminder_1 eligibility", () => {
  it("new_never_used → reminderType reminder_1, emailPreview populated", async () => {
    setEligible("u1", "reminder_1");
    const admin = makeFakeAdmin({ candidates: ["u1"] });
    const report = await runLifecycleDryRun(admin as unknown as Parameters<typeof runLifecycleDryRun>[0]);

    const r = report.results[0];
    expect(r.reminderType).toBe("reminder_1");
    expect(r.classification).toBe("new_never_used");
    expect(r.emailPreview).not.toBeNull();
    expect(r.emailPreview?.subject).toContain("reminder_1");
    expect(r.exclusionReason).toBeNull();
  });

  it("reminder_1 eligible → summary.reminder1Eligible incremented", async () => {
    setEligible("u1", "reminder_1");
    const admin = makeFakeAdmin({ candidates: ["u1"] });
    const report = await runLifecycleDryRun(admin as unknown as Parameters<typeof runLifecycleDryRun>[0]);
    expect(report.summary.reminder1Eligible).toBe(1);
    expect(report.summary.reminder2Eligible).toBe(0);
  });
});

describe("runLifecycleDryRun — reminder_2 eligibility", () => {
  it("new_partially_used → reminderType reminder_2, emailPreview populated", async () => {
    setEligible("u2", "reminder_2");
    const admin = makeFakeAdmin({ candidates: ["u2"] });
    const report = await runLifecycleDryRun(admin as unknown as Parameters<typeof runLifecycleDryRun>[0]);

    const r = report.results[0];
    expect(r.reminderType).toBe("reminder_2");
    expect(r.classification).toBe("new_partially_used");
    expect(r.emailPreview).not.toBeNull();
    expect(r.exclusionReason).toBeNull();
  });

  it("reminder_2 eligible → summary.reminder2Eligible incremented", async () => {
    setEligible("u2", "reminder_2");
    const admin = makeFakeAdmin({ candidates: ["u2"] });
    const report = await runLifecycleDryRun(admin as unknown as Parameters<typeof runLifecycleDryRun>[0]);
    expect(report.summary.reminder2Eligible).toBe(1);
    expect(report.summary.reminder1Eligible).toBe(0);
  });

  it("new_partially_used snapshot carries remaining in emailPreview", async () => {
    classifyState.results["u2"] = {
      reminder_1: { classification: "active_paid", snapshot: makeSnapshot("active_paid") },
      reminder_2: {
        classification: "new_partially_used",
        snapshot: makeSnapshot("new_partially_used", { used: 1, remaining: 1 }),
      },
    };
    const admin = makeFakeAdmin({ candidates: ["u2"] });
    const report = await runLifecycleDryRun(admin as unknown as Parameters<typeof runLifecycleDryRun>[0]);
    expect(report.results[0].emailPreview?.remaining).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION C — Exclusions
// ─────────────────────────────────────────────────────────────────────────────

describe("runLifecycleDryRun — excluded users", () => {
  const EXCLUSION_CASES: EligibilityClassification[] = [
    "active_paid",
    "unsubscribed",
    "consent_missing",
    "already_reminded",
    "free_allowance_exhausted",
    "outside_onboarding_window",
    "existing_recurring_free",
    "account_too_new",
    "too_recently_active",
    "historical_usage_uncertain",
  ];

  for (const cls of EXCLUSION_CASES) {
    it(`${cls} → reminderType "none", exclusionReason set, tokenStatus "n/a"`, async () => {
      setExcluded("u-excl", cls);
      const admin = makeFakeAdmin({ candidates: ["u-excl"] });
      const report = await runLifecycleDryRun(admin as unknown as Parameters<typeof runLifecycleDryRun>[0]);

      const r = report.results[0];
      expect(r.reminderType).toBe("none");
      expect(r.emailPreview).toBeNull();
      expect(r.tokenStatus).toBe("n/a");
      expect(r.exclusionReason).not.toBeNull();
    });
  }

  it("excluded user increments summary.excluded for the label", async () => {
    setExcluded("u1", "active_paid");
    setExcluded("u2", "active_paid");
    setExcluded("u3", "unsubscribed");
    const admin = makeFakeAdmin({ candidates: ["u1", "u2", "u3"] });
    const report = await runLifecycleDryRun(admin as unknown as Parameters<typeof runLifecycleDryRun>[0]);

    expect(report.summary.excluded["active_paid"]).toBe(2);
    expect(report.summary.excluded["unsubscribed"]).toBe(1);
    expect(report.summary.reminder1Eligible).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION D — data_error
// ─────────────────────────────────────────────────────────────────────────────

describe("runLifecycleDryRun — data_error", () => {
  it("data_error increments summary.dataErrors", async () => {
    setExcluded("u-err", "data_error");
    const admin = makeFakeAdmin({ candidates: ["u-err"] });
    const report = await runLifecycleDryRun(admin as unknown as Parameters<typeof runLifecycleDryRun>[0]);
    expect(report.summary.dataErrors).toBe(1);
  });

  it("data_error user gets excluded label in summary.excluded", async () => {
    setExcluded("u-err", "data_error");
    const admin = makeFakeAdmin({ candidates: ["u-err"] });
    const report = await runLifecycleDryRun(admin as unknown as Parameters<typeof runLifecycleDryRun>[0]);
    expect(report.summary.excluded["data_error"]).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION E — Token status
// ─────────────────────────────────────────────────────────────────────────────

describe("runLifecycleDryRun — token status", () => {
  it("eligible user with stored hash → tokenStatus available", async () => {
    setEligible("u-tok", "reminder_1");
    const admin = makeFakeAdmin({
      candidates: ["u-tok"],
      tokenHashes: { "u-tok": "abc123def456" },
    });
    const report = await runLifecycleDryRun(admin as unknown as Parameters<typeof runLifecycleDryRun>[0]);
    expect(report.results[0].tokenStatus).toBe("available");
    expect(report.summary.tokensMissing).toBe(0);
  });

  it("eligible user with null hash → tokenStatus needs_provisioning", async () => {
    setEligible("u-tok", "reminder_1");
    const admin = makeFakeAdmin({
      candidates: ["u-tok"],
      tokenHashes: { "u-tok": null },
    });
    const report = await runLifecycleDryRun(admin as unknown as Parameters<typeof runLifecycleDryRun>[0]);
    expect(report.results[0].tokenStatus).toBe("needs_provisioning");
    expect(report.summary.tokensMissing).toBe(1);
  });

  it("ineligible user → tokenStatus is n/a (no token query made)", async () => {
    setExcluded("u-excl", "active_paid");
    const admin = makeFakeAdmin({ candidates: ["u-excl"] });
    const report = await runLifecycleDryRun(admin as unknown as Parameters<typeof runLifecycleDryRun>[0]);
    expect(report.results[0].tokenStatus).toBe("n/a");
    expect(report.summary.tokensMissing).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION F — Profile / firstName in email preview
// ─────────────────────────────────────────────────────────────────────────────

describe("runLifecycleDryRun — email preview firstName", () => {
  it("profile with full name → firstName is first word", async () => {
    setEligible("u-name", "reminder_1");
    const admin = makeFakeAdmin({
      candidates: ["u-name"],
      profileNames: { "u-name": "Jane Doe" },
    });
    const report = await runLifecycleDryRun(admin as unknown as Parameters<typeof runLifecycleDryRun>[0]);
    expect(report.results[0].emailPreview?.firstName).toBe("Jane");
  });

  it("profile with null name → firstName is null in emailPreview", async () => {
    setEligible("u-noname", "reminder_1");
    const admin = makeFakeAdmin({
      candidates: ["u-noname"],
      profileNames: { "u-noname": null },
    });
    const report = await runLifecycleDryRun(admin as unknown as Parameters<typeof runLifecycleDryRun>[0]);
    expect(report.results[0].emailPreview?.firstName).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION G — Batch options
// ─────────────────────────────────────────────────────────────────────────────

describe("runLifecycleDryRun — batch options", () => {
  it("default limit is 25 (reflected in report)", async () => {
    const admin = makeFakeAdmin({ candidates: [] });
    const report = await runLifecycleDryRun(admin as unknown as Parameters<typeof runLifecycleDryRun>[0]);
    expect(report.batchLimit).toBe(25);
  });

  it("limit > 50 is capped to 50", async () => {
    const admin = makeFakeAdmin({ candidates: [] });
    const report = await runLifecycleDryRun(admin as unknown as Parameters<typeof runLifecycleDryRun>[0], { limit: 200 });
    expect(report.batchLimit).toBe(50);
  });

  it("limit < 1 is raised to 1", async () => {
    const admin = makeFakeAdmin({ candidates: [] });
    const report = await runLifecycleDryRun(admin as unknown as Parameters<typeof runLifecycleDryRun>[0], { limit: 0 });
    expect(report.batchLimit).toBe(1);
  });

  it("offset is reflected in report", async () => {
    const admin = makeFakeAdmin({ candidates: [] });
    const report = await runLifecycleDryRun(admin as unknown as Parameters<typeof runLifecycleDryRun>[0], { offset: 100 });
    expect(report.batchOffset).toBe(100);
  });

  it("negative offset is normalised to 0", async () => {
    const admin = makeFakeAdmin({ candidates: [] });
    const report = await runLifecycleDryRun(admin as unknown as Parameters<typeof runLifecycleDryRun>[0], { offset: -5 });
    expect(report.batchOffset).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION H — Report shape
// ─────────────────────────────────────────────────────────────────────────────

describe("runLifecycleDryRun — report shape", () => {
  it("report always carries _dryRun: true", async () => {
    const admin = makeFakeAdmin({ candidates: [] });
    const report = await runLifecycleDryRun(admin as unknown as Parameters<typeof runLifecycleDryRun>[0]);
    expect(report._dryRun).toBe(true);
  });

  it("evaluatedAt is an ISO timestamp string", async () => {
    const admin = makeFakeAdmin({ candidates: [] });
    const report = await runLifecycleDryRun(admin as unknown as Parameters<typeof runLifecycleDryRun>[0]);
    expect(() => new Date(report.evaluatedAt)).not.toThrow();
    expect(report.evaluatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("eligible result carries ctaUrl pointing to app root", async () => {
    setEligible("u1", "reminder_1");
    const admin = makeFakeAdmin({ candidates: ["u1"] });
    const report = await runLifecycleDryRun(admin as unknown as Parameters<typeof runLifecycleDryRun>[0]);
    expect(report.results[0].emailPreview?.ctaUrl).toBe("https://koalapply.com/login?redirect=/");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION I — Zero DB writes (source-file contract)
// ─────────────────────────────────────────────────────────────────────────────

describe("runLifecycleDryRun — zero DB write guarantee", () => {
  it("worker never calls insert/update/upsert on the admin client (runtime check)", async () => {
    setEligible("u1", "reminder_1");
    const admin = makeFakeAdmin({ candidates: ["u1"] });
    await runLifecycleDryRun(admin as unknown as Parameters<typeof runLifecycleDryRun>[0]);
    expect(admin.writeCalls).toHaveLength(0);
  });

  it("worker source does not import Resend (structural guarantee)", () => {
    const fs = require("fs");
    const path = require("path");
    const src = fs.readFileSync(
      path.resolve(__dirname, "../lib/lifecycle-email-worker.ts"),
      "utf8"
    );
    // No import statement references the resend package
    expect(src).not.toMatch(/from ["']resend["']/);
    expect(src).not.toMatch(/require\(["']resend["']\)/);
  });

  it("worker source contains no insert/update/upsert call (structural guarantee)", () => {
    const fs = require("fs");
    const path = require("path");
    const src = fs.readFileSync(
      path.resolve(__dirname, "../lib/lifecycle-email-worker.ts"),
      "utf8"
    );
    // Verify that no write-path method is present
    expect(src).not.toMatch(/\.insert\s*\(/);
    expect(src).not.toMatch(/\.update\s*\(/);
    expect(src).not.toMatch(/\.upsert\s*\(/);
  });

  it("worker header comment states dry-run-only semantics", () => {
    const fs = require("fs");
    const path = require("path");
    const src = fs.readFileSync(
      path.resolve(__dirname, "../lib/lifecycle-email-worker.ts"),
      "utf8"
    );
    expect(src).toContain("Dry-Run Only");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION J — Multi-user summary aggregation
// ─────────────────────────────────────────────────────────────────────────────

describe("runLifecycleDryRun — summary aggregation", () => {
  it("mixed batch: 2 eligible + 2 excluded → correct summary totals", async () => {
    setEligible("u-r1a", "reminder_1");
    setEligible("u-r2a", "reminder_2");
    setExcluded("u-paid", "active_paid");
    setExcluded("u-err", "data_error");

    const admin = makeFakeAdmin({
      candidates: ["u-r1a", "u-r2a", "u-paid", "u-err"],
    });
    const report = await runLifecycleDryRun(admin as unknown as Parameters<typeof runLifecycleDryRun>[0]);

    expect(report.summary.reminder1Eligible).toBe(1);
    expect(report.summary.reminder2Eligible).toBe(1);
    expect(report.summary.excluded["active_paid"]).toBe(1);
    expect(report.summary.dataErrors).toBe(1);
    expect(report.results).toHaveLength(4);
  });
});
