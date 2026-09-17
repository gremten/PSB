import { completionScenarioForAction } from "./scenario-progress";

export interface TrackData {
  screen?: string;
  action?: string;
  target?: string;
  metadata?: Record<string, unknown>;
}

export const PARTICIPANT_SESSION_KEY = "psb-participant-session-v1";
export const PARTICIPANT_NAME_KEY = "psb-participant-name-v1";
export const PARTICIPANT_SESSION_CHANGED = "psb:participant-session-changed";
export const PARTICIPANT_ACTIVE_SCENARIO_KEY = "psb-participant-active-scenario-v1";
export const PARTICIPANT_COMPLETION_LOCK_KEY = "psb-participant-completion-lock-v1";
export const PARTICIPANT_SCENARIO_COMPLETING = "psb:participant-scenario-completing";
export const PARTICIPANT_SCENARIO_COMPLETED = "psb:participant-scenario-completed";
export const PARTICIPANT_SCENARIO_COMPLETION_FAILED = "psb:participant-scenario-completion-failed";

export async function track(eventName: string, data: TrackData = {}) {
  if (typeof window === "undefined") return;
  if (new URLSearchParams(window.location.search).has("replay")) return;
  const sessionId = window.sessionStorage.getItem(PARTICIPANT_SESSION_KEY);
  if (!sessionId) return;
  if (window.sessionStorage.getItem(PARTICIPANT_COMPLETION_LOCK_KEY)) return;
  const scenarioCode = window.sessionStorage.getItem(PARTICIPANT_ACTIVE_SCENARIO_KEY);
  const completingScenario = completionScenarioForAction(data.action);
  const isTerminalAction = Boolean(completingScenario
    && window.sessionStorage.getItem(PARTICIPANT_ACTIVE_SCENARIO_KEY) === completingScenario);
  if (isTerminalAction) {
    window.sessionStorage.setItem(PARTICIPANT_COMPLETION_LOCK_KEY, completingScenario ?? "");
    window.dispatchEvent(new CustomEvent(PARTICIPANT_SCENARIO_COMPLETING, { detail: { scenario: completingScenario } }));
  }
  try {
    const response = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventName, sessionId, scenarioCode, ...data, metadata: { ...data.metadata, clientTimeMs: performance.timeOrigin + performance.now() } }),
      keepalive: true,
    });
    if (!isTerminalAction) return;
    const payload = await response.json().catch(() => null) as { scenarioCompleted?: boolean; status?: unknown } | null;
    if (!response.ok || !payload?.scenarioCompleted || !payload.status) throw new Error("Scenario completion was not confirmed");
    window.dispatchEvent(new CustomEvent(PARTICIPANT_SCENARIO_COMPLETED, { detail: { ...(payload.status as object), completedScenario: completingScenario } }));
  } catch {
    // Instrumentation must never block the participant flow.
    if (isTerminalAction) {
      window.sessionStorage.removeItem(PARTICIPANT_COMPLETION_LOCK_KEY);
      window.dispatchEvent(new Event(PARTICIPANT_SCENARIO_COMPLETION_FAILED));
    }
  }
}
