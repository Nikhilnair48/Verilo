// State variables for tracking
let trackingCategory: string | null = null;
let trackingDomainId: string | null = null;
let startTime: number | null = null;
let intervalId: number | null = null;

// Function to start tracking for the specified domain and category
async function startTracking(category: string, domainId: string) {
  console.log("startTracking");

  // If already tracking, return early
  if (intervalId !== null) return;

  trackingCategory = category;
  trackingDomainId = domainId;
  startTime = Date.now();
  
  // Save to chrome storage for persistence
  await chrome.storage.local.set({ trackingCategory, trackingDomainId, startTime });

  console.log(`Started tracking ${domainId} in ${category}`);

  // Set up an interval to log data periodically
  intervalId = window.setInterval(async () => {
    if (trackingCategory && trackingDomainId && startTime) {
      const now = Date.now();
      const duration = Math.floor((now - startTime) / 1000);

      // Send message to background script to log data
      chrome.runtime.sendMessage({ action: 'logBrowsingData', domainId, category, duration });
      
      // Update start time for the next interval
      startTime = now;
      await chrome.storage.local.set({ startTime });
    }
  }, 30000);
}

// Function to stop tracking and send final log to background
async function stopTracking() {
  console.log("stopTracking");

  // Clear the interval if it exists
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }

  if (trackingCategory && trackingDomainId && startTime) {
    const duration = Math.floor((Date.now() - startTime) / 1000);

    // Send final log message to background script
    chrome.runtime.sendMessage({ action: 'logBrowsingData', domainId: trackingDomainId, category: trackingCategory, duration });

    // Clear local state and chrome storage
    trackingCategory = null;
    trackingDomainId = null;
    startTime = null;
    await chrome.storage.local.remove(['trackingCategory', 'trackingDomainId', 'startTime']);
  }
}

// Restore tracking state from chrome.storage.local if available
async function restoreTrackingState() {
  const storedData = await chrome.storage.local.get(['trackingCategory', 'trackingDomainId', 'startTime']);
  
  if (storedData.trackingCategory && storedData.trackingDomainId && storedData.startTime) {
    trackingCategory = storedData.trackingCategory;
    trackingDomainId = storedData.trackingDomainId;
    startTime = storedData.startTime;

    // Start tracking with restored data
    startTracking(storedData.trackingCategory, storedData.trackingDomainId);
  }
}

// Detect when the tab becomes hidden or visible
document.addEventListener("visibilitychange", () => {
  chrome.runtime.sendMessage({
    action: "visibilityChanged",
    state: document.visibilityState
  });
});

// Save on tab unload
window.addEventListener("beforeunload", () => {
  stopTracking();
});

async function checkChromeAIApi() {
  try {
    const { available } = await (window as any).ai.languageModel.capabilities();
    const chromeAIApiAvailable = available !== "no";
    
    // Store the availability in Chrome storage
    await chrome.storage.local.set({ chromeAIApiAvailable });
  } catch (error) {
    console.error("Chrome AI API check failed:", error);
    await chrome.storage.local.set({ chromeAIApiAvailable: false });
  }
}

checkChromeAIApi();

// Call restoreTrackingState on load to restore previous tracking if any
restoreTrackingState();

async function handleCategorizeWithChromeAI(message: any) {
  try {
    const session = await (window as any).ai.languageModel.create();
    const result = await session.prompt(message.prompt);
    session.destroy();
    return result;
  } catch (error) {
    console.error("Error with Chrome AI categorization:", error);
    return null;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'categorizeWithChromeAI') {
    handleCategorizeWithChromeAI(message).then((response) => { sendResponse(response); });
    return true;
  }
});
