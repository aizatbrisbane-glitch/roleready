const appUrlInput = document.getElementById("appUrl");
const sendButton = document.getElementById("send");
const statusEl = document.getElementById("status");

chrome.storage.local.get(["appUrl"], (stored) => {
  if (stored.appUrl) {
    appUrlInput.value = stored.appUrl;
  }
});

function clean(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractJobAd() {
  const clean = (value) =>
    String(value || "")
      .replace(/\s+/g, " ")
      .trim();

  const pickText = (selectors, minLength = 0) => {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      const text = clean(element?.innerText || element?.textContent || "");
      if (text.length > minLength) {
        return text;
      }
    }
    return "";
  };

  const title = pickText([
    "h1",
    '[data-automation="job-detail-title"]',
    '[data-testid="job-title"]',
    '[data-testid="jobsearch-JobInfoHeader-title"]', // Indeed
    ".job-title"
  ]) || document.title;

  const company = pickText([
    '[data-automation="advertiser-name"]',
    '[data-automation="job-detail-company-name"]',
    '[data-testid="company-name"]',
    '[data-testid="inlineHeader-companyName"]', // Indeed
    '[data-company-name="true"]',               // Indeed alt
    'a[href*="/companies/"]'
  ]);

  const location = pickText([
    '[data-automation="job-detail-location"]',
    '[data-testid="job-location"]',
    '[aria-label*="location" i]'
  ]);

  const salary = pickText([
    '[data-automation="job-detail-salary"]',
    '[data-testid="job-salary"]',
    '#salaryInfoAndJobType',                          // Indeed
    '[data-testid="jobsearch-JobInfoHeader-salary"]'  // Indeed
  ]);

  const description = pickText([
    '[data-automation="jobAdDetails"]',
    '[data-automation="job-detail-description"]',
    '[data-testid="job-description"]',
    '#jobDescriptionText',                             // Indeed
    '[data-testid="jobDescriptionText"]',              // Indeed
    '[data-testid="jobsearch-jobDescriptionText"]',    // Indeed
    "article",
    "main"
  ], 200) || clean(document.body.innerText);

  // On SEEK, jobs open in a side panel without changing the address bar URL.
  // Try to extract the actual job listing URL from the DOM first.
  const seekJobAnchor = Array.from(document.querySelectorAll('a[href*="/job/"]'))
    .find(a => /\/job\/\d+/.test(a.getAttribute('href') || ''));
  const seekHref = seekJobAnchor?.getAttribute('href') ?? '';
  const resolvedUrl = seekHref
    ? (seekHref.startsWith('http') ? seekHref : `${window.location.origin}${seekHref}`)
    : window.location.href;

  return {
    title: clean(title),
    company: clean(company),
    location: clean(location),
    salary: clean(salary),
    description: description.slice(0, 30000),
    url: resolvedUrl
  };
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

sendButton.addEventListener("click", async () => {
  const appUrl = appUrlInput.value.replace(/\/+$/, "");
  chrome.storage.local.set({ appUrl });
  sendButton.disabled = true;
  statusEl.textContent = "Reading this page...";

  try {
    const tab = await getActiveTab();
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractJobAd
    });

    if (!result || !result.description || result.description.length < 200) {
      throw new Error("Could not read enough job ad text from this page. Scroll the ad into view and try again.");
    }

    statusEl.textContent = "Opening local app...";

    const payload = btoa(unescape(encodeURIComponent(JSON.stringify(result))))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
    chrome.tabs.create({ url: `${appUrl}/extension-import#payload=${payload}`, active: true });
    statusEl.textContent = "Sent to app.";
  } catch (error) {
    statusEl.textContent = error.message || "Unable to send job ad.";
  } finally {
    sendButton.disabled = false;
  }
});
