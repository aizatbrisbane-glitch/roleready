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
  const userId = String(body?.userId ?? "");

  if (!organizationId || !userId) {
    return NextResponse.json({ error: "Choose an employee to revoke." }, { status: 400 });
  }

  const { data: org } = await supabase.from("organizations").select("status").eq("id", organizationId).maybeSingle();
  if (org?.status !== "active") {
    return NextResponse.json({ error: "This organisation is deactivated. Contact Koalapply to reactivate." }, { status: 403 });
  }

  const { error } = await supabase.rpc("enterprise_revoke_employee", {
    p_organization_id: organizationId,
    p_user_id: userId,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
