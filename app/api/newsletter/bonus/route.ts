import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("newsletter_subscribed").eq("id", user.id).maybeSingle();
  if (profile?.newsletter_subscribed) return NextResponse.json({ ok: true });

  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    const resend = new Resend(apiKey);
    await resend.contacts.create({ email: user.email, unsubscribed: false });
  }

  await supabase.from("profiles").upsert({ id: user.id, newsletter_subscribed: true });
  await recordLifecycleConsent(createSupabaseAdminClient(), user.id, "[newsletter/bonus]");

  return NextResponse.json({ ok: true });
}

// Same rules as /api/newsletter — see that file for full documentation.
async function recordLifecycleConsent(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  tag: string
): Promise<void> {
  if (!admin) return;

  const { error: insertError } = await admin
    .from("email_preferences")
    .insert({
      user_id: userId,
      preference_type: "lifecycle_marketing",
      opted_in: true,
      source: "signup_flow",
    });

  if (!insertError) return;

  if ((insertError as { code?: string }).code !== "23505") {
    console.error(`${tag} lifecycle consent insert failed:`, insertError.message);
    return;
  }

  const { error: updateError } = await admin
    .from("email_preferences")
    .update({ opted_in: true, source: "signup_flow" })
    .eq("user_id", userId)
    .eq("preference_type", "lifecycle_marketing")
    .or("source.is.null,source.neq.unsubscribe_link");

  if (updateError) {
    console.error(`${tag} lifecycle consent update failed:`, updateError.message);
  }
}
