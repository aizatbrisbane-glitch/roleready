import { NextResponse } from "next/server";
import { hashUnsubscribeToken, isPlausibleToken } from "@/lib/lifecycle-unsubscribe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// ─── RFC 8058 One-Click Unsubscribe ───────────────────────────────────────────
//
// This endpoint is referenced in the List-Unsubscribe and List-Unsubscribe-Post
// email headers. Email providers (Gmail, Apple Mail, etc.) POST to this URL
// when the user activates the in-client "Unsubscribe" button.
//
// Required headers on the outgoing email:
//   List-Unsubscribe: <https://koalapply.com/api/unsubscribe/lifecycle/one-click?token=TOKEN>
//   List-Unsubscribe-Post: List-Unsubscribe=One-Click
//
// RFC 8058 requirements met here:
//   • POST-only (GET is explicitly rejected — does not change preferences).
//   • No browser session required.
//   • No confirmation step — the email provider performs the action on behalf
//     of the user; another confirmation would break provider compliance.
//   • Returns 200 OK (some providers check for 2xx).
//   • Idempotent (repeated POSTs with the same token are safe).
//   • No private information in the response body.
//
// Security:
//   • Token is validated via direct DB lookup (service_role only).
//   • A 32-byte random token (256 bits) cannot be guessed or enumerated.
//   • The only action this endpoint can perform is setting opted_in = false for
//     lifecycle_marketing — it cannot read or modify any other data.
//
// User-facing unsubscribe (with confirmation page):
//   GET /unsubscribe/lifecycle?token=TOKEN  → confirmation page
//   POST /api/unsubscribe/lifecycle         → form submission handler

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token") ?? "";

  if (!isPlausibleToken(token)) {
    return NextResponse.json({ error: "Invalid token." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    console.error("[one-click-unsubscribe] admin client not configured");
    return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  }

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
    console.error("[one-click-unsubscribe] DB error:", error.message);
    return NextResponse.json({ error: "Failed to process request." }, { status: 500 });
  }

  if (!data || data.length === 0) {
    // Token not recognised — respond with 404 so the provider knows the link
    // is no longer valid (e.g., after token rotation).
    return NextResponse.json({ error: "Token not found." }, { status: 404 });
  }

  // RFC 8058: return 200 OK with no sensitive body.
  return NextResponse.json({ unsubscribed: true }, { status: 200 });
}

// RFC 8058 requires GET not to change preferences.
// Return 405 Method Not Allowed with an Allow header.
export function GET() {
  return new NextResponse(null, {
    status: 405,
    headers: { Allow: "POST" },
  });
}
