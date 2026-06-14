"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, Bookmark, Building2, FileText, Home, LogOut, Plus, Settings } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const navItems = [
  { href: "/",        label: "Home",             icon: Home },
  { href: "/applications", label: "Applications",     icon: FileText },
  { href: "/saved",   label: "Saved Jobs",       icon: Bookmark },
  { href: "/documents", label: "Documents",        icon: FileText },
  { href: "/profile", label: "Profile/Settings", icon: Settings },
];

type SidebarProps = {
  userName?: string | null;
  userEmail?: string | null;
  avatarUrl?: string | null;
  showEnterpriseAdmin?: boolean;
  planType?: string | null;
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

export function Sidebar({ userName, userEmail, avatarUrl, showEnterpriseAdmin, planType }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const initials = initialsFrom(userName, userEmail);
  const visibleNavItems = showEnterpriseAdmin
    ? [...navItems, { href: "/enterprise", label: "Enterprise", icon: Building2 }]
    : navItems;

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
        <img src="/brand/koalapply-logo.png" alt="Koalapply" className="h-20 w-auto" />
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

        <div className="pt-2">
          <Link
            href="/jobs/new"
            className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-500 transition duration-200 hover:bg-slate-50 hover:text-[#2200ff]"
          >
            <Plus className="h-4.5 w-4.5 shrink-0" />
            Add Job
          </Link>
        </div>
      </nav>

      {planType === "free" && (
        <div className="mx-4 mb-3 rounded-2xl bg-[#ece8ff] p-4">
          <p className="text-xs font-black text-[#2200ff]">Need to apply more?</p>
          <p className="mt-1 text-xs leading-5 text-[#4422cc]">You have 1 free application per month. Upgrade for up to 150.</p>
          <Link
            href="/pricing"
            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[#2200ff] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#1a00cc]"
          >
            See plans <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}

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
