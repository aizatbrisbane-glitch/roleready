import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";
import Link from "next/link";
import { Plus } from "lucide-react";
import { headers } from "next/headers";
import { MobileNav } from "@/components/MobileNav";
import { Sidebar } from "@/components/Sidebar";
import { AttributionCapture } from "@/components/AttributionCapture";
import { SignOutButton } from "@/components/SignOutButton";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAccessState } from "@/lib/entitlements";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

function initialsFrom(name?: string | null, email?: string | null) {
  return (name || email || "Koalapply")
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part[0]?.toUpperCase())
    .join("");
}

export const metadata: Metadata = {
  metadataBase: new URL("https://koalapply.com"),
  title: "Koalapply — Job hunting, without the burnout.",
  description: "Tailored resumes and cover letters for every job ad, powered by AI.",
  icons: {
    icon: [
      { url: "/brand/koalapply-favicon.png", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      { rel: "manifest", url: "/site.webmanifest" },
    ],
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = isSupabaseConfigured() ? await createSupabaseServerClient() : null;
  const { data: { user } } = supabase
    ? await supabase.auth.getUser()
    : { data: { user: null } };
  const { data: profile } = user && supabase
    ? await supabase.from("profiles").select("name,email,avatar_url,role").eq("id", user.id).maybeSingle()
    : { data: null };
  if (user && supabase) {
    await supabase.rpc("accept_enterprise_invitations");
  }
  const { data: enterpriseAdminMembership } = user && supabase
    ? await supabase
        .from("organization_members")
        .select("id")
        .eq("user_id", user.id)
        .in("role", ["owner", "admin"])
        .limit(1)
        .maybeSingle()
    : { data: null };

  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  const isPublicShellPage =
    pathname === "/login" ||
    pathname === "/enterprise/request" ||
    pathname.startsWith("/auth/");
  const authed = Boolean(user) && !isPublicShellPage;
  const displayName = profile?.name || null;
  const displayEmail = profile?.email || user?.email || null;
  const avatarUrl = profile?.avatar_url || null;
  const initials = initialsFrom(displayName, displayEmail);
  const showEnterpriseAdmin = Boolean(enterpriseAdminMembership);
  const isAdmin = profile?.role === "admin" || profile?.role === "founder";
  const access = user && supabase ? await getAccessState(supabase, user.id) : null;
  const planType = access?.planType ?? null;

  return (
    <html lang="en" className={inter.className}>
      <body className="overflow-x-hidden">
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-R1ZFGNBD6D" strategy="afterInteractive" />
        <Script id="ga-init" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-R1ZFGNBD6D');
        `}</Script>

        {/* Meta Pixel — base code, fires PageView on every page. Two pixels share one script load. */}
        <Script id="meta-pixel" strategy="afterInteractive">{`
          !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
          n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
          document,'script','https://connect.facebook.net/en_US/fbevents.js');
          fbq('init','1740921460363763');
          fbq('init','1596552155409990');
          fbq('track','PageView');
        `}</Script>
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img height="1" width="1" style={{ display: "none" }} alt=""
            src="https://www.facebook.com/tr?id=1740921460363763&ev=PageView&noscript=1" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img height="1" width="1" style={{ display: "none" }} alt=""
            src="https://www.facebook.com/tr?id=1596552155409990&ev=PageView&noscript=1" />
        </noscript>

        {/* LinkedIn Insight Tag — base code, fires on every page */}
        <Script id="linkedin-insight" strategy="afterInteractive">{`
          _linkedin_partner_id="9404122";
          window._linkedin_data_partner_ids=window._linkedin_data_partner_ids||[];
          window._linkedin_data_partner_ids.push(_linkedin_partner_id);
          (function(l){if(!l){window.lintrk=function(a,b){window.lintrk.q.push([a,b])};
          window.lintrk.q=[];}
          var s=document.getElementsByTagName("script")[0];
          var b=document.createElement("script");
          b.type="text/javascript";b.async=true;
          b.src="https://snap.licdn.com/li.lms-analytics/insight.min.js";
          s.parentNode.insertBefore(b,s);})(window.lintrk);
        `}</Script>
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img height="1" width="1" style={{ display: "none" }} alt=""
            src="https://px.ads.linkedin.com/collect/?pid=9404122&fmt=gif" />
        </noscript>
        <AttributionCapture isAuthenticated={Boolean(user)} />
        {authed && (
          <Sidebar
            userName={displayName}
            userEmail={displayEmail}
            avatarUrl={avatarUrl}
            showEnterpriseAdmin={showEnterpriseAdmin}
            isAdmin={isAdmin}
            planType={planType}
            planLabel={access?.planLabel ?? null}
            applicationsUsed={access?.applicationsUsed ?? 0}
            applicationsRemaining={access?.applicationsRemaining ?? 0}
            applicationLimit={access?.applicationLimit ?? 1}
          />
        )}

        <div className={`flex min-h-screen flex-col ${authed ? "md:pl-60" : ""}`}>
          {/* Mobile-only top header — authenticated users only */}
          {authed && (
            <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/95 backdrop-blur md:hidden">
              <div className="flex items-center justify-between px-4 py-3">
                <Link href="/" className="flex items-center gap-2.5">
                  <img src="/brand/koalapply-logo.png" alt="Koalapply" className="h-14 w-auto" />
                </Link>

                <nav className="flex items-center gap-1">
                  {!showEnterpriseAdmin && planType === "free" && (
                    <Link
                      href="/pricing"
                      className="inline-flex items-center gap-1 rounded-full bg-[#ece8ff] px-3 py-1.5 text-xs font-semibold text-[#2200ff] transition hover:bg-[#ddd8ff]"
                    >
                      Upgrade
                    </Link>
                  )}
                  <Link
                    href="/more"
                    className="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#ece8ff] to-[#d4ccff] text-xs font-semibold text-[#2200ff] shadow-[0_10px_24px_rgba(34,0,255,0.12)] transition hover:bg-white hover:text-[#2200ff]"
                    aria-label="Open profile menu"
                  >
                    {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : initials}
                  </Link>
                  <SignOutButton />
                  {!showEnterpriseAdmin && (
                    <Link
                      href="/jobs/new"
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#2200ff] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#1a00cc]"
                    >
                      <Plus className="h-4 w-4" />
                    </Link>
                  )}
                </nav>
              </div>
            </header>
          )}

          {children}

          {authed && <MobileNav showEnterpriseAdmin={showEnterpriseAdmin} isAdmin={isAdmin} />}
          <Analytics />
        </div>
      </body>
    </html>
  );
}
