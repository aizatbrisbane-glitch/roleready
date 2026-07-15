declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function fireEvent(eventName: string, params?: Record<string, string | number | boolean>) {
  if (typeof window === "undefined") return;
  if (process.env.NODE_ENV === "development") {
    console.log("[analytics]", eventName, params ?? {});
  }
  window.gtag?.("event", eventName, params);
}

export const analytics = {
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
