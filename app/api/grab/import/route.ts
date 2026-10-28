import { scheduleAnalytics } from "@/lib/analytics-background";
import { recordGAEvent } from "@/lib/ga4";
import { NextResponse } from "next/server";
import { fetchJobAdDetails, detectJobSource, normaliseJobUrl } from "@/lib/job-ad";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const maxDuration = 60;
export const preferredRegion = ["syd1"];

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  const body = await request.json() as {
    title: string;
    company: string;
    location: string;
    salary: string;
    jobUrl: string;
    description: string;
    matchScore: number;
    matchReason: string;
  };

  // Try to fetch the full job description from the actual job page.
  // The jobUrl may be an Adzuna redirect — fetchJobAdDetails follows the redirect
  // and falls back to puppeteer for blocked sites (SEEK, LinkedIn, etc.).
  let jobDetails = {
    title: body.title,
    company: body.company,
    location: body.location,
    salary: body.salary,
    description: body.description,
    expiresAt: null as string | null,
  };

  try {
    console.log(`[import] fetching job ad: ${body.jobUrl}`);
    const fetched = await fetchJobAdDetails(body.jobUrl);
    console.log(`[import] fetched description length: ${fetched.description.trim().length}, snippet length: ${body.description.trim().length}`);
    // Only use fetched data when we got a meaningfully longer description
    if (fetched.description.trim().length > body.description.trim().length) {
      jobDetails = {
        title: fetched.title || body.title,
        company: fetched.company || body.company,
        location: fetched.location || body.location,
        salary: fetched.salary || body.salary,
        description: fetched.description,
        expiresAt: fetched.expiresAt ?? null,
      };
    } else {
      jobDetails.expiresAt = fetched.expiresAt ?? null;
    }
  } catch (e) {
    console.warn(`[import] fetchJobAdDetails failed for ${body.jobUrl}:`, e instanceof Error ? e.message : e);
    // Fall back to the snippet — the application page will prompt the user to paste the full ad
  }

  const normalisedUrl = normaliseJobUrl(body.jobUrl ?? "");

  // Check whether a job record already exists for this URL (created by a prior
  // tailor-intent save). Reuse it to avoid duplicate rows and respect the
  // UNIQUE (user_id, job_id) constraint on applications.
  const { data: existingJob } = await supabase
    .from("jobs")
    .select("id")
    .eq("user_id", user.id)
    .eq("job_url", normalisedUrl)
    .maybeSingle();

  let jobId: string;

  if (existingJob) {
    jobId = existingJob.id;
    // Update the job with the better-fetched description (best-effort; do not fail on error).
    await supabase
      .from("jobs")
      .update({
        title: jobDetails.title,
        company: jobDetails.company,
        location: jobDetails.location,
        salary: jobDetails.salary,
        description: jobDetails.description,
        expires_at: jobDetails.expiresAt,
      })
      .eq("id", jobId);
  } else {
    const { data: newJob, error: jobError } = await supabase
      .from("jobs")
      .insert({
        user_id: user.id,
        title: jobDetails.title,
        company: jobDetails.company,
        location: jobDetails.location,
        salary: jobDetails.salary,
        job_url: normalisedUrl,
        description: jobDetails.description,
        source: detectJobSource(body.jobUrl),
        expires_at: jobDetails.expiresAt,
      })
      .select("id")
      .single();

    if (jobError || !newJob) {
      return NextResponse.json({ error: jobError?.message ?? "Unable to create job." }, { status: 400 });
    }
    jobId = newJob.id;
  }

  // Upsert the application — handles both the first-time import and the
  // tailor-intent resume-gate promotion (Saved → New) without consuming
  // a duplicate credit or violating the UNIQUE (user_id, job_id) constraint.
  // tailor_intent is intentionally omitted so it is preserved on conflict
  // (the column default false applies only on fresh inserts).
  const { data: application, error: applicationError } = await supabase
    .from("applications")
    .upsert(
      {
        user_id: user.id,
        job_id: jobId,
        status: "New",
        match_score: body.matchScore ?? null,
        match_explanation: body.matchReason ?? null,
        missing_keywords: [],
      },
      { onConflict: "user_id,job_id" }
    )
    .select("id")
    .single();

  if (applicationError || !application) {
    return NextResponse.json({ error: applicationError?.message ?? "Unable to create application." }, { status: 400 });
  }

  scheduleAnalytics(() => recordGAEvent({ name: "job_added", key: `job:${jobId}`, userId: user.id }));
  return NextResponse.json({ applicationId: application.id });
}
