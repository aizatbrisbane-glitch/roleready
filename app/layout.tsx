import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { BriefcaseBusiness, Plus, UserRound } from "lucide-react";
import { MobileNav } from "@/components/MobileNav";
import { Sidebar } from "@/components/Sidebar";
import { SignOutButton } from "@/components/SignOutButton";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "JobPilot — AI Job Search Assistant",
  description: "Tailored resumes and cover letters for every job ad, powered by AI."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body className="overflow-x-hidden">
        {/* Desktop sidebar */}
        <Sidebar />

        {/* Content — offset right on desktop to clear the fixed sidebar */}
        <div className="flex min-h-screen flex-col md:pl-56">

          {/* Mobile-only top header */}
          <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900 md:hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <Link href="/" className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/20">
                  <BriefcaseBusiness className="h-4.5 w-4.5 text-teal-400" />
                </div>
                <span className="text-[15px] font-semibold tracking-tight text-white">JobPilot</span>
              </Link>

              <nav className="flex items-center gap-1">
                <Link
                  href="/profile"
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-slate-400 transition hover:bg-slate-800 hover:text-white"
                >
                  <UserRound className="h-4 w-4" />
                </Link>
                <SignOutButton />
                <Link
                  href="/jobs/new"
                  className="inline-flex items-center gap-1.5 rounded-md bg-teal-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-teal-500"
                >
                  <Plus className="h-4 w-4" />
                </Link>
              </nav>
            </div>
          </header>

          {children}
          <MobileNav />
        </div>
      </body>
    </html>
  );
}
