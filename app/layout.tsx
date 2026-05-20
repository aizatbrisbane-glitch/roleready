import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { Plus } from "lucide-react";
import { MobileNav } from "@/components/MobileNav";
import { Sidebar } from "@/components/Sidebar";
import { SignOutButton } from "@/components/SignOutButton";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

function initialsFrom(name?: string | null, email?: string | null) {
  return (name || email || "ApplyHQ")
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part[0]?.toUpperCase())
    .join("");
}

export const metadata: Metadata = {
  title: "ApplyHQ — Your Career Companion",
  description: "Tailored resumes and cover letters for every job ad, powered by AI.",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png"
  }
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = isSupabaseConfigured() ? await createSupabaseServerClient() : null;
  const { data: { user } } = supabase
    ? await supabase.auth.getUser()
    : { data: { user: null } };
  const { data: profile } = user && supabase
    ? await supabase.from("profiles").select("name,email,avatar_url").eq("id", user.id).maybeSingle()
    : { data: null };

  const authed = Boolean(user);
  const displayName = profile?.name || null;
  const displayEmail = profile?.email || user?.email || null;
  const avatarUrl = profile?.avatar_url || null;
  const initials = initialsFrom(displayName, displayEmail);

  return (
    <html lang="en" className={inter.className}>
      <body className="overflow-x-hidden">
        {authed && <Sidebar userName={displayName} userEmail={displayEmail} avatarUrl={avatarUrl} />}

        <div className={`flex min-h-screen flex-col ${authed ? "md:pl-60" : ""}`}>
          {/* Mobile-only top header — authenticated users only */}
          {authed && (
            <header className="sticky top-0 z-30 border-b border-[#efe6d8] bg-[#fffdf8]/95 backdrop-blur md:hidden">
              <div className="flex items-center justify-between px-4 py-3">
                <Link href="/" className="flex items-center gap-2.5">
                  <img src="/brand/applyhq-logo-transparent.png" alt="ApplyHQ" className="h-10 w-auto mix-blend-multiply" />
                </Link>

                <nav className="flex items-center gap-1">
                  <Link
                    href="/more"
                    className="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-teal-100 to-amber-100 text-xs font-semibold text-[#0f8f83] shadow-[0_10px_24px_rgba(20,33,61,0.08)] transition hover:bg-white hover:text-[#0f8f83]"
                    aria-label="Open profile menu"
                  >
                    {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : initials}
                  </Link>
                  <SignOutButton />
                  <Link
                    href="/jobs/new"
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#0f9f92] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#0b8f83]"
                  >
                    <Plus className="h-4 w-4" />
                  </Link>
                </nav>
              </div>
            </header>
          )}

          {children}

          {authed && <MobileNav />}
        </div>
      </body>
    </html>
  );
}
