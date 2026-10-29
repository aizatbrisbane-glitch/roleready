import type { LifecycleReminderType } from "@/types/database";

const APP_URL = "https://koalapply.com";
const SENDER_NAME = "Aizat";
const SENDER_TITLE = "Founder, Koalapply";
const FROM_ADDRESS = "Aizat at Koalapply <noreply@koalapply.com>";

export { FROM_ADDRESS };

export type TailorIntentJobContext = {
  title: string;
  company: string;
  /** URL the CTA should deep-link to — the dashboard, which shows the "Continue" banner */
  ctaUrl: string;
  /** True when the user already has a master resume on file */
  hasResume: boolean;
};

export type LifecycleEmailData = {
  reminderType: LifecycleReminderType;
  firstName: string | null;
  remaining: number;
  unsubscribeUrl: string;
  /** When present, personalise the email around this specific saved job */
  tailorIntentJob?: TailorIntentJobContext | null;
  /** Used only in generic reminder_1. First target job title from onboarding. */
  primaryJobTitle?: string | null;
  /** Used only in generic reminder_1. Location from onboarding profile. */
  location?: string | null;
};

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
  // For the outgoing email's List-Unsubscribe and List-Unsubscribe-Post headers.
  // Same token as unsubscribeUrl, different path.
  oneClickUnsubscribeUrl: string;
};

// ─── HTML helpers ─────────────────────────────────────────────────────────────

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function greetingHtml(firstName: string | null): string {
  const name = firstName?.trim();
  return name ? `Hi ${esc(name)},` : "Hi there,";
}

function applicationPhrase(n: number): string {
  return n === 1 ? "1 free Koalapply application" : `${n} free Koalapply applications`;
}

function applicationShort(n: number): string {
  return n === 1 ? "application" : "applications";
}

// ─── Shared HTML layout ───────────────────────────────────────────────────────
//
// Inline styles throughout — email clients strip <style> blocks.
// max-width 600px matches common safe email widths.
// Logo source matches the path used in lib/limit-email.ts.

