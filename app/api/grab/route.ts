import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CachedGrabbedJob } from "@/types/database";

type AdzunaJob = {
  id: string;
  title: string;
  description: string;
  company: { display_name: string };
  location: { display_name: string };
  salary_min?: number;
  salary_max?: number;
  redirect_url: string;
  created: string;
};

type JoobleJob = {
  title: string;
  company: string;
  location: string;
  salary: string;
  snippet: string;
  link: string;
  updated: string;
  source?: string;
};

function normaliseJoobleSource(raw?: string): string {
  if (!raw) return "Jooble";
  const s = raw.toLowerCase();
  if (s.includes("seek")) return "Seek";
  if (s.includes("linkedin")) return "LinkedIn";
  if (s.includes("indeed")) return "Indeed";
  if (s.includes("adzuna")) return "Adzuna";
  if (s.includes("ethicaljobs")) return "Ethical Jobs";
  // Capitalise whatever Jooble gives us
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export type GrabResult = {
  id: string;
  title: string;
  company: string;
  location: string;
  salaryMin?: number;
  salaryMax?: number;
  salary?: string;
  description: string;
  jobUrl: string;
  matchScore: number;
  matchReason: string;
  postedAt: string;
  source?: string;
  fetchedAt?: string;
};

function formatSalary(min?: number, max?: number): string {
  if (!min && !max) return "";
  const fmt = (n: number) => `$${Math.round(n / 1000)}k`;
  if (min && max) return `${fmt(min)} - ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  return `Up to ${fmt(max!)}`;
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function cachedRowToResult(row: CachedGrabbedJob): GrabResult {
  return {
    id: row.external_id,
    title: row.title,
    company: row.company,
    location: row.location,
    salaryMin: row.salary_min ?? undefined,
    salaryMax: row.salary_max ?? undefined,
    salary: row.salary || undefined,
    description: row.description,
    jobUrl: row.job_url,
    matchScore: row.match_score,
    matchReason: row.match_reason,
    postedAt: row.posted_at ?? row.created_at,
    source: row.source || undefined,
    fetchedAt: row.fetched_at
  };
}

const keywordSchema = {
  type: "object" as const,
  additionalProperties: false,
  required: ["jobTitle", "searchQuery"],
  properties: {
    jobTitle: { type: "string" },
    searchQuery: { type: "string" }
  }
};

const scoringSchema = {
  type: "object" as const,
  additionalProperties: false,
  required: ["scores"],
  properties: {
    scores: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "score", "reason"],
        properties: {
          id: { type: "string" },
          score: { type: "integer" },
          reason: { type: "string" }
        }
      }
    }
  }
};

async function extractKeywords(resumeText: string, provider: "anthropic" | "openai") {
  const userMsg = `Extract the primary job title and a 5–8 keyword search query from this resume. Focus on the most recent role and core skills.\n\nResume:\n${resumeText.slice(0, 8000)}`;

  if (provider === "anthropic") {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured.");
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 0 });
    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
      max_tokens: 200,
      tools: [{ name: "extract", description: "Extract job search keywords from resume.", input_schema: keywordSchema as Anthropic.Tool.InputSchema }],
      tool_choice: { type: "tool", name: "extract" },
      messages: [{ role: "user", content: userMsg }]
    });
    const block = response.content.find((b) => b.type === "tool_use");
    if (!block || block.type !== "tool_use") throw new Error("No keyword extraction result from Anthropic.");
    return block.input as { jobTitle: string; searchQuery: string };
  }

  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    input: [{ role: "user", content: [{ type: "input_text", text: userMsg }] }],
    text: { format: { type: "json_schema", name: "extract_keywords", schema: keywordSchema, strict: true } }
  } as OpenAI.Responses.ResponseCreateParamsNonStreaming);
  return JSON.parse(response.output_text) as { jobTitle: string; searchQuery: string };
}

async function scoreJobs(
  resumeText: string,
  jobs: { id: string; title: string; company: string; description: string }[],
  provider: "anthropic" | "openai"
) {
  const jobList = jobs
    .map((j) => `ID:${j.id}\nTitle: ${j.title} at ${j.company}\n${j.description.slice(0, 600)}`)
    .join("\n---\n");

  const userMsg = `You are a strict recruiter scoring job-resume fit from 0–100.

Scoring guide:
- 80–100: Strong match — title aligns, most key skills present, right seniority level
- 60–79: Reasonable match — related field, some gaps in skills or level
- 40–59: Partial match — different specialisation or seniority, some transferable skills
- 0–39: Weak match — different field, missing core requirements

Be conservative. Most scores should fall in the 40–70 range. Only award 80+ when there is clear evidence across title, experience level, AND key skills.

Resume (summary):\n${resumeText.slice(0, 6000)}\n\nJobs to score:\n${jobList}`;

  if (provider === "anthropic") {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured.");
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 0 });
    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
      max_tokens: 2000,
      tools: [{ name: "score_jobs", description: "Score job listings against a resume.", input_schema: scoringSchema as Anthropic.Tool.InputSchema }],
      tool_choice: { type: "tool", name: "score_jobs" },
      messages: [{ role: "user", content: userMsg }]
    });
    const block = response.content.find((b) => b.type === "tool_use");
    if (!block || block.type !== "tool_use") throw new Error("No scoring result from Anthropic.");
    return (block.input as { scores: { id: string; score: number; reason: string }[] }).scores;
  }

  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    input: [{ role: "user", content: [{ type: "input_text", text: userMsg }] }],
    text: { format: { type: "json_schema", name: "score_jobs", schema: scoringSchema, strict: true } }
  } as OpenAI.Responses.ResponseCreateParamsNonStreaming);
  return (JSON.parse(response.output_text) as { scores: { id: string; score: number; reason: string }[] }).scores;
}

async function fetchAdzunaJobs({
  appId,
  appKey,
  query,
  where,
  workTypes,
  salaryMin,
  maxDaysOld,
  resultsPerPage,
}: {
  appId: string;
  appKey: string;
  query: string;
  where?: string;
  workTypes?: string;
  salaryMin?: number;
  maxDaysOld: number;
  resultsPerPage: number;
}) {
  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    results_per_page: String(resultsPerPage),
    what: query,
    max_days_old: String(maxDaysOld),
    sort_by: "date",
  });
  if (where) params.set("where", where);
  if (workTypes) {
    for (const t of workTypes.split(",")) {
      const trimmed = t.trim();
      if (trimmed) params.set(trimmed, "1");
    }
  }
  if (salaryMin) params.set("salary_min", String(salaryMin));

  const res = await fetch(`https://api.adzuna.com/v1/api/jobs/au/search/1?${params}`, {
    headers: { Accept: "application/json" },
    cache: "no-store"
  });
  if (!res.ok) throw new Error(`Adzuna returned HTTP ${res.status}`);
  const data = (await res.json()) as { results?: AdzunaJob[] };
  return data.results ?? [];
}

