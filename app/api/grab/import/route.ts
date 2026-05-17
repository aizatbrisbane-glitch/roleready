import { NextResponse } from "next/server";
import { fetchJobAdDetails, detectJobSource } from "@/lib/job-ad";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const maxDuration = 60;

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
  };

  try {
    const fetched = await fetchJobAdDetails(body.jobUrl);
    // Only use fetched data when we got a meaningfully longer description
    if (fetched.description.trim().length > body.description.trim().length) {
      jobDetails = {
        title: fetched.title || body.title,
        company: fetched.company || body.company,
        location: fetched.location || body.location,
        salary: fetched.salary || body.salary,
        description: fetched.description,
      };
    }
  } catch {
    // Fall back to the Adzuna snippet — the application page will prompt the user to paste the full ad
  }

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .insert({
      user_id: user.id,
      title: jobDetails.title,
      company: jobDetails.company,
      location: jobDetails.location,
      salary: jobDetails.salary,
      job_url: body.jobUrl,
      description: jobDetails.description,
      source: detectJobSource(body.jobUrl),
    })
    .select("id")
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: jobError?.message ?? "Unable to create job." }, { status: 400 });
  }

  const { data: application, error: applicationError } = await supabase
    .from("applications")
    .insert({
      user_id: user.id,
      job_id: job.id,
      status: "New",
      match_score: body.matchScore,
      match_explanation: body.matchReason,
      missing_keywords: [],
    })
    .select("id")
    .single();

  if (applicationError || !application) {
    return NextResponse.json({ error: applicationError?.message ?? "Unable to create application." }, { status: 400 });
  }

  return NextResponse.json({ applicationId: application.id });
}
