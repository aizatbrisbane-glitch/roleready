import { existsSync } from "fs";

type JobAdDetails = {
  title: string;
  company: string;
  location: string;
  salary: string;
  description: string;
};

// Job boards that commonly block server-side requests.
// "seek.com" catches both au.seek.com (new domain) and any other seek.com subdomains.
const BLOCKED_DOMAINS = ["seek.com.au", "seek.co.nz", "seek.com", "linkedin.com", "indeed.com", "jora.com", "jora.com.au", "adzuna.com.au", "adzuna.co.nz"];

export function isBlockedJobBoard(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    return BLOCKED_DOMAINS.some((d) => host === d || host.endsWith("." + d));
  } catch {
    return false;
  }
}

export function blockedJobBoardMessage(url: string, status?: number): string {
  const host = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return "This site";
    }
  })();
  const statusText = status ? ` (HTTP ${status})` : "";
  return `${host} blocked our request${statusText}. Paste the full job description in the box below instead.`;
}

export function detectJobSource(url: string): "SEEK" | "LinkedIn" | "Adzuna" | "Other" {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("seek.") || host.includes(".seek.")) return "SEEK";
    if (host.includes("linkedin.com")) return "LinkedIn";
    if (host.includes("adzuna.")) return "Adzuna";
    // Indeed and Jora map to "Other" — not in the JobSource enum
  } catch {
    // fall through
  }
  return "Other";
}

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeBlockedPage(text: string): boolean {
  const normalized = text.toLowerCase();
  return [
    "403 forbidden",
    "access denied",
    "request blocked",
    "enable javascript",
    "captcha",
    "unusual traffic",
    "verify you are human",
    "blocked our request"
  ].some((phrase) => normalized.includes(phrase));
}

