import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { trackSignupServerSide } from "@/lib/server-analytics";

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

      // Detect a brand-new signup (account created within the last 60 seconds)
      const user = data.session.user;
      const createdAt = new Date(user.created_at).getTime();
      const isNewUser = Date.now() - createdAt < 60_000;

      if (isNewUser && user.email) {
        // Fire server-side tracking — no client-side pixel needed for Google OAuth signups
        // (the Meta CAPI and LinkedIn CAPI calls are more reliable than a browser pixel)
        void trackSignupServerSide({
          email: user.email,
          userId: user.id,
          method: "google",
        });
      }
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
