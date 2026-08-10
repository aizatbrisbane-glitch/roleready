import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ ok: false }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false }, { status: 400 });

  const truncate = (v: unknown) =>
    typeof v === "string" ? v.slice(0, 500) : undefined;

  const update = {
    attr_source:        truncate(body.source),
    attr_medium:        truncate(body.medium),
    attr_campaign:      truncate(body.campaign),
    attr_content:       truncate(body.content),
    attr_term:          truncate(body.term),
    attr_referrer:      truncate(body.referrer),
    attr_landing_page:  truncate(body.landing_page),
    attr_ga_client_id:  truncate(body.ga_client_id),
    attr_fbp:           truncate(body.fbp),
    attr_fbc:           truncate(body.fbc),
    attr_landed_at:     new Date().toISOString(),
  };

  // First-touch only — only writes if attr_landed_at is still NULL
  const { error: updateError } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", user.id)
    .is("attr_landed_at", null);

  if (updateError) {
    console.error("[api/attribution] Failed to write attribution:", updateError.message, { userId: user.id });
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
