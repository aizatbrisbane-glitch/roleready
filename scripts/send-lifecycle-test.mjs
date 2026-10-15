/**
 * One-shot lifecycle test send script.
 * Run: node scripts/send-lifecycle-test.mjs
 *
 * Reads SUPABASE / RESEND credentials from .env.local.
 * Sends exactly ONE Reminder 1 email to the address hardcoded below.
 * Unsubscribe token is linked to the founder account — clicking it
 * only affects the founder's email_preferences row.
 */

import { readFileSync } from "fs"; // still used for .env.local
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

// ── Load .env.local ───────────────────────────────────────────────────────────
const env = {};
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("=");
  if (eq < 0) continue;
  env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = env.RESEND_API_KEY;
const APP_URL = "https://koalapply.com";
const LOGO_SRC = `${APP_URL}/brand/koalapply-logo-email-white.png`;
const TO = "aizat.koalapply@gmail.com";
const FIRST_NAME = "Aizat";
const REMAINING = 2;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !RESEND_API_KEY) {
  console.error("Missing required env vars in .env.local");
  process.exit(1);
}

// ── Supabase admin client ─────────────────────────────────────────────────────
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Find founder/admin user to link unsubscribe token to ─────────────────────
const { data: founderProfile, error: profileErr } = await admin
  .from("profiles")
  .select("id, email, role")
  .in("role", ["founder", "admin"])
  .order("created_at", { ascending: true })
  .limit(1)
  .maybeSingle();

if (profileErr || !founderProfile) {
  console.error("Could not find founder/admin user:", profileErr?.message ?? "no rows");
  process.exit(1);
}
console.log(`Using account: role=${founderProfile.role}, id=${founderProfile.id}`);

// ── Generate unsubscribe token ────────────────────────────────────────────────
// Matches lib/lifecycle-unsubscribe.ts (32 bytes, base64url, SHA-256 hash stored)
const token = crypto.randomBytes(32).toString("base64url");
const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

// ── Upsert email_preferences ──────────────────────────────────────────────────
const { error: prefErr } = await admin.from("email_preferences").upsert(
  {
    user_id: founderProfile.id,
    preference_type: "lifecycle_marketing",
    opted_in: true,
    source: "test_send",
    unsubscribe_token_hash: tokenHash,
    updated_at: new Date().toISOString(),
  },
  { onConflict: "user_id,preference_type" }
);

if (prefErr) {
  console.error("email_preferences upsert failed:", prefErr.message);
  process.exit(1);
}
console.log("email_preferences row upserted for founder account.");

const unsubscribeUrl = `${APP_URL}/unsubscribe/lifecycle?token=${encodeURIComponent(token)}`;
const oneClickUrl = `${APP_URL}/api/unsubscribe/lifecycle/one-click?token=${encodeURIComponent(token)}`;

// ── Render email (mirrors lib/lifecycle-email-templates.ts — reminder_1) ─────
function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const phrase = REMAINING === 1 ? "1 free Koalapply application" : `${REMAINING} free Koalapply applications`;
const short  = REMAINING === 1 ? "application" : "applications";

const htmlBody = `
  <p style="margin:0 0 16px">Hi ${esc(FIRST_NAME)},</p>
  <p style="margin:0 0 16px">Just checking in — you've still got <strong>${esc(phrase)}</strong> ready to use.</p>
  <p style="margin:0 0 16px">If you've spotted a job you're interested in, just paste the job link into Koalapply. We'll check how well you match the role and help tailor your resume and cover letter.</p>
  <p style="margin:0 0 16px">No pressure — your free ${esc(short)} will be there when you're ready.</p>
  <a href="${esc(APP_URL + "/")}" style="display:inline-block;background:#2200ff;color:#fff;font-weight:700;font-size:15px;padding:14px 28px;border-radius:9999px;text-decoration:none;margin:8px 0 24px">Try Koalapply →</a>
  <p style="margin:24px 0 0;font-size:15px;color:#475569">Good luck with the job search!<br /><br />Aizat<br /><span style="color:#94a3b8;font-size:13px">Founder, Koalapply</span></p>
`;

const html = `<!DOCTYPE html>
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
              <img src="${LOGO_SRC}" alt="Koalapply" width="180" style="width:180px;height:auto;display:block;margin-bottom:28px" />
            </td>
          </tr>
          <tr>
            <td bgcolor="#ffffff" style="background-color:#ffffff;padding:0 32px 32px;color:#1e293b;font-size:15px;line-height:1.7">
              ${htmlBody}
            </td>
          </tr>
          <tr>
            <td bgcolor="#ffffff" style="background-color:#ffffff;padding:20px 32px 28px;border-top:1px solid #f1f5f9">
              <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6">
                You're receiving this because you created a Koalapply account.<br />
                <a href="${esc(unsubscribeUrl)}" style="color:#94a3b8">Unsubscribe from reminder emails</a>
                &nbsp;·&nbsp;
                <a href="${esc(APP_URL)}" style="color:#94a3b8">koalapply.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const text = [
  `Hi ${FIRST_NAME},`,
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
  "Aizat",
  "Founder, Koalapply",
  "",
  `Unsubscribe from reminder emails: ${unsubscribeUrl}`,
].join("\n");

// ── Send via Resend ───────────────────────────────────────────────────────────
const resend = new Resend(RESEND_API_KEY);

console.log(`Sending to: ${TO} …`);

const result = await resend.emails.send({
  from: "Aizat at Koalapply <noreply@koalapply.com>",
  to: TO,
  subject: "[TEST SEND] Still looking for your next role?",
  html,
  text,
  headers: {
    "List-Unsubscribe": `<${oneClickUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    "X-Koalapply-Test": "true",
  },
});

if (result.error) {
  console.error("Resend error:", JSON.stringify(result.error, null, 2));
  process.exit(1);
}

console.log("✓ Accepted by Resend");
console.log("  Message ID :", result.data?.id);
console.log("  To         :", TO);
console.log("  Subject    : [TEST SEND] Still looking for your next role?");
console.log("  Unsub URL  :", unsubscribeUrl);
