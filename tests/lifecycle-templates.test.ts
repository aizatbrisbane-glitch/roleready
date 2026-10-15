import { describe, expect, it } from "vitest";
import { renderLifecycleEmail, FROM_ADDRESS, type LifecycleEmailData } from "../lib/lifecycle-email-templates";

const UNSUB_URL = "https://koalapply.com/unsubscribe/lifecycle?token=test-token";

function make(overrides: Partial<LifecycleEmailData> = {}): LifecycleEmailData {
  return {
    reminderType: "reminder_1",
    firstName: "Alex",
    remaining: 1,
    unsubscribeUrl: UNSUB_URL,
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Reminder 1
// ─────────────────────────────────────────────────────────────────────────────

describe("Reminder 1 — Still looking for your next role?", () => {

  it("subject line is correct", () => {
    const { subject } = renderLifecycleEmail(make());
    expect(subject).toBe("Still looking for your next role?");
  });

  it("HTML: first name is personalised", () => {
    const { html } = renderLifecycleEmail(make({ firstName: "Alex" }));
    expect(html).toContain("Hi Alex,");
  });

  it("HTML: missing first name falls back to 'Hi there,'", () => {
    const { html } = renderLifecycleEmail(make({ firstName: null }));
    expect(html).toContain("Hi there,");
  });

  it("HTML: empty-string first name falls back to 'Hi there,'", () => {
    const { html } = renderLifecycleEmail(make({ firstName: "   " }));
    expect(html).toContain("Hi there,");
  });

  it("HTML: singular grammar with 1 remaining (application, not applications)", () => {
    const { html } = renderLifecycleEmail(make({ remaining: 1 }));
    expect(html).toContain("1 free Koalapply application");
    expect(html).not.toContain("1 free Koalapply applications");
  });

  it("HTML: plural grammar with 2 remaining", () => {
    const { html } = renderLifecycleEmail(make({ remaining: 2 }));
    expect(html).toContain("2 free Koalapply applications");
  });

  it("HTML: CTA button points to / (no /dashboard route exists)", () => {
    const { html } = renderLifecycleEmail(make());
    expect(html).toContain("https://koalapply.com/");
    expect(html).not.toContain("https://koalapply.com/dashboard");
    expect(html).toContain("Try Koalapply");
  });

  it("HTML: includes unsubscribe link", () => {
    const { html } = renderLifecycleEmail(make({ unsubscribeUrl: UNSUB_URL }));
    expect(html).toContain(UNSUB_URL);
    expect(html).toContain("Unsubscribe from reminder emails");
  });

  it("HTML: sender information is present", () => {
    const { html } = renderLifecycleEmail(make());
    expect(html).toContain("Aizat");
    expect(html).toContain("Founder, Koalapply");
  });

  it("HTML: logo is present", () => {
    const { html } = renderLifecycleEmail(make());
    expect(html).toContain("koalapply-logo-email-white.png");
    expect(html).toContain("Koalapply");
  });

  it("HTML: escapes XSS in first name", () => {
    const { html } = renderLifecycleEmail(make({ firstName: '<script>alert("xss")</script>' }));
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("HTML: escapes ampersand in first name", () => {
    const { html } = renderLifecycleEmail(make({ firstName: "Tom & Jerry" }));
    expect(html).not.toContain("Tom & Jerry");
    expect(html).toContain("Tom &amp; Jerry");
  });

  it("HTML: escapes double-quotes in first name", () => {
    const { html } = renderLifecycleEmail(make({ firstName: 'Say "Hi"' }));
    expect(html).not.toContain('"Hi"');
    expect(html).toContain("&quot;Hi&quot;");
  });

  it("plain text: correct greeting with name", () => {
    const { text } = renderLifecycleEmail(make({ firstName: "Alex" }));
    expect(text).toContain("Hi Alex,");
  });

  it("plain text: fallback greeting without name", () => {
    const { text } = renderLifecycleEmail(make({ firstName: null }));
    expect(text).toContain("Hi there,");
  });

  it("plain text: includes 1 free application (singular)", () => {
    const { text } = renderLifecycleEmail(make({ remaining: 1 }));
    expect(text).toContain("1 free Koalapply application");
    expect(text).not.toContain("1 free Koalapply applications");
  });

  it("plain text: includes 2 free applications (plural)", () => {
    const { text } = renderLifecycleEmail(make({ remaining: 2 }));
    expect(text).toContain("2 free Koalapply applications");
  });

  it("plain text: CTA includes root URL (no /dashboard route)", () => {
    const { text } = renderLifecycleEmail(make());
    expect(text).toContain("https://koalapply.com/");
    expect(text).not.toContain("https://koalapply.com/dashboard");
  });

  it("plain text: includes unsubscribe URL as plain text", () => {
    const { text } = renderLifecycleEmail(make({ unsubscribeUrl: UNSUB_URL }));
    expect(text).toContain(UNSUB_URL);
    expect(text).toContain("Unsubscribe from reminder emails");
  });

  it("plain text: no HTML tags present", () => {
    const { text } = renderLifecycleEmail(make());
    expect(text).not.toMatch(/<[^>]+>/);
  });

  it("does not claim applications never expire or are indefinitely available", () => {
    const { html, text } = renderLifecycleEmail(make());
    for (const content of [html, text]) {
      expect(content.toLowerCase()).not.toContain("never expire");
      expect(content.toLowerCase()).not.toContain("always be there");
      expect(content.toLowerCase()).not.toContain("indefinitely");
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Reminder 2
// ─────────────────────────────────────────────────────────────────────────────

describe("Reminder 2 — Found another job worth applying for?", () => {

  it("subject line is correct", () => {
    const { subject } = renderLifecycleEmail(make({ reminderType: "reminder_2" }));
    expect(subject).toBe("Found another job worth applying for?");
  });

  it("HTML: first name is personalised", () => {
    const { html } = renderLifecycleEmail(make({ reminderType: "reminder_2", firstName: "Jordan" }));
    expect(html).toContain("Hi Jordan,");
  });

  it("HTML: missing first name falls back to 'Hi there,'", () => {
    const { html } = renderLifecycleEmail(make({ reminderType: "reminder_2", firstName: null }));
    expect(html).toContain("Hi there,");
  });

  it("HTML: singular grammar with 1 remaining", () => {
    const { html } = renderLifecycleEmail(make({ reminderType: "reminder_2", remaining: 1 }));
    expect(html).toContain("1 free Koalapply application");
    expect(html).not.toContain("1 free Koalapply applications");
  });

  it("HTML: plural grammar with 2 remaining", () => {
    const { html } = renderLifecycleEmail(make({ reminderType: "reminder_2", remaining: 2 }));
    expect(html).toContain("2 free Koalapply applications");
  });

  it("HTML: CTA button labelled 'Try another job' pointing to /", () => {
    const { html } = renderLifecycleEmail(make({ reminderType: "reminder_2" }));
    expect(html).toContain("Try another job");
    expect(html).toContain("https://koalapply.com/");
    expect(html).not.toContain("https://koalapply.com/dashboard");
  });

  it("HTML: includes unsubscribe link", () => {
    const { html } = renderLifecycleEmail(make({ reminderType: "reminder_2", unsubscribeUrl: UNSUB_URL }));
    expect(html).toContain(UNSUB_URL);
  });

  it("HTML: escapes XSS in first name", () => {
    const { html } = renderLifecycleEmail(
      make({ reminderType: "reminder_2", firstName: '<script>alert("xss")</script>' })
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("HTML: does not include upgrade pitch", () => {
    const { html } = renderLifecycleEmail(make({ reminderType: "reminder_2" }));
    expect(html.toLowerCase()).not.toContain("upgrade");
    expect(html.toLowerCase()).not.toContain("sprint");
    expect(html.toLowerCase()).not.toContain("pricing");
  });

  it("plain text: CTA includes root URL (no /dashboard route)", () => {
    const { text } = renderLifecycleEmail(make({ reminderType: "reminder_2" }));
    expect(text).toContain("https://koalapply.com/");
    expect(text).not.toContain("https://koalapply.com/dashboard");
  });

  it("plain text: no HTML tags present", () => {
    const { text } = renderLifecycleEmail(make({ reminderType: "reminder_2" }));
    expect(text).not.toMatch(/<[^>]+>/);
  });

  it("plain text: includes unsubscribe URL", () => {
    const { text } = renderLifecycleEmail(make({ reminderType: "reminder_2", unsubscribeUrl: UNSUB_URL }));
    expect(text).toContain(UNSUB_URL);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Shared: sender identification
// ─────────────────────────────────────────────────────────────────────────────

describe("Both reminders — sender identification and one-click URL", () => {
  it("FROM_ADDRESS constant is exported for use by the send function", () => {
    expect(FROM_ADDRESS).toContain("Aizat at Koalapply");
    expect(FROM_ADDRESS).toContain("noreply@koalapply.com");
  });

  for (const type of ["reminder_1", "reminder_2"] as const) {
    it(`${type}: HTML includes Aizat / Founder, Koalapply`, () => {
      const { html } = renderLifecycleEmail(make({ reminderType: type }));
      expect(html).toContain("Aizat");
      expect(html).toContain("Founder, Koalapply");
    });

    it(`${type}: oneClickUnsubscribeUrl uses the one-click path`, () => {
      const { oneClickUnsubscribeUrl } = renderLifecycleEmail(make({ reminderType: type }));
      expect(oneClickUnsubscribeUrl).toContain("/api/unsubscribe/lifecycle/one-click");
      expect(oneClickUnsubscribeUrl).toContain("test-token");
    });

    it(`${type}: oneClickUnsubscribeUrl differs from footer unsubscribeUrl`, () => {
      const result = renderLifecycleEmail(make({ reminderType: type }));
      expect(result.oneClickUnsubscribeUrl).not.toBe(UNSUB_URL);
    });
  }
});
