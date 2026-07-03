import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BlogArticleCard } from "@/components/blog/BlogArticleCard";
import { BlogResumeCTA } from "@/components/blog/BlogResumeCTA";
import { NewsletterSignup } from "@/components/blog/NewsletterSignup";
import { blogArticles, getArticleBySlug, getRelatedArticles } from "@/lib/blog";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return blogArticles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);

  if (!article) {
    return { title: "Article Not Found | Koalapply" };
  }

  return {
    title: `${article.title} | Koalapply`,
    description: article.excerpt,
  };
}

export default async function BlogArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);

  if (!article) notFound();

  const related = getRelatedArticles(article);

  const supabase = isSupabaseConfigured() ? await createSupabaseServerClient() : null;
  const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
      {!user && (
        <header className="border-b border-slate-100 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
            <Link href="/" className="inline-flex items-center">
              <Image src="/brand/koalapply-logo.png" alt="Koalapply" width={168} height={56} className="h-12 w-auto sm:h-14" priority />
            </Link>
            <Link href="/blog" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-[#2200ff]">
              <ArrowLeft className="h-4 w-4" /> Blog
            </Link>
          </div>
        </header>
      )}

      <article>
        <section className="bg-white px-5 py-10 sm:px-8 lg:px-10 lg:py-16">
          <div className="mx-auto max-w-4xl">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              <span className="rounded-full bg-[#ece8ff] px-3 py-1.5 text-[#2200ff]">{article.category}</span>
              <span>{article.author}</span>
              <span>{article.publishDate}</span>
              <span>{article.readingTime}</span>
            </div>
            <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              {article.title}
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-600">{article.excerpt}</p>
          </div>
        </section>

        <section className="px-5 py-8 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-4xl">
            <div className="relative aspect-[16/9] overflow-hidden rounded-[2rem] bg-slate-50 shadow-[0_24px_70px_rgba(34,0,255,0.08)]">
              <Image src={article.image} alt={article.imageAlt} fill sizes="(min-width: 1024px) 896px, 100vw" className="object-contain" priority />
            </div>
          </div>
        </section>

        <section className="px-5 pb-6 sm:px-8 lg:px-10 lg:pb-8">
          <div className="mx-auto max-w-4xl space-y-8">
            <div className="rounded-[1.5rem] border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Table of contents</p>
              <nav className="mt-4">
                <ol className="space-y-1">
                  {article.sections.filter((s) => s.title).map((section, index) => (
                    <li key={section.id} className="flex items-baseline gap-3">
                      <span className="w-5 shrink-0 text-right text-xs font-bold text-slate-300">{index + 1}.</span>
                      <a href={`#${section.id}`} className="text-sm font-semibold leading-6 text-slate-600 transition hover:text-[#2200ff]">
                        {section.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </div>

            <div className="rounded-[2rem] border border-slate-100 bg-white px-6 py-8 shadow-sm sm:px-8 lg:px-12 lg:py-12">
              <div className="space-y-10">
                {article.sections.map((section) => (
                  <section key={section.id} id={section.id} className="scroll-mt-8">
                    <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{section.title}</h2>
                    <div className="mt-4 space-y-4">
                      {section.paragraphs?.map((paragraph) => (
                        <p key={paragraph} className="text-base leading-8 text-slate-600">{paragraph}</p>
                      ))}
                    </div>
                    {section.bullets ? (
                      <ul className="mt-5 space-y-3">
                        {section.bullets.map((bullet) => (
                          <li key={bullet} className="flex gap-3 text-base leading-7 text-slate-600">
                            <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2200ff]" />
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </section>
                ))}
              </div>
            </div>
          </div>
        </section>
      </article>

      <BlogResumeCTA />

      <section className="px-5 pb-14 sm:px-8 lg:px-10 lg:pb-20">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-7 text-3xl font-black tracking-tight text-slate-900">Related articles</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <BlogArticleCard key={item.slug} article={item} />
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-16 sm:px-8 lg:px-10 lg:pb-24">
        <div className="mx-auto max-w-7xl">
          <NewsletterSignup />
        </div>
      </section>
    </main>
  );
}
