import { scheduleAnalytics } from "@/lib/analytics-background";
import { observeSignup } from "@/lib/ga4";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { trackSignupServerSide, type AttributionData } from "@/lib/server-analytics";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ ok: false }, { status: 500 });

  // Read the authenticated user from the session cookie — never trust client-supplied IDs
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const method = user.app_metadata?.provider === "google" ? "google" : "email";
  const attribution = (body?.attribution ?? {}) as AttributionData;

  scheduleAnalytics(() => observeSignup(user.id));
  scheduleAnalytics(() => trackSignupServerSide({ email: user.email!, userId: user.id, method, attribution }));

  return NextResponse.json({ ok: true });
}
