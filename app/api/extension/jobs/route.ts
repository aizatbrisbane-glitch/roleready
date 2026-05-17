import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ExtensionJobPayload = {
  title?: string;
  company?: string;
  location?: string;
  salary?: string;
  description?: string;
  url?: string;
};

function corsHeaders(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  const allowedOrigin = origin.startsWith("chrome-extension://") ? origin : "http://localhost:3004";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(request)
  });
}

export async function POST(request: Request) {
  const headers = corsHeaders(request);
  try {
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return NextResponse.json({ error: "Supabase is not configured." }, { status: 500, headers });
    }

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 401, headers });
    }

    if (!user) {
      return NextResponse.json({ error: "Open the Job Assistant app and sign in first, then try the extension again." }, { status: 401, headers });
    }

    const payload = (await request.json()) as ExtensionJobPayload | null;

    if (!payload) {
      return NextResponse.json({ error: "The extension did not send any job ad data." }, { status: 400, headers });
    }

    const description = payload.description?.trim() ?? "";

    if (description.length < 200) {
      return NextResponse.json({ error: "The extension could not find enough job ad text on this page." }, { status: 400, headers });
    }

    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .insert({
        user_id: user.id,
        title: payload.title?.trim().slice(0, 300) || "Imported job ad",
        company: payload.company?.trim().slice(0, 300) || "Company from job ad",
        location: payload.location?.trim().slice(0, 300) || "",
        salary: payload.salary?.trim().slice(0, 300) || "",
        job_url: payload.url?.trim().slice(0, 1200) || "",
        description: description.slice(0, 30000),
        source: payload.url?.includes("seek.com") ? "SEEK" : "Other"
      })
      .select("id")
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: jobError?.message ?? "Unable to create job." }, { status: 400, headers });
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
      return NextResponse.json({ error: applicationError?.message ?? "Unable to create application." }, { status: 400, headers });
    }

    return NextResponse.json({ applicationId: application.id, applicationUrl: `/applications/${application.id}` }, { headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unexpected import error." }, { status: 500, headers });
  }
}
