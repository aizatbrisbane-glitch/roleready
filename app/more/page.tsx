import Link from "next/link";
import { ArrowRight, Bookmark, FileText, Settings } from "lucide-react";
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
    color: "bg-teal-50 text-[#0f9f92]",
  },
  {
    href: "/profile",
    title: "Profile settings",
    body: "Update your details, preferences, and target roles.",
    icon: Settings,
    color: "bg-amber-50 text-amber-600",
  },
  {
    href: "/saved",
    title: "Saved jobs",
    body: "Keep roles you like close by.",
    icon: Bookmark,
    color: "bg-violet-50 text-violet-600",
  },
];

export default async function MorePage() {
  const configured = isSupabaseConfigured();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

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

  return (
    <main className="min-h-screen bg-[#fffaf4] px-4 py-5 pb-36 md:px-8 md:py-10 md:pb-10 xl:px-10">
      <div className="mx-auto max-w-[760px] overflow-x-clip">
        <div className="mb-6">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1.5 text-sm font-semibold text-[#0f8f83]">
            More
          </p>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-[#14213d] md:text-5xl">
            Your ApplyHQ space.
          </h1>
          <p className="mt-2 text-base leading-7 text-slate-600">Manage the parts that support every application.</p>
        </div>

        <section className="space-y-3">
          {moreItems.map(({ href, title, body, icon: Icon, color }) => (
            <Link
              key={href}
              href={href}
              className="flex min-h-24 items-center gap-4 rounded-[1.6rem] bg-white/82 p-4 shadow-[0_16px_54px_rgba(20,33,61,0.055)] transition hover:-translate-y-0.5 hover:bg-white"
            >
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${color}`}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-semibold text-[#14213d]">{title}</span>
                <span className="mt-1 block text-sm leading-6 text-slate-600">{body}</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-[#0f8f83]" />
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
