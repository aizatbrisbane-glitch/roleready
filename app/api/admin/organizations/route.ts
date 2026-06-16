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

export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorised." }, { status: 403 });

  const adminClient = createSupabaseAdminClient();
  if (!adminClient) return NextResponse.json({ error: "Admin client not configured." }, { status: 500 });

  const [{ data: orgs, error }, { data: ownerMembers }] = await Promise.all([
    adminClient
      .from("organizations")
      .select(`id, name, status, seat_limit, created_at, organization_members(count)`)
      .order("created_at", { ascending: false }),
    adminClient
      .from("organization_members")
      .select(`organization_id, profiles(email)`)
      .eq("role", "owner"),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ownerByOrg = Object.fromEntries(
    (ownerMembers ?? []).map((m) => {
      const p = m.profiles;
      const email = Array.isArray(p)
        ? (p[0] as { email?: string } | undefined)?.email ?? null
        : (p as { email?: string } | null)?.email ?? null;
      return [m.organization_id, email];
    })
  );

  const result = (orgs ?? []).map((org) => ({
    id: org.id,
    name: org.name,
    status: org.status,
    seatLimit: org.seat_limit,
    createdAt: org.created_at,
    memberCount: (org.organization_members as { count: number }[])?.[0]?.count ?? 0,
    ownerEmail: ownerByOrg[org.id] ?? null,
  }));

  return NextResponse.json({ organizations: result });
}

export async function POST(request: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorised." }, { status: 403 });

  const adminClient = createSupabaseAdminClient();
  if (!adminClient) return NextResponse.json({ error: "Admin client not configured." }, { status: 500 });

  const body = await request.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  const ownerEmail = String(body?.ownerEmail ?? "").trim().toLowerCase();
  const seatLimit = Math.max(1, Number(body?.seatLimit ?? 10));
  const adminEmail = body?.adminEmail ? String(body.adminEmail).trim().toLowerCase() : null;

  if (!name || !ownerEmail) {
    return NextResponse.json({ error: "Organisation name and owner email are required." }, { status: 400 });
  }

  // Create organisation
  const { data: org, error: orgError } = await adminClient
    .from("organizations")
    .insert({ name, status: "active", seat_limit: seatLimit })
    .select("id")
    .single();

  if (orgError || !org) {
    return NextResponse.json({ error: orgError?.message ?? "Failed to create organisation." }, { status: 500 });
  }

  const orgId = org.id;

  // Check if user already exists
  let ownerId: string | null = null;
  const { data: existingProfile } = await adminClient
    .from("profiles")
    .select("id")
    .eq("email", ownerEmail)
    .maybeSingle();

  if (existingProfile?.id) {
    ownerId = existingProfile.id;
  } else {
    const requestUrl = new URL(request.url);
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(ownerEmail, {
      redirectTo: `${requestUrl.origin}/auth/invite`,
    });
    if (inviteError || !inviteData?.user?.id) {
      await adminClient.from("organizations").delete().eq("id", orgId);
      return NextResponse.json({ error: inviteError?.message ?? "Failed to invite owner." }, { status: 500 });
    }
    ownerId = inviteData.user.id;
  }

  // Add as owner
  const { error: memberError } = await adminClient
    .from("organization_members")
    .insert({ organization_id: orgId, user_id: ownerId, role: "owner" });

  if (memberError) {
    await adminClient.from("organizations").delete().eq("id", orgId);
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  // Optionally add a co-admin
  if (adminEmail && adminEmail !== ownerEmail) {
    const { data: adminProfile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("email", adminEmail)
      .maybeSingle();

    let adminUserId: string | null = null;
    if (adminProfile?.id) {
      adminUserId = adminProfile.id;
    } else {
      const requestUrl2 = new URL(request.url);
      const { data: adminInvite } = await adminClient.auth.admin.inviteUserByEmail(adminEmail, {
        redirectTo: `${requestUrl2.origin}/auth/invite`,
      });
      adminUserId = adminInvite?.user?.id ?? null;
    }

    if (adminUserId) {
      await adminClient
        .from("organization_members")
        .insert({ organization_id: orgId, user_id: adminUserId, role: "admin" });
    }
  }

  return NextResponse.json({ ok: true, organizationId: orgId, ownerInvited: !existingProfile });
}
