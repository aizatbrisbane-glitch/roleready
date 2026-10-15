import type { LifecycleReminderType } from "@/types/database";

const APP_URL = "https://koalapply.com";
const SENDER_NAME = "Aizat";
const SENDER_TITLE = "Founder, Koalapply";
const FROM_ADDRESS = "Aizat at Koalapply <noreply@koalapply.com>";

export { FROM_ADDRESS };

export type LifecycleEmailData = {
  reminderType: LifecycleReminderType;
  firstName: string | null;
  remaining: number;
  unsubscribeUrl: string;
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
  <title>Koalapply</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc">
    <tr>
      <td align="center" style="padding:32px 16px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:12px;overflow:hidden">
          <tr>
            <td style="padding:32px 32px 0">
              <img src="${APP_URL}/brand/koalapply-logo.png" alt="Koalapply" width="180" style="width:180px;height:auto;display:block;margin-bottom:28px" />
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 32px;color:#1e293b;font-size:15px;line-height:1.7">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid #f1f5f9">
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
  const phrase = applicationPhrase(data.remaining);
  const short = applicationShort(data.remaining);

  const body = `
    ${p(greeting)}
    ${p(`Just checking in — you've still got <strong>${esc(phrase)}</strong> ready to use.`)}
    ${p("If you've spotted a job you're interested in, just paste the job link into Koalapply. We'll check how well you match the role and help tailor your resume and cover letter.")}
    ${p(`No pressure — your free ${esc(short)} will be there when you're ready.`)}
    ${ctaButton("Try Koalapply →", `${APP_URL}/`)}
    ${signature()}
  `;

  return htmlLayout(body, data.unsubscribeUrl);
}

function reminder1Text(data: LifecycleEmailData): string {
  const greeting = data.firstName?.trim() ? `Hi ${data.firstName.trim()},` : "Hi there,";
  const phrase = applicationPhrase(data.remaining);
  const short = applicationShort(data.remaining);

  return [
    greeting,
    "",
    `Just checking in — you've still got ${phrase} ready to use.`,
    "",
    "If you've spotted a job you're interested in, just paste the job link into Koalapply. We'll check how well you match the role and help tailor your resume and cover letter.",
    "",
    `No pressure — your free ${short} will be there when you're ready.`,
    "",
    `Try Koalapply → ${APP_URL}/`,
    "",
    "Good luck with the job search!",
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
    ${ctaButton("Try another job →", `${APP_URL}/`)}
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
    `Try another job → ${APP_URL}/`,
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
    return {
      subject: "Still looking for your next role?",
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
