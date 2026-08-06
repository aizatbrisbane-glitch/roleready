import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Not configured." }, { status: 500 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["admin", "founder"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "Admin client not configured." }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter") ?? "all";

  const now = new Date();

  const [rpcResult, { data: profiles }, { data: entitlements }] = await Promise.all([
    admin.rpc("admin_get_user_emails"),
    admin.from("profiles").select("id, name, created_at, monthly_generations_used, monthly_generations_reset_at, attr_source, attr_medium, attr_campaign, attr_landing_page, attr_landed_at"),
    admin
      .from("entitlements")
      .select("user_id, plan_type, applications_used, application_limit, valid_until")
      .eq("status", "active")
      .not("stripe_payment_id", "is", null),
  ]);

  const authEmails = (rpcResult.data ?? []) as { id: string; email: string; created_at: string }[];

  const profileById: Record<string, { name: string | null; created_at: string; monthlyUsed: number; monthlyResetAt: string | null; attrSource: string | null; attrMedium: string | null; attrCampaign: string | null; attrLandingPage: string | null; attrLandedAt: string | null }> = Object.fromEntries(
    (profiles ?? []).map((p) => [p.id as string, {
      name: (p.name as string | null) ?? null,
      created_at: p.created_at as string,
      monthlyUsed: (p.monthly_generations_used as number) ?? 0,
      monthlyResetAt: (p.monthly_generations_reset_at as string | null) ?? null,
      attrSource: (p.attr_source as string | null) ?? null,
      attrMedium: (p.attr_medium as string | null) ?? null,
      attrCampaign: (p.attr_campaign as string | null) ?? null,
      attrLandingPage: (p.attr_landing_page as string | null) ?? null,
      attrLandedAt: (p.attr_landed_at as string | null) ?? null,
    }])
  );

  const entitlementByUser = Object.fromEntries(
    (entitlements ?? []).map((e) => [e.user_id as string, {
      plan: e.plan_type as string,
      used: e.applications_used as number,
      limit: e.application_limit as number,
      validUntil: e.valid_until as string,
    }])
  );

  // Build user list from auth (all real users) joined with profile + entitlement data
  let users = authEmails.map((u) => {
    const prof = profileById[u.id];
    const ent = entitlementByUser[u.id] ?? null;
    return {
      id: u.id,
      name: prof?.name ?? null,
      email: u.email,
      plan: ent?.plan ?? null,
      applicationsUsed: ent?.used ?? null,
      applicationLimit: ent?.limit ?? null,
      validUntil: ent?.validUntil ?? null,
      monthlyGenerationsUsed: prof?.monthlyUsed ?? 0,
      monthlyResetAt: prof?.monthlyResetAt ?? null,
      attrSource: prof?.attrSource ?? null,
      attrMedium: prof?.attrMedium ?? null,
      attrCampaign: prof?.attrCampaign ?? null,
      attrLandingPage: prof?.attrLandingPage ?? null,
      joined: prof?.created_at ?? u.created_at,
    };
  });

  // Sort newest first
  users.sort((a, b) => new Date(b.joined).getTime() - new Date(a.joined).getTime());

  // Date filters — apply against join date
  if (filter === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    users = users.filter((u) => new Date(u.joined) >= start);
  } else if (filter === "week") {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    users = users.filter((u) => new Date(u.joined) >= start);
  } else if (filter === "paid") {
    users = users.filter((u) => u.plan !== null);
  } else if (filter === "source") {
    const source = searchParams.get("source") ?? "(direct)";
    users = users.filter((u) => {
      const prof = profileById[u.id];
      if (!prof?.attrLandedAt) return false; // no attribution captured
      return source === "(direct)" ? !u.attrSource : u.attrSource === source;
    });
  }

  return NextResponse.json(users.slice(0, 150));
}
