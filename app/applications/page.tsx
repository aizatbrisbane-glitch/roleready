import Link from "next/link";
import { ArrowRight, Briefcase, CheckCircle2, Send, Sparkles, XCircle } from "lucide-react";
import { ApplicationsFilter } from "@/components/ApplicationsFilter";
import { LandingPage } from "@/components/landing/LandingPage";
import { SetupNotice } from "@/components/SetupNotice";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ApplicationWithJob } from "@/types/database";

export default async function ApplicationsPage() {
  const configured = isSupabaseConfigured();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  if (!configured) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <SetupNotice />
      </main>
    );
  }

  if (!user || !supabase) {
    return <LandingPage />;
  }

  const { data } = await supabase
    .from("applications")
    .select("*, jobs(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const applications = (data ?? []) as ApplicationWithJob[];
  const readyCount = applications.filter((app) => app.tailored_resume && app.cover_letter).length;
  const sentCount = applications.filter((app) => app.applied_at).length;
  const rejectedCount = applications.filter((app) => app.status === "Rejected").length;
  const activeCount = applications.length;

  return (
    <main className="min-h-screen bg-[#fffaf4] px-4 py-5 pb-36 md:px-8 md:py-10 md:pb-10 xl:px-10">
      <div className="mx-auto max-w-[1520px] overflow-x-clip">
        <div className="mb-5 flex flex-col gap-4 md:mb-10 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1.5 text-sm font-semibold text-[#0f8f83] md:text-xs">
              <Briefcase className="h-3.5 w-3.5" />
              Applications
            </p>
            <h1 className="font-serif text-3xl font-semibold tracking-tight text-[#14213d] md:text-5xl">
              Your applications in progress
            </h1>
            <p className="mt-2 max-w-2xl text-base leading-7 text-slate-600 md:mt-3 md:text-lg md:leading-8">
              Keep track of the roles you&apos;ve started, tailored, and sent.
            </p>
          </div>
          <Link
            href="/"
            className="hidden w-fit items-center gap-2 rounded-full bg-[#0f9f92] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_42px_rgba(15,159,146,0.18)] transition duration-300 hover:-translate-y-1 hover:bg-[#0b8f83] md:inline-flex"
          >
            Find fresh matches <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <section className="mb-8 hidden gap-4 md:grid md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[1.5rem] bg-white/78 p-5 shadow-[0_16px_54px_rgba(20,33,61,0.055)]">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-teal-50 text-[#0f9f92]">
              <Sparkles className="h-5 w-5" />
            </span>
            <p className="mt-4 text-3xl font-semibold text-[#14213d]">{activeCount}</p>
            <p className="mt-1 text-sm text-slate-600">applications started</p>
          </div>
          <div className="rounded-[1.5rem] bg-white/78 p-5 shadow-[0_16px_54px_rgba(20,33,61,0.055)]">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-violet-50 text-violet-600">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <p className="mt-4 text-3xl font-semibold text-[#14213d]">{readyCount}</p>
            <p className="mt-1 text-sm text-slate-600">ready to send</p>
          </div>
          <div className="rounded-[1.5rem] bg-white/78 p-5 shadow-[0_16px_54px_rgba(20,33,61,0.055)]">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-50 text-amber-600">
              <Send className="h-5 w-5" />
            </span>
            <p className="mt-4 text-3xl font-semibold text-[#14213d]">{sentCount}</p>
            <p className="mt-1 text-sm text-slate-600">sent applications</p>
          </div>
          <div className="rounded-[1.5rem] bg-white/78 p-5 shadow-[0_16px_54px_rgba(20,33,61,0.055)]">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <XCircle className="h-5 w-5" />
            </span>
            <p className="mt-4 text-3xl font-semibold text-[#14213d]">{rejectedCount}</p>
            <p className="mt-1 text-sm text-slate-600">closed outcomes</p>
          </div>
        </section>

        <ApplicationsFilter applications={applications} />
      </div>
    </main>
  );
}
