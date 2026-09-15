import type { TrackedEvent } from "./types";

const MAX_CLIENT_CLOCK_DRIFT_MS = 300_000;

export function trackedEventTime(event: TrackedEvent) {
  const serverTime = new Date(event.timestamp).getTime();
  const clientTime = event.metadata.clientTimeMs;
  return typeof clientTime === "number"
    && Number.isFinite(clientTime)
    && (!Number.isFinite(serverTime) || Math.abs(clientTime - serverTime) < MAX_CLIENT_CLOCK_DRIFT_MS)
    ? clientTime
    : serverTime;
}

export function sortTrackedEvents(events: TrackedEvent[]) {
  return [...events].sort((a, b) => trackedEventTime(a) - trackedEventTime(b) || a.id - b.id);
}
