import { scheduleAnalytics } from "@/lib/analytics-background";
import { trackSignupServerSide } from "@/lib/server-analytics";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { observeSignup, currentRequestIsProduction } from "@/lib/ga4";
import { cleanIdentity } from "@/lib/analytics-policy";

export async function POST(request: Request) {
  if (!await currentRequestIsProduction()) return NextResponse.json({ ok: true, skipped: true });
  const supabase = await createSupabaseServerClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  try { await observeSignup(user.id, cleanIdentity(await request.json().catch(() => ({})))); }
  catch { return NextResponse.json({ ok: false }, { status: 503 }); }
  return NextResponse.json({ ok: true });
}
