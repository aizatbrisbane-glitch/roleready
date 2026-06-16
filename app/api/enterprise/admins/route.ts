import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const MAX_ADMINS_PER_ORG = 5; // owner + up to 4 co-admins

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Not configured." }, { status: 500 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const organizationId = String(body?.organizationId ?? "");
  const email = String(body?.email ?? "").trim().toLowerCase();

  if (!organizationId || !email) {
    return NextResponse.json({ error: "Organisation and email are required." }, { status: 400 });
  }

  // Caller must be owner of this org
  const { data: callerMember } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (callerMember?.role !== "owner") {
    return NextResponse.json({ error: "Only the organisation owner can add admins." }, { status: 403 });
  }

  const { data: org } = await supabase.from("organizations").select("status").eq("id", organizationId).maybeSingle();
  if (org?.status !== "active") {
    return NextResponse.json({ error: "This organisation is deactivated. Contact Koalapply to reactivate." }, { status: 403 });
  }

  const adminClient = createSupabaseAdminClient();
  if (!adminClient) return NextResponse.json({ error: "Admin client not configured." }, { status: 500 });

  // Enforce max admin count
  const { count: adminCount } = await adminClient
    .from("organization_members")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .in("role", ["owner", "admin"]);

  if ((adminCount ?? 0) >= MAX_ADMINS_PER_ORG) {
    return NextResponse.json(
      { error: `This organisation has reached the maximum of ${MAX_ADMINS_PER_ORG} admins.` },
      { status: 400 }
    );
  }

  // Look up existing profile by email
  const { data: profile } = await adminClient
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (profile?.id) {
    // Check if already a member of this org
    const { data: existingMember } = await adminClient
      .from("organization_members")
      .select("role")
      .eq("organization_id", organizationId)
      .eq("user_id", profile.id)
      .maybeSingle();

    if (existingMember) {
      if (existingMember.role === "owner") {
        return NextResponse.json({ error: "This person is already the organisation owner." }, { status: 400 });
      }
      if (existingMember.role === "admin") {
        return NextResponse.json({ error: "This person is already an admin." }, { status: 400 });
      }
      // Promote existing employee to admin
      const { error } = await adminClient
        .from("organization_members")
        .update({ role: "admin" })
        .eq("organization_id", organizationId)
        .eq("user_id", profile.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, action: "promoted" });
    }

    // Existing user not in org — add directly as admin
    const { error } = await adminClient
      .from("organization_members")
      .insert({ organization_id: organizationId, user_id: profile.id, role: "admin" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, action: "added" });
  }

  // New user — send invite email and insert as admin
  const requestUrl = new URL(request.url);
  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${requestUrl.origin}/auth/invite`,
  });

  if (inviteError || !inviteData?.user?.id) {
    return NextResponse.json({ error: inviteError?.message ?? "Failed to send invite." }, { status: 500 });
  }

  const { error: memberError } = await adminClient
    .from("organization_members")
    .insert({ organization_id: organizationId, user_id: inviteData.user.id, role: "admin" });

  if (memberError) return NextResponse.json({ error: memberError.message }, { status: 500 });

  return NextResponse.json({ ok: true, action: "invited" });
}
