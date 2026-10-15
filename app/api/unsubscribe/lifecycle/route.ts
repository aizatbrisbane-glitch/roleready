import { NextResponse } from "next/server";
import { hashUnsubscribeToken, isPlausibleToken } from "@/lib/lifecycle-unsubscribe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://koalapply.com").replace(/\/$/, "");
const UNSUB_PAGE = `${APP_URL}/unsubscribe/lifecycle`;

export async function POST(request: Request) {
  let token: string;
  try {
    const body = await request.formData();
    token = (body.get("token") as string | null) ?? "";
  } catch {
    return NextResponse.redirect(`${UNSUB_PAGE}?error=1`, { status: 303 });
  }

  if (!isPlausibleToken(token)) {
    return NextResponse.redirect(`${UNSUB_PAGE}?error=1`, { status: 303 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    console.error("[unsubscribe/lifecycle] admin client not configured");
    return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  }

  // Hash token before DB lookup — DB stores only SHA-256(token), not plaintext.
  // .select() returns the updated rows so we can distinguish
  // "token not found" (empty array, not an error) from a real DB error.
  const { data, error } = await admin
    .from("email_preferences")
    .update({
      opted_in: false,
      source: "unsubscribe_link",
      updated_at: new Date().toISOString(),
    })
    .eq("unsubscribe_token_hash", hashUnsubscribeToken(token))
    .eq("preference_type", "lifecycle_marketing")
    .select("user_id");

  if (error) {
    console.error("[unsubscribe/lifecycle] DB error:", error.message);
    return NextResponse.json({ error: "Failed to process request." }, { status: 500 });
  }

  if (!data || data.length === 0) {
    // Token not found in DB — link may belong to an old email before this
    // feature was introduced, or the token has been rotated.
    return NextResponse.redirect(`${UNSUB_PAGE}?error=1`, { status: 303 });
  }

  return NextResponse.redirect(`${APP_URL}/unsubscribe/lifecycle/confirmed`, { status: 303 });
}
