import Link from "next/link";
import { legalDetails } from "@/lib/legal";

export function PublicFooter() {
  return (
    <footer className="border-t border-slate-100 bg-white px-5 py-10 text-sm text-slate-500 sm:px-8 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-semibold text-slate-900">{legalDetails.brandName}</p>
          <p className="mt-1">{legalDetails.legalName} · {legalDetails.abn}</p>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 font-semibold">
          <Link href="/privacy" className="transition hover:text-[#2200ff]">Privacy</Link>
          <Link href="/terms" className="transition hover:text-[#2200ff]">Terms</Link>
          <Link href="/refunds" className="transition hover:text-[#2200ff]">Refunds</Link>
          <a href={`mailto:${legalDetails.supportEmail}`} className="transition hover:text-[#2200ff]">Contact</a>
        </nav>
      </div>
    </footer>
  );
}
