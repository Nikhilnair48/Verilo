import { uploadToGoogleDrive } from "./utils/drive";

// Function to retrieve browsing data from IndexedDB

// Function to handle data encryption and upload to Google Drive
async function syncDataToDrive() {
  try {
    // Retrieve browsing data
    const data = await retrieveBrowsingData();
    if (data.length === 0) {
      console.log("No data to sync.");
      return;
    }

    // Get the encryption key
    const encryptionKey = await getEncryptionKey();
    
    // Encrypt the data
    const encryptedData = await encryptData(JSON.stringify(data), encryptionKey);

    // Define the file name based on the current date
    const fileName = `BrowsingSummary_${new Date().toISOString().split("T")[0]}.json`;
    
    // Upload encrypted data to Google Drive
    await uploadToGoogleDrive(encryptedData, fileName);

    console.log("Data synced to Google Drive successfully.");
  } catch (error) {
    console.error("Failed to sync data to Google Drive:", error);
  }
}

// Listener for messages from the popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.command === "syncToDrive") {
    syncDataToDrive().then(() => sendResponse({ status: "success" })).catch(() => sendResponse({ status: "failure" }));
    return true; // Indicates async response
  }
});