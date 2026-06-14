import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { blogArticles, blogCategories, getFeaturedArticle } from "@/lib/blog";
import { BlogArticleCard } from "@/components/blog/BlogArticleCard";
import { NewsletterSignup } from "@/components/blog/NewsletterSignup";
import { PublicFooter } from "@/components/PublicFooter";

export const metadata: Metadata = {
  title: "Career Advice & Insights | ApplyHQ",
  description: "Practical advice to help you find jobs, prepare applications, ace interviews and grow your career.",
};

export default function BlogPage() {
  const featured = getFeaturedArticle();
  const latest = blogArticles.filter((article) => article.slug !== featured.slug);

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
      <header className="border-b border-slate-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          <Link href="/" className="inline-flex items-center">
            <Image src="/brand/koalapply-logo.png" alt="Koalapply" width={168} height={56} className="h-24 w-auto sm:h-28" priority />
          </Link>

          <nav className="hidden items-center gap-9 text-sm font-medium text-slate-700 md:flex">
            <Link href="/#how-it-works" className="transition hover:text-[#2200ff]">How it works</Link>
            <Link href="/#features" className="transition hover:text-[#2200ff]">Features</Link>
            <Link href="/pricing" className="transition hover:text-[#2200ff]">Pricing</Link>
            <Link href="/blog" className="text-[#2200ff] transition hover:text-[#1a00cc]">Blog</Link>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/login" className="inline-flex min-h-10 items-center justify-center rounded-full px-4 text-sm font-semibold text-slate-700 transition hover:text-[#2200ff]">
              Log in
            </Link>
            <Link href="/login" className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#2200ff] px-4 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(34,0,255,0.3)] transition hover:-translate-y-0.5 hover:bg-[#1a00cc] sm:min-h-11 sm:px-6">
              Start free
            </Link>
          </div>
        </div>
      </header>

      <section className="bg-white px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full bg-[#ece8ff] px-3 py-1.5 text-sm font-semibold text-[#2200ff]">
            Resource Centre
          </p>
          <h1 className="text-4xl font-black leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Career Advice & Insights
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            Practical advice to help you find jobs, prepare applications, ace interviews and grow your career.
          </p>
        </div>
      </section>

      <section className="px-5 py-12 sm:px-8 lg:px-10 lg:py-16">
        <div className="mx-auto max-w-7xl">
          <BlogArticleCard article={featured} featured />
        </div>
      </section>

      <section className="px-5 pb-12 sm:px-8 lg:px-10 lg:pb-16">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap gap-2">
            {blogCategories.map((category) => (
              <span key={category} className="rounded-full border border-slate-100 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm">
                {category}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-14 sm:px-8 lg:px-10 lg:pb-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-7 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">Latest Articles</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Fresh career guidance</h2>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {latest.map((article) => (
              <BlogArticleCard key={article.slug} article={article} />
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-16 sm:px-8 lg:px-10 lg:pb-24">
        <div className="mx-auto max-w-7xl">
          <NewsletterSignup />
        </div>
      </section>
      <PublicFooter />
    </main>
  );
}
