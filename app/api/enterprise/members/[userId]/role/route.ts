import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Not configured." }, { status: 500 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { userId } = await params;
  const body = await request.json().catch(() => null);
  const organizationId = String(body?.organizationId ?? "");
  const role = String(body?.role ?? "");

  if (!organizationId || !["admin", "employee"].includes(role)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Caller must be owner of this org
  const { data: callerMember } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (callerMember?.role !== "owner") {
    return NextResponse.json({ error: "Only the organisation owner can change roles." }, { status: 403 });
  }

  const { data: org } = await supabase.from("organizations").select("status").eq("id", organizationId).maybeSingle();
  if (org?.status !== "active") {
    return NextResponse.json({ error: "This organisation is deactivated. Contact Koalapply to reactivate." }, { status: 403 });
  }

  // Prevent changing the owner's role
  const { data: targetMember } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!targetMember) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }
  if (targetMember.role === "owner") {
    return NextResponse.json({ error: "Cannot change the owner's role." }, { status: 400 });
  }

  const { error } = await supabase
    .from("organization_members")
    .update({ role })
    .eq("organization_id", organizationId)
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
