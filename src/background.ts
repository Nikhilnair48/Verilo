import { addDomainInfo, closeSession, createSession, getBrowsingDataByDate, openDatabase, saveBrowsingData } from './db/database';
import { getTrackingState, updateTrackingState } from './utils/cache';
import { openai, parseAIPromptResponse } from './utils/categorize';
import { generatePrompt } from './utils/constants';
import { syncDataToDrive } from './utils/drive';

// State variables for tracking
let activeTabId: number | null = null;
let trackingCategory: string | null = null;
let trackingDomainId: string | null = null;
let startTime: number | null = null;
let sessionExpiryTimeout: NodeJS.Timeout;
let sessionLock = false;

function getDomain(url: string): string {
  const { hostname } = new URL(url);
  return hostname;
}

async function withSessionLock(callback: () => Promise<void>) {
  if(sessionLock) {
    console.warn("Session lock active; operation skipped");
    return;
  }
  sessionLock = true;
  try {
    await callback();
  } catch(ex) {
    sessionLock = false;
  }
}

async function startTracking(tabId: number, category: string, domainId: string) {
  await withSessionLock(async () => {
    if (activeTabId !== tabId || trackingCategory !== category || trackingDomainId !== domainId) {
      // Stop previous tracking if a new tab or domain is being tracked
      await stopTracking();
  
      // Create a new session for the domain
      const sessionId = await createSession(domainId);
  
      trackingCategory = category;
      trackingDomainId = domainId;
      startTime = Date.now();
  
      updateTrackingState({ trackingCategory, trackingDomainId, sessionId, startTime });
      activeTabId = tabId;
  
      console.log(`Started tracking ${domainId} in ${category}`);
    }
  });
}

// Function to start tracking for the specified domain and category
async function stopTracking() {
  await withSessionLock(async () => {
    if (trackingCategory && trackingDomainId && startTime) {
      const duration = Math.floor((Date.now() - startTime) / 1000);
  
      // Save duration data to centralized IndexedDB
      const sessionId = await getTrackingState("sessionId");
      const today = new Date(startTime).toISOString().split("T")[0];
      if(sessionId) {
        await saveBrowsingData({
          id: `${today}-${trackingDomainId}`,
          date: today,
          domainId: trackingDomainId,
          sessionId,
          duration,
          visitCount: 1
        });
    
        await closeSession(sessionId);
    
        console.log(`Stopped tracking ${trackingDomainId} in ${trackingCategory} with duration ${duration} seconds`);
    
        // Reset tracking variables
        trackingCategory = null;
        trackingDomainId = null;
        startTime = null;
        activeTabId = null;
        clearTimeout(sessionExpiryTimeout);
    
        updateTrackingState({});
      } else {
        throw new Error("Stop tracking failed. Invalid sessionId.")
      }
    }
  });
}

async function isChromeAIApiAvailable() {
  const { chromeAIApiAvailable } = await chrome.storage.local.get("chromeAIApiAvailable");
  return chromeAIApiAvailable || false;
}

async function categorizeDomain(domain: string): Promise<any> {
  
  const chromeAIApiAvailable = await isChromeAIApiAvailable();
  const prompt = generatePrompt(domain);

  if (chromeAIApiAvailable) {
    try {
      // Use chrome.tabs.sendMessage to communicate with contentScript on a specific tab
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log(activeTab);
      if (activeTab && activeTab.id !== undefined) {  
        return new Promise((resolve, reject) => {
          chrome.tabs.sendMessage(
            activeTab.id!,
            { action: 'categorizeWithChromeAI', prompt },
            (response) => {
              if (chrome.runtime.lastError) {
                console.error("Error sending message to content script:", chrome.runtime.lastError.message);
                reject(chrome.runtime.lastError);
              } else {
                resolve(parseAIPromptResponse(response));
              }
            }
          );
        });
      } else {
        console.warn("No active tab found.");
        return null;
      }
    } catch (error) {
      console.error("Chrome AI categorization failed:", error);
    }
  }

  // Fallback to OpenAI if Chrome AI API is unavailable
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: "system", content: "You are an AI assistant categorizing website content." },
        { role: "user", content: prompt }],
    });
    const result = response.choices[0].message.content || '';
    return parseAIPromptResponse(result);
  } catch (error) {
    console.error("OpenAI categorization failed:", error);
    return null;
  }
}

async function categorizeAndHandleTracking(activeInfo: any) {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  const domain = tab.url ? getDomain(tab.url) : null;

  if (domain) {
    // Check if the domain already exists in the database
    const db = await openDatabase();
    const existingDomain = await db?.get('domainInfo', domain);
    if (existingDomain) {
      // If the domain exists, use the existing category and track browsing
      await startTracking(activeInfo.tabId, existingDomain.category, domain);
    } else {
      // If the domain is new, use AI to categorize and then store it in the database
      const categoryData = await categorizeDomain(domain);
      if (categoryData) {
        const { category, subcategories, tags } = categoryData;
        await addDomainInfo(domain, category, subcategories); // Store the new domain info in DB
        await startTracking(activeInfo.tabId, category, domain); // Start tracking with new category data
      } else {
        console.warn("Failed to categorize domain:", domain);
        await stopTracking(); // Stop tracking if categorization fails
      }
    }
  } else {
    await stopTracking();
  }
}

chrome.tabs.onActivated.addListener((activeInfo) => {
  categorizeAndHandleTracking(activeInfo);
  return true;
});

// Listen for visibility changes from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "visibilityChanged") {
    if (message.state === "hidden") {
      sessionExpiryTimeout = setTimeout(async () => {
        await stopTracking();
      }, 2 * 60 * 1000);  // 2 minutes of inactivity
    } else if (message.state === "visible" && trackingCategory && trackingDomainId) {
      startTracking(sender.tab?.id!, trackingCategory, trackingDomainId);
    }
  } else if (message.action === 'getBrowsingData') {
      try {
        getBrowsingDataByDate(new Date().toISOString().split("T")[0]).then((data) => sendResponse(data));
      } catch (error) {
        console.error("Error fetching browsing data:", error);
        sendResponse([]);
      }
      return true;
  } else if (message.command === "syncToDrive") {
    syncDataToDrive()
      .then(() => sendResponse({ status: "success" }))
      .catch(() => sendResponse({ status: "failure" }));
    return true;
  }
});