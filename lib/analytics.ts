declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const SIGNUP_SOURCE_KEY = "koalapply_signup_source";

function fireEvent(eventName: string, params?: Record<string, string | number | boolean>) {
  if (typeof window === "undefined") return;
  if (process.env.NODE_ENV === "development") {
    console.log("[analytics]", eventName, params ?? {});
  }
  window.gtag?.("event", eventName, params);
}

export const analytics = {
  /** Persist the page that initiated the signup flow (call when modal opens or /login loads) */
  setSignupSource(source: string) {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(SIGNUP_SOURCE_KEY, source);
  },

  /** Read + clear the persisted signup source */
  getSignupSource(): string {
    if (typeof window === "undefined") return "unknown";
    const value = sessionStorage.getItem(SIGNUP_SOURCE_KEY) ?? "unknown";
    sessionStorage.removeItem(SIGNUP_SOURCE_KEY);
    return value;
  },

  /**
   * User completed account creation.
   * Uses GA4's recommended `sign_up` event name so it's auto-recognised as a conversion.
   */
  signupComplete(opts: { method: "email" | "email_otp" | "google"; source: string }) {
    fireEvent("sign_up", {
      method: opts.method,
      source: opts.source,
    });
  },

  /**
   * User completed a Stripe checkout.
   * Uses GA4's recommended `purchase` event name with standard ecommerce params.
   */
  purchaseComplete(opts: { plan: string; value: number; currency: string; transactionId: string }) {
    fireEvent("purchase", {
      transaction_id: opts.transactionId,
      value: opts.value,
      currency: opts.currency,
      items: opts.plan,
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
};
