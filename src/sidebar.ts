import { getBrowsingData } from "./db/database";

// Format time for display
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours} hrs ${minutes % 60} mins` : `${minutes} mins`;
}

// Populate the table in the sidebar with browsing data
async function populateTable() {
  const dataTable = document.getElementById("dataTable");
  if (!dataTable) return;

  const browsingData = await getBrowsingData();

  browsingData.forEach((item: any) => {
    const row = document.createElement("tr");

    const urlCell = document.createElement("td");
    urlCell.textContent = item.url;
    row.appendChild(urlCell);

    const timeCell = document.createElement("td");
    timeCell.textContent = formatTime(item.timeSpent);
    row.appendChild(timeCell);

    dataTable.appendChild(row);
  });
}

// Initialize the sidebar data display
populateTable();