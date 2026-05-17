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
const BLOCKED_DOMAINS = ["seek.com.au", "seek.co.nz", "seek.com", "linkedin.com", "indeed.com", "adzuna.com.au", "adzuna.co.nz"];

export function isBlockedJobBoard(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    return BLOCKED_DOMAINS.some((d) => host === d || host.endsWith("." + d));
  } catch {
    return false;
  }
}

export function detectJobSource(url: string): "SEEK" | "LinkedIn" | "Adzuna" | "Other" {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("seek.") || host.includes(".seek.")) return "SEEK";
    if (host.includes("linkedin.com")) return "LinkedIn";
    if (host.includes("adzuna.")) return "Adzuna";
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

function scriptJson(html: string) {
  const matches =
    html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) ?? [];

  for (const match of matches) {
    const jsonText = match
      .replace(/^<script[^>]*>/i, "")
      .replace(/<\/script>$/i, "")
      .trim();
    try {
      const parsed = JSON.parse(jsonText);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      const posting = items.find(
        (item) =>
          item?.["@type"] === "JobPosting" || item?.["@type"]?.includes?.("JobPosting")
      );
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
      props.data?.jobDetails;

    if (!job) return null;

    const rawDescription =
      job.content ?? job.description ?? job.jobDescription ?? job.fullDescription ?? "";

    return {
      title: String(job.title ?? job.roleName ?? ""),
      company: String(
        job.advertiser?.description ??
          job.advertiser?.name ??
          job.companyName ??
          job.company ??
          ""
      ),
      location: String(
        job.locationLabel ??
          job.location?.label ??
          job.location?.description ??
          job.location ??
          ""
      ),
      salary: String(job.salary ?? job.salaryLabel ?? job.salaryRange ?? ""),
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

// ─── Puppeteer-core browser fallback ───────────────────────────────────────

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

    // Use 'load' so scripts run and any client-side rendering finishes
    await page.goto(url, { waitUntil: "load", timeout: 35000 });

    // Wait for SEEK job detail content — up to 15 s
    const descSelector =
      '[data-automation="jobAdDetails"], [data-automation="job-detail-description"], [data-automation="jobDescription"]';
    await page.waitForSelector(descSelector, { timeout: 15000 }).catch(() => {});

    const data = await page.evaluate(() => {
      function txt(el: Element | null): string {
        return el ? (el.textContent ?? "").replace(/\s+/g, " ").trim() : "";
      }

      const descEl =
        document.querySelector('[data-automation="jobAdDetails"]') ??
        document.querySelector('[data-automation="job-detail-description"]') ??
        document.querySelector('[data-automation="jobDescription"]');

      const description = descEl ? (descEl.innerHTML || descEl.textContent || "") : "";

      const titleEl =
        document.querySelector('[data-automation="job-detail-title"]') ??
        document.querySelector("h1[data-automation]") ??
        document.querySelector("h1");

      const companyEl =
        document.querySelector('[data-automation="advertiser-name"]') ??
        document.querySelector('[data-automation="job-detail-company"]');

      const locationEl =
        document.querySelector('[data-automation="job-detail-location"]') ??
        document.querySelector('[data-automation="job-location"]');

      const salaryEl =
        document.querySelector('[data-automation="job-detail-salary"]') ??
        document.querySelector('[data-automation="job-salary"]');

      return {
        title: txt(titleEl),
        company: txt(companyEl),
        location: txt(locationEl),
        salary: txt(salaryEl),
        description
      };
    });

    console.log(`[job-ad] browser fetch got description length: ${data.description.length}`);

    if (!data.description || data.description.trim().length < 100) return null;

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

// ─── Main export ────────────────────────────────────────────────────────────

export async function fetchJobAdDetails(jobUrl: string): Promise<JobAdDetails> {
  const response = await fetch(jobUrl, {
    headers: {
      // Realistic Chrome browser headers — many job boards block obvious bot User-Agents.
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
    cache: "no-store"
  });

  if (!response.ok) {
    // Before giving up, try the browser fallback for blocked sites
    if (isBlockedJobBoard(jobUrl)) {
      const browserResult = await fetchJobWithBrowser(jobUrl);
      if (browserResult) return browserResult;
    }
    throw new Error(
      isBlockedJobBoard(jobUrl)
        ? `${new URL(jobUrl).hostname} blocked our request (HTTP ${response.status}). Use the Chrome extension on the job page, or paste the job description in the box below.`
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
    htmlToText(html);

  const title =
    nd?.title ||
    (structured?.title ? decodeHtml(String(structured.title)) : "") ||
    meta(html, ["og:title", "twitter:title"]) ||
    pageTitle ||
    "Job from link";

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

  // If description is too short and this is a known blocked site, try headless browser
  if (result.description.trim().length < 300 && isBlockedJobBoard(jobUrl)) {
    const browserResult = await fetchJobWithBrowser(jobUrl);
    if (browserResult) return browserResult;
  }

  return result;
}
