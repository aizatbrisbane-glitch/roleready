import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { BlogArticle } from "@/lib/blog";

type Props = {
  article: BlogArticle;
  featured?: boolean;
};

export function BlogArticleCard({ article, featured = false }: Props) {
  if (featured) {
    return (
      <article className="grid overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-[0_24px_70px_rgba(34,0,255,0.08)] md:grid-cols-[1.05fr_0.95fr]">
        <div className="relative min-h-72 bg-slate-50 md:min-h-full">
          <Image src={article.image} alt={article.imageAlt} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-contain" priority />
        </div>
        <div className="p-6 sm:p-8 lg:p-10">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            <span className="rounded-full bg-[#ece8ff] px-3 py-1.5 text-[#2200ff]">{article.category}</span>
            <span>{article.readingTime}</span>
            <span>{article.publishDate}</span>
          </div>
          <h2 className="mt-5 text-3xl font-black leading-tight tracking-tight text-slate-900 sm:text-4xl">
            {article.title}
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-600">{article.excerpt}</p>
          <Link href={`/blog/${article.slug}`} className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#2200ff] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(34,0,255,0.22)] transition hover:-translate-y-0.5 hover:bg-[#1a00cc]">
            Read More <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </article>
    );
  }

  return (
    <article className="overflow-hidden rounded-[1.6rem] border border-slate-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(34,0,255,0.08)]">
      <Link href={`/blog/${article.slug}`} className="block">
        <div className="relative aspect-[16/10] bg-slate-50">
          <Image src={article.image} alt={article.imageAlt} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-contain" />
        </div>
      </Link>
      <div className="p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-400">
          <span className="rounded-full bg-[#ece8ff] px-2.5 py-1 text-[#2200ff]">{article.category}</span>
          <span>{article.readingTime}</span>
          <span>{article.publishDate}</span>
        </div>
        <h3 className="mt-4 text-xl font-black leading-snug text-slate-900">
          <Link href={`/blog/${article.slug}`} className="transition hover:text-[#2200ff]">
            {article.title}
          </Link>
        </h3>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{article.excerpt}</p>
      </div>
    </article>
  );
}
