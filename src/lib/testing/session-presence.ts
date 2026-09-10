// A short reload/navigation can reconnect; a closed/crashed/background client expires.
export const SESSION_HEARTBEAT_MS = 15_000;
export const SESSION_TIMEOUT_MS = 90_000;

export function presenceCutoff(nowMs = Date.now()) {
  return new Date(nowMs - SESSION_TIMEOUT_MS).toISOString();
}
