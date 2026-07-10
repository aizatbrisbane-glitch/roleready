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
  const type = searchParams.get("type");

  if (!type) return NextResponse.json({ error: "Missing type param." }, { status: 400 });

  const { data: events } = await admin
    .from("koalapply_events")
    .select("id, event_type, user_id, metadata, created_at")
    .eq("event_type", type)
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json(events ?? []);
}
