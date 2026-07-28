import type { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Entitlement, EntitlementPlanType } from "@/types/database";

type SupabaseServerClient = NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>;

export type AccessState = {
  planType: EntitlementPlanType;
  planLabel: string;
  applicationLimit: number;
  applicationsUsed: number;
  applicationsRemaining: number;
  validUntil: string | null;
  canGenerate: boolean;
  entitlementId: string | null;
  userId: string;
  needsMonthlyReset: boolean;
};

const FREE_MONTHLY_APPLICATION_LIMIT = 1;
const FREE_NEWSLETTER_APPLICATION_LIMIT = 2;

function monthStartIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

function labelForPlan(planType: EntitlementPlanType) {
  switch (planType) {
    case "enterprise_90_day":
      return "Enterprise access";
    case "partner_90_day":
      return "90-Day Partner";
    case "focus_30_day":
      return "30-Day Focus";
    case "sprint_7_day":
      return "7-Day Sprint";
    default:
      return "Free plan";
  }
}

export async function getAccessState(supabase: SupabaseServerClient, userId: string): Promise<AccessState> {
  const now = new Date().toISOString();
  const { data: entitlement } = await supabase
    .from("entitlements")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .lte("valid_from", now)
    .gte("valid_until", now)
    .order("valid_until", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (entitlement) {
    const activeEntitlement = entitlement as Entitlement;
    const remaining = Math.max(0, activeEntitlement.application_limit - activeEntitlement.applications_used);

    return {
      planType: activeEntitlement.plan_type,
      planLabel: labelForPlan(activeEntitlement.plan_type),
      applicationLimit: activeEntitlement.application_limit,
      applicationsUsed: activeEntitlement.applications_used,
      applicationsRemaining: remaining,
      validUntil: activeEntitlement.valid_until,
      canGenerate: remaining > 0,
      entitlementId: activeEntitlement.id,
      userId,
      needsMonthlyReset: false,
    };
  }

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("newsletter_subscribed, monthly_generations_used, monthly_generations_reset_at")
    .eq("id", userId)
    .maybeSingle();

  const needsMonthlyReset =
    !profileRow?.monthly_generations_reset_at ||
    profileRow.monthly_generations_reset_at < monthStartIso();

  const freeLimit = profileRow?.newsletter_subscribed
    ? FREE_NEWSLETTER_APPLICATION_LIMIT
    : FREE_MONTHLY_APPLICATION_LIMIT;
  const used = needsMonthlyReset ? 0 : (profileRow?.monthly_generations_used ?? 0);
  const remaining = Math.max(0, freeLimit - used);

  return {
    planType: "free",
    planLabel: "Free plan",
    applicationLimit: freeLimit,
    applicationsUsed: used,
    applicationsRemaining: remaining,
    validUntil: null,
    canGenerate: remaining > 0,
    entitlementId: null,
    userId,
    needsMonthlyReset,
  };
}

export async function consumeGenerationCredit(supabase: SupabaseServerClient, access: AccessState) {
  if (access.entitlementId) {
    const { data, error } = await supabase.rpc("consume_application_credit", {
      p_entitlement_id: access.entitlementId,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    return data === true
      ? { ok: true, error: null }
      : { ok: false, error: "No application credits remaining." };
  }

  // Free tier — write to persistent counter so deleting applications cannot restore credits.
  const newCount = access.needsMonthlyReset ? 1 : access.applicationsUsed + 1;
  const patch: Record<string, unknown> = { monthly_generations_used: newCount };
  if (access.needsMonthlyReset) patch.monthly_generations_reset_at = monthStartIso();

  const { error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", access.userId);

  if (error) return { ok: false, error: error.message };
  return { ok: true, error: null };
}

export function generationLimitMessage(access: AccessState) {
  if (access.planType === "free") {
    return "You have used your free application. Upgrade to generate more.";
  }

  return "This access pass has no application credits remaining.";
}
