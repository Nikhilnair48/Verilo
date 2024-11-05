import { saveBrowsingData } from "./db/database";

// State variables for tracking
let trackingCategory: string | null = null;
let trackingDomainId: string | null = null;
let startTime: number | null = null;
let intervalId: number | null = null;

// Function to start tracking for the specified domain and category
async function startTracking(category: string, domainId: string) {
  if (intervalId !== null) return;

  trackingCategory = category;
  trackingDomainId = domainId;
  startTime = Date.now();

  // Save to storage for persistence
  await chrome.storage.local.set({
    trackingCategory,
    trackingDomainId,
    startTime,
  });

  console.log(`Started tracking ${domainId} in ${category}`);

  intervalId = window.setInterval(async () => {
    if (trackingCategory && trackingDomainId && startTime) {
      const now = Date.now();
      const duration = Math.floor((now - startTime) / 1000);
      await saveCurrentDuration(duration);
      startTime = now;
      await chrome.storage.local.set({ startTime });
    }
  }, 30000);
}

// Function to stop tracking and save data
async function stopTracking() {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }

  const { trackingCategory: localTrackingCategory, trackingDomainId: localTrackingDomainId, startTime: localStartTime } = await chrome.storage.local.get([
    "trackingCategory",
    "trackingDomainId",
    "startTime",
  ]);

  console.log(`trackingCategory: ${trackingCategory}, trackingDomainId: ${trackingDomainId}, startTime: ${startTime}`);

  if (localTrackingCategory && localTrackingDomainId && localStartTime) {
    const duration = Math.floor((Date.now() - localStartTime) / 1000);
    await saveCurrentDuration(duration);

    // Clear storage
    await chrome.storage.local.remove(["trackingCategory", "trackingDomainId", "startTime"]);

    trackingCategory = null;
    trackingDomainId = null;
    startTime = null;
  }
}

// Helper function to save duration to IndexedDB
async function saveCurrentDuration(duration: number) {
  console.log(`saveCurrentDuration: ${duration}`);
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

async function restoreTrackingState() {
  const { trackingCategory, trackingDomainId, startTime } = await chrome.storage.local.get([
    "trackingCategory",
    "trackingDomainId",
    "startTime",
  ]);

  if (trackingCategory && trackingDomainId && startTime) {
    startTracking(trackingCategory, trackingDomainId);
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

restoreTrackingState();