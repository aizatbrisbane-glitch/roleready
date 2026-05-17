"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, UserRound } from "lucide-react";

const items = [
  { href: "/",        label: "Home",    icon: LayoutDashboard },
  { href: "/profile", label: "Profile", icon: UserRound },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-stone-200 bg-white md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs font-semibold transition ${
                active ? "text-teal-700" : "text-stone-400"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "text-teal-600" : "text-stone-400"}`} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
