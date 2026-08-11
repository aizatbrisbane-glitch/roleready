import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { htmlToText } from "@/lib/job-ad";
import { AU_COUNTRY, COUNTRY_RULES, inferCountry, isCountryLocation, marketLabel, type CountryInfo } from "@/lib/country-inference";
import type { CachedGrabbedJob } from "@/types/database";

export const maxDuration = 60;
export const preferredRegion = ["syd1"];

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


async function extractKeywords(resumeText: string, provider: "anthropic" | "openai") {
  const userMsg = `Extract the candidate's primary job title and a short search query from this resume.

Rules:
- jobTitle: 2–4 words max, the exact role they are targeting (e.g. "Store Manager", "Governance Manager", "Software Engineer"). No fluff.
- searchQuery: 3–5 words max, the jobTitle plus 1–2 key specialisations if useful (e.g. "Governance Risk Compliance Manager", "Retail Store Manager"). Still short — this goes directly into a job board search engine.

Resume:\n${resumeText.slice(0, 8000)}`;

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

const STOP_WORDS = new Set(["and", "or", "the", "a", "an", "in", "at", "for", "to", "of", "with", "on", "by", "as", "it", "is", "are", "be", "was", "has"]);

function toKeywords(jobTitle: string, searchQuery: string): string[] {
  return [...new Set(
    `${jobTitle} ${searchQuery}`.toLowerCase().split(/\W+/).filter((w) => w.length > 2 && !STOP_WORDS.has(w))
  )];
}

function keywordScore(kwList: string[], job: { title: string; description: string }): { score: number; reason: string } {
  if (kwList.length === 0) return { score: 50, reason: "No keywords extracted." };
  const title = job.title.toLowerCase();
  const desc = job.description.toLowerCase();
  const titleHits = kwList.filter((k) => title.includes(k));
  const descHits = kwList.filter((k) => desc.includes(k));
  const allHits = [...new Set([...titleHits, ...descHits])];
  // Title match weighted 60%, description match 40%
  const score = Math.round(
    (titleHits.length / kwList.length) * 60 +
    (descHits.length / kwList.length) * 40
  );
  const reason = allHits.length > 0
    ? `Keywords matched: ${allHits.slice(0, 5).join(", ")}`
    : "No keyword matches found.";
  return { score, reason };
}

async function fetchAdzunaJobs({
  appId,
  appKey,
  query,
  where,
  country = "au",
  workTypes,
  salaryMin,
  maxDaysOld,
  resultsPerPage,
  orMode = false,
}: {
  appId: string;
  appKey: string;
  query: string;
  where?: string;
  country?: string;
  workTypes?: string;
  salaryMin?: number;
  maxDaysOld: number;
  resultsPerPage: number;
  orMode?: boolean;
}) {
  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    results_per_page: String(resultsPerPage),
    max_days_old: String(maxDaysOld),
    sort_by: "date",
  });
  // orMode uses what_or so ANY word matches — broader but AI scoring filters relevance
  if (orMode) {
    params.set("what_or", query);
  } else {
    params.set("what", query);
  }
  if (where) params.set("where", where);
  if (workTypes) {
    for (const t of workTypes.split(",")) {
      const trimmed = t.trim();
      if (trimmed) params.set(trimmed, "1");
    }
  }
  if (salaryMin) params.set("salary_min", String(salaryMin));

  const res = await fetch(`https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Adzuna returned HTTP ${res.status}`);
  const data = (await res.json()) as { results?: AdzunaJob[] };
  return data.results ?? [];
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

// Jooble source domains known to carry low-quality or niche job listings (crypto, scrapers, etc.)
const JOOBLE_BLOCKED_DOMAINS = [
  "decentrajobs.com", "web3.career", "cryptocurrencyjobs.co", "cryptojobslist.com",
  "remote3.co", "useweb3.xyz", "jobstash.xyz", "blockchain.works-hub.com",
];

