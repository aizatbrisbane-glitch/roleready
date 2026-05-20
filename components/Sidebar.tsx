"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bookmark, FileText, Home, LogOut, Plus, Settings } from "lucide-react";
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
};

function initialsFrom(name?: string | null, email?: string | null) {
  const source = name || email || "ApplyHQ";
  return source
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part[0]?.toUpperCase())
    .join("");
}

export function Sidebar({ userName, userEmail, avatarUrl }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const initials = initialsFrom(userName, userEmail);

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    if (supabase) await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:z-30 md:flex md:w-60 md:flex-col md:border-r md:border-[#efe6d8] md:bg-[#fffdf8]/95 md:backdrop-blur">
      {/* Logo */}
      <div className="flex h-20 items-center px-7">
        <img src="/brand/applyhq-logo-transparent.png" alt="ApplyHQ" className="h-12 w-auto mix-blend-multiply" />
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-2 px-4 py-4">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={`${href}-${label}`}
              href={href}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition duration-300 ${
                active
                  ? "bg-teal-50 text-[#0f8f83] shadow-[0_16px_42px_rgba(15,159,146,0.08)]"
                  : "text-[#14213d]/70 hover:-translate-y-0.5 hover:bg-white hover:text-[#0f8f83] hover:shadow-sm"
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
            className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-[#14213d]/70 transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:text-[#0f8f83] hover:shadow-sm"
          >
            <Plus className="h-4.5 w-4.5 shrink-0" />
            Add Job
          </Link>
        </div>
      </nav>

      <div className="px-4 py-5">
        <Link
          href="/profile"
          className="mb-3 flex min-w-0 items-center gap-3 rounded-2xl bg-white/70 px-3 py-3 text-sm transition hover:bg-white"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-teal-100 to-amber-100 text-sm font-semibold text-[#0f8f83]">
            {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : initials}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold text-[#14213d]">{userName || "Profile"}</span>
            <span className="block truncate text-xs text-slate-500">{userEmail}</span>
          </span>
        </Link>

        <button
          type="button"
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-[#14213d]/55 transition hover:bg-white hover:text-rose-500"
        >
          <LogOut className="h-4.5 w-4.5 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
