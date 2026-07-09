import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

  return NextResponse.json({ ok: true });
}
