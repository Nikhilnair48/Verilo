import { openDB } from 'idb';

const DB_NAME = "MentalHealthCheckInDB";
const DB_VERSION = 1;
const STORE_NAME = "browsingData";

// Define types for data entries in IndexedDB
export interface BrowsingData {
  id: string;                // Unique identifier: `${date}-${domainId}`
  date: string;              // YYYY-MM-DD (daily aggregation)
  domainId: string;          // Foreign key to DomainInfo
  duration: number;          // Total time spent on this domain on this date (seconds)
  visitCount: number;        // Number of times user switched to this domain within the date
}

export interface DomainInfo {
  domainId: string;          // Unique ID for the domain
  domain: string;            // Domain name (e.g., 'nytimes.com')
  category: string;          // Primary category (e.g., 'News')
  subcategories: string[];   // Array of subcategories
}

// Open database with BrowsingData and DomainInfo tables
export const openDatabase = async () => {
  return await openDB('TrackingDatabase', 1, {
    upgrade(db) {
      const browsingStore = db.createObjectStore('browsingData', { keyPath: 'id' });
      browsingStore.createIndex('date', 'date');
      browsingStore.createIndex('domainId', 'domainId');

      const domainStore = db.createObjectStore('domainInfo', { keyPath: 'domainId' });
      domainStore.createIndex('domain', 'domain');
    },
  });
};

// Add or update domain information
export async function addDomainInfo(domain: string, category: string, subcategories: string[]): Promise<string> {
  const db = await openDatabase();
  const domainId = `${domain}-${category}`;
  const existing = await db.get('domainInfo', domainId);

  if (!existing) {
    await db.put('domainInfo', { domainId, domain, category, subcategories });
  }
  return domainId;
}

// Save browsing data with aggregation
export async function saveBrowsingData({ id, date, domainId, duration, visitCount }: BrowsingData) {
  const db = await openDatabase();
  const existing = await db.get('browsingData', id);

  if (existing) {
    existing.duration += duration;
    existing.visitCount += visitCount;
    await db.put('browsingData', existing);
  } else {
    await db.put('browsingData', { id, date, domainId, duration, visitCount });
  }
}

// Fetch browsing data for reporting
export async function getBrowsingDataByDate(date: string): Promise<BrowsingData[]> {
  const db = await openDatabase();
  return await db.getAllFromIndex('browsingData', 'date', date);
}