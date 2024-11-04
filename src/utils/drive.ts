export async function authenticateWithGoogle(): Promise<string> {
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
    const token = await authenticateWithGoogle();
    const metadata = { name: fileName, mimeType: "application/json" };
  
    const formData = new FormData();
    formData.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
    formData.append("file", new Blob([data], { type: "application/octet-stream" }));
  
    await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
      method: "POST",
      headers: new Headers({ Authorization: `Bearer ${token}` }),
      body: formData
    });
  }