function meta(html: string, selectors: string[]) {
  for (const selector of selectors) {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(
      `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i"
    );
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtml(match[1]);
  }
  return "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function typeIncludesJobPosting(value: unknown) {
  if (typeof value === "string") return value.includes("JobPosting");
  if (Array.isArray(value)) return value.some(typeIncludesJobPosting);
  return false;
}

function findNested(value: unknown, predicate: (item: Record<string, unknown>) => boolean, depth = 0): Record<string, unknown> | null {
  if (depth > 12) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findNested(item, predicate, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (!isRecord(value)) return null;
  if (predicate(value)) return value;
  for (const child of Object.values(value)) {
    const found = findNested(child, predicate, depth + 1);
    if (found) return found;
  }
  return null;
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

function nestedString(value: unknown, ...keys: string[]) {
  let current: unknown = value;
  for (const key of keys) {
    if (!isRecord(current)) return "";
    current = current[key];
  }
  return firstString(current);
}

function scriptJson(html: string): any {
  const matches =
    html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) ?? [];

  for (const match of matches) {
    const jsonText = match
      .replace(/^<script[^>]*>/i, "")
      .replace(/<\/script>$/i, "")
      .trim();
    try {
      const parsed = JSON.parse(jsonText);
      const posting = findNested(parsed, (item) => typeIncludesJobPosting(item["@type"]));
      if (posting) return posting;
    } catch {
      // ignore malformed JSON blocks
    }
  }
  return null;
}

/** Extract embedded Next.js page data (__NEXT_DATA__), used by SEEK and others. */
function nextDataJob(html: string): Partial<{
  title: string;
  company: string;
  location: string;
  salary: string;
  description: string;
}> | null {
  const m = html.match(
    /<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i
  );
  if (!m?.[1]) return null;

  try {
    const data = JSON.parse(m[1]);
    const props = data?.props?.pageProps;
    if (!props) return null;

    // Try the most common job-detail paths used by SEEK and similar Next.js job boards
    const job =
      props.jobDetails ??
      props.job ??
      props.listing ??
      props.jobAd ??
      props.data?.jobDetails ??
      findNested(props, (item) => {
        const description = firstString(item.description, item.jobDescription, item.fullDescription, item.content);
        const title = firstString(item.title, item.roleName, item.jobTitle);
        return description.length > 100 && title.length > 0;
      });

    if (!job) return null;

    const rawDescription =
      job.content ?? job.description ?? job.jobDescription ?? job.fullDescription ?? nestedString(job, "details", "description") ?? "";

    return {
      title: firstString(job.title, job.roleName, job.jobTitle),
      company: firstString(
        nestedString(job, "advertiser", "description"),
        nestedString(job, "advertiser", "name"),
        job.companyName,
        job.company
      ),
      location: firstString(
        job.locationLabel,
        nestedString(job, "location", "label"),
        nestedString(job, "location", "description"),
        job.location
      ),
      salary: firstString(job.salary, job.salaryLabel, job.salaryRange),
      description: htmlToText(String(rawDescription))
    };
  } catch {
    return null;
  }
}

function htmlToText(html: string) {
  return decodeHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  );
}

// ─── LinkedIn guest API (no auth required for public job listings) ─────────

function extractLinkedInJobId(url: string): string | null {
  try {
    const u = new URL(url);
    // /jobs/view/1234567890/
    const viewMatch = u.pathname.match(/\/jobs\/view\/(\d+)/);
    if (viewMatch) return viewMatch[1];
    // ?currentJobId=1234567890
    const qp = u.searchParams.get("currentJobId");
    if (qp) return qp;
  } catch {
    // ignore
  }
  return null;
}

async function fetchLinkedInGuestApi(url: string): Promise<JobAdDetails | null> {
  const jobId = extractLinkedInJobId(url);
  if (!jobId) return null;

  try {
    const res = await fetch(
      `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${jobId}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-AU,en;q=0.8",
        },
        signal: AbortSignal.timeout(20000),
      }
    );

    if (!res.ok) return null;
    const html = await res.text();
    if (!html || html.trim().length < 200) return null;

    // Extract description — LinkedIn guest API returns HTML with nested divs;
    // slice from the description container to the end and let htmlToText clean it up
    const descStart = html.search(
      /class="[^"]*show-more-less-html__markup[^"]*"/i
    ) !== -1
      ? html.search(/class="[^"]*show-more-less-html__markup[^"]*"/i)
      : html.search(/class="[^"]*description__text[^"]*"/i);
    const descSlice = descStart > 0 ? html.slice(descStart, descStart + 20000) : html;
    const description = htmlToText(descSlice);
    if (description.trim().length < 100) return null;

    const titleMatch = html.match(/<h2[^>]*class="[^"]*top-card-layout__title[^"]*"[^>]*>([\s\S]*?)<\/h2>/i);
    const title = titleMatch ? decodeHtml(titleMatch[1].replace(/<[^>]+>/g, " ").trim()) : "";

    const companyMatch = html.match(/<a[^>]*class="[^"]*topcard__org-name-link[^"]*"[^>]*>([\s\S]*?)<\/a>/i)
      ?? html.match(/<span[^>]*class="[^"]*topcard__flavor[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
    const company = companyMatch ? decodeHtml(companyMatch[1].replace(/<[^>]+>/g, " ").trim()) : "";

    const locationMatch = html.match(/<span[^>]*class="[^"]*topcard__flavor--bullet[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
    const location = locationMatch ? decodeHtml(locationMatch[1].replace(/<[^>]+>/g, " ").trim()) : "";

    console.log(`[job-ad] LinkedIn guest API ok — title: "${title}", desc length: ${description.length}`);

    return {
      title: title || "Job from LinkedIn",
      company: company || "Company from job ad",
      location,
      salary: "",
      description: description.slice(0, 30000),
    };
  } catch (e) {
    console.warn("[job-ad] LinkedIn guest API failed:", e);
    return null;
  }
}

// ─── Seek Chalice API (tries Seek's internal JSON API before scraping) ────────

function extractSeekJobId(url: string): string | null {
  try {
    const u = new URL(url);
    const pathMatch = u.pathname.match(/^\/job\/(\d+)/);
    if (pathMatch) return pathMatch[1];
    const qp = u.searchParams.get("jobId");
    if (qp) return qp;
  } catch { /* ignore */ }
  return null;
}

