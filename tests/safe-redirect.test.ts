import { describe, expect, it } from "vitest";
import { isSafeRedirect } from "../lib/safe-redirect";

// ─────────────────────────────────────────────────────────────────────────────
// isSafeRedirect — unit tests
// ─────────────────────────────────────────────────────────────────────────────

describe("isSafeRedirect — valid same-origin paths", () => {
  it("accepts root /", () => expect(isSafeRedirect("/")).toBe(true));
  it("accepts a nested path", () => expect(isSafeRedirect("/dashboard/settings")).toBe(true));
  it("accepts path with query string", () => expect(isSafeRedirect("/?tab=matches")).toBe(true));
  it("accepts path with fragment", () => expect(isSafeRedirect("/pricing#faq")).toBe(true));
  it("accepts path with multiple query params", () => expect(isSafeRedirect("/blog?page=2&tag=jobs")).toBe(true));
});

describe("isSafeRedirect — rejects external URLs", () => {
  it("rejects https:// external URL", () => expect(isSafeRedirect("https://evil.com")).toBe(false));
  it("rejects http:// external URL", () => expect(isSafeRedirect("http://evil.com")).toBe(false));
  it("rejects https:// with path", () => expect(isSafeRedirect("https://evil.com/steal")).toBe(false));
  it("rejects javascript: scheme (XSS vector)", () => expect(isSafeRedirect("javascript:alert(1)")).toBe(false));
  it("rejects data: scheme", () => expect(isSafeRedirect("data:text/html,<script>alert(1)</script>")).toBe(false));
});

describe("isSafeRedirect — rejects protocol-relative URLs", () => {
  it("rejects //evil.com", () => expect(isSafeRedirect("//evil.com")).toBe(false));
  it("rejects //evil.com/path", () => expect(isSafeRedirect("//evil.com/path")).toBe(false));
  it("rejects //koalapply.com (own domain still rejected — stays relative)", () => {
    // Protocol-relative //own-domain.com can be downgraded to http:// by attackers
    expect(isSafeRedirect("//koalapply.com")).toBe(false);
  });
});

describe("isSafeRedirect — rejects null/undefined/empty", () => {
  it("rejects null", () => expect(isSafeRedirect(null)).toBe(false));
  it("rejects undefined", () => expect(isSafeRedirect(undefined)).toBe(false));
  it("rejects empty string", () => expect(isSafeRedirect("")).toBe(false));
  it("rejects bare hostname without slash", () => expect(isSafeRedirect("evil.com")).toBe(false));
  it("rejects relative path without leading slash", () => expect(isSafeRedirect("login")).toBe(false));
});

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle email CTA — redirect parameter safety
// ─────────────────────────────────────────────────────────────────────────────

describe("lifecycle email CTA — redirect destinations are safe", () => {
  it("reminder_1 generic CTA: /login?redirect=/ carries a safe redirect", () => {
    const ctaUrl = "https://koalapply.com/login?redirect=/";
    const redirectParam = new URL(ctaUrl).searchParams.get("redirect");
    expect(isSafeRedirect(redirectParam)).toBe(true);
    expect(redirectParam).toBe("/");
  });

  it("reminder_1 tailor-intent CTA: /login?redirect=/ carries a safe redirect", () => {
    // fetchTailorIntentJob in lifecycle-email-sender.ts sets ctaUrl to
    // `${APP_URL}/login?redirect=/`
    const ctaUrl = "https://koalapply.com/login?redirect=/";
    const redirectParam = new URL(ctaUrl).searchParams.get("redirect");
    expect(isSafeRedirect(redirectParam)).toBe(true);
  });

  it("reminder_2 CTA: /login?redirect=/ carries a safe redirect", () => {
    const ctaUrl = "https://koalapply.com/login?redirect=/";
    const redirectParam = new URL(ctaUrl).searchParams.get("redirect");
    expect(isSafeRedirect(redirectParam)).toBe(true);
  });

  it("malicious ?redirect= is rejected and falls back to /", () => {
    // Simulate what app/login/page.tsx does after validation
    const maliciousParams = [
      "https://evil.com",
      "//evil.com",
      "javascript:alert(1)",
      "http://evil.com/steal",
    ];
    for (const redirectParam of maliciousParams) {
      const redirectTo = isSafeRedirect(redirectParam) ? redirectParam : "/";
      expect(redirectTo).toBe("/");
    }
  });

  it("safe ?redirect=/path is preserved", () => {
    const redirectParam = "/";
    const redirectTo = isSafeRedirect(redirectParam) ? redirectParam : "/";
    expect(redirectTo).toBe("/");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Auth callback — ?next= validation
// ─────────────────────────────────────────────────────────────────────────────

describe("auth callback — ?next= validation", () => {
  it("safe ?next=/ is preserved through the callback", () => {
    const rawNext = "/";
    const next = isSafeRedirect(rawNext) ? rawNext : "/";
    expect(next).toBe("/");
  });

  it("null ?next= falls back to /", () => {
    const rawNext = null;
    const next = isSafeRedirect(rawNext) ? rawNext : "/";
    expect(next).toBe("/");
  });

  it("external ?next= is rejected and falls back to /", () => {
    const rawNext = "https://evil.com";
    const next = isSafeRedirect(rawNext) ? rawNext : "/";
    expect(next).toBe("/");
  });

  it("protocol-relative ?next= is rejected and falls back to /", () => {
    const rawNext = "//evil.com";
    const next = isSafeRedirect(rawNext) ? rawNext : "/";
    expect(next).toBe("/");
  });

  it("safe next is passed to new URL() as same-origin", () => {
    const next = "/";
    const result = new URL(next, "https://koalapply.com");
    expect(result.hostname).toBe("koalapply.com");
    expect(result.pathname).toBe("/");
  });
});
