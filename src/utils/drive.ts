import { getBrowsingDataByDate } from "../db/database";
import { encryptData, getEncryptionKey } from "./encryption";

  // Helper function to retrieve access token for Google Drive
async function getAccessToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError || !token) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(token);
      }
    });
  });
}
  
export async function uploadToGoogleDrive(data: ArrayBuffer, fileName: string) {
  try {
    const metadata = {
      name: fileName,
      mimeType: "application/json",
      parents: ["appDataFolder"] // Google Drive app-specific folder
    };
  
    const form = new FormData();
    form.append(
      "metadata",
      new Blob([JSON.stringify(metadata)], { type: "application/json" })
    );
    form.append("file", new Blob([data], { type: "application/octet-stream" }));
  
    const accessToken = await getAccessToken();
    await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
      method: "POST",
      headers: new Headers({ Authorization: `Bearer ${accessToken}` }),
      body: form
    });
  } catch (error) {
    console.error("Failed to upload to Google Drive:", error);
  }
}

// Function to handle data encryption and upload to Google Drive
export async function syncDataToDrive() {
  try {
    const date = new Date().toISOString().split("T")[0]; // Use current date for sync
    const browsingData = await getBrowsingDataByDate(date);

    if (browsingData && browsingData.length === 0) {
      console.log("No data to sync.");
      return;
    }

    // Encrypt data for upload
    const encryptionKey = await getEncryptionKey();
    if(encryptionKey) {
      const dataToUpload = JSON.stringify(browsingData);
      const encryptedData = await encryptData(dataToUpload, encryptionKey);
      if(encryptedData) {
        // Define the file name
        const fileName = `BrowsingSummary_${date}.json`;
        await uploadToGoogleDrive(encryptedData, fileName);
        
        console.log("Data successfully synced to Google Drive.");
      }
    }
  } catch (error) {
    console.error("Failed to sync data to Google Drive:", error);
  }
}