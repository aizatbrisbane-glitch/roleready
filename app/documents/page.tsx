import { FileText } from "lucide-react";
import { AuthPanel } from "@/components/AuthPanel";
import { DocumentsForm } from "@/components/DocumentsForm";
import { SetupNotice } from "@/components/SetupNotice";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { MasterCoverLetter, MasterResume } from "@/types/database";

export default async function DocumentsPage() {
  const configured = isSupabaseConfigured();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  if (!configured) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <SetupNotice />
      </main>
    );
  }

  if (!user || !supabase) {
    return (
      <main className="mx-auto flex max-w-6xl justify-center px-4 py-12">
        <AuthPanel />
      </main>
    );
  }

  const [{ data: masterResume }, { data: masterCoverLetter }] = await Promise.all([
    supabase.from("master_resumes").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("master_cover_letters").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  return (
    <main className="min-h-screen bg-[#fffaf4] px-4 py-5 pb-36 md:px-8 md:py-10 md:pb-10 xl:px-10">
      <div className="mx-auto max-w-[1520px] overflow-x-clip">
        <div className="mb-6 max-w-4xl md:mb-8">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1.5 text-sm font-semibold text-[#0f8f83] md:text-xs">
            <FileText className="h-4 w-4" />
            Documents
          </p>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-[#14213d] md:text-5xl">
            Keep your master documents ready.
          </h1>
          <p className="mt-2 max-w-2xl text-base leading-7 text-slate-600 md:mt-3 md:text-lg md:leading-8">
            ApplyHQ uses these as the source material for tailored resumes and cover letters.
          </p>
        </div>

        <DocumentsForm masterResume={masterResume as MasterResume | null} masterCoverLetter={masterCoverLetter as MasterCoverLetter | null} />
      </div>
    </main>
  );
}
