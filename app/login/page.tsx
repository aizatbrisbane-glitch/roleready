import { CheckCircle2, Sparkles, Target } from "lucide-react";
import { AuthPanel } from "@/components/AuthPanel";

const benefits = [
  {
    icon: Sparkles,
    title: "AI tailored for you",
    body: "Resumes and cover letters that highlight your best.",
    color: "bg-teal-50 text-[#0f9f92]",
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
    color: "bg-amber-50 text-amber-600",
  },
];

export default function LoginPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fffaf4] px-5 py-8 text-[#14213d] sm:px-8 lg:px-12">
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-teal-100/70 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full bg-amber-100/45 blur-3xl" />
      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl flex-col">
        <header className="flex items-center justify-between py-4">
          <img src="/brand/applyhq-logo-transparent.png" alt="ApplyHQ" className="h-12 w-auto mix-blend-multiply sm:h-14" />
        </header>

        <section className="grid flex-1 items-center gap-8 py-4 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:py-10">
          <div className="mx-auto w-full max-w-[610px] lg:order-2">
            <AuthPanel />
          </div>

          <div className="mx-auto w-full max-w-xl lg:order-1 lg:mx-0">
            <h1 className="font-serif text-4xl font-semibold leading-tight tracking-tight text-[#14213d] sm:text-5xl lg:text-6xl">
              Your next opportunity
              <span className="relative mt-2 block text-[#0f9f92]">
                starts here.
                <span className="absolute -bottom-2 left-0 h-1.5 w-36 rounded-full bg-[#ff9d8d]" />
              </span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-7 text-slate-600 sm:text-xl sm:leading-9 lg:mt-8">
              ApplyHQ helps you find the right roles and apply with confidence.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3 lg:mt-10 lg:block lg:space-y-7">
              {benefits.map(({ icon: Icon, title, body, color }) => (
                <div key={title} className="rounded-3xl bg-white/58 p-4 shadow-[0_14px_42px_rgba(20,33,61,0.045)] lg:flex lg:gap-5 lg:bg-transparent lg:p-0 lg:shadow-none">
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl lg:h-14 lg:w-14 ${color}`}>
                    <Icon className="h-5 w-5 lg:h-6 lg:w-6" />
                  </span>
                  <span>
                    <span className="mt-3 block text-base font-semibold text-[#14213d] lg:mt-0">{title}</span>
                    <span className="mt-1 block max-w-sm text-sm leading-6 text-slate-600">{body}</span>
                  </span>
                </div>
              ))}
            </div>

            <p className="mt-8 font-serif text-2xl italic text-[#0f9f92] lg:mt-12 lg:text-3xl">
              You&apos;ve got this! <span className="text-amber-400">♡</span>
            </p>
          </div>

        </section>
      </div>
    </main>
  );
}
