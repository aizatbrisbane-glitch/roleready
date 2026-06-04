import { NextResponse } from "next/server";
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
  const invitationId = String(body?.invitationId ?? "");

  if (!organizationId || !invitationId) {
    return NextResponse.json({ error: "Choose an invitation to cancel." }, { status: 400 });
  }

  const { error } = await supabase.rpc("enterprise_revoke_invitation", {
    p_organization_id: organizationId,
    p_invitation_id: invitationId,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
