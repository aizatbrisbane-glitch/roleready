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
};

const FREE_MONTHLY_APPLICATION_LIMIT = 3;

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
    };
  }

  const { count } = await supabase
    .from("applications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .not("generated_at", "is", null)
    .gte("generated_at", monthStartIso());

  const used = count ?? 0;
  const remaining = Math.max(0, FREE_MONTHLY_APPLICATION_LIMIT - used);

  return {
    planType: "free",
    planLabel: "Free plan",
    applicationLimit: FREE_MONTHLY_APPLICATION_LIMIT,
    applicationsUsed: used,
    applicationsRemaining: remaining,
    validUntil: null,
    canGenerate: remaining > 0,
    entitlementId: null,
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

  // Free usage is derived from successful generated applications in the current month.
  return { ok: true, error: null };
}

export function generationLimitMessage(access: AccessState) {
  if (access.planType === "free") {
    return "You have used your 3 free applications for this month.";
  }

  return "This access pass has no application credits remaining.";
}
