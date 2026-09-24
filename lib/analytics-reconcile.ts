import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { gaEnabled } from "./ga4";
import { getStripeClient } from "./stripe";
import { recordVerifiedPurchase } from "./stripe-analytics";

// Only the analytics scheduler invokes this; no business request waits for it.
export async function reconcileAnalytics() {
  if (!gaEnabled()) return;
  const admin = createSupabaseAdminClient();
  if (!admin) throw new Error("Analytics admin unavailable");
  const { error } = await admin.rpc("discover_ga4_accounts", { p_user: null });
  if (error) throw new Error("Account discovery unavailable");
  const { data, error: purchaseError } = await admin.rpc("ga4_purchase_candidates");
  if (purchaseError) throw new Error("Purchase reconciliation unavailable");
  for (const row of data ?? []) {
    try {
      const session = await getStripeClient().checkout.sessions.retrieve(row.stripe_payment_id, { expand: ["payment_intent.latest_charge"] });
      const intent = session.payment_intent;
      const charge = intent && typeof intent !== "string" ? intent.latest_charge : null;
      const paidAt = charge && typeof charge !== "string" ? charge.created : session.created;
      await recordVerifiedPurchase(session, row.user_id, paidAt);
    } catch { console.error("[analytics] Purchase reconciliation deferred"); }
  }
}
