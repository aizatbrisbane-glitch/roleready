import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { htmlToText } from "@/lib/job-ad";
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
  provider: "anthropic" | "openai",
  targetJobTitle?: string
) {
  const jobList = jobs
    .map((j) => `ID:${j.id}\nTitle: ${j.title} at ${j.company}\n${j.description.slice(0, 600)}`)
    .join("\n---\n");

  const targetLine = targetJobTitle?.trim()
    ? `\nThe candidate is targeting: "${targetJobTitle}". Any job in a clearly different role category should score 0–15.`
    : "";

  const userMsg = `You are a strict recruiter scoring job-resume fit from 0–100.

Scoring guide:
- 80–100: Strong match — title aligns exactly, most key skills present, right seniority level
- 60–79: Reasonable match — closely related role, some skill gaps but same field
- 40–59: Partial match — different specialisation or seniority but same broad industry
- 20–39: Weak match — adjacent industry, mostly transferable skills only
- 0–19: Wrong field — completely different industry or requiring qualifications the candidate clearly does not have

CRITICAL RULES (apply these first, before anything else):
- If the job is in a completely different industry from the candidate (e.g. healthcare vs retail, IT vs hospitality, law vs construction, nursing vs sales), score 0–15 regardless of any shared keywords like "customer service" or "communication".
- If the job requires a professional licence or degree the candidate clearly does not have (registered nurse, doctor, lawyer, engineer, teacher registration, etc.), score 0–10.
- Generic transferable skills (communication, teamwork, customer service) must NOT push a score above 20 if the core role is a different field.
- Be conservative. Genuinely related jobs should mostly score 30–65. Reserve 80+ for clear title + skill + seniority alignment.${targetLine}

Resume:\n${resumeText.slice(0, 6000)}\n\nJobs to score:\n${jobList}`;

  if (provider === "anthropic") {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured.");
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 0 });
    const response = await client.messages.create({
      model: "claude-3-5-haiku-20241022",
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

type CountryInfo = {
  adzunaCode: string | null; // null = Adzuna doesn't cover this country
  joobleCountry: string;     // sent as Jooble location param
  geoTerms: string[];        // used to filter Jooble results to this country
};

const COUNTRY_RULES: { pattern: RegExp; info: CountryInfo }[] = [
  {
    pattern: /\b(uk|united kingdom|england|scotland|wales|northern ireland|london|manchester|birmingham|leeds|glasgow|edinburgh|bristol|liverpool|sheffield|coventry|leicester|cardiff)\b/i,
    info: { adzunaCode: "gb", joobleCountry: "United Kingdom", geoTerms: ["uk", "united kingdom", "england", "scotland", "wales", "london", "manchester", "birmingham", "leeds", "glasgow", "bristol"] },
  },
  {
    pattern: /\b(usa?|united states|america|new york|los angeles|chicago|houston|phoenix|philadelphia|san francisco|seattle|boston|miami|denver|atlanta|dallas|austin|portland|san diego)\b/i,
    info: { adzunaCode: "us", joobleCountry: "United States", geoTerms: ["united states", "usa", "new york", "los angeles", "chicago", "houston", "san francisco", "seattle", "boston", "miami", "dallas"] },
  },
  {
    pattern: /\b(canada|toronto|vancouver|montreal|calgary|ottawa|edmonton|winnipeg)\b/i,
    info: { adzunaCode: "ca", joobleCountry: "Canada", geoTerms: ["canada", "toronto", "vancouver", "montreal", "calgary", "ottawa", "edmonton"] },
  },
  {
    pattern: /\b(malaysia|kuala lumpur|\bkl\b|penang|johor|petaling jaya|\bpj\b|subang|klang|ipoh|kota kinabalu|kuching|cyberjaya|putrajaya)\b/i,
    info: { adzunaCode: null, joobleCountry: "Malaysia", geoTerms: ["malaysia", "kuala lumpur", "penang", "johor", "petaling", "subang", "klang", "ipoh", "cyberjaya", "putrajaya"] },
  },
  {
    pattern: /\b(singapore)\b/i,
    info: { adzunaCode: "sg", joobleCountry: "Singapore", geoTerms: ["singapore"] },
  },
  {
    pattern: /\b(new zealand|\bnz\b|auckland|wellington|christchurch|hamilton|tauranga|dunedin)\b/i,
    info: { adzunaCode: "nz", joobleCountry: "New Zealand", geoTerms: ["new zealand", "auckland", "wellington", "christchurch", "hamilton", "dunedin"] },
  },
  {
    pattern: /\b(india|bangalore|bengaluru|mumbai|delhi|hyderabad|chennai|pune|kolkata|noida|gurugram|gurgaon)\b/i,
    info: { adzunaCode: "in", joobleCountry: "India", geoTerms: ["india", "bangalore", "bengaluru", "mumbai", "delhi", "hyderabad", "chennai", "pune", "kolkata"] },
  },
  {
    pattern: /\b(germany|deutschland|berlin|munich|münchen|hamburg|frankfurt|cologne|düsseldorf|stuttgart)\b/i,
    info: { adzunaCode: "de", joobleCountry: "Germany", geoTerms: ["germany", "deutschland", "berlin", "munich", "hamburg", "frankfurt", "cologne"] },
  },
  {
    pattern: /\b(france|paris|lyon|marseille|toulouse|nice|nantes|bordeaux|strasbourg)\b/i,
    info: { adzunaCode: "fr", joobleCountry: "France", geoTerms: ["france", "paris", "lyon", "marseille", "toulouse"] },
  },
  {
    pattern: /\b(netherlands|holland|amsterdam|rotterdam|the hague|den haag|utrecht|eindhoven)\b/i,
    info: { adzunaCode: "nl", joobleCountry: "Netherlands", geoTerms: ["netherlands", "holland", "amsterdam", "rotterdam", "utrecht"] },
  },
  {
    pattern: /\b(south africa|johannesburg|cape town|durban|pretoria|port elizabeth|bloemfontein)\b/i,
    info: { adzunaCode: "za", joobleCountry: "South Africa", geoTerms: ["south africa", "johannesburg", "cape town", "durban", "pretoria"] },
  },
];

const AU_COUNTRY: CountryInfo = {
  adzunaCode: "au",
  joobleCountry: "Australia",
  geoTerms: ["australia", "nsw", "vic", "qld", "wa", "sa", "act", "tas", "nt", "sydney", "melbourne", "brisbane", "perth", "adelaide", "canberra", "hobart", "darwin"],
};

function inferCountry(locations: string[]): CountryInfo {
  const combined = locations.filter(Boolean).join(" ");
  if (!combined.trim()) return AU_COUNTRY;
  for (const { pattern, info } of COUNTRY_RULES) {
    if (pattern.test(combined)) return info;
  }
  return AU_COUNTRY;
}

function isCountryLocation(loc: string, countryInfo: CountryInfo): boolean {
  const l = loc.toLowerCase();
  return countryInfo.geoTerms.some((t) => l.includes(t));
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
      if (!j.location) return true;
      if (!isCountryLocation(j.location, countryInfo)) return false;
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
      .select("target_job_titles, preferred_locations")
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

  // Infer the user's country from their preferred locations (falls back to Australia)
  const countryInfo = inferCountry([
    ...(profile?.preferred_locations ?? []),
    ...(locationParam ? [locationParam] : []),
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

  let actualSearchQuery = keywords.searchQuery;
  const joobleApiKey = process.env.JOOBLE_API_KEY;
  const adzunaCountry = countryInfo.adzunaCode; // null = not covered by Adzuna

  // Run Adzuna + Jooble in parallel (skip Adzuna if country not covered)
  const [adzunaSettled, joobleSettled] = await Promise.allSettled([
    adzunaCountry
      ? fetchAdzunaJobs({ appId, appKey, query: actualSearchQuery, where: locationParam, country: adzunaCountry, workTypes: workTypeParam, salaryMin: salaryMinParam, maxDaysOld: 30, resultsPerPage: 50 })
      : Promise.resolve([]),
    joobleApiKey
      ? fetchJoobleJobs({ apiKey: joobleApiKey, query: actualSearchQuery, location: locationParam, countryInfo })
      : Promise.resolve([]),
  ]);

  let adzunaJobs: AdzunaJob[] = adzunaSettled.status === "fulfilled" ? adzunaSettled.value : [];
  let joobleJobs: GrabResult[] = joobleSettled.status === "fulfilled" ? joobleSettled.value : [];
  if (adzunaSettled.status === "rejected") console.error("[grab] Adzuna primary fetch failed:", adzunaSettled.reason);
  if (joobleSettled.status === "rejected") console.error("[grab] Jooble fetch failed:", joobleSettled.reason);

  // If Adzuna city-scoped search returned nothing, retry nationwide and rely on post-hoc filter
  if (adzunaCountry && adzunaJobs.length === 0 && locationParam) {
    try {
      adzunaJobs = await fetchAdzunaJobs({ appId, appKey, query: actualSearchQuery, country: adzunaCountry, workTypes: workTypeParam, salaryMin: salaryMinParam, maxDaysOld: 30, resultsPerPage: 50 });
    } catch (e) {
      console.error("[grab] Adzuna nationwide primary fetch failed:", e);
    }
  }

  // Fallback: if both returned nothing, retry with just the job title and a wider window.
  // First try with location, then without (relying on post-hoc filtering) if still empty.
  if (adzunaJobs.length === 0 && joobleJobs.length === 0 && keywords.jobTitle.trim()) {
    actualSearchQuery = keywords.jobTitle.trim();
    if (adzunaCountry) {
      try {
        adzunaJobs = await fetchAdzunaJobs({ appId, appKey, query: actualSearchQuery, where: locationParam, country: adzunaCountry, workTypes: workTypeParam, salaryMin: salaryMinParam, maxDaysOld: 60, resultsPerPage: 50 });
      } catch (e) {
        console.error("[grab] Adzuna fallback fetch failed:", e);
      }
      // If city-scoped search still empty, broaden to nationwide and rely on post-hoc filter
      if (adzunaJobs.length === 0) {
        try {
          adzunaJobs = await fetchAdzunaJobs({ appId, appKey, query: actualSearchQuery, country: adzunaCountry, workTypes: workTypeParam, salaryMin: salaryMinParam, maxDaysOld: 60, resultsPerPage: 50 });
        } catch (e) {
          console.error("[grab] Adzuna nationwide fallback fetch failed:", e);
        }
      }
    }
    // Retry Jooble with title too
    if (joobleApiKey) {
      try {
        joobleJobs = await fetchJoobleJobs({ apiKey: joobleApiKey, query: actualSearchQuery, location: locationParam, countryInfo });
      } catch (e) {
        console.error("[grab] Jooble fallback fetch failed:", e);
      }
    }
  }

  // Last resort: OR-mode search so ANY keyword word matches — AI scoring filters out irrelevant results
  if (adzunaCountry && adzunaJobs.length === 0 && joobleJobs.length === 0) {
    try {
      adzunaJobs = await fetchAdzunaJobs({ appId, appKey, query: actualSearchQuery, where: locationParam, country: adzunaCountry, maxDaysOld: 60, resultsPerPage: 50, orMode: true });
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

  // Reuse any scores already stored for these job IDs so scores stay consistent across refreshes
  const { data: existingCached } = await supabase
    .from("cached_grabbed_jobs")
    .select("external_id, match_score, match_reason")
    .eq("user_id", user.id)
    .in("external_id", allJobs.map((j) => j.id));

  // Exclude fallback-scored entries so they get properly rescored next time AI is available
  const cachedScoreMap = new Map(
    (existingCached ?? [])
      .filter((row) => row.match_reason !== "Match scoring unavailable.")
      .map((row) => [row.external_id, { score: row.match_score as number, reason: row.match_reason as string }])
  );

  // Only call AI for jobs we haven't scored before; cap at 20 to keep scoring fast
  const jobsNeedingScore = allJobs
    .filter((j) => !cachedScoreMap.has(j.id))
    .slice(0, 20)
    .map((j) => ({ id: j.id, title: j.title, company: j.company, description: j.description }));

  let newScores: { id: string; score: number; reason: string }[] = [];
  if (jobsNeedingScore.length > 0) {
    try {
      newScores = await scoreJobs(masterResume.resume_text, jobsNeedingScore, provider, keywords.jobTitle || undefined);
    } catch {
      newScores = jobsNeedingScore.map((j) => ({ id: j.id, score: 30, reason: "Match scoring unavailable." }));
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

  // Drop clearly irrelevant jobs (wrong field) before caching — keeps the list clean
  const topResults = results.filter((r) => r.matchScore >= 25).slice(0, 20);
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
    cached: false,
    fetchedAt,
  });
}
