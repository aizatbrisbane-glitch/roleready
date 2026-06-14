import Link from "next/link";
import { PublicFooter } from "@/components/PublicFooter";
import { legalDetails } from "@/lib/legal";

type Section = {
  title: string;
  body: string[];
};

type LegalPageProps = {
  title: string;
  intro: string;
  sections: Section[];
};

export function LegalPage({ title, intro, sections }: LegalPageProps) {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-100 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" className="inline-flex items-center">
            <img src="/brand/koalapply-logo.png" alt="Koalapply" className="h-24 w-auto sm:h-28" />
          </Link>
          <Link href="/login" className="rounded-full bg-[#2200ff] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1a00cc]">
            Start free
          </Link>
        </div>
      </header>

      <section className="px-5 py-12 sm:px-8 lg:py-16">
        <article className="mx-auto max-w-3xl rounded-[1.75rem] border border-slate-100 bg-white p-6 shadow-sm sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#2200ff]">Legal</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">{title}</h1>
          <p className="mt-4 text-base leading-7 text-slate-600">{intro}</p>
          <p className="mt-4 text-sm text-slate-500">Last updated: {legalDetails.lastUpdated}</p>

          <div className="mt-10 space-y-8">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-xl font-black tracking-tight text-slate-900">{section.title}</h2>
                <div className="mt-3 space-y-3 text-sm leading-7 text-slate-600">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </article>
      </section>

      <PublicFooter />
    </main>
  );
}
