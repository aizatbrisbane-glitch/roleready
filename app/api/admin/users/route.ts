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

  const [{ data: authEmails }, { data: profiles }, { data: entitlements }] = await Promise.all([
    // Source of truth: all users from auth.users via SECURITY DEFINER RPC
    admin.rpc("admin_get_user_emails") as Promise<{ data: { id: string; email: string; created_at: string }[] | null; error: unknown }>,
    // Profile data for name / joined date
    admin.from("profiles").select("id, name, created_at"),
    // Active paid entitlements (Stripe purchases only)
    admin
      .from("entitlements")
      .select("user_id, plan_type")
      .eq("status", "active")
      .not("stripe_payment_id", "is", null),
  ]);

  const profileById: Record<string, { name: string | null; created_at: string }> = Object.fromEntries(
    (profiles ?? []).map((p) => [p.id as string, { name: (p.name as string | null) ?? null, created_at: p.created_at as string }])
  );

  const planByUser = Object.fromEntries(
    (entitlements ?? []).map((e) => [e.user_id as string, e.plan_type as string])
  );

  // Build user list from auth (all real users) joined with profile + entitlement data
  let users = (authEmails ?? []).map((u) => {
    const prof = profileById[u.id];
    return {
      id: u.id,
      name: prof?.name ?? null,
      email: u.email,
      plan: planByUser[u.id] ?? null,
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
  }

  return NextResponse.json(users.slice(0, 150));
}
