// encryption.ts

// Function to generate or retrieve a stored encryption key for AES-GCM encryption
export async function getEncryptionKey(): Promise<CryptoKey> {
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

// Encrypt data using AES-GCM
export async function encryptData(data: string, key: CryptoKey): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // Initialization vector for AES-GCM
  const encodedData = encoder.encode(data);

  const encryptedData = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv
    },
    key,
    encodedData
  );

  // Combine IV and encrypted data
  const result = new Uint8Array(iv.byteLength + encryptedData.byteLength);
  result.set(iv);
  result.set(new Uint8Array(encryptedData), iv.byteLength);
  return result.buffer;
}