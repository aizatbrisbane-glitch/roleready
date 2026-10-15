import { describe, expect, it } from "vitest";
import { classifyFromData, classifyUser, type ClassificationInput } from "../lib/lifecycle-eligibility";

// Fixed reference point — Oct 14 2026 12:00 UTC.
// monthStartIso() for this date = "2026-10-01T00:00:00.000Z"
const NOW = new Date("2026-10-14T12:00:00Z");
const MONTH_START = "2026-10-01T00:00:00.000Z";
const PREV_MONTH_START = "2026-09-01T00:00:00.000Z";

// Canonical base: 2-day-old free user, never generated, opted-in, no prior reminder.
const BASE: ClassificationInput = {
  accountAgeHours: 48,
  planType: "free",
  applicationsRemaining: 1,
  needsMonthlyReset: false,
  monthlyUsedRaw: 0,
  hasVerifiedHistoricalUsage: false,
  hasApplicationHistorySignal: false,
  lastGeneratedAt: null,
  consentOptedIn: true,
  alreadyRemindedStatus: null,
};

function make(overrides: Partial<ClassificationInput>): ClassificationInput {
  return { ...BASE, ...overrides };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION A — classifyFromData (pure function)
// ─────────────────────────────────────────────────────────────────────────────

describe("classifyFromData — pure function", () => {

  it("1. baseline new free user, opted-in, never generated → new_never_used", () => {
    expect(classifyFromData(BASE, NOW)).toBe("new_never_used");
  });

  // ── Consent gates ─────────────────────────────────────────────────────────
  it("2. no email_preferences row (consentOptedIn null) → consent_missing", () => {
    expect(classifyFromData(make({ consentOptedIn: null }), NOW)).toBe("consent_missing");
  });

  it("3. opted_in = false → unsubscribed", () => {
    expect(classifyFromData(make({ consentOptedIn: false }), NOW)).toBe("unsubscribed");
  });

  // ── Already-reminded gate ─────────────────────────────────────────────────
  it("4. existing reminder 'sent' → already_reminded", () => {
    expect(classifyFromData(make({ alreadyRemindedStatus: "sent" }), NOW)).toBe("already_reminded");
  });

  it("5. existing reminder 'pending' → already_reminded", () => {
    expect(classifyFromData(make({ alreadyRemindedStatus: "pending" }), NOW)).toBe("already_reminded");
  });

  it("6. existing reminder 'sending' → already_reminded", () => {
    expect(classifyFromData(make({ alreadyRemindedStatus: "sending" }), NOW)).toBe("already_reminded");
  });

  it("7. failed/uncertain reminder → caller maps to null → does NOT block → proceeds to classify", () => {
    // classifyUser maps 'failed'/'uncertain' to null before calling classifyFromData.
    expect(classifyFromData(make({ alreadyRemindedStatus: null }), NOW)).toBe("new_never_used");
  });

  // ── Paid gate ─────────────────────────────────────────────────────────────
  it("8. active paid entitlement → active_paid", () => {
    expect(classifyFromData(make({ planType: "sprint_7_day", applicationsRemaining: 5 }), NOW)).toBe("active_paid");
  });

  // ── 14-day onboarding window ──────────────────────────────────────────────
  it("9. account 400h old, no verified usage → outside_onboarding_window", () => {
    expect(classifyFromData(make({ accountAgeHours: 400 }), NOW)).toBe("outside_onboarding_window");
  });

  it("10. account 400h old with verified event history → existing_recurring_free (Group C)", () => {
    expect(
      classifyFromData(make({ accountAgeHours: 400, hasVerifiedHistoricalUsage: true }), NOW)
    ).toBe("existing_recurring_free");
  });

  it("11. account 1h old → account_too_new", () => {
    expect(classifyFromData(make({ accountAgeHours: 1 }), NOW)).toBe("account_too_new");
  });

  it("11b. account 23h old → account_too_new (boundary: must be ≥ 24h for Reminder 1)", () => {
    expect(classifyFromData(make({ accountAgeHours: 23 }), NOW)).toBe("account_too_new");
  });

  it("11c. account exactly 24h old → eligible (new_never_used)", () => {
    expect(classifyFromData(make({ accountAgeHours: 24 }), NOW)).toBe("new_never_used");
  });

  // ── Month-boundary scenarios (replaced unreachable null-reset_at tests) ───
  it("12. signed up at end of previous month (Sept 30 ≡ 336h ago), never generated → new_never_used, not uncertain", () => {
    // reset_at = Sept 30 < Oct 1 monthStart → needsMonthlyReset = true.
    // Counter = 0, no events, no app records → no conflicting signals → new_never_used.
    // The old implementation incorrectly returned historical_usage_uncertain here.
    expect(
      classifyFromData(
        make({
          accountAgeHours: 336,        // 14 days exactly; within window (> is strict)
          needsMonthlyReset: true,
          monthlyUsedRaw: 0,
          hasVerifiedHistoricalUsage: false,
          hasApplicationHistorySignal: false,
        }),
        NOW
      )
    ).toBe("new_never_used");
  });

  it("13. app records exist but events and counter are both absent → historical_usage_uncertain (signal conflict)", () => {
    // Applications table has generated_at rows, but koalapply_events has no RESUME_GENERATED
    // and the free-tier counter is 0. Possible causes:
    //   - Generated before koalapply_events was added (July 2026) — but such users are always
    //     older than 14 days and won't reach this check in practice.
    //   - Rare event-write failure concurrent with a counter not being incremented.
    // Conservative: exclude rather than misclassify as first-time user.
    expect(
      classifyFromData(
        make({
          hasVerifiedHistoricalUsage: false,
          monthlyUsedRaw: 0,
          hasApplicationHistorySignal: true,
        }),
        NOW
      )
    ).toBe("historical_usage_uncertain");
  });

  it("14. monthly counter > 0 from previous period (needsMonthlyReset=true, used=1) → treated as used, not uncertain", () => {
    // monthly_generations_used is never decremented. > 0 reliably means prior free-tier generation,
    // regardless of whether the reset period has elapsed.
    expect(
      classifyFromData(
        make({
          needsMonthlyReset: true,
          monthlyUsedRaw: 1,
          applicationsRemaining: 1,
          lastGeneratedAt: null,
        }),
        NOW
      )
    ).toBe("new_partially_used");
  });

  // ── Activity / allowance states ────────────────────────────────────────────
  it("15. verified usage, remaining > 0, generated 12h ago → too_recently_active", () => {
    const twelveHoursAgo = new Date(NOW.getTime() - 12 * 3600 * 1000).toISOString();
    expect(
      classifyFromData(
        make({ hasVerifiedHistoricalUsage: true, applicationsRemaining: 1, lastGeneratedAt: twelveHoursAgo }),
        NOW
      )
    ).toBe("too_recently_active");
  });

  it("16. verified usage, remaining > 0, generated 72h ago → new_partially_used (Group B)", () => {
    const seventyTwoHoursAgo = new Date(NOW.getTime() - 72 * 3600 * 1000).toISOString();
    expect(
      classifyFromData(
        make({ hasVerifiedHistoricalUsage: true, applicationsRemaining: 1, lastGeneratedAt: seventyTwoHoursAgo }),
        NOW
      )
    ).toBe("new_partially_used");
  });

  it("17. verified usage, remaining = 0 → free_allowance_exhausted", () => {
    expect(
      classifyFromData(make({ hasVerifiedHistoricalUsage: true, applicationsRemaining: 0 }), NOW)
    ).toBe("free_allowance_exhausted");
  });

  // ── Gate-order validation ──────────────────────────────────────────────────
  it("18. consent checked before window — old account with missing consent → consent_missing, not outside_onboarding_window", () => {
    expect(
      classifyFromData(make({ accountAgeHours: 400, consentOptedIn: null }), NOW)
    ).toBe("consent_missing");
  });

  // ── Additional scenarios ───────────────────────────────────────────────────
  it("19. newsletter subscriber: used 1 of 2 slots, remaining 1, inactive 72h → new_partially_used", () => {
    // applicationsRemaining=1 reflects the second free slot from newsletter benefit
    const seventyTwoHoursAgo = new Date(NOW.getTime() - 72 * 3600 * 1000).toISOString();
    expect(
      classifyFromData(
        make({ hasVerifiedHistoricalUsage: true, applicationsRemaining: 1, lastGeneratedAt: seventyTwoHoursAgo }),
        NOW
      )
    ).toBe("new_partially_used");
  });

  it("20. previously paid user now on free tier: events confirm history, events = only signal (counter never incremented for paid path)", () => {
    // Paid-tier generations increment entitlement.applications_used, NOT monthly_generations_used.
    // koalapply_events is the only signal covering those generations.
    const seventyTwoHoursAgo = new Date(NOW.getTime() - 72 * 3600 * 1000).toISOString();
    expect(
      classifyFromData(
        make({
          planType: "free",
          applicationsRemaining: 1,
          monthlyUsedRaw: 0,                 // paid path: free counter was never touched
          hasVerifiedHistoricalUsage: true,  // events cover paid-path generations
          lastGeneratedAt: seventyTwoHoursAgo,
        }),
        NOW
      )
    ).toBe("new_partially_used");
  });

  it("21. uncertain reminder status → caller passes null → does NOT permanently block classification", () => {
    // 'uncertain' rows must not block re-queuing after manual investigation.
    expect(
      classifyFromData(
        make({
          alreadyRemindedStatus: null,
          hasVerifiedHistoricalUsage: true,
          applicationsRemaining: 0,
        }),
        NOW
      )
    ).toBe("free_allowance_exhausted");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION B — classifyUser (Supabase wrapper) with mock admin client
// ─────────────────────────────────────────────────────────────────────────────

// Build a duck-typed admin client.
// errorOverrides: table name → error message (query returns { data: null, error: {...} })
// dataOverrides:  table name → row value (query returns { data: X, error: null })
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeClient(errorOverrides: Record<string, string> = {}, dataOverrides: Record<string, unknown> = {}): any {
  const signupTs = new Date(NOW.getTime() - 48 * 3600 * 1000).toISOString();

  const defaults: Record<string, unknown> = {
    profiles: {
      newsletter_subscribed: false,
      created_at: signupTs,
      monthly_generations_used: 0,
      monthly_generations_reset_at: signupTs,
    },
    entitlements: null,
    email_preferences: { opted_in: true },
    lifecycle_email_log: null,
    koalapply_events: [],
    applications: null,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client: any = {
    from: (table: string) => {
      const resolve = () => {
        if (errorOverrides[table]) {
          return { data: null, error: { message: errorOverrides[table] } };
        }
        const data = Object.prototype.hasOwnProperty.call(dataOverrides, table)
          ? dataOverrides[table]
          : defaults[table];
        return { data, error: null };
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chain: Record<string, any> = {};
      for (const m of ["select", "eq", "not", "order", "limit", "lte", "gte"]) {
        chain[m] = () => chain;
      }
      chain.maybeSingle = () => Promise.resolve(resolve());
      chain.then = (fn: (r: unknown) => unknown) => Promise.resolve(resolve()).then(fn);
      return chain;
    },
  };
  return client;
}

describe("classifyUser — Supabase wrapper (mocked client)", () => {

  // ── data_error: each query independently ──────────────────────────────────
  it("B1. profiles query error → data_error", async () => {
    const { classification } = await classifyUser(
      makeClient({ profiles: "DB unavailable" }) as never,
      "u1", "reminder_1", NOW
    );
    expect(classification).toBe("data_error");
  });

  it("B2. entitlements query error → data_error (never treat paid user as free)", async () => {
    const { classification } = await classifyUser(
      makeClient({ entitlements: "timeout" }) as never,
      "u1", "reminder_1", NOW
    );
    expect(classification).toBe("data_error");
  });

  it("B3. email_preferences query error → data_error (never assume consent given)", async () => {
    const { classification } = await classifyUser(
      makeClient({ email_preferences: "permission denied" }) as never,
      "u1", "reminder_1", NOW
    );
    expect(classification).toBe("data_error");
  });

  it("B4. lifecycle_email_log query error → data_error (never assume reminder not sent)", async () => {
    const { classification } = await classifyUser(
      makeClient({ lifecycle_email_log: "connection refused" }) as never,
      "u1", "reminder_1", NOW
    );
    expect(classification).toBe("data_error");
  });

  it("B5. koalapply_events query error → data_error (never assume no history)", async () => {
    const { classification } = await classifyUser(
      makeClient({ koalapply_events: "RLS violation" }) as never,
      "u1", "reminder_1", NOW
    );
    expect(classification).toBe("data_error");
  });

  it("B6. applications query error → data_error (never assume no history)", async () => {
    const { classification } = await classifyUser(
      makeClient({ applications: "statement timeout" }) as never,
      "u1", "reminder_1", NOW
    );
    expect(classification).toBe("data_error");
  });

  it("B7. multiple query errors simultaneously → data_error", async () => {
    const { classification } = await classifyUser(
      makeClient({ profiles: "err", entitlements: "err", email_preferences: "err" }) as never,
      "u1", "reminder_1", NOW
    );
    expect(classification).toBe("data_error");
  });

  // ── Correct classification with valid data ────────────────────────────────
  it("B8. valid free user, opted-in, never generated → new_never_used", async () => {
    const { classification, snapshot } = await classifyUser(
      makeClient() as never, "u1", "reminder_1", NOW
    );
    expect(classification).toBe("new_never_used");
    expect(snapshot.planType).toBe("free");
  });

  it("B9. missing profile row → account_too_new (age defaults to 0h — safe exclusion)", async () => {
    const { classification } = await classifyUser(
      makeClient({}, { profiles: null }) as never, "u1", "reminder_1", NOW
    );
    expect(classification).toBe("account_too_new");
  });

  it("B10. no email_preferences row → consent_missing", async () => {
    const { classification } = await classifyUser(
      makeClient({}, { email_preferences: null }) as never, "u1", "reminder_1", NOW
    );
    expect(classification).toBe("consent_missing");
  });

  it("B11. opted_in = false → unsubscribed", async () => {
    const { classification } = await classifyUser(
      makeClient({}, { email_preferences: { opted_in: false } }) as never, "u1", "reminder_1", NOW
    );
    expect(classification).toBe("unsubscribed");
  });

  // ── Entitlement parity (matches getAccessState() in lib/entitlements.ts) ──
  it("B12. newsletter subscriber used 1 of 2 slots → snapshot shows 2 total, 1 remaining", async () => {
    const sixtyHoursAgo = new Date(NOW.getTime() - 60 * 3600 * 1000).toISOString();
    const signupTs = new Date(NOW.getTime() - 48 * 3600 * 1000).toISOString();
    const { classification, snapshot } = await classifyUser(
      makeClient({}, {
        profiles: {
          newsletter_subscribed: true,
          created_at: signupTs,
          monthly_generations_used: 1,
          monthly_generations_reset_at: MONTH_START,
        },
        koalapply_events: [{ created_at: sixtyHoursAgo }],
      }) as never,
      "u1", "reminder_1", NOW
    );
    expect(snapshot.totalAllowance).toBe(2);
    expect(snapshot.used).toBe(1);
    expect(snapshot.remaining).toBe(1);
    expect(classification).toBe("new_partially_used");
  });

  it("B13. needsMonthlyReset=true, raw counter=1 from previous month → effective used=0 for current month (parity with getAccessState)", async () => {
    // getAccessState: used = needsMonthlyReset ? 0 : monthly_generations_used
    // classifyUser must match: snapshot.used should be 0 (the reset erases current-month count)
    const signupTs = new Date(NOW.getTime() - 200 * 3600 * 1000).toISOString();
    const { snapshot } = await classifyUser(
      makeClient({}, {
        profiles: {
          newsletter_subscribed: false,
          created_at: signupTs,
          monthly_generations_used: 1,       // raw value from last month
          monthly_generations_reset_at: PREV_MONTH_START,  // Sept 1 < Oct 1 → needsMonthlyReset
        },
        koalapply_events: [],
        applications: null,
      }) as never,
      "u1", "reminder_1", NOW
    );
    expect(snapshot.used).toBe(0);     // current month: no generations yet
    expect(snapshot.remaining).toBe(1); // 1 free slot available
  });

  it("B14. active paid entitlement → active_paid, snapshot uses entitlement limits not free tier", async () => {
    const { classification, snapshot } = await classifyUser(
      makeClient({}, {
        entitlements: { plan_type: "focus_30_day", applications_used: 3, application_limit: 30 },
      }) as never,
      "u1", "reminder_1", NOW
    );
    expect(classification).toBe("active_paid");
    expect(snapshot.totalAllowance).toBe(30);
    expect(snapshot.remaining).toBe(27);
  });

  it("B15. month-boundary signup (Sept 30 = exactly 336h ago), never generated → new_never_used", async () => {
    // User created Sept 30 12:00. reset_at = Sept 30 (DEFAULT now()) < Oct 1 monthStart
    // → needsMonthlyReset = true. Counter=0, no events, no app records.
    // Must be new_never_used, not historical_usage_uncertain.
    const septThirtieth = new Date(NOW.getTime() - 336 * 3600 * 1000).toISOString();
    const { classification } = await classifyUser(
      makeClient({}, {
        profiles: {
          newsletter_subscribed: false,
          created_at: septThirtieth,
          monthly_generations_used: 0,
          monthly_generations_reset_at: septThirtieth,  // Sept 30 < Oct 1 → needsMonthlyReset
        },
        koalapply_events: [],
        applications: null,
      }) as never,
      "u1", "reminder_1", NOW
    );
    expect(classification).toBe("new_never_used");
  });
});
