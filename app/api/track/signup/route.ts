import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { trackSignupServerSide } from "@/lib/server-analytics";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ ok: false }, { status: 500 });

  // Read the authenticated user from the session cookie — never trust client-supplied IDs
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ ok: false }, { status: 401 });

  // Guard: only fire for accounts created in the last 5 minutes to prevent replay
  const createdAt = new Date(user.created_at).getTime();
  if (Date.now() - createdAt > 300_000) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const body = await request.json().catch(() => ({}));
  const method = (body?.method as string) ?? "email";

  await trackSignupServerSide({ email: user.email, userId: user.id, method });

  return NextResponse.json({ ok: true });
}
