const DB_NAME = "MentalHealthCheckInDB";
const DB_VERSION = 1;
const STORE_NAME = "browsingData";

export interface BrowsingData {
  id: string;
  date: string;
  categories: Record<string, number>;
}

export async function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject("Failed to open database");
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
  });
}

export async function saveBrowsingData(data: BrowsingData) {
  const db = await openDatabase();
  console.log(db);
  const transaction = db.transaction(STORE_NAME, "readwrite");
  console.log(data);
  transaction.objectStore(STORE_NAME).put(data);
}