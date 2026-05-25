import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchJobAdDetails } from "@/lib/job-ad";
import type { JobSource } from "@/types/database";

const sources: JobSource[] = ["Manual", "SEEK", "LinkedIn", "Adzuna", "Other"];

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in before adding jobs." }, { status: 401 });
  }

  const formData = await request.formData();
  const source = String(formData.get("source") ?? "Manual") as JobSource;
  const jobUrl = String(formData.get("job_url") ?? "");
  let description = String(formData.get("description") ?? "");

  if (jobUrl && description.trim().length < 300) {
    try {
      // Strip URL fragment — fragments aren't sent to servers and confuse Jina
      const cleanUrl = jobUrl.split("#")[0];
      const scraped = await Promise.race([
        fetchJobAdDetails(cleanUrl),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 32000)),
      ]);
      if (scraped && scraped.description.trim().length > description.trim().length) {
        description = scraped.description;
      }
    } catch {
      // Scraping failed — continue with user-pasted description
    }
  }

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .insert({
      user_id: user.id,
      title: String(formData.get("title") ?? ""),
      company: String(formData.get("company") ?? ""),
      location: String(formData.get("location") ?? ""),
      salary: String(formData.get("salary") ?? ""),
      job_url: jobUrl,
      description,
      source: sources.includes(source) ? source : "Manual"
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
      status: "New"
    })
    .select("id")
    .single();

  if (applicationError || !application) {
    return NextResponse.json({ error: applicationError?.message ?? "Unable to create application." }, { status: 400 });
  }

  return NextResponse.json({ applicationId: application.id });
}
