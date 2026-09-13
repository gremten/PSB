import type { ResearchSession, TrackedEvent } from "./types";

const meaningfulTypes = new Set(["tap", "action", "navigation", "product_state_change"]);

export interface SessionInteractionMetrics {
  durationMs: number;
  eventCount: number;
  tapCount: number;
  meaningfulSteps: number;
  screenViewCount: number;
  uniqueScreens: number;
  navigationCount: number;
  productStateChanges: number;
  demoFeedbackCount: number;
  missclickCount: number;
  firstMeaningfulAction: string | null;
  lastAction: string | null;
  lastScreen: string;
  sequence: string[];
}

export function isDemoMissclick(event: TrackedEvent) {
  return (event.type === "action" && event.action === "demo.unavailable")
    || (event.type === "tap" && (event.action ?? event.target ?? "").includes("unavailable") && event.action !== "demo.unavailable.toast.dismiss");
}

function countDemoMissclicks(events: TrackedEvent[]) {
  const explicit = events.filter((event) => event.type === "action" && event.action === "demo.unavailable");
  const legacy = events.filter((event) => {
    if (event.type !== "tap" || !isDemoMissclick(event)) return false;
    const time = Number(event.metadata.clientTimeMs) || new Date(event.timestamp).getTime();
    return !explicit.some((recorded) => {
      const recordedTime = Number(recorded.metadata.clientTimeMs) || new Date(recorded.timestamp).getTime();
      return recorded.screen === event.screen && recorded.target === event.target && Math.abs(recordedTime - time) < 500;
    });
  });
  return explicit.length + legacy.length;
}

export function calculateSessionInteractionMetrics(session: ResearchSession, events: TrackedEvent[], nowMs = Date.now()): SessionInteractionMetrics {
  const meaningful = events.filter((event) => meaningfulTypes.has(event.type));
  const screens = events.flatMap((event) => event.screen ? [event.screen] : []);
  const last = events.at(-1) ?? null;
  const startedAt = session.startedAt ? new Date(session.startedAt).getTime() : new Date(session.createdAt).getTime();
  const lastObservedAt = session.endedAt ? new Date(session.endedAt).getTime() : last ? Math.max(new Date(last.timestamp).getTime(), nowMs) : nowMs;
  const missclickCount = countDemoMissclicks(events);
  return {
    durationMs: Math.max(0, lastObservedAt - startedAt),
    eventCount: events.length,
    tapCount: events.filter((event) => event.type === "tap").length,
    meaningfulSteps: meaningful.length,
    screenViewCount: events.filter((event) => event.type === "screen_view").length,
    uniqueScreens: new Set(screens).size,
    navigationCount: events.filter((event) => event.type === "navigation").length,
    productStateChanges: events.filter((event) => event.type === "product_state_change").length,
    demoFeedbackCount: missclickCount,
    missclickCount,
    firstMeaningfulAction: meaningful[0]?.action ?? meaningful[0]?.target ?? null,
    lastAction: last?.action ?? last?.target ?? last?.type ?? null,
    lastScreen: [...screens].at(-1) ?? "/",
    sequence: events.filter((event) => event.type === "screen_view" || meaningfulTypes.has(event.type)).map((event) => [event.type, event.screen, event.action ?? event.target].filter(Boolean).join(":")),
  };
}
