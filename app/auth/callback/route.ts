import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { trackSignupServerSide, type AttributionData } from "@/lib/server-analytics";

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
        // Read the attribution cookie written by the client immediately before the OAuth redirect.
        // Cookies survive cross-domain redirects; sessionStorage does not.
        const cookieHeader = request.headers.get("cookie") ?? "";
        const attrMatch = cookieHeader.match(/(?:^|;\s*)koalapply_attribution=([^;]+)/);
        let attribution: AttributionData = {};
        if (attrMatch) {
          try {
            attribution = JSON.parse(decodeURIComponent(attrMatch[1])) as AttributionData;

            // Write attribution to the profiles table so Mission Control reflects the correct
            // traffic source. This is more reliable than AttributionCapture.tsx reading
            // localStorage after the redirect (which may be empty or stale).
            const truncate = (v: unknown) => typeof v === "string" ? v.slice(0, 500) : undefined;
            await supabase.from("profiles").update({
              attr_source:       truncate(attribution.utm_source),
              attr_medium:       truncate(attribution.utm_medium),
              attr_campaign:     truncate(attribution.utm_campaign),
              attr_content:      truncate(attribution.utm_content),
              attr_term:         truncate(attribution.utm_term),
              attr_referrer:     truncate(attribution.referrer),
              attr_ga_client_id: truncate(attribution.ga_client_id),
              attr_fbp:          truncate(attribution.fbp),
              attr_fbc:          truncate(attribution.fbc),
              attr_landed_at:    new Date().toISOString(),
            }).eq("id", user.id).is("attr_landed_at", null);
          } catch {
            console.warn("[auth/callback] Failed to parse koalapply_attribution cookie — attribution will be absent from signup events");
          }
        } else {
          console.warn("[auth/callback] koalapply_attribution cookie not present — Google OAuth signup will fire without traffic source attribution");
        }

        // Fire server-side tracking — no client-side pixel needed for Google OAuth signups
        // (the Meta CAPI and LinkedIn CAPI calls are more reliable than a browser pixel)
        void trackSignupServerSide({
          email: user.email,
          userId: user.id,
          method: "google",
          attribution,
        });
      }
    }
  }

  const response = NextResponse.redirect(new URL(next, requestUrl.origin));
  // Attribution cookie is single-use — clear it so it doesn't linger
  response.cookies.set("koalapply_attribution", "", { maxAge: 0, path: "/auth/callback", sameSite: "lax" });
  return response;
}