async function fetchSeekJobApi(url: string): Promise<JobAdDetails | null> {
  const jobId = extractSeekJobId(url);
  if (!jobId) return null;

  try {
    const res = await fetch(
      `https://chalice-experience.seek.com.au/jobs/${jobId}?locale=en-AU`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "en-AU,en;q=0.9",
          Referer: `https://au.seek.com/job/${jobId}`,
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site",
        },
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!res.ok) return null;
    const data = await res.json();

    const rawDescription = String(data?.content ?? data?.description ?? data?.jobDescription ?? "");
    const description = htmlToText(rawDescription);
    if (description.trim().length < 100) return null;

    console.log(`[job-ad] Seek API ok — jobId: ${jobId}, desc length: ${description.length}`);

    return {
      title: firstString(data?.title, data?.roleName) || "Job from SEEK",
      company: firstString(
        nestedString(data, "advertiser", "description"),
        nestedString(data, "advertiser", "name"),
        data?.companyName
      ) || "Company from job ad",
      location: firstString(
        data?.locationLabel,
        nestedString(data, "location", "label"),
        nestedString(data, "location", "description")
      ),
      salary: firstString(data?.salary, data?.salaryLabel),
      description: description.slice(0, 30000),
    };
  } catch (e) {
    console.warn("[job-ad] Seek API fetch failed:", e);
    return null;
  }
}

// ─── Jina AI Reader fallback (used in serverless / production) ─────────────

async function fetchJobWithJina(url: string): Promise<JobAdDetails | null> {
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: { Accept: "text/plain", "X-Timeout": "25" },
      signal: AbortSignal.timeout(28000),
    });

    if (!res.ok) return null;

    const text = await res.text();
    if (!text || text.trim().length < 300) return null;
    if (looksLikeBlockedPage(text)) return null;

    // Jina returns "Title: ...\nURL Source: ...\n\nMarkdown Content:\n{body}"
    const titleMatch = text.match(/^Title:\s*(.+)$/m);
    const rawTitle = titleMatch?.[1]?.trim() ?? "";
    const title = rawTitle
      .replace(/\s*[|–—\-]\s*(SEEK|LinkedIn|Indeed|Jora|Adzuna)[\s\S]*$/i, "")
      .trim() || "Job from link";

    // Try to extract company — often appears after "Company:" or as first bold line
    const companyMatch = text.match(/(?:^|\n)(?:Company|Advertiser|Employer):\s*(.+)/i);
    const company = companyMatch?.[1]?.trim() || "Company from job ad";

    const locationMatch = text.match(/(?:^|\n)(?:Location|Where):\s*(.+)/i);
    const location = locationMatch?.[1]?.trim() || "";

    const salaryMatch = text.match(/(?:^|\n)(?:Salary|Pay|Remuneration):\s*(.+)/i);
    const salary = salaryMatch?.[1]?.trim() || "";

    console.log(`[job-ad] Jina fetch ok — title: "${title}", length: ${text.length}`);

    return {
      title,
      company,
      location,
      salary,
      description: text.slice(0, 30000),
    };
  } catch (e) {
    console.warn("[job-ad] Jina fallback failed:", e);
    return null;
  }
}

// ─── Puppeteer-core browser fallback (local dev only) ──────────────────────

const CHROME_PATHS = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  String(process.env.CHROME_PATH ?? ""),
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium"
];

function findChrome(): string | null {
  return CHROME_PATHS.find((p) => p && existsSync(p)) ?? null;
}

const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION);

async function getBrowserLaunchOptions(): Promise<{
  executablePath: string;
  args: string[];
  headless: boolean;
} | null> {
  if (IS_SERVERLESS) {
    try {
      const chromium = (await import("@sparticuz/chromium")).default;
      return {
        executablePath: await chromium.executablePath(),
        args: chromium.args as string[],
        headless: true,
      };
    } catch (e) {
      console.warn("[job-ad] @sparticuz/chromium not available:", e);
      return null;
    }
  }

  const executablePath = findChrome();
  if (!executablePath) return null;
  return {
    executablePath,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-dev-shm-usage",
      "--disable-infobars",
      "--window-size=1366,768",
    ],
    headless: true,
  };
}

