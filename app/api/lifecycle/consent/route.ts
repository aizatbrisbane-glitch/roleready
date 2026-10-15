import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// POST /api/lifecycle/consent
// Body: { action: "opt_in" | "dismiss" }
//
// Called by the in-dashboard reminder prompt shown to Group B users
// (non-newsletter subscribers who have not yet opted in or dismissed).
// Requires an active session — anonymous users cannot consent.

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Not configured." }, { status: 500 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const action = body?.action;
  if (action !== "opt_in" && action !== "dismiss") {
    return NextResponse.json({ error: "action must be opt_in or dismiss." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

  const { error } = await admin
    .from("email_preferences")
    .upsert(
      {
        user_id: user.id,
        preference_type: "lifecycle_marketing",
        opted_in: action === "opt_in",
        source: action === "opt_in" ? "prompt_opt_in" : "prompt_dismissed",
      },
      { onConflict: "user_id,preference_type", ignoreDuplicates: false }
    );

  if (error) {
    console.error("[lifecycle/consent] upsert failed:", error.message);
    return NextResponse.json({ error: "Failed to save preference." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, action });
}
