import { saveBrowsingData } from "./db/database";

// State variables for tracking
let trackingCategory: string | null = null;
let trackingDomainId: string | null = null;
let startTime: number | null = null;
let intervalId: number | null = null;

// Function to start tracking for the specified domain and category
function startTracking(category: string, domainId: string) {
  if (intervalId !== null) return;

  trackingCategory = category;
  trackingDomainId = domainId;
  startTime = Date.now();
  console.log(`Started tracking ${domainId} in ${category}`);

  intervalId = window.setInterval(async () => {
    if (trackingCategory && trackingDomainId && startTime) {
      const now = Date.now();
      const duration = Math.floor((now - startTime) / 1000);
      await saveCurrentDuration(duration);
      startTime = now;
    }
  }, 30000);
}

// Function to stop tracking and save data
async function stopTracking() {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }

  if (trackingCategory && trackingDomainId && startTime) {
    const duration = Math.floor((Date.now() - startTime) / 1000);
    await saveCurrentDuration(duration);

    trackingCategory = null;
    trackingDomainId = null;
    startTime = null;
  }
}

// Helper function to save duration to IndexedDB
async function saveCurrentDuration(duration: number) {
  const timestamp = Date.now();
  const date = new Date(timestamp).toISOString().split('T')[0];
  if (trackingCategory && trackingDomainId) {
    await saveBrowsingData({
      id: `${date}-${trackingDomainId}`,
      date,
      domainId: trackingDomainId,
      duration,
      visitCount: 1
    });
  }
}

// Detect when the tab becomes hidden or visible
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === 'hidden') {
    stopTracking();
  } else if (document.visibilityState === 'visible' && trackingCategory && trackingDomainId) {
    startTracking(trackingCategory, trackingDomainId);
  }
});

// Save on tab unload
window.addEventListener("beforeunload", () => {
  stopTracking();
});

// Listen for messages from the background script to control tracking
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'startTracking' && message.category && message.domainId) {
    stopTracking();
    startTracking(message.category, message.domainId);
  } else if (message.action === 'stopTracking') {
    stopTracking();
  }
});