async function fetchJobWithBrowser(url: string): Promise<JobAdDetails | null> {
  const launchOptions = await getBrowserLaunchOptions();
  if (!launchOptions) {
    console.warn("[job-ad] puppeteer fallback: no browser available");
    return null;
  }

  let puppeteer;
  try {
    puppeteer = await import("puppeteer-core");
  } catch (e) {
    console.warn("[job-ad] puppeteer-core not available:", e);
    return null;
  }

  const browser = await puppeteer.launch(launchOptions);

  try {
    const page = await browser.newPage();

    // Spoof bot-detection properties before any page code runs
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).chrome = { runtime: {} };
      Object.defineProperty(navigator, "plugins", {
        get: () => [{ name: "Chrome PDF Plugin" }, { name: "Chrome PDF Viewer" }, { name: "Native Client" }]
      });
      Object.defineProperty(navigator, "languages", { get: () => ["en-AU", "en-US", "en"] });
    });

    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
    );

    // domcontentloaded fires in ~1-2s (HTML parsed, scripts not yet done).
    // We then wait separately for the job element — this lets CSR sites like SEEK
    // load and render without also waiting for all images/fonts/etc.
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });

    // Wait for SEEK/Indeed job detail content — up to 25 s to allow SEEK's React
    // app to fetch job data from the SEEK API and render it into the DOM.
    const descSelector =
      [
        '[data-automation="jobAdDetails"]',
        '[data-automation="job-detail-description"]',
        '[data-automation="jobDescription"]',
        "#jobDescriptionText",
        '[data-testid="jobDescriptionText"]',
        '[data-testid="jobsearch-jobDescriptionText"]'
      ].join(", ");
    await page.waitForSelector(descSelector, { timeout: 25000 }).catch(() => {});

    // No helper functions inside evaluate — esbuild wraps named functions with __name()
    // which is not defined in the browser context and causes a ReferenceError.
    const data = await page.evaluate(() => {
      const descEl =
        document.querySelector('[data-automation="jobAdDetails"]') ??
        document.querySelector('[data-automation="job-detail-description"]') ??
        document.querySelector('[data-automation="jobDescription"]') ??
        document.querySelector("#jobDescriptionText") ??
        document.querySelector('[data-testid="jobDescriptionText"]') ??
        document.querySelector('[data-testid="jobsearch-jobDescriptionText"]');

      const description = descEl ? (descEl.innerHTML || descEl.textContent || "") : "";

      const titleEl =
        document.querySelector('[data-automation="job-detail-title"]') ??
        document.querySelector('[data-testid="jobsearch-JobInfoHeader-title"]') ??
        document.querySelector("h1[data-automation]") ??
        document.querySelector("h1");

      const companyEl =
        document.querySelector('[data-automation="advertiser-name"]') ??
        document.querySelector('[data-automation="job-detail-company"]') ??
        document.querySelector('[data-testid="inlineHeader-companyName"]') ??
        document.querySelector('[data-company-name="true"]');

      const locationEl =
        document.querySelector('[data-automation="job-detail-location"]') ??
        document.querySelector('[data-automation="job-location"]') ??
        document.querySelector('[data-testid="job-location"]');

      const salaryEl =
        document.querySelector('[data-automation="job-detail-salary"]') ??
        document.querySelector('[data-automation="job-salary"]') ??
        document.querySelector("#salaryInfoAndJobType") ??
        document.querySelector('[data-testid="jobsearch-JobInfoHeader-salary"]');

      return {
        title: titleEl ? (titleEl.textContent ?? "").replace(/\s+/g, " ").trim() : "",
        company: companyEl ? (companyEl.textContent ?? "").replace(/\s+/g, " ").trim() : "",
        location: locationEl ? (locationEl.textContent ?? "").replace(/\s+/g, " ").trim() : "",
        salary: salaryEl ? (salaryEl.textContent ?? "").replace(/\s+/g, " ").trim() : "",
        description
      };
    });

    console.log(`[job-ad] browser fetch got description length: ${data.description.length}`);

    if (!data.description || data.description.trim().length < 100) return null;
    if (looksLikeBlockedPage(htmlToText(data.description))) return null;

    return {
      title: data.title || "Job from link",
      company: data.company || "Company from job ad",
      location: data.location || "",
      salary: data.salary || "",
      description: htmlToText(data.description).slice(0, 30000)
    };
  } catch (e) {
    console.error("[job-ad] browser fetch error:", e);
    return null;
  } finally {
    await browser.close();
  }
}

