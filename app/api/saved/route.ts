import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normaliseJobUrl } from "@/lib/job-ad";
import type { JobSource } from "@/types/database";

const VALID_SOURCES: JobSource[] = ["Manual", "SEEK", "LinkedIn", "Adzuna", "Other"];

function sanitiseSource(raw: string | undefined): JobSource {
  if (!raw) return "Other";
  const match = VALID_SOURCES.find((s) => s.toLowerCase() === raw.toLowerCase());
  return match ?? "Other";
}

export async function GET() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to view saved jobs." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("applications")
    .select("*, jobs(*)")
    .eq("user_id", user.id)
    .eq("status", "Saved")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ saved: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to save jobs." }, { status: 401 });
  }

  const body = await request.json();
  const { title, company, location, salary, jobUrl, description, source, tailor_intent } = body;
  const isTailorIntent = Boolean(tailor_intent);

  if (!title || !company) {
    return NextResponse.json({ error: "title and company are required." }, { status: 400 });
  }

  const normalisedUrl = normaliseJobUrl(String(jobUrl ?? ""));

  // Dedup: if this URL is already saved, return the existing application.
  // For tailor_intent saves, also promote the existing row if it wasn't already
  // marked as tailor intent (user bookmarked the same job before clicking Tailor).
  if (jobUrl) {
    const { data: existing } = await supabase
      .from("applications")
      .select("id, tailor_intent, jobs!inner(job_url)")
      .eq("user_id", user.id)
      .eq("status", "Saved")
      .eq("jobs.job_url", normalisedUrl)
      .maybeSingle();
    if (existing) {
      if (isTailorIntent && !(existing as { tailor_intent: boolean }).tailor_intent) {
        await supabase
          .from("applications")
          .update({ tailor_intent: true })
          .eq("id", existing.id);
      }
      return NextResponse.json({ applicationId: existing.id });
    }
  }

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .insert({
      user_id: user.id,
      title: String(title),
      company: String(company),
      location: String(location ?? ""),
      salary: String(salary ?? ""),
      job_url: normalisedUrl,
      description: String(description ?? ""),
      source: sanitiseSource(source),
    })
    .select("id")
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: jobError?.message ?? "Unable to create job." }, { status: 400 });
  }

  const { data: application, error: appError } = await supabase
    .from("applications")
    .insert({ user_id: user.id, job_id: job.id, status: "Saved", tailor_intent: isTailorIntent })
    .select("id")
    .single();

  if (appError || !application) {
    return NextResponse.json({ error: appError?.message ?? "Unable to save job." }, { status: 400 });
  }

  return NextResponse.json({ applicationId: application.id });
}
