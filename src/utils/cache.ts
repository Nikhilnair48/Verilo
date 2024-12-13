// Cache object
type TrackingState = {
    sessionId: string | null;
    trackingCategory: string | null;
    trackingDomainId: string | null;
    startTime: number | null;
}
let trackingState: TrackingState = {
    sessionId: null,
    trackingCategory: null,
    trackingDomainId: null,
    startTime: null,
  };
  
  async function updateTrackingState(updates: Partial<typeof trackingState>) {
    Object.assign(trackingState, updates);
    await chrome.storage.local.set(updates);
  }
  
  async function loadTrackingState() {
    const storedState = await chrome.storage.local.get([
      "sessionId",
      "trackingCategory",
      "trackingDomainId",
      "startTime",
    ]);
    Object.assign(trackingState, storedState);
  }
  
  async function getTrackingState<K extends keyof TrackingState>(key: K): Promise<TrackingState[K]> {
    await loadTrackingState();
    return trackingState[key];

  }
  