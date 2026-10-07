import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ApplicationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return <>{children}</>;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Unauthenticated users fall through to individual page auth handling
  if (!user) return <>{children}</>;

  const { data: profile } = await supabase
    .from("profiles")
    .select("candidate_onboarding_completed_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.candidate_onboarding_completed_at) {
    redirect("/");
  }

  return <>{children}</>;
}
