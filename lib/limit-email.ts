import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";

const APP_URL = "https://koalapply.com";

function monthStartIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

function variantA(greeting: string) {
  return {
    subject: "You've used your free application this month",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1e293b">
        <img src="${APP_URL}/brand/koalapply-logo.png" alt="Koalapply" width="220" style="width:220px;height:auto;margin-bottom:32px" />
        <p style="font-size:15px;line-height:1.6;margin:0 0 16px">${greeting}</p>
        <p style="font-size:15px;line-height:1.6;margin:0 0 16px">
          You just used your one free application on KoalaApply. Nice work — that's one more resume tailored to actually get past the ATS.
        </p>
        <p style="font-size:15px;line-height:1.6;margin:0 0 24px">
          If you're applying to more than one role this month, the 7-Day Sprint gets you 12 applications for $9. That's less than a coffee a day for a focused push.
        </p>
        <a href="${APP_URL}/pricing" style="display:inline-block;background:#2200ff;color:#fff;font-weight:700;font-size:15px;padding:14px 28px;border-radius:9999px;text-decoration:none">
          Start 7-Day Sprint →
        </a>
        <p style="font-size:14px;line-height:1.6;margin:32px 0 0;color:#64748b">
          Your free application resets on the 1st of next month if you'd rather wait.
        </p>
        <p style="font-size:13px;color:#94a3b8;margin:24px 0 0">
          Cheers,<br />The KoalaApply team
        </p>
      </div>
    `,
  };
}

function variantB(greeting: string) {
  return {
    subject: "You've used both your applications this month",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1e293b">
        <img src="${APP_URL}/brand/koalapply-logo.png" alt="Koalapply" width="220" style="width:220px;height:auto;margin-bottom:32px" />
        <p style="font-size:15px;line-height:1.6;margin:0 0 16px">${greeting}</p>
        <p style="font-size:15px;line-height:1.6;margin:0 0 16px">
          You've now used both your applications this month, so you're clearly putting KoalaApply to work.
        </p>
        <p style="font-size:15px;line-height:1.6;margin:0 0 24px">
          If you're mid job search, the 30-Day Focus gives you 50 applications over 30 days for $19 — our best value plan. Or if you need a bigger runway, the 90-Day Partner covers 150 applications over 90 days for $49.
        </p>
        <a href="${APP_URL}/pricing" style="display:inline-block;background:#2200ff;color:#fff;font-weight:700;font-size:15px;padding:14px 28px;border-radius:9999px;text-decoration:none">
          See plans →
        </a>
        <p style="font-size:14px;line-height:1.6;margin:32px 0 0;color:#64748b">
          Your credits reset on the 1st if you'd rather hold off.
        </p>
        <p style="font-size:13px;color:#94a3b8;margin:24px 0 0">
          Cheers,<br />The KoalaApply team
        </p>
      </div>
    `,
  };
}

export async function sendLimitReachedEmail(opts: {
  supabase: SupabaseClient;
  userId: string;
  email: string;
  firstName: string | null;
  applicationLimit: number;
  limitEmailSentAt: string | null;
}): Promise<void> {
  // Guard: at most one email per calendar month (UTC) — same cycle as the generation counter reset
  if (opts.limitEmailSentAt && new Date(opts.limitEmailSentAt) >= new Date(monthStartIso())) {
    console.log(`[limit-email] already sent this billing cycle for user ${opts.userId} — skipping`);
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[limit-email] RESEND_API_KEY not set — skipping limit-reached email");
    return;
  }

  if (!opts.email) {
    console.warn(`[limit-email] no email address for user ${opts.userId} — skipping`);
    return;
  }

  const greeting = opts.firstName?.trim() ? `Hi ${opts.firstName},` : "Hi there,";
  const { subject, html } = opts.applicationLimit === 2 ? variantB(greeting) : variantA(greeting);

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from: "Koalapply <noreply@koalapply.com>",
    to: opts.email,
    subject,
    html,
  });

  if (error) {
    console.error(`[limit-email] send failed for user ${opts.userId}:`, error);
    return;
  }

  const variant = opts.applicationLimit === 2 ? "B" : "A";
  console.log(`[limit-email] sent variant ${variant} to user ${opts.userId} (resend id: ${data?.id})`);

  // Stamp the profile so we don't re-send this billing cycle.
  // Failure here is non-fatal — worst case they receive a duplicate next blocked attempt.
  const { error: updateError } = await opts.supabase
    .from("profiles")
    .update({ limit_email_sent_at: new Date().toISOString() })
    .eq("id", opts.userId);

  if (updateError) {
    console.error(`[limit-email] failed to stamp limit_email_sent_at for user ${opts.userId}:`, updateError.message);
  }
}
