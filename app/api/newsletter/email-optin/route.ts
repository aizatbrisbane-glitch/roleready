import { createHmac } from "crypto";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function expectedSig(userId: string, exp: string): string {
  const secret = process.env.RESEND_API_KEY ?? "";
  return createHmac("sha256", secret).update(`${userId}:${exp}`).digest("hex");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const uid = searchParams.get("uid") ?? "";
  const exp = searchParams.get("exp") ?? "";
  const sig = searchParams.get("sig") ?? "";

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

  const expired = !exp || Math.floor(Date.now() / 1000) > Number(exp);
  if (!uid || expired || sig !== expectedSig(uid, exp)) {
    return NextResponse.redirect(`${appUrl}/`);
  }

  const adminSupabase = createSupabaseAdminClient();
  if (!adminSupabase) {
    return NextResponse.redirect(`${appUrl}/`);
  }

  const { data: { user } } = await adminSupabase.auth.admin.getUserById(uid);
  const email = user?.email;

  if (email) {
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      const resend = new Resend(apiKey);
      await resend.contacts.create({ email, unsubscribed: false });
    }
    await adminSupabase.from("profiles").upsert({ id: uid, newsletter_subscribed: true });
  }

  return NextResponse.redirect(`${appUrl}/?newsletter=subscribed`);
}
