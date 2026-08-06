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

  // Fetch all profiles that have attribution data
  const { data: rows } = await admin
    .from("profiles")
    .select("attr_source, attr_medium, attr_campaign, attr_referrer, attr_landed_at")
    .not("attr_landed_at", "is", null);

  if (!rows || rows.length === 0) {
    return NextResponse.json({ sources: [], total: 0 });
  }

  // Group by source → medium → campaign
  const map = new Map<string, { medium: string; campaign: string; count: number }[]>();

  for (const row of rows) {
    const source   = (row.attr_source   as string | null) ?? "(direct)";
    const medium   = (row.attr_medium   as string | null) ?? "(none)";
    const campaign = (row.attr_campaign as string | null) ?? "(none)";

    if (!map.has(source)) map.set(source, []);
    const existing = map.get(source)!.find(
      (e) => e.medium === medium && e.campaign === campaign
    );
    if (existing) {
      existing.count++;
    } else {
      map.get(source)!.push({ medium, campaign, count: 1 });
    }
  }

  // Flatten and sort by total count per source descending
  const sources = Array.from(map.entries())
    .map(([source, breakdowns]) => ({
      source,
      total: breakdowns.reduce((s, b) => s + b.count, 0),
      breakdowns: breakdowns.sort((a, b) => b.count - a.count),
    }))
    .sort((a, b) => b.total - a.total);

  return NextResponse.json({ sources, total: rows.length });
}
