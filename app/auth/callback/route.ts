import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/";
  const supabase = await createSupabaseServerClient();

  if (code && supabase) {
    const { data } = await supabase.auth.exchangeCodeForSession(code);
    if (data.session) {
      const { error } = await supabase.rpc("accept_enterprise_invitations");
      if (error) {
        console.error("Unable to accept enterprise invitation during callback", error.message);
      }
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
