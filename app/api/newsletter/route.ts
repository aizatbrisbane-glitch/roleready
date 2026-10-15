import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email required." }, { status: 400 });
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.contacts.create({ email, unsubscribed: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").upsert({ id: user.id, newsletter_subscribed: true });
      await recordLifecycleConsent(createSupabaseAdminClient(), user.id, "[newsletter]");
    }
  }

  return NextResponse.json({ ok: true });
}

// Records lifecycle_marketing consent from an explicit newsletter subscription.
//
// Rules:
//   • No existing row         → INSERT opted_in=true, source=signup_flow
//   • Existing 'prompt_dismissed' row → UPDATE to opted_in=true (fresh explicit consent;
//     the checkbox wording explicitly covers reminder emails)
//   • Existing 'unsubscribe_link' row → do NOT update (hard unsubscribe; user must
//     re-opt via the /api/lifecycle/consent endpoint with action='opt_in')
//   • Any other existing source → UPDATE to opted_in=true
//
// The UPDATE uses `.or("source.is.null,source.neq.unsubscribe_link")` so NULL-source
// rows are also updated (defensive; our code always sets a source, but the column is
// nullable in the schema).
//
// This is safe for retries: repeated calls with the same userId produce the same result.
async function recordLifecycleConsent(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  tag: string
): Promise<void> {
  if (!admin) return;

  // Step 1: try INSERT (fast path — new users have no email_preferences row)
  const { error: insertError } = await admin
    .from("email_preferences")
    .insert({
      user_id: userId,
      preference_type: "lifecycle_marketing",
      opted_in: true,
      source: "signup_flow",
    });

  if (!insertError) return;

  // PostgreSQL unique_violation = 23505. Any other code is a real DB error.
  if ((insertError as { code?: string }).code !== "23505") {
    console.error(`${tag} lifecycle consent insert failed:`, insertError.message);
    return;
  }

  // Step 2: row already exists — update ONLY if not a hard unsubscribe.
  // .or("source.is.null,source.neq.unsubscribe_link") generates:
  //   source IS NULL OR source <> 'unsubscribe_link'
  // so hard-unsubscribed rows are left untouched. Dismissed rows are overwritten.
  const { error: updateError } = await admin
    .from("email_preferences")
    .update({ opted_in: true, source: "signup_flow" })
    .eq("user_id", userId)
    .eq("preference_type", "lifecycle_marketing")
    .or("source.is.null,source.neq.unsubscribe_link");

  if (updateError) {
    console.error(`${tag} lifecycle consent update failed:`, updateError.message);
  }
  // If update touched 0 rows: source = 'unsubscribe_link' → correctly not updated.
}