const AU_GEO_TERMS = ["australia", "nsw", "vic", "qld", "wa", "sa", "act", "tas", "nt",
  "sydney", "melbourne", "brisbane", "perth", "adelaide", "canberra", "hobart", "darwin"];

function isAustralianLocation(loc: string): boolean {
  const l = loc.toLowerCase();
  return AU_GEO_TERMS.some((t) => l.includes(t));
}

// State abbreviations and full names for each capital — used to broaden city matches
const CITY_STATE_MAP: Record<string, string[]> = {
  brisbane:   ["qld", "queensland"],
  sydney:     ["nsw", "new south wales"],
  melbourne:  ["vic", "victoria"],
  perth:      ["wa", "western australia"],
  adelaide:   ["sa", "south australia"],
  canberra:   ["act", "australian capital territory"],
  hobart:     ["tas", "tasmania"],
  darwin:     ["nt", "northern territory"],
};

function matchesRequestedLocation(jobLoc: string, requested: string): boolean {
  const j = jobLoc.toLowerCase();
  const r = requested.toLowerCase().trim();
  if (!r) return true;
  // Direct substring match
  if (j.includes(r)) return true;
  // Match by state for known cities (e.g. "QLD" matches "Brisbane" request)
  for (const [city, states] of Object.entries(CITY_STATE_MAP)) {
    if (r.includes(city)) {
      if (states.some((s) => j.includes(s))) return true;
    }
  }
  // Match first word of requested location (e.g. "Brisbane" from "Brisbane, QLD")
  const firstWord = r.split(/[\s,]+/)[0];
  return firstWord.length > 2 && j.includes(firstWord);
}

