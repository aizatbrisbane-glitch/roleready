"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, BarChart2, BookOpen, Bookmark, Building2, FileText, Home, LayoutDashboard, LogOut, Plus, Settings, Users, Zap } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const navItems = [
  { href: "/",        label: "Home",             icon: Home },
  { href: "/applications", label: "Applications",     icon: FileText },
  { href: "/saved",   label: "Saved Jobs",       icon: Bookmark },
  { href: "/documents", label: "Documents",        icon: FileText },
  { href: "/blog",     label: "Career Tips",      icon: BookOpen },
  { href: "/profile", label: "Profile/Settings", icon: Settings },
];

type SidebarProps = {
  userName?: string | null;
  userEmail?: string | null;
  avatarUrl?: string | null;
  showEnterpriseAdmin?: boolean;
  planType?: string | null;
  planLabel?: string | null;
  applicationsUsed?: number;
  applicationsRemaining?: number;
  applicationLimit?: number;
};

function initialsFrom(name?: string | null, email?: string | null) {
  const source = name || email || "Koalapply";
  return source
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part[0]?.toUpperCase())
    .join("");
}

const enterpriseNavItems = [
  { href: "/enterprise",            label: "Overview",    icon: LayoutDashboard },
  { href: "/enterprise#employees",  label: "Employees",   icon: Users },
  { href: "/enterprise#usage",      label: "Usage",       icon: BarChart2 },
  { href: "/profile",               label: "Settings",    icon: Settings },
];

export function Sidebar({ userName, userEmail, avatarUrl, showEnterpriseAdmin, planType, planLabel, applicationsUsed = 0, applicationsRemaining = 0, applicationLimit = 1 }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const initials = initialsFrom(userName, userEmail);
  const visibleNavItems = showEnterpriseAdmin ? enterpriseNavItems : navItems;

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    if (supabase) await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:z-30 md:flex md:w-60 md:flex-col md:border-r md:border-slate-100 md:bg-white">
      {/* Logo */}
      <div className="flex h-20 items-center px-7">
        <img src="/brand/koalapply-logo.png" alt="Koalapply" className="h-14 w-auto" />
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-1 px-4 py-4">
        {visibleNavItems.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={`${href}-${label}`}
              href={href}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition duration-200 ${
                active
                  ? "bg-[#ece8ff] text-[#2200ff] shadow-[0_4px_16px_rgba(34,0,255,0.1)]"
                  : "text-slate-500 hover:bg-slate-50 hover:text-[#2200ff]"
              }`}
            >
              <Icon className="h-4.5 w-4.5 shrink-0" />
              {label}
            </Link>
          );
        })}

        {!showEnterpriseAdmin && (
          <div className="pt-2">
            <Link
              href="/jobs/new"
              className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-500 transition duration-200 hover:bg-slate-50 hover:text-[#2200ff]"
            >
              <Plus className="h-4.5 w-4.5 shrink-0" />
              Add Job
            </Link>
          </div>
        )}
      </nav>

      <div className="px-4 py-5">
        <Link
          href="/profile"
          className="mb-3 flex min-w-0 items-center gap-3 rounded-2xl bg-slate-50 px-3 py-3 text-sm transition hover:bg-slate-100"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#ece8ff] to-[#d4ccff] text-sm font-semibold text-[#2200ff]">
            {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : initials}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold text-slate-800">{userName || "Profile"}</span>
            <span className="block truncate text-xs text-slate-400">{userEmail}</span>
          </span>
        </Link>

        {!showEnterpriseAdmin && (
          <div className="mb-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Your plan</p>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${planType === "free" ? "bg-slate-100 text-slate-600" : "bg-[#ece8ff] text-[#2200ff]"}`}>
                <Zap className="h-2.5 w-2.5" />
                {planLabel ?? "Free"}
              </span>
            </div>

            <div className="mt-3">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${applicationsRemaining === 0 ? "bg-rose-400" : "bg-[#2200ff]"}`}
                  style={{ width: `${applicationLimit > 0 ? Math.round((applicationsUsed / applicationLimit) * 100) : 0}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-slate-400">{applicationsRemaining} of {applicationLimit} remaining</p>
              {planType === "free" && (
                <p className="mt-0.5 text-xs text-slate-400">Resets on the 1st of each month</p>
              )}
            </div>

            {planType === "free" ? (
              <Link
                href="/pricing"
                className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[#2200ff] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#1a00cc]"
              >
                Upgrade <ArrowRight className="h-3 w-3" />
              </Link>
            ) : (
              <Link
                href="/profile"
                className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 transition hover:border-[#d4ccff] hover:text-[#2200ff]"
              >
                View details <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-400 transition hover:bg-slate-50 hover:text-rose-500"
        >
          <LogOut className="h-4.5 w-4.5 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
