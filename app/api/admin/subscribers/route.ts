import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Not configured." }, { status: 500 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["admin", "founder"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Resend not configured." }, { status: 500 });

  const resend = new Resend(apiKey);

  const { data: contactData, error: contactError } = await resend.contacts.list();
  if (contactError) {
    return NextResponse.json({ error: contactError.message }, { status: 500 });
  }

  const subscribers = (contactData?.data ?? [])
    .filter((c) => !c.unsubscribed)
    .map((c) => ({
      email: c.email,
      name: [c.first_name, c.last_name].filter(Boolean).join(" ") || null,
      subscribedAt: c.created_at,
    }))
    .sort((a, b) => new Date(b.subscribedAt).getTime() - new Date(a.subscribedAt).getTime());

  return NextResponse.json(subscribers);
}
