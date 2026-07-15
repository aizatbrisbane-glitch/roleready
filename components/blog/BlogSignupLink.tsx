"use client";

import Link from "next/link";
import { analytics } from "@/lib/analytics";

export function BlogSignupLink({ slug, children, className }: { slug: string; children: React.ReactNode; className?: string }) {
  return (
    <Link
      href="/login"
      className={className}
      onClick={() => analytics.blogSignupClick({ sourceSlug: slug })}
    >
      {children}
    </Link>
  );
}
