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

  const pickText = (selectors) => {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      const text = clean(element?.innerText || element?.textContent || "");
      if (text) {
        return text;
      }
    }
    return "";
  };

  const title = pickText([
    "h1",
    '[data-automation="job-detail-title"]',
    '[data-testid="job-title"]',
    ".job-title"
  ]) || document.title;

  const company = pickText([
    '[data-automation="advertiser-name"]',
    '[data-automation="job-detail-company-name"]',
    '[data-testid="company-name"]',
    'a[href*="/companies/"]'
  ]);

  const location = pickText([
    '[data-automation="job-detail-location"]',
    '[data-testid="job-location"]',
    '[aria-label*="location" i]'
  ]);

  const salary = pickText([
    '[data-automation="job-detail-salary"]',
    '[data-testid="job-salary"]'
  ]);

  const description = pickText([
    '[data-automation="jobAdDetails"]',
    '[data-automation="job-detail-description"]',
    '[data-testid="job-description"]',
    "article",
    "main"
  ]) || clean(document.body.innerText);

  return {
    title: clean(title),
    company: clean(company),
    location: clean(location),
    salary: clean(salary),
    description: description.slice(0, 30000),
    url: window.location.href
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
