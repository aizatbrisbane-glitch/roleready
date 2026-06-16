import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function sendExistingUserInviteEmail({
  email,
  organizationName,
  actionLink,
}: {
  email: string;
  organizationName?: string | null;
  actionLink: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    return { skipped: true, error: "RESEND_API_KEY or RESEND_FROM_EMAIL is not configured." };
  }

  const safeOrgName = organizationName || "your organisation";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: `You're invited to ${safeOrgName} on Koalapply`,
      html: `
        <div style="margin:0;padding:0;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;color:#061333;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7fb;padding:40px 16px;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:24px;border:1px solid #e7ebf3;overflow:hidden;">
                  <tr>
                    <td align="center" style="padding:36px 32px 18px;">
                      <img src="https://koalapply.com/brand/koalapply-logo.png" alt="Koalapply" style="height:80px;" />
                      <p style="margin:10px 0 0;font-size:14px;color:#60708f;">Enterprise invitation</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:12px 40px 40px;text-align:center;">
                      <h1 style="margin:0 0 14px;font-size:26px;line-height:1.2;color:#061333;">Accept your enterprise access</h1>
                      <p style="margin:0 auto 28px;max-width:390px;font-size:16px;line-height:1.6;color:#405476;">
                        ${safeOrgName} has invited you to use Koalapply. Accept the invite to join their enterprise workspace.
                      </p>
                      <a href="${actionLink}" style="display:inline-block;background:#2f00ff;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:16px 34px;border-radius:999px;">
                        Accept invitation
                      </a>
                      <p style="margin:28px 0 0;font-size:13px;line-height:1.6;color:#8796b3;">
                        If you weren't expecting this invite, you can ignore this email.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </div>
      `,
      text: `${safeOrgName} has invited you to use Koalapply.\n\nAccept invitation: ${actionLink}\n\nIf you weren't expecting this invite, you can ignore this email.`,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    return { skipped: false, error: body || "Resend could not send the invite email." };
  }

  return { skipped: false, error: null };
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in before managing enterprise seats." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const organizationId = String(body?.organizationId ?? "");
  const email = String(body?.email ?? "").trim();

  if (!organizationId || !email) {
    return NextResponse.json({ error: "Choose an organization and enter an employee email." }, { status: 400 });
  }

  const { data: org } = await supabase.from("organizations").select("status").eq("id", organizationId).maybeSingle();
  if (org?.status !== "active") {
    return NextResponse.json({ error: "This organisation is deactivated. Contact Koalapply to reactivate." }, { status: 403 });
  }

  const { data: invitationRows, error: invitationError } = await supabase.rpc("enterprise_create_employee_invitation", {
    p_organization_id: organizationId,
    p_email: email,
  });

  if (invitationError) {
    return NextResponse.json({ error: invitationError.message }, { status: 400 });
  }

  const invitation = Array.isArray(invitationRows) ? invitationRows[0] : null;
  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return NextResponse.json({
      ok: true,
      action: "invite_recorded",
      warning: "Invite saved, but SUPABASE_SERVICE_ROLE_KEY is not configured so no email was sent.",
    });
  }

  const requestUrl = new URL(request.url);
  const redirectTo = `${requestUrl.origin}/auth/invite`;
  const userExists = Boolean(invitation?.user_exists);

  if (userExists) {
    // Don't use generateLink — it auto-sends a Supabase email on top of ours.
    // Existing users can sign in normally and land on /auth/invite to accept.
    const emailResult = await sendExistingUserInviteEmail({
      email,
      organizationName: invitation?.organization_name,
      actionLink: redirectTo,
    });

    if (emailResult.error) {
      return NextResponse.json({
        ok: true,
        action: "invite_recorded",
        warning: `Invite saved, but the email could not be sent: ${emailResult.error}`,
      });
    }

    return NextResponse.json({ ok: true, action: "invite_sent" });
  }

  const inviteEmailResult = await adminSupabase.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: {
          organization_id: organizationId,
          organization_name: invitation?.organization_name,
          enterprise_invitation_id: invitation?.invitation_id,
        },
      });

  if (inviteEmailResult.error) {
    return NextResponse.json({
      ok: true,
      action: "invite_recorded",
      warning: `Invite saved, but the email could not be sent: ${inviteEmailResult.error.message}`,
    });
  }

  return NextResponse.json({ ok: true, action: "invite_sent" });
}
