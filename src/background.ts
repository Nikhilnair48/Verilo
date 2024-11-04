import { openDatabase, BrowsingData } from "./db/database";
import { encryptData } from "./utils/encryption";
import { uploadToGoogleDrive } from "./utils/drive";

// Function to retrieve or generate an AES-GCM encryption key
async function getEncryptionKey(): Promise<CryptoKey> {
  const storedKey = await chrome.storage.local.get("encryptionKey");

  if (storedKey.encryptionKey) {
    const keyBuffer = new Uint8Array(storedKey.encryptionKey).buffer;
    return await crypto.subtle.importKey("raw", keyBuffer, { name: "AES-GCM" }, true, ["encrypt", "decrypt"]);
  } else {
    const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
    const exportedKey = new Uint8Array(await crypto.subtle.exportKey("raw", key));
    await chrome.storage.local.set({ encryptionKey: Array.from(exportedKey) });
    return key;
  }
}

// Function to retrieve browsing data from IndexedDB
async function retrieveBrowsingData(): Promise<BrowsingData[]> {
  const db = await openDatabase();
  const transaction = db.transaction("browsingData", "readonly");
  const store = transaction.objectStore("browsingData");

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => {
      resolve(request.result as BrowsingData[]);
    };
    request.onerror = () => {
      reject("Failed to retrieve browsing data from IndexedDB");
    };
  });
}

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