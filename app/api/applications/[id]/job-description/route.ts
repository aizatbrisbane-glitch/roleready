import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ApplicationWithJob } from "@/types/database";

type Props = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Props) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in before editing job descriptions." }, { status: 401 });
  }

  const body = await request.json();
  const description = typeof body?.description === "string" ? body.description.trim() : "";

  if (description.length < 100) {
    return NextResponse.json({ error: "Paste the full job ad before saving." }, { status: 400 });
  }

  const { data: application } = await supabase.from("applications").select("*, jobs(*)").eq("id", id).eq("user_id", user.id).maybeSingle();
  const app = application as ApplicationWithJob | null;

  if (!app?.jobs) {
    return NextResponse.json({ error: "Application not found." }, { status: 404 });
  }

  const { error: jobError } = await supabase.from("jobs").update({ description }).eq("id", app.jobs.id).eq("user_id", user.id);

  if (jobError) {
    return NextResponse.json({ error: jobError.message }, { status: 400 });
  }

  const { error: applicationError } = await supabase
    .from("applications")
    .update({
      status: "New",
      match_score: null,
      match_explanation: null,
      missing_keywords: [],
      tailored_resume: null,
      cover_letter: null,
      generated_by: null,
      generated_at: null
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (applicationError) {
    return NextResponse.json({ error: applicationError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
