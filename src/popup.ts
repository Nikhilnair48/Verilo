import { syncDataToDrive } from "./utils/drive";

// Function to format time for display in hours and minutes
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours} hrs ${minutes % 60} mins` : `${minutes} mins`;
}

// Function to display the browsing activity summary from IndexedDB
async function displayActivitySummary() {
  console.log("displayActivitySummary");
  const tableBody = document.getElementById("activitySummary");
  if (!tableBody) return;

  // Request data from the background script
  try {
    chrome.runtime.sendMessage({ action: 'getBrowsingData' }, function(data) {
      console.log("Data received from background:", data);
      if (data && data.length > 0) {
        tableBody.innerHTML = data
          .map((entry: { duration: number; domainId: string }) => {
            const timeSpent = formatTime(entry.duration);
            return `<tr><td>${entry.domainId}</td><td>${timeSpent}</td></tr>`;
          })
          .join("");
      } else {
        tableBody.innerHTML = "<tr><td colspan='2'>No data available</td></tr>";
      }
    });


  } catch (error) {
    console.error("Failed to retrieve browsing data:", error);
    tableBody.innerHTML = "<tr><td colspan='2'>Error loading data</td></tr>";
  }
}

// Set up the event listener for the "Sync to Drive" button
document.getElementById("syncButton")?.addEventListener("click", syncDataToDrive);

// Display the activity summary on popup load
document.addEventListener("DOMContentLoaded", () => {
  displayActivitySummary();
});