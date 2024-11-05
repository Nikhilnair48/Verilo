import { openDatabase, BrowsingData } from "./db/database";
import { encryptData } from "./utils/encryption";
import { uploadToGoogleDrive } from "./utils/drive";
import { syncDataToDrive } from "./utils/drive";

// Function to securely retrieve or generate an encryption key for AES-GCM encryption
async function getEncryptionKey(): Promise<CryptoKey> {
  const storedKey = await chrome.storage.local.get("encryptionKey");
  
  if (storedKey.encryptionKey) {
    // Convert the stored key back to a CryptoKey
    const keyBuffer = new Uint8Array(storedKey.encryptionKey).buffer;
    return await crypto.subtle.importKey("raw", keyBuffer, { name: "AES-GCM" }, true, ["encrypt", "decrypt"]);
  } else {
    // Generate a new encryption key and store it securely
    const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
    const exportedKey = new Uint8Array(await crypto.subtle.exportKey("raw", key));
    await chrome.storage.local.set({ encryptionKey: Array.from(exportedKey) });
    return key;
  }
}

// Function to display the browsing activity summary from IndexedDB
async function displayActivitySummary() {
  const db = await openDatabase();
  const transaction = db.transaction("browsingData", "readonly");
  const store = transaction.objectStore("browsingData");

  const request = store.getAll();
  request.onsuccess = () => {
    const data = request.result as BrowsingData[];
    const summaryElement = document.getElementById("activitySummary");

    if (summaryElement) {
      summaryElement.innerHTML = data
        .map(entry => `<p><strong>${entry.date}</strong>: ${JSON.stringify(entry.categories)}</p>`)
        .join("");
    }
  };
}

// Function to handle "Sync to Drive" action
async function syncToDrive() {
  try {
    const db = await openDatabase();
    const transaction = db.transaction("browsingData", "readonly");
    const store = transaction.objectStore("browsingData");

    const request = store.getAll();
    request.onsuccess = async () => {
      const data = request.result as BrowsingData[];
      
      if (data.length === 0) {
        alert("No data to sync.");
        return;
      }

      const encryptionKey = await getEncryptionKey();
      const encryptedData = await encryptData(JSON.stringify(data), encryptionKey);

      const fileName = `BrowsingSummary_${new Date().toISOString().split("T")[0]}.json`;
      await uploadToGoogleDrive(encryptedData, fileName);

      alert("Data synced to Google Drive successfully!");
    };
  } catch (error) {
    console.error("Failed to sync data to Google Drive:", error);
    alert("Error syncing data. Please try again.");
  }
}

// Set up the event listener for the "Sync to Drive" button
document.getElementById("syncButton")?.addEventListener("click", syncDataToDrive);

// Display the activity summary on popup load
displayActivitySummary();