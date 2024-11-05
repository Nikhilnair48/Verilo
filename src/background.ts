import { addDomainInfo } from './db/database';
import { syncDataToDrive } from './utils/drive';

// Define categories to track
const CATEGORIES = {
  SOCIAL_MEDIA: ["facebook.com", "twitter.com", "instagram.com"],
  NEWS: ["cnn.com", "bbc.com", "nytimes.com"]
};

let activeTabId: number | null = null;
let activeCategory: string | null = null;
let activeDomainId: string | null = null;

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

function startTracking(tabId: number, category: string, domainId: string) {
  if (activeTabId !== tabId || activeCategory !== category || activeDomainId !== domainId) {
    chrome.tabs.sendMessage(tabId, { action: 'startTracking', category, domainId });
    activeTabId = tabId;
    activeCategory = category;
    activeDomainId = domainId;
  }
}

function stopTracking() {
  if (activeTabId !== null) {
    chrome.tabs.sendMessage(activeTabId, { action: 'stopTracking' });
    activeTabId = null;
    activeCategory = null;
    activeDomainId = null;
  }
}

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  const categoryData = tab.url ? determineCategory(tab.url) : null;

  if (categoryData) {
    const { category, domainId } = categoryData;
    stopTracking();
    await addDomainInfo(getDomain(tab.url!), category, [category]);
    startTracking(activeInfo.tabId, category, domainId);
  } else {
    stopTracking();
  }
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    stopTracking();
  } else {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        const categoryData = tabs[0].url ? determineCategory(tabs[0].url) : null;
        if (categoryData) {
          const { category, domainId } = categoryData;
          startTracking(tabs[0].id!, category, domainId);
        } else {
          stopTracking();
        }
      }
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.command === "syncToDrive") {
    syncDataToDrive()
      .then(() => sendResponse({ status: "success" }))
      .catch(() => sendResponse({ status: "failure" }));
    return true;
  }
});