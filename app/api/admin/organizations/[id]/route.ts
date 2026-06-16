import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;
  if (!ADMIN_EMAILS.includes(user.email.toLowerCase())) return null;
  return user;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorised." }, { status: 403 });

  const adminClient = createSupabaseAdminClient();
  if (!adminClient) return NextResponse.json({ error: "Admin client not configured." }, { status: 500 });

  const { id } = await params;
  const body = await request.json().catch(() => null);

  const updates: Record<string, unknown> = {};
  if (body?.seatLimit !== undefined) updates.seat_limit = Math.max(1, Number(body.seatLimit));
  if (body?.status !== undefined && ["active", "inactive"].includes(String(body.status))) {
    updates.status = body.status;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
  }

  const { error } = await adminClient.from("organizations").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Revoking the org — immediately revoke all active entitlements for every member
  if (updates.status === "inactive") {
    const { data: members } = await adminClient
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", id);

    const userIds = (members ?? []).map((m) => m.user_id).filter(Boolean) as string[];

    if (userIds.length > 0) {
      const { error: revokeError } = await adminClient
        .from("entitlements")
        .update({ status: "revoked" })
        .in("user_id", userIds)
        .eq("status", "active");

      if (revokeError) {
        console.warn("[admin/organizations] entitlement revoke failed:", revokeError.message);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
