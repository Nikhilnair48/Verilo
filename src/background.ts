import { addDomainInfo, getBrowsingDataByDate, saveBrowsingData } from './db/database';
import { categorizeDomain } from './utils/categorize';
import { syncDataToDrive } from './utils/drive';

const CATEGORIES = {
  SOCIAL_MEDIA: ["facebook.com", "twitter.com", "instagram.com"],
  NEWS: ["cnn.com", "bbc.com", "nytimes.com"]
};

// State variables for tracking
let activeTabId: number | null = null;
let trackingCategory: string | null = null;
let trackingDomainId: string | null = null;
let startTime: number | null = null;

function getDomain(url: string): string {
  const { hostname } = new URL(url);
  return hostname;
}

function determineCategory(url: string): { category: string, domainId: string } | null {
  const domain = getDomain(url);
  for (const [category, sites] of Object.entries(CATEGORIES)) {
    if (sites.some(site => url.includes(site))) {
      const domainId = `${domain}-${category}`;
      return { category, domainId };
    }
  }
  return null;
}

async function startTracking(tabId: number, category: string, domainId: string) {
  if (activeTabId !== tabId || trackingCategory !== category || trackingDomainId !== domainId) {
    // Stop previous tracking if a new tab or domain is being tracked
    await stopTracking();

    trackingCategory = category;
    trackingDomainId = domainId;
    startTime = Date.now();

    chrome.storage.local.set({ trackingCategory, trackingDomainId, startTime });
    activeTabId = tabId;

    console.log(`Started tracking ${domainId} in ${category}`);
  }
}

// Function to start tracking for the specified domain and category
async function stopTracking() {
  if (trackingCategory && trackingDomainId && startTime) {
    const duration = Math.floor((Date.now() - startTime) / 1000);

    // Save duration data to centralized IndexedDB
    const today = new Date(startTime).toISOString().split("T")[0];
    await saveBrowsingData({
      id: `${today}-${trackingDomainId}`,
      date: today,
      domainId: trackingDomainId,
      duration,
      visitCount: 1
    });

    console.log(`Stopped tracking ${trackingDomainId} in ${trackingCategory} with duration ${duration} seconds`);

    // Reset tracking variables
    trackingCategory = null;
    trackingDomainId = null;
    startTime = null;
    activeTabId = null;

    chrome.storage.local.remove(["trackingCategory", "trackingDomainId", "startTime"]);
  }
}

async function handleDomainCategorization(domain: string) {
  try {
    const result = await categorizeDomain(domain);
    if (result) {
      await addDomainInfo(domain, result.category, result.subcategories);
    } else {
      // Fallback if categorization fails
      await addDomainInfo(domain, "Uncategorized", []);
    }
  } catch (error) {
    console.error("Failed to categorize domain:", error);
  }
}

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  const categoryData = tab.url ? determineCategory(tab.url) : null;

  if (categoryData) {
    const { category, domainId } = categoryData;
    await handleDomainCategorization(getDomain(tab.url!));
    await startTracking(activeInfo.tabId, category, domainId);
  } else {
    await stopTracking();
  }
});


// Listen for visibility changes from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "visibilityChanged") {
    if (message.state === "hidden") {
      stopTracking();
    } else if (message.state === "visible" && trackingCategory && trackingDomainId) {
      startTracking(sender.tab?.id!, trackingCategory, trackingDomainId);
    }
  } else if (message.action === 'getBrowsingData') {
      try {
        getBrowsingDataByDate(new Date().toISOString().split("T")[0]).then((data) => sendResponse(data));
      } catch (error) {
        console.error("Error fetching browsing data:", error);
        sendResponse([]); // Send an empty array on error
      }
      return true;
  } else if (message.command === "syncToDrive") {
    syncDataToDrive()
      .then(() => sendResponse({ status: "success" }))
      .catch(() => sendResponse({ status: "failure" }));
    return true;
  }
});