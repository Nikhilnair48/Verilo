import { openDatabase, BrowsingData } from "./db/database";
import { syncDataToDrive } from "./utils/drive";

// Function to format time for display in hours and minutes
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours} hrs ${minutes % 60} mins` : `${minutes} mins`;
}

// Function to display the browsing activity summary from IndexedDB
async function displayActivitySummary() {
  try {
    const db = await openDatabase();
    if(db) {
      const transaction = db.transaction("browsingData", "readonly");
      const store = transaction.objectStore("browsingData");
  
      // Use async/await to get all data directly
      const data = await store.getAll() as BrowsingData[];
  
      const tableBody = document.getElementById("activitySummary");
  
      if (tableBody) {
        tableBody.innerHTML = data
          .map(entry => {
            const timeSpent = formatTime(entry.duration); // Assuming 'duration' field is used instead of 'timeSpent'
            return `<tr><td>${entry.domainId}</td><td>${timeSpent}</td></tr>`; // Replaced 'url' with 'domainId'
          })
          .join("");
      }
    }
  } catch (error) {
    console.error("Failed to display activity summary:", error);
  }
}

// Set up the event listener for the "Sync to Drive" button
document.getElementById("syncButton")?.addEventListener("click", syncDataToDrive);

// Display the activity summary on popup load
displayActivitySummary();