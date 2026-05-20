"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, FileText, Home, Menu } from "lucide-react";

const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/applications", label: "Applications", icon: FileText },
  { href: "/saved", label: "Saved", icon: Bookmark },
  { href: "/more", label: "More", icon: Menu, activePaths: ["/more", "/documents", "/profile"] },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#eadfce] bg-[#fffdf8]/98 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-lg px-2">
        {items.map(({ href, label, icon: Icon, activePaths }) => {
          const active = href === "/" ? pathname === "/" : (activePaths ?? [href]).some((path) => pathname.startsWith(path));
          return (
            <Link
              key={`${href}-${label}`}
              href={href}
              className={`relative flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition ${
                active ? "text-[#0f8f83]" : "text-slate-400"
              }`}
            >
              {active ? <span className="absolute top-0 h-0.5 w-8 rounded-full bg-[#0f9f92]" /> : null}
              <Icon className={`h-5 w-5 ${active ? "text-[#0f9f92]" : "text-slate-400"}`} strokeWidth={active ? 2.5 : 2} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
