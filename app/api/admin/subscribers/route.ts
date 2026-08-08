import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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

  const { data: contactData, error: contactError } = await resend.contacts.list({ limit: 100 });
  if (contactError) {
    return NextResponse.json({ error: contactError.message }, { status: 500 });
  }

  const subscribers = (contactData?.data ?? [])
    .filter((c) => !c.unsubscribed)
    .map((c) => ({
      email: c.email,
      name: [c.first_name, c.last_name].filter(Boolean).join(" ") || null,
      subscribedAt: c.created_at,
      jobSearchIntent: null as string | null,
    }))
    .sort((a, b) => new Date(b.subscribedAt).getTime() - new Date(a.subscribedAt).getTime());

  // Enrich with job_search_intent from Supabase profiles via email lookup
  const adminClient = createSupabaseAdminClient();
  if (adminClient && subscribers.length > 0) {
    const emailSet = new Set(subscribers.map((s) => s.email));

    const { data: authUsers } = await adminClient.rpc("admin_get_user_emails");
    const emailToId: Record<string, string> = {};
    for (const u of authUsers ?? []) {
      if (emailSet.has(u.email)) emailToId[u.email] = u.id;
    }

    const userIds = Object.values(emailToId);
    if (userIds.length > 0) {
      const { data: profiles } = await adminClient
        .from("profiles")
        .select("id, job_search_intent")
        .in("id", userIds);

      const idToIntent: Record<string, string> = {};
      for (const p of profiles ?? []) {
        if (p.job_search_intent) idToIntent[p.id] = p.job_search_intent;
      }

      for (const s of subscribers) {
        const uid = emailToId[s.email];
        if (uid) s.jobSearchIntent = idToIntent[uid] ?? null;
      }
    }
  }

  return NextResponse.json(subscribers);
}
