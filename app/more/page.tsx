import Link from "next/link";
import { ArrowRight, Bookmark, Building2, FileText, Settings } from "lucide-react";
import { LandingPage } from "@/components/landing/LandingPage";
import { SetupNotice } from "@/components/SetupNotice";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const moreItems = [
  {
    href: "/documents",
    title: "Documents",
    body: "Manage your master resume and cover letter.",
    icon: FileText,
    color: "bg-[#ece8ff] text-[#2200ff]",
  },
  {
    href: "/profile",
    title: "Profile settings",
    body: "Update your details, preferences, and target roles.",
    icon: Settings,
    color: "bg-violet-50 text-violet-600",
  },
  {
    href: "/saved",
    title: "Saved jobs",
    body: "Keep roles you like close by.",
    icon: Bookmark,
    color: "bg-sky-50 text-sky-600",
  },
];

export default async function MorePage() {
  const configured = isSupabaseConfigured();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const { data: enterpriseAdminMembership } = user && supabase
    ? await supabase
        .from("organization_members")
        .select("id")
        .eq("user_id", user.id)
        .in("role", ["owner", "admin"])
        .limit(1)
        .maybeSingle()
    : { data: null };

  if (!configured) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <SetupNotice />
      </main>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  const visibleMoreItems = enterpriseAdminMembership
    ? [
        {
          href: "/enterprise",
          title: "Enterprise admin",
          body: "Manage seats, access and employee usage.",
          icon: Building2,
          color: "bg-[#ece8ff] text-[#2200ff]",
        },
        ...moreItems,
      ]
    : moreItems;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 pb-36 md:px-8 md:py-10 md:pb-10 xl:px-10">
      <div className="mx-auto max-w-[760px] overflow-x-clip">
        <div className="mb-6">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#ece8ff] px-3 py-1.5 text-sm font-semibold text-[#2200ff]">
            More
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-5xl">
            Your ApplyHQ space.
          </h1>
          <p className="mt-2 text-base leading-7 text-slate-600">Manage the parts that support every application.</p>
        </div>

        <section className="space-y-3">
          {visibleMoreItems.map(({ href, title, body, icon: Icon, color }) => (
            <Link
              key={href}
              href={href}
              className="flex min-h-24 items-center gap-4 rounded-[1.6rem] border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(34,0,255,0.08)]"
            >
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${color}`}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-semibold text-slate-900">{title}</span>
                <span className="mt-1 block text-sm leading-6 text-slate-600">{body}</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-[#2200ff]/60" />
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