function isBlockedJoobleSource(jobUrl: string): boolean {
  return JOOBLE_BLOCKED_DOMAINS.some((d) => jobUrl.includes(d));
}


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
  countryInfo,
}: {
  apiKey: string;
  query: string;
  location?: string;
  countryInfo: CountryInfo;
}): Promise<GrabResult[]> {
  // Search by country so Jooble returns maximum results for that market.
  // City-level filtering is applied post-fetch via matchesRequestedLocation.
  const body: Record<string, string | number> = { keywords: query, location: countryInfo.joobleCountry, page: 1 };

  const res = await fetch(`https://jooble.org/api/${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Jooble returned HTTP ${res.status}`);
  const data = (await res.json()) as { jobs?: JoobleJob[] };

  return (data.jobs ?? [])
    .filter((j) => {
      if (isBlockedJoobleSource(j.link ?? "")) return false;
      if (!j.location) return true;
      if (!isCountryLocation(j.location, countryInfo)) return false;
      if (location) return matchesRequestedLocation(j.location, location);
      return true;
    })
    .map((j) => ({
      id: j.link,
      title: j.title,
      company: j.company ?? "",
      location: j.location ?? "",
      description: htmlToText([j.title, j.company, j.snippet].filter(Boolean).join(" — ")),
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

  const [{ data: masterResume }, { data: profile }] = await Promise.all([
    supabase
      .from("master_resumes")
      .select("resume_text")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("target_job_titles, preferred_locations, location")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

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
  const explicitLocation = url.searchParams.get("location")?.trim();
  const locationParam = explicitLocation || profile?.preferred_locations?.[0] || undefined;
  const workTypeParam = url.searchParams.get("work_type")?.trim() || undefined;
  const salaryMinParam = url.searchParams.get("salary_min") ? Number(url.searchParams.get("salary_min")) : undefined;
  const forceRefresh = url.searchParams.get("refresh") === "true" || Boolean(manualQuery) || Boolean(explicitLocation) || Boolean(workTypeParam) || Boolean(salaryMinParam);

  // Explicit location filter takes priority for country detection — a Malaysian user searching
  // "Sydney" should hit Adzuna AU, not be locked to their profile's country.
  const countryInfo = explicitLocation
    ? inferCountry([explicitLocation])
    : inferCountry([
        ...(profile?.preferred_locations ?? []),
        ...((profile as { location?: string } | null)?.location ? [(profile as { location?: string }).location!] : []),
      ]);

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
  } else if (profile?.target_job_titles?.length) {
    const title = profile.target_job_titles[0];
    keywords = { jobTitle: title, searchQuery: title };
  } else {
    try {
      keywords = await extractKeywords(masterResume.resume_text, provider);
    } catch (e) {
      return NextResponse.json({ error: `Keyword extraction failed: ${e instanceof Error ? e.message : "Unknown error"}` }, { status: 500 });
    }
  }

  // Primary Adzuna search uses the short job title (2-4 words) for precise AND matching.
  // Jooble and fallbacks use the broader searchQuery.
  const primaryQuery = keywords.jobTitle.trim() || keywords.searchQuery;
  let actualSearchQuery = primaryQuery;
  const joobleApiKey = process.env.JOOBLE_API_KEY;
  const adzunaCountry = countryInfo.adzunaCode; // null = not covered by Adzuna

  // Run Adzuna (short title) + Jooble (broader query) in parallel
  const [adzunaSettled, joobleSettled] = await Promise.allSettled([
    adzunaCountry
      ? fetchAdzunaJobs({ appId, appKey, query: primaryQuery, where: locationParam, country: adzunaCountry, workTypes: workTypeParam, salaryMin: salaryMinParam, maxDaysOld: 30, resultsPerPage: 50 })
      : Promise.resolve([]),
    joobleApiKey
      ? fetchJoobleJobs({ apiKey: joobleApiKey, query: keywords.searchQuery, location: locationParam, countryInfo })
      : Promise.resolve([]),
  ]);

  let adzunaJobs: AdzunaJob[] = adzunaSettled.status === "fulfilled" ? adzunaSettled.value : [];
  let joobleJobs: GrabResult[] = joobleSettled.status === "fulfilled" ? joobleSettled.value : [];
  if (adzunaSettled.status === "rejected") console.error("[grab] Adzuna primary fetch failed:", adzunaSettled.reason);
  if (joobleSettled.status === "rejected") console.error("[grab] Jooble fetch failed:", joobleSettled.reason);

  // If Adzuna city-scoped returned nothing, retry nationwide
  if (adzunaCountry && adzunaJobs.length === 0 && locationParam) {
    try {
      adzunaJobs = await fetchAdzunaJobs({ appId, appKey, query: primaryQuery, country: adzunaCountry, workTypes: workTypeParam, salaryMin: salaryMinParam, maxDaysOld: 30, resultsPerPage: 50 });
    } catch (e) {
      console.error("[grab] Adzuna nationwide primary fetch failed:", e);
    }
  }

  // Fallback: broaden to searchQuery with wider time window
  if (adzunaJobs.length === 0 && joobleJobs.length === 0) {
    actualSearchQuery = keywords.searchQuery;
    if (adzunaCountry) {
      try {
        adzunaJobs = await fetchAdzunaJobs({ appId, appKey, query: actualSearchQuery, where: locationParam, country: adzunaCountry, workTypes: workTypeParam, salaryMin: salaryMinParam, maxDaysOld: 60, resultsPerPage: 50 });
      } catch (e) {
        console.error("[grab] Adzuna fallback fetch failed:", e);
      }
      if (adzunaJobs.length === 0) {
        try {
          adzunaJobs = await fetchAdzunaJobs({ appId, appKey, query: actualSearchQuery, country: adzunaCountry, workTypes: workTypeParam, salaryMin: salaryMinParam, maxDaysOld: 60, resultsPerPage: 50 });
        } catch (e) {
          console.error("[grab] Adzuna nationwide fallback fetch failed:", e);
        }
      }
    }
    if (joobleApiKey) {
      try {
        joobleJobs = await fetchJoobleJobs({ apiKey: joobleApiKey, query: actualSearchQuery, location: locationParam, countryInfo });
      } catch (e) {
        console.error("[grab] Jooble fallback fetch failed:", e);
      }
    }
  }

  // Last resort: OR-mode on short title only — keeps field relevance while broadening matches
  if (adzunaCountry && adzunaJobs.length === 0 && joobleJobs.length === 0) {
    try {
      adzunaJobs = await fetchAdzunaJobs({ appId, appKey, query: primaryQuery, where: locationParam, country: adzunaCountry, maxDaysOld: 60, resultsPerPage: 50, orMode: true });
    } catch (e) {
      console.error("[grab] Adzuna OR-mode fallback failed:", e);
    }
  }

  // Adzuna already filters by country (/au/ endpoint) and city (where param), so we trust
  // its results directly without re-applying our own location filter.
  const adzunaGrabResults: GrabResult[] = adzunaJobs
    .map((j) => ({
      id: j.id,
      title: j.title,
      company: j.company.display_name,
      location: j.location.display_name,
      salaryMin: j.salary_min,
      salaryMax: j.salary_max,
      description: htmlToText(j.description),
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

  // Keyword-based scoring: fast, deterministic, no extra API call
  const kwList = toKeywords(keywords.jobTitle, keywords.searchQuery);
  const results: GrabResult[] = allJobs.map((j) => {
    const { score, reason } = keywordScore(kwList, j);
    return { ...j, matchScore: score, matchReason: reason };
  });

  results.sort((a, b) => b.matchScore - a.matchScore);

  // Drop jobs with zero keyword overlap — genuinely unrelated to the search
  const topResults = results.filter((r) => r.matchScore > 0).slice(0, 30);
  const fetchedAt = new Date().toISOString();

  await supabase.from("cached_grabbed_jobs").delete().eq("user_id", user.id);

  if (topResults.length > 0) {
    const { error: insertError } = await supabase.from("cached_grabbed_jobs").upsert(
      topResults.map((job) => ({
        user_id: user.id,
        external_id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        salary: job.salary ?? formatSalary(job.salaryMin, job.salaryMax),
        salary_min: job.salaryMin != null ? Math.round(job.salaryMin) : null,
        salary_max: job.salaryMax != null ? Math.round(job.salaryMax) : null,
        job_url: job.jobUrl,
        description: job.description,
        match_score: job.matchScore,
        match_reason: job.matchReason,
        posted_at: job.postedAt ? new Date(job.postedAt).toISOString() : null,
        search_query: actualSearchQuery,
        source: job.source ?? "Adzuna",
        fetched_at: fetchedAt,
      })),
      { onConflict: "user_id,external_id" }
    );

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    jobs: topResults.map((job) => ({ ...job, fetchedAt })),
    searchQuery: actualSearchQuery,
    jobTitle: keywords.jobTitle,
    market: marketLabel(countryInfo),
    cached: false,
    fetchedAt,
  });
}