// ─── Parallel scraping fallback (Jina + Puppeteer race) ─────────────────────

async function fetchWithScrapingFallbacks(url: string): Promise<JobAdDetails | null> {
  const fetchers: Array<Promise<JobAdDetails | null>> = [fetchJobWithJina(url), fetchJobWithBrowser(url)];
  return Promise.any(
    fetchers.map((p) =>
      p.then((r) => {
        if (r === null) throw new Error("no result");
        return r;
      })
    )
  ).catch(() => null);
}

// ─── Main export ────────────────────────────────────────────────────────────

export async function fetchJobAdDetails(jobUrl: string): Promise<JobAdDetails> {
  // Fragments (#hash) are browser-only and break server-side fetches / Jina
  jobUrl = jobUrl.split("#")[0];

  // Search-result URLs embed the job in a side panel via a query param.
  // Rewrite to the canonical job page so we scrape the actual listing.
  try {
    const u = new URL(jobUrl);
    if ((u.hostname === "au.seek.com" || u.hostname.endsWith(".seek.com")) && u.searchParams.has("jobId")) {
      jobUrl = `https://au.seek.com/job/${u.searchParams.get("jobId")}`;
    } else if (u.hostname.includes("linkedin.com") && u.searchParams.has("currentJobId")) {
      jobUrl = `https://www.linkedin.com/jobs/view/${u.searchParams.get("currentJobId")}/`;
    } else if (u.hostname.includes("indeed.com")) {
      const jk = u.searchParams.get("vjk") ?? u.searchParams.get("jk");
      if (jk) jobUrl = `https://${u.hostname}/viewjob?jk=${jk}`;
    }
  } catch {
    // malformed URL — fall through
  }

  // For known blocked job boards, skip the slow direct fetch entirely and
  // fire all available extractors in parallel — takes whichever succeeds first.
  if (isBlockedJobBoard(jobUrl)) {
    const hostname = new URL(jobUrl).hostname;
    const isSeek = hostname.includes("seek.");
    const isLinkedIn = hostname.includes("linkedin.com");

    const fetchers: Promise<JobAdDetails | null>[] = [
      fetchJobWithJina(jobUrl),
      fetchJobWithBrowser(jobUrl),
    ];
    if (isSeek) fetchers.unshift(fetchSeekJobApi(jobUrl));
    if (isLinkedIn) fetchers.unshift(fetchLinkedInGuestApi(jobUrl));

    const result = await Promise.any(
      fetchers.map((p) => p.then((r) => { if (!r) throw new Error("no result"); return r; }))
    ).catch(() => null);

    if (result) return result;
    throw new Error(blockedJobBoardMessage(jobUrl));
  }

  const response = await fetch(jobUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "en-AU,en-US;q=0.9,en;q=0.8",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1"
    },
    redirect: "follow",
    cache: "no-store",
  });

  // After following redirects, use the final URL for blocked-domain detection
  // (e.g. a jooble.org redirect may land on seek.com.au)
  const finalUrl = response.url || jobUrl;
  const effectiveUrl = isBlockedJobBoard(finalUrl) ? finalUrl : jobUrl;

  if (!response.ok) {
    // Redirect landed on a blocked domain (e.g. Adzuna → Seek) — run parallel fallbacks
    if (isBlockedJobBoard(effectiveUrl)) {
      const hostname = new URL(effectiveUrl).hostname;
      const isSeek = hostname.includes("seek.");
      const isLinkedIn = hostname.includes("linkedin.com");
      const fetchers: Promise<JobAdDetails | null>[] = [fetchJobWithJina(effectiveUrl), fetchJobWithBrowser(effectiveUrl)];
      if (isSeek) fetchers.unshift(fetchSeekJobApi(effectiveUrl));
      if (isLinkedIn) fetchers.unshift(fetchLinkedInGuestApi(effectiveUrl));
      const result = await Promise.any(
        fetchers.map((p) => p.then((r) => { if (!r) throw new Error("no result"); return r; }))
      ).catch(() => null);
      if (result) return result;
    }
    throw new Error(
      isBlockedJobBoard(effectiveUrl)
        ? blockedJobBoardMessage(effectiveUrl, response.status)
        : `Could not read this job link. The site returned HTTP ${response.status}.`
    );
  }

  const html = await response.text();

  // 1. Try LD+JSON structured data (most reliable when present)
  const structured = scriptJson(html);

  // 2. Try __NEXT_DATA__ (used by SEEK and other Next.js job boards)
  const nd = nextDataJob(html);

  const pageTitle = decodeHtml(
    html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? ""
  );

  const description =
    nd?.description ||
    (structured?.description ? htmlToText(String(structured.description)) : "") ||
    meta(html, ["description", "og:description"]) ||
    // For blocked job boards (SEEK, LinkedIn etc.) the full HTML is useless noise —
    // leave it empty so the fallback scraper is triggered below.
    (isBlockedJobBoard(effectiveUrl) ? "" : htmlToText(html));

  const rawTitle =
    nd?.title ||
    (structured?.title ? decodeHtml(String(structured.title)) : "") ||
    meta(html, ["og:title", "twitter:title"]) ||
    pageTitle ||
    "Job from link";

  // Strip trailing site names like "- SEEK", "| LinkedIn", "– Indeed"
  const title = rawTitle
    .replace(/\s*[|–—\-]\s*(SEEK|LinkedIn|Indeed|Jora|Adzuna)[\s\S]*$/i, "")
    .trim() || "Job from link";

  const company =
    nd?.company ||
    (structured?.hiringOrganization?.name
      ? decodeHtml(String(structured.hiringOrganization.name))
      : "");

  const location =
    nd?.location ||
    (structured?.jobLocation?.address?.addressLocality
      ? decodeHtml(String(structured.jobLocation.address.addressLocality))
      : structured?.jobLocation?.address?.addressRegion
        ? decodeHtml(String(structured.jobLocation.address.addressRegion))
        : "");

  const salary =
    nd?.salary ||
    (structured?.baseSalary?.value?.value
      ? String(structured.baseSalary.value.value)
      : "");

  const result: JobAdDetails = {
    title,
    company: company || "Company from job ad",
    location,
    salary,
    description: description.slice(0, 30000)
  };

  // Redirect landed on a blocked domain and returned a challenge page with short/no content
  if (result.description.trim().length < 300 && isBlockedJobBoard(effectiveUrl)) {
    const hostname = new URL(effectiveUrl).hostname;
    console.log(`[job-ad] redirect hit blocked site (${hostname}), trying parallel fallbacks…`);
    const isSeek = hostname.includes("seek.");
    const isLinkedIn = hostname.includes("linkedin.com");
    const fetchers: Promise<JobAdDetails | null>[] = [fetchJobWithJina(effectiveUrl), fetchJobWithBrowser(effectiveUrl)];
    if (isSeek) fetchers.unshift(fetchSeekJobApi(effectiveUrl));
    if (isLinkedIn) fetchers.unshift(fetchLinkedInGuestApi(effectiveUrl));
    const fallback = await Promise.any(
      fetchers.map((p) => p.then((r) => { if (!r) throw new Error("no result"); return r; }))
    ).catch(() => null);
    if (fallback) return fallback;
    throw new Error(blockedJobBoardMessage(effectiveUrl));
  }

  return result;
}
