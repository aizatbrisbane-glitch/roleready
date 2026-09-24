import { deferBrowserAnalytics } from "./analytics-browser";
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    lintrk?: (action: string, payload?: Record<string, unknown>) => void;
  }
}

const SIGNUP_SOURCE_KEY = "koalapply_signup_source";

function fireEvent(eventName: string, params?: Record<string, string | number | boolean>) {
  if (typeof window === "undefined") return;
  if (!window.koalapplyAnalyticsEnabled) return;
  if (process.env.NODE_ENV === "development") {
    console.log("[analytics]", eventName, params ?? {});
  }
  deferBrowserAnalytics(() => window.gtag?.("event", eventName, params));
}

export const analytics = {
  signupDiagnostic(event: "signup_page_viewed" | "signup_form_started" | "signup_error" | "signup_confirmation_required", form: "hero" | "footer" | "page", errorCode?: "validation" | "password_policy" | "signup_failed") {
    fireEvent(event, { form_placement: form, ...(errorCode ? { error_code: errorCode } : {}) });
  },
  /** Persist the page that initiated the signup flow (call when modal opens or /login loads) */
  setSignupSource(source: string) {
    if (typeof window === "undefined") return;
    try { sessionStorage.setItem(SIGNUP_SOURCE_KEY, source); } catch {}
  },

  /** Read + clear the persisted signup source */
  getSignupSource(): string {
    if (typeof window === "undefined") return "unknown";
    try {
      const value = sessionStorage.getItem(SIGNUP_SOURCE_KEY) ?? "unknown";
      sessionStorage.removeItem(SIGNUP_SOURCE_KEY);
      return value;
    } catch { return "unknown"; }
  },

  /**
   * User completed account creation.
   * GA4 is emitted once by the account-creation outbox.
   * Also fires Meta Pixel CompleteRegistration and LinkedIn lintrk conversion.
   * For Google OAuth signups, trackSignupServerSide() handles everything server-side instead.
   */
  signupComplete(opts: { method: "email" | "email_otp" | "google"; source: string; userId?: string }) {
    deferBrowserAnalytics(() => {
      // GA4 signup is owned by the durable account-discovery outbox.
      // eventID matches the server-side CAPI call so Meta deduplicates and counts it once
      window.fbq?.(
        "track",
        "CompleteRegistration",
        { method: opts.method },
        opts.userId ? { eventID: `signup_${opts.userId}` } : undefined
      );
      const linkedInConvId = process.env.NEXT_PUBLIC_LINKEDIN_SIGNUP_CONVERSION_ID;
      if (linkedInConvId) {
        window.lintrk?.("track", { conversion_id: Number(linkedInConvId) });
      }
    });
  },

  /**
   * User completed a Stripe checkout.
   * GA4 is emitted only by the verified Stripe webhook.
   * Also fires Meta Pixel Purchase — event_id matches the server-side CAPI call so Meta deduplicates.
   */
  purchaseComplete(opts: { plan: string; value: number; currency: string; transactionId: string }) {
    deferBrowserAnalytics(() => {
      // Stripe-verified browser Meta event only; GA4 purchase is webhook-owned.
      window.fbq?.(
        "track",
        "Purchase",
        { value: opts.value, currency: opts.currency, content_name: opts.plan },
        { eventID: `purchase_${opts.transactionId}` }
      );
    });
  },

  /** User clicked "Check my score" on the ATS checker tool */
  atsCheck(opts: { resumeLength: number; jdLength: number }) {
    fireEvent("ats_check", {
      resume_length: opts.resumeLength,
      jd_length: opts.jdLength,
    });
  },

  /** User clicked the BlogResumeCTA upload zone or button */
  blogCtaClick(opts: { sourceSlug: string; placement: string }) {
    fireEvent("blog_cta_click", {
      source_slug: opts.sourceSlug,
      placement: opts.placement,
    });
  },

  /** User clicked a login/signup link while on a blog article */
  blogSignupClick(opts: { sourceSlug: string }) {
    fireEvent("blog_signup_click", { source_slug: opts.sourceSlug });
  },

  /** User clicked a link pointing to /ats-checker */
  atsCheckerNavClick(opts: { placement: "nav" | "footer" | "homepage_card" | "blog_inline" }) {
    fireEvent("ats_checker_nav_click", { placement: opts.placement });
  },

  /** Free-tier user hit their generation limit (server returned 402).
   *  limit=1 → base free tier; limit=2 → newsletter subscriber bonus tier. */
  creditLimitReached(opts: { limit: number }) {
    fireEvent("credit_limit_reached", { application_limit: opts.limit });
  },
};
