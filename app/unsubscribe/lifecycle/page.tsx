import { hashUnsubscribeToken, isPlausibleToken } from "@/lib/lifecycle-unsubscribe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// This page is intentionally not behind login — anyone with the correct token can
// reach it. The token itself is the authorisation (256-bit random, unguessable).
//
// We do NOT auto-unsubscribe on GET because link scanners open email URLs without
// user interaction. The user must click the button to confirm, which triggers a
// POST to /api/unsubscribe/lifecycle.
//
// RFC 8058 one-click (provider-automated) unsubscribes use a separate endpoint:
// POST /api/unsubscribe/lifecycle/one-click?token=TOKEN

type Props = {
  searchParams: Promise<{ token?: string; error?: string }>;
};

export default async function LifecycleUnsubscribePage({ searchParams }: Props) {
  const { token = "", error } = await searchParams;

  if (!isPlausibleToken(token)) {
    return <InvalidLinkPage reason="not_found" />;
  }

  // Validate token via DB lookup — read-only, no preferences changed here.
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return <InvalidLinkPage reason="unavailable" />;
  }

  const { data } = await admin
    .from("email_preferences")
    .select("opted_in")
    .eq("unsubscribe_token_hash", hashUnsubscribeToken(token))
    .eq("preference_type", "lifecycle_marketing")
    .maybeSingle();

  if (!data) {
    return <InvalidLinkPage reason="not_found" />;
  }

  return (
    <main style={{ fontFamily: "sans-serif", maxWidth: 480, margin: "80px auto", padding: "0 24px", color: "#1e293b" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Unsubscribe from reminder emails</h1>
      {error && (
        <p style={{ fontSize: 14, color: "#dc2626", marginBottom: 16 }}>
          Something went wrong. Please try again.
        </p>
      )}
      <p style={{ fontSize: 15, lineHeight: 1.6, color: "#475569", marginBottom: 24 }}>
        Clicking the button below will stop Koalapply from sending you job search
        reminder emails. This does not affect transactional emails (password resets,
        receipts) or the Koalapply newsletter if you subscribed separately.
      </p>
      <form action="/api/unsubscribe/lifecycle" method="POST">
        <input type="hidden" name="token" value={token} />
        <button
          type="submit"
          style={{
            background: "#2200ff",
            color: "#fff",
            fontWeight: 700,
            fontSize: 15,
            padding: "14px 28px",
            borderRadius: 9999,
            border: "none",
            cursor: "pointer",
          }}
        >
          Unsubscribe from reminders
        </button>
      </form>
      <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 24 }}>
        If you change your mind, you can re-enable reminders from your account settings.
      </p>
    </main>
  );
}

function InvalidLinkPage({ reason }: { reason: "not_found" | "unavailable" }) {
  const message =
    reason === "unavailable"
      ? "This service is temporarily unavailable. Please try again shortly."
      : "This unsubscribe link is invalid, has already been rotated, or could not be found.";

  return (
    <main style={{ fontFamily: "sans-serif", maxWidth: 480, margin: "80px auto", padding: "0 24px", color: "#1e293b" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Link not valid</h1>
      <p style={{ fontSize: 15, lineHeight: 1.6, color: "#64748b" }}>{message}</p>
      <p style={{ fontSize: 14, color: "#94a3b8", marginTop: 24 }}>
        If you received a reminder email and want to unsubscribe, use the link in that
        email. If it no longer works, contact us at{" "}
        <a href="mailto:support@koalapply.com" style={{ color: "#64748b" }}>support@koalapply.com</a>
        {" "}and we will process your request manually.
      </p>
    </main>
  );
}
