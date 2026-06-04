import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

  const { error } = await supabase.rpc("enterprise_grant_employee_access", {
    p_organization_id: organizationId,
    p_email: email,
  });

  if (!error) {
    return NextResponse.json({ ok: true, action: "access_granted" });
  }

  if (!error.message.includes("No ApplyHQ user was found")) {
    return NextResponse.json({ error: error.message }, { status: 400 });
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
  const { error: inviteEmailError } = await adminSupabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${requestUrl.origin}/auth/invite`,
    data: {
      organization_id: organizationId,
      organization_name: invitation?.organization_name,
      enterprise_invitation_id: invitation?.invitation_id,
    },
  });

  if (inviteEmailError) {
    return NextResponse.json({
      ok: true,
      action: "invite_recorded",
      warning: `Invite saved, but the email could not be sent: ${inviteEmailError.message}`,
    });
  }

  return NextResponse.json({ ok: true, action: "invite_sent" });
}
