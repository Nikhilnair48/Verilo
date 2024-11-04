export async function encryptData(data: string, key: CryptoKey): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(data);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encryptedData = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encodedData
    );
    
    return encryptedData;
  }