function htmlLayout(body: string, unsubscribeUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>Koalapply</title>
  <style>
    :root { color-scheme: light; }
  </style>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc">
    <tr>
      <td align="center" style="padding:32px 16px">
        <table role="presentation" bgcolor="#ffffff" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden">
          <tr>
            <td bgcolor="#ffffff" style="background-color:#ffffff;padding:32px 32px 0">
              <img src="${APP_URL}/brand/koalapply-logo-email-white.png" alt="Koalapply" width="180" style="width:180px;height:auto;display:block;margin-bottom:28px" />
            </td>
          </tr>
          <tr>
            <td bgcolor="#ffffff" style="background-color:#ffffff;padding:0 32px 32px;color:#1e293b;font-size:15px;line-height:1.7">
              ${body}
            </td>
          </tr>
          <tr>
            <td bgcolor="#ffffff" style="background-color:#ffffff;padding:20px 32px 28px;border-top:1px solid #f1f5f9">
              <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6">
                You're receiving this because you created a Koalapply account.<br />
                <a href="${esc(unsubscribeUrl)}" style="color:#94a3b8">Unsubscribe from reminder emails</a>
                &nbsp;·&nbsp;
                <a href="${APP_URL}" style="color:#94a3b8">koalapply.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function ctaButton(label: string, href: string): string {
  return `<a href="${esc(href)}" style="display:inline-block;background:#2200ff;color:#fff;font-weight:700;font-size:15px;padding:14px 28px;border-radius:9999px;text-decoration:none;margin:8px 0 24px">${esc(label)}</a>`;
}

function p(content: string): string {
  return `<p style="margin:0 0 16px">${content}</p>`;
}

function signature(): string {
  return `<p style="margin:24px 0 0;font-size:15px;color:#475569">Good luck with the job search!<br /><br />${SENDER_NAME}<br /><span style="color:#94a3b8;font-size:13px">${SENDER_TITLE}</span></p>`;
}

// ─── Reminder 1 — First application ──────────────────────────────────────────

function reminder1Html(data: LifecycleEmailData): string {
  const greeting = greetingHtml(data.firstName);

  // Personalised variant: user previously clicked Tailor & Apply on a specific job
  if (data.tailorIntentJob) {
    const { title, company, ctaUrl, hasResume } = data.tailorIntentJob;
    const resumePara = hasResume
      ? "If you're still interested, you can pick up where you left off and Koalapply will help you tailor your application for the role."
      : "If you're still interested, add your resume and Koalapply will help you tailor your application for the role.";
    const body = `
      ${p(greeting)}
      ${p(`Are you still interested in applying for the <strong>${esc(title)}</strong> role at <strong>${esc(company)}</strong>?`)}
      ${p("You started preparing your application but didn't quite finish it.")}
      ${p(resumePara)}
      ${ctaButton("Continue your application →", esc(ctaUrl))}
      <p style="margin:24px 0 0;font-size:15px;color:#475569">Good luck!<br /><br />${SENDER_NAME}<br /><span style="color:#94a3b8;font-size:13px">${SENDER_TITLE}</span></p>
    `;
    return htmlLayout(body, data.unsubscribeUrl);
  }

  // Generic variant: bring the user back to their job matches
  const t = data.primaryJobTitle?.trim() || null;
  const l = data.location?.trim() || null;
  const firstPara = t && l
    ? `Still looking for <strong>${esc(t)}</strong> roles in <strong>${esc(l)}</strong>?`
    : t
    ? `Still looking for <strong>${esc(t)}</strong> roles?`
    : l
    ? `Still looking for roles in <strong>${esc(l)}</strong>?`
    : "Still looking for your next role?";

  const body = `
    ${p(greeting)}
    ${p(firstPara)}
    ${p("Pick one you're interested in and Koalapply can help you understand your match and prepare a tailored application.")}
    ${ctaButton("See my job matches →", `${APP_URL}/login?redirect=/`)}
    <p style="margin:24px 0 0;font-size:15px;color:#475569">Good luck!<br /><br />${SENDER_NAME}<br /><span style="color:#94a3b8;font-size:13px">${SENDER_TITLE}</span></p>
  `;

  return htmlLayout(body, data.unsubscribeUrl);
}

function reminder1Text(data: LifecycleEmailData): string {
  const greeting = data.firstName?.trim() ? `Hi ${data.firstName.trim()},` : "Hi there,";

  // Personalised variant
  if (data.tailorIntentJob) {
    const { title, company, ctaUrl, hasResume } = data.tailorIntentJob;
    const resumeLine = hasResume
      ? "If you're still interested, you can pick up where you left off and Koalapply will help you tailor your application for the role."
      : "If you're still interested, add your resume and Koalapply will help you tailor your application for the role.";
    return [
      greeting,
      "",
      `Are you still interested in applying for the ${title} role at ${company}?`,
      "",
      "You started preparing your application but didn't quite finish it.",
      "",
      resumeLine,
      "",
      `Continue your application → ${ctaUrl}`,
      "",
      "Good luck!",
      "",
      SENDER_NAME,
      SENDER_TITLE,
      "",
      `Unsubscribe from reminder emails: ${data.unsubscribeUrl}`,
    ].join("\n");
  }

  // Generic variant
  const t = data.primaryJobTitle?.trim() || null;
  const l = data.location?.trim() || null;
  const firstLine = t && l
    ? `Still looking for ${t} roles in ${l}?`
    : t
    ? `Still looking for ${t} roles?`
    : l
    ? `Still looking for roles in ${l}?`
    : "Still looking for your next role?";

  return [
    greeting,
    "",
    firstLine,
    "",
    "Pick one you're interested in and Koalapply can help you understand your match and prepare a tailored application.",
    "",
    `See my job matches → ${APP_URL}/login?redirect=/`,
    "",
    "Good luck!",
    "",
    SENDER_NAME,
    SENDER_TITLE,
    "",
    `Unsubscribe from reminder emails: ${data.unsubscribeUrl}`,
  ].join("\n");
}

// ─── Reminder 2 — Another application ────────────────────────────────────────

function reminder2Html(data: LifecycleEmailData): string {
  const greeting = greetingHtml(data.firstName);
  const phrase = applicationPhrase(data.remaining);
  const short = applicationShort(data.remaining);

  const body = `
    ${p(greeting)}
    ${p("Hope the job search is going well.")}
    ${p(`You've still got <strong>${esc(phrase)}</strong> left, so if another interesting role has popped up, you can run it through Koalapply too.`)}
    ${p(`Just paste the job and we'll help you check the match and tailor your ${esc(short === "application" ? "application" : "applications")}.`)}
    ${ctaButton("Try another job →", `${APP_URL}/login?redirect=/`)}
    ${signature()}
  `;

  return htmlLayout(body, data.unsubscribeUrl);
}

function reminder2Text(data: LifecycleEmailData): string {
  const greeting = data.firstName?.trim() ? `Hi ${data.firstName.trim()},` : "Hi there,";
  const phrase = applicationPhrase(data.remaining);
  const short = applicationShort(data.remaining);

  return [
    greeting,
    "",
    "Hope the job search is going well.",
    "",
    `You've still got ${phrase} left, so if another interesting role has popped up, you can run it through Koalapply too.`,
    "",
    `Just paste the job and we'll help you check the match and tailor your ${short}.`,
    "",
    `Try another job → ${APP_URL}/login?redirect=/`,
    "",
    "Good luck — hope the next one is a great fit.",
    "",
    SENDER_NAME,
    SENDER_TITLE,
    "",
    `Unsubscribe from reminder emails: ${data.unsubscribeUrl}`,
  ].join("\n");
}

// ─── Public renderer ──────────────────────────────────────────────────────────

function genericReminder1Subject(title: string | null, location: string | null): string {
  if (title && location) return `Still looking for a ${title} role in ${location}?`;
  if (title) return `Still looking for ${title} roles?`;
  if (location) return `Still looking for roles in ${location}?`;
  return "Still looking for your next role?";
}

function toOneClickUrl(unsubscribeUrl: string): string {
  try {
    const url = new URL(unsubscribeUrl);
    url.pathname = "/api/unsubscribe/lifecycle/one-click";
    return url.toString();
  } catch {
    // Fallback for malformed URLs in tests/previews.
    return unsubscribeUrl.replace("/unsubscribe/lifecycle", "/api/unsubscribe/lifecycle/one-click");
  }
}

export function renderLifecycleEmail(data: LifecycleEmailData): RenderedEmail {
  const oneClickUnsubscribeUrl = toOneClickUrl(data.unsubscribeUrl);
  if (data.reminderType === "reminder_1") {
    const subject = data.tailorIntentJob
      ? `Still interested in the ${data.tailorIntentJob.title} role?`
      : genericReminder1Subject(data.primaryJobTitle ?? null, data.location ?? null);
    return {
      subject,
      html: reminder1Html(data),
      text: reminder1Text(data),
      oneClickUnsubscribeUrl,
    };
  }
  return {
    subject: "Found another job worth applying for?",
    html: reminder2Html(data),
    text: reminder2Text(data),
    oneClickUnsubscribeUrl,
  };
}
