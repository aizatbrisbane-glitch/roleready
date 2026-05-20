import Link from "next/link";
import { ArrowRight, Bookmark, Sparkles } from "lucide-react";
import { LandingPage } from "@/components/landing/LandingPage";
import { SetupNotice } from "@/components/SetupNotice";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SavedPage() {
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
    <main className="min-h-screen bg-[#fffaf4] px-4 pb-36 pt-6 md:px-8 md:py-10 xl:px-10">
      <div className="mx-auto max-w-[920px] overflow-x-clip">
        <div className="mb-8">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1.5 text-sm font-semibold text-[#0f8f83]">
            <Bookmark className="h-4 w-4" />
            Saved jobs
          </p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight text-[#14213d] md:text-5xl">
            Keep roles you like close by.
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 md:text-lg md:leading-8">
            Saved jobs are coming soon. For now, start from fresh matches or keep active roles in Applications.
          </p>
        </div>

        <section className="max-w-full overflow-hidden rounded-[2rem] bg-white/82 px-5 py-14 text-center shadow-[0_20px_70px_rgba(20,33,61,0.07)] sm:px-6">
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-teal-50 to-amber-50 text-[#0f9f92]">
            <Sparkles className="h-9 w-9" />
          </span>
          <h2 className="mt-5 text-2xl font-semibold text-[#14213d]">Your saved list is waiting.</h2>
          <p className="mx-auto mt-3 max-w-md text-base leading-7 text-slate-600">
            We will add persistent saved jobs here in a later pass. Today, ApplyHQ keeps discovery and active applications separate.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#0f9f92] px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_42px_rgba(15,159,146,0.2)] sm:w-auto">
              Find fresh matches <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/applications" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#0f8f83] shadow-sm sm:w-auto">
              View applications
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
