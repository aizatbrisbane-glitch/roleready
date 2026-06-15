import { redirect } from "next/navigation";
import { CheckCircle2, Sparkles, Target } from "lucide-react";
import { AuthPanel } from "@/components/AuthPanel";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const benefits = [
  {
    icon: Sparkles,
    title: "AI tailored for you",
    body: "Resumes and cover letters that highlight your best.",
    color: "bg-[#ece8ff] text-[#2200ff]",
  },
  {
    icon: Target,
    title: "Smart job matching",
    body: "Find roles that truly fit your experience and goals.",
    color: "bg-violet-50 text-violet-600",
  },
  {
    icon: CheckCircle2,
    title: "Stay organised",
    body: "Track applications and never miss an opportunity.",
    color: "bg-emerald-50 text-emerald-600",
  },
];

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ plan?: string; redirect?: string; message?: string }> }) {
  const supabase = isSupabaseConfigured() ? await createSupabaseServerClient() : null;
  const { data: { user } } = supabase
    ? await supabase.auth.getUser()
    : { data: { user: null } };
  const { plan, redirect: redirectParam, message } = await searchParams;
  const redirectTo = plan ? `/checkout/initiate?plan=${plan}` : (redirectParam ?? "/");
  if (user) redirect(redirectTo);
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 px-5 py-8 text-slate-900 sm:px-8 lg:px-12">
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-[#d4ccff]/60 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full bg-violet-100/40 blur-3xl" />
      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl flex-col">
        <header className="flex items-center justify-between py-4">
          <img src="/brand/koalapply-logo.png" alt="Koalapply" className="h-32 w-auto sm:h-40" />
        </header>

        {message ? (
          <section className="flex flex-1 flex-col items-center justify-center py-8">
            <div className="w-full max-w-md">
              <div className="mb-6 rounded-2xl border border-[#d4ccff] bg-[#ece8ff] px-6 py-4 text-center text-base font-bold text-[#2200ff] shadow-sm">
                {message}
              </div>
              <AuthPanel redirectTo={redirectTo} />
            </div>
          </section>
        ) : (
          <section className="grid flex-1 items-center gap-8 py-4 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:py-10">
            <div className="mx-auto w-full max-w-[610px] lg:order-2">
              <AuthPanel redirectTo={redirectTo} />
            </div>

            <div className="mx-auto w-full max-w-xl lg:order-1 lg:mx-0">
              <h1 className="text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                Your next opportunity
                <span className="relative mt-2 block text-[#2200ff]">
                  starts here.
                  <span className="absolute -bottom-2 left-0 h-1.5 w-36 rounded-full bg-violet-300" />
                </span>
              </h1>
              <p className="mt-6 max-w-md text-base leading-7 text-slate-600 sm:text-xl sm:leading-9 lg:mt-8">
                Koalapply helps you find the right roles and apply with confidence.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3 lg:mt-10 lg:block lg:space-y-7">
                {benefits.map(({ icon: Icon, title, body, color }) => (
                  <div key={title} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm lg:flex lg:gap-5 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
                    <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl lg:h-14 lg:w-14 ${color}`}>
                      <Icon className="h-5 w-5 lg:h-6 lg:w-6" />
                    </span>
                    <span>
                      <span className="mt-3 block text-base font-bold text-slate-900 lg:mt-0">{title}</span>
                      <span className="mt-1 block max-w-sm text-sm leading-6 text-slate-600">{body}</span>
                    </span>
                  </div>
                ))}
              </div>

              <p className="mt-8 text-2xl font-semibold text-[#2200ff] lg:mt-12 lg:text-3xl">
                You&apos;ve got this! <span className="text-violet-400">♡</span>
              </p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
