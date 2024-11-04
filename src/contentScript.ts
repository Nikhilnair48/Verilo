import { saveBrowsingData } from "./db/database";

// Categories to track (as examples)
const CATEGORIES = {
  SOCIAL_MEDIA: ["facebook.com", "twitter.com", "instagram.com"],
  NEWS: ["cnn.com", "bbc.com", "nytimes.com"]
};

// Helper function to determine the category based on URL
function determineCategory(url: string): string | null {
  for (const [category, sites] of Object.entries(CATEGORIES)) {
    if (sites.some(site => url.includes(site))) {
      return category;
    }
  }
  return null;
}

// Track time on a website
let currentCategory: string | null = null;
let startTime: number | null = null;

// Start tracking when the tab becomes active
function startTracking(category: string) {
  currentCategory = category;
  startTime = Date.now();
  console.log(`Started tracking ${category} at ${new Date(startTime).toLocaleTimeString()}`)
}

// Stop tracking and save the data
async function stopTracking() {
  if (currentCategory && startTime) {
    const endTime = Date.now();
    const duration = Math.floor((endTime - startTime) / 1000); // duration in seconds

    const today = new Date().toISOString().split("T")[0];
    await saveBrowsingData({
      id: `${today}-${currentCategory}`,
      date: today,
      categories: { [currentCategory]: duration }
    });

    // Reset tracking
    currentCategory = null;
    startTime = null;
  }
}

// Listen for tab activity changes
window.addEventListener("focus", () => {
  const category = determineCategory(window.location.hostname);
  console.log(category);
  if (category) {
    startTracking(category);
  }
});

window.addEventListener("blur", () => {
  console.log("stop tracking");
  stopTracking();
});