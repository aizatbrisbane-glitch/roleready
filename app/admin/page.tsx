import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AdminOrganizationsPanel, type AdminOrg } from "@/components/AdminOrganizationsPanel";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) redirect("/");

  const adminClient = createSupabaseAdminClient();
  if (!adminClient) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <p className="text-sm text-rose-600">Admin client not configured. Check SUPABASE_SERVICE_ROLE_KEY.</p>
      </main>
    );
  }

  const [{ data: orgs }, { data: ownerMembers }] = await Promise.all([
    adminClient
      .from("organizations")
      .select("id, name, status, seat_limit, created_at, organization_members(count)")
      .order("created_at", { ascending: false }),
    adminClient
      .from("organization_members")
      .select("organization_id, profiles(email)")
      .eq("role", "owner"),
  ]);

  const ownerByOrg = Object.fromEntries(
    (ownerMembers ?? []).map((m) => {
      const p = m.profiles;
      const email = Array.isArray(p)
        ? (p[0] as { email?: string } | undefined)?.email ?? null
        : (p as { email?: string } | null)?.email ?? null;
      return [m.organization_id, email];
    })
  );

  const organizations: AdminOrg[] = (orgs ?? []).map((org) => ({
    id: org.id as string,
    name: org.name as string,
    status: org.status as string,
    seatLimit: org.seat_limit as number,
    createdAt: org.created_at as string,
    memberCount: (org.organization_members as { count: number }[])?.[0]?.count ?? 0,
    ownerEmail: ownerByOrg[org.id as string] ?? null,
  }));

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 pb-36 md:px-8 md:py-10 md:pb-10 xl:px-10">
      <div className="mx-auto max-w-[1320px]">
        <AdminOrganizationsPanel organizations={organizations} />
      </div>
    </main>
  );
}
