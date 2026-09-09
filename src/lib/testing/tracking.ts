export interface TrackData {
  screen?: string;
  action?: string;
  target?: string;
  metadata?: Record<string, unknown>;
}

export const PARTICIPANT_SESSION_KEY = "psb-participant-session-v1";

export async function track(eventName: string, data: TrackData = {}) {
  if (typeof window === "undefined") return;
  if (new URLSearchParams(window.location.search).has("replay")) return;
  try {
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventName, sessionId: window.sessionStorage.getItem(PARTICIPANT_SESSION_KEY), ...data }),
      keepalive: true,
    });
  } catch {
    // Instrumentation must never block the participant flow.
  }
}