async function fetchJoobleJobs({
  apiKey,
  query,
  location,
}: {
  apiKey: string;
  query: string;
  location?: string;
}): Promise<GrabResult[]> {
  // Always search all of Australia so Jooble returns maximum results.
  // City-level filtering is applied post-fetch via matchesRequestedLocation.
  // Sending a specific city to Jooble causes it to return far fewer results than
  // searching broadly and filtering ourselves.
  const body: Record<string, string | number> = { keywords: query, location: "Australia", page: 1 };

  const res = await fetch(`https://jooble.org/api/${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Jooble returned HTTP ${res.status}`);
  const data = (await res.json()) as { jobs?: JoobleJob[] };

  return (data.jobs ?? [])
    .filter((j) => {
      if (!j.location) return true;
      if (!isAustralianLocation(j.location)) return false;
      // If a specific city/location was requested, enforce it at the city level
      if (location) return matchesRequestedLocation(j.location, location);
      return true;
    })
    .map((j) => ({
      id: j.link,
      title: j.title,
      company: j.company ?? "",
      location: j.location ?? "",
      description: [j.title, j.company, j.snippet].filter(Boolean).join(" — "),
      jobUrl: j.link,
      salary: j.salary || undefined,
      matchScore: 0,
      matchReason: "",
      postedAt: j.updated,
      source: normaliseJoobleSource(j.source),
    }));
}

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to grab jobs." }, { status: 401 });
  }

  const { data: masterResume } = await supabase
    .from("master_resumes")
    .select("resume_text")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!masterResume?.resume_text?.trim()) {
    return NextResponse.json({ error: "Upload a master resume first." }, { status: 400 });
  }

  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  if (!appId || !appKey) {
    return NextResponse.json(
      { error: "Job search is not configured. Add ADZUNA_APP_ID and ADZUNA_APP_KEY to your environment variables." },
      { status: 500 }
    );
  }

  const provider = process.env.AI_PROVIDER === "anthropic" ? "anthropic" : "openai";

  const url = new URL(request.url);
  const manualQuery = url.searchParams.get("q")?.trim();
  const locationParam = url.searchParams.get("location")?.trim() || undefined;
  const workTypeParam = url.searchParams.get("work_type")?.trim() || undefined;
  const salaryMinParam = url.searchParams.get("salary_min") ? Number(url.searchParams.get("salary_min")) : undefined;
  const forceRefresh = url.searchParams.get("refresh") === "true" || Boolean(manualQuery) || Boolean(locationParam) || Boolean(workTypeParam) || Boolean(salaryMinParam);

  if (!forceRefresh) {
    const { data: cachedRows } = await supabase
      .from("cached_grabbed_jobs")
      .select("*")
      .eq("user_id", user.id)
      .gte("fetched_at", startOfToday().toISOString())
      .order("match_score", { ascending: false })
      .limit(15);

    if (cachedRows?.length) {
      const rows = cachedRows as CachedGrabbedJob[];
      return NextResponse.json({
        jobs: rows.map(cachedRowToResult),
        searchQuery: rows[0]?.search_query ?? "",
        jobTitle: "",
        cached: true,
        fetchedAt: rows[0]?.fetched_at,
      });
    }
  }

  let keywords: { jobTitle: string; searchQuery: string };
  if (manualQuery) {
    keywords = { jobTitle: "", searchQuery: manualQuery };
  } else {
    try {
      keywords = await extractKeywords(masterResume.resume_text, provider);
    } catch (e) {
      return NextResponse.json({ error: `Keyword extraction failed: ${e instanceof Error ? e.message : "Unknown error"}` }, { status: 500 });
    }
  }

  let actualSearchQuery = keywords.searchQuery;
  const joobleApiKey = process.env.JOOBLE_API_KEY;

  // Run Adzuna + Jooble in parallel
  const [adzunaSettled, joobleSettled] = await Promise.allSettled([
    fetchAdzunaJobs({ appId, appKey, query: actualSearchQuery, where: locationParam, workTypes: workTypeParam, salaryMin: salaryMinParam, maxDaysOld: 30, resultsPerPage: 25 }),
    joobleApiKey
      ? fetchJoobleJobs({ apiKey: joobleApiKey, query: actualSearchQuery, location: locationParam })
      : Promise.resolve([]),
  ]);

  let adzunaJobs: AdzunaJob[] = adzunaSettled.status === "fulfilled" ? adzunaSettled.value : [];
  let joobleJobs: GrabResult[] = joobleSettled.status === "fulfilled" ? joobleSettled.value : [];
  if (adzunaSettled.status === "rejected") console.error("[grab] Adzuna primary fetch failed:", adzunaSettled.reason);
  if (joobleSettled.status === "rejected") console.error("[grab] Jooble fetch failed:", joobleSettled.reason);

  // Fallback: if both returned nothing, retry Adzuna with just job title and a wider window
  if (adzunaJobs.length === 0 && joobleJobs.length === 0 && keywords.jobTitle.trim()) {
    actualSearchQuery = keywords.jobTitle.trim();
    try {
      adzunaJobs = await fetchAdzunaJobs({ appId, appKey, query: actualSearchQuery, where: locationParam, workTypes: workTypeParam, salaryMin: salaryMinParam, maxDaysOld: 60, resultsPerPage: 25 });
    } catch (e) {
      console.error("[grab] Adzuna fallback fetch failed:", e);
    }
    // Retry Jooble with title too
    if (joobleApiKey) {
      try {
        joobleJobs = await fetchJoobleJobs({ apiKey: joobleApiKey, query: actualSearchQuery, location: locationParam });
      } catch (e) {
        console.error("[grab] Jooble fallback fetch failed:", e);
      }
    }
  }

  // Convert Adzuna results to GrabResult[]
  const adzunaGrabResults: GrabResult[] = adzunaJobs.map((j) => ({
    id: j.id,
    title: j.title,
    company: j.company.display_name,
    location: j.location.display_name,
    salaryMin: j.salary_min,
    salaryMax: j.salary_max,
    description: j.description,
    jobUrl: j.redirect_url,
    matchScore: 0,
    matchReason: "",
    postedAt: j.created,
    source: "Adzuna",
  }));

  // Merge and deduplicate by normalised URL (strip query params / tracking)
  const seenUrls = new Set<string>();
  const allJobs: GrabResult[] = [];
  for (const job of [...adzunaGrabResults, ...joobleJobs]) {
    const key = job.jobUrl.split("?")[0].toLowerCase();
    if (!seenUrls.has(key)) {
      seenUrls.add(key);
      allJobs.push(job);
    }
  }

  if (allJobs.length === 0) {
    await supabase.from("cached_grabbed_jobs").delete().eq("user_id", user.id);
    return NextResponse.json({
      jobs: [],
      searchQuery: actualSearchQuery,
      jobTitle: keywords.jobTitle,
      cached: false,
      fetchedAt: new Date().toISOString()
    });
  }

  // Reuse any scores already stored for these job IDs so scores stay consistent across refreshes
  const { data: existingCached } = await supabase
    .from("cached_grabbed_jobs")
    .select("external_id, match_score, match_reason")
    .eq("user_id", user.id)
    .in("external_id", allJobs.map((j) => j.id));

  const cachedScoreMap = new Map(
    (existingCached ?? []).map((row) => [row.external_id, { score: row.match_score as number, reason: row.match_reason as string }])
  );

  // Only call AI for jobs we haven't scored before; cap at 40 to control cost
  const jobsNeedingScore = allJobs
    .filter((j) => !cachedScoreMap.has(j.id))
    .slice(0, 40)
    .map((j) => ({ id: j.id, title: j.title, company: j.company, description: j.description }));

  let newScores: { id: string; score: number; reason: string }[] = [];
  if (jobsNeedingScore.length > 0) {
    try {
      newScores = await scoreJobs(masterResume.resume_text, jobsNeedingScore, provider);
    } catch {
      newScores = jobsNeedingScore.map((j) => ({ id: j.id, score: 50, reason: "Match scoring unavailable." }));
    }
  }

  const scoreMap = new Map<string, { score: number; reason: string }>([
    ...cachedScoreMap.entries(),
    ...newScores.map((s) => [s.id, { score: s.score, reason: s.reason }] as [string, { score: number; reason: string }]),
  ]);

  const results: GrabResult[] = allJobs.map((j) => {
    const s = scoreMap.get(j.id) ?? { score: 50, reason: "" };
    return { ...j, matchScore: Math.max(0, Math.min(100, Math.round(s.score))), matchReason: s.reason };
  });

  results.sort((a, b) => b.matchScore - a.matchScore);

  const topResults = results.slice(0, 20);
  const fetchedAt = new Date().toISOString();

  await supabase.from("cached_grabbed_jobs").delete().eq("user_id", user.id);

  if (topResults.length > 0) {
    const { error: insertError } = await supabase.from("cached_grabbed_jobs").insert(
      topResults.map((job) => ({
        user_id: user.id,
        external_id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        salary: job.salary ?? formatSalary(job.salaryMin, job.salaryMax),
        salary_min: job.salaryMin ?? null,
        salary_max: job.salaryMax ?? null,
        job_url: job.jobUrl,
        description: job.description,
        match_score: job.matchScore,
        match_reason: job.matchReason,
        posted_at: job.postedAt ? new Date(job.postedAt).toISOString() : null,
        search_query: actualSearchQuery,
        source: job.source ?? "Adzuna",
        fetched_at: fetchedAt,
      }))
    );

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    jobs: topResults.map((job) => ({ ...job, fetchedAt })),
    searchQuery: actualSearchQuery,
    jobTitle: keywords.jobTitle,
    cached: false,
    fetchedAt,
  });
}
