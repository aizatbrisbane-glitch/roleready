import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ id: string }>;
};

const KEY_NOTES_FIELDS = ["notes", "hiring_manager", "location_type", "role_summary", "other_notes"] as const;

export async function PATCH(request: Request, { params }: Props) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to update applications." }, { status: 401 });
  }

  const body = await request.json();
  const update: Record<string, unknown> = {};
  for (const field of KEY_NOTES_FIELDS) {
    if (field in body) update[field] = body[field] ?? null;
  }

  if ("reference_ids" in body) update.reference_ids = Array.isArray(body.reference_ids) ? body.reference_ids : [];
  if ("include_references_in_cv" in body) update.include_references_in_cv = Boolean(body.include_references_in_cv);
  if ("interview_questions" in body) update.interview_questions = body.interview_questions;
  if ("tailored_resume" in body) update.tailored_resume = body.tailored_resume ?? null;
  if ("cover_letter" in body) update.cover_letter = body.cover_letter ?? null;
  if ("strengthened_keywords" in body) update.strengthened_keywords = body.strengthened_keywords;
  if ("strengthened_keyword_snippets" in body) update.strengthened_keyword_snippets = body.strengthened_keyword_snippets;
  if ("strengthened_keyword_originals" in body) update.strengthened_keyword_originals = body.strengthened_keyword_originals;
  if ("strengthened_keyword_targets" in body) update.strengthened_keyword_targets = body.strengthened_keyword_targets;
  if ("strengthen_count" in body) update.strengthen_count = Math.max(0, Number(body.strengthen_count) || 0);
  if ("skipped_keywords" in body) update.skipped_keywords = body.skipped_keywords;

  // Update salary on the linked job if provided
  if ("salary" in body) {
    const { data: app } = await supabase.from("applications").select("job_id").eq("id", id).eq("user_id", user.id).maybeSingle();
    if (app?.job_id) {
      await supabase.from("jobs").update({ salary: body.salary ?? "" }).eq("id", app.job_id).eq("user_id", user.id);
    }
  }

  if (Object.keys(update).length === 0 && !("salary" in body)) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
  }

  if (Object.keys(update).length > 0) {
    const { error } = await supabase.from("applications").update(update).eq("id", id).eq("user_id", user.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Props) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in before deleting applications." }, { status: 401 });
  }

  const { error } = await supabase.from("applications").delete().eq("id", id).eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
