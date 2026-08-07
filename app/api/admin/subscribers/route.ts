import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
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

  const [rpcResult, { data: subscribedProfiles }] = await Promise.all([
    admin.rpc("admin_get_user_emails"),
    admin.from("profiles").select("id, name, created_at").eq("newsletter_subscribed", true),
  ]);

  const emailById = Object.fromEntries(
    ((rpcResult.data ?? []) as { id: string; email: string }[]).map((r) => [r.id, r.email])
  );

  const subscribers = (subscribedProfiles ?? [])
    .map((p) => ({
      email: emailById[p.id as string] ?? null,
      name: (p.name as string | null) ?? null,
      subscribedAt: p.created_at as string,
    }))
    .filter((s) => s.email)
    .sort((a, b) => new Date(b.subscribedAt).getTime() - new Date(a.subscribedAt).getTime());

  return NextResponse.json(subscribers);
}
