import type { ResearchSession, TaskRun, TrackedEvent } from "./types";
import { isScenarioGateTarget, scenarioVerdictForEvent } from "./scenario-progress";

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
  scenarioErrorCount: number;
  correctTapCount: number;
  recoveryCount: number;
  infoTapCount: number;
  firstMeaningfulAction: string | null;
  lastAction: string | null;
  lastScreen: string;
  sequence: string[];
}

export function isDemoMissclick(event: TrackedEvent) {
  return (event.type === "action" && event.action === "demo.unavailable")
    || (event.type === "tap" && (event.action ?? event.target ?? "").includes("unavailable") && event.action !== "demo.unavailable.toast.dismiss");
}

function countDemoMissclicks(events: TrackedEvent[], verdictFor: (event: TrackedEvent) => ReturnType<typeof scenarioVerdictForEvent>) {
  const informational = events.filter((event) => verdictFor(event) === "info");
  const explicit = events.filter((event) => {
    if (event.type !== "action" || event.action !== "demo.unavailable") return false;
    const recordedTime = Number(event.metadata.clientTimeMs) || new Date(event.timestamp).getTime();
    return !informational.some((tap) => {
      const tapTime = Number(tap.metadata.clientTimeMs) || new Date(tap.timestamp).getTime();
      return tap.screen === event.screen && tap.target === event.target && Math.abs(recordedTime - tapTime) < 500;
    });
  });
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

export function calculateSessionInteractionMetrics(session: ResearchSession, events: TrackedEvent[], nowMs = Date.now(), taskRuns: TaskRun[] = []): SessionInteractionMetrics {
  const taskCodeByRun = new Map(taskRuns.map((run) => [run.id, run.taskCode]));
  const verdictFor = (event: TrackedEvent) => scenarioVerdictForEvent(event, event.taskRunId ? taskCodeByRun.get(event.taskRunId) : undefined);
  const scenarioEvents = events.filter((event) => !(event.type === "tap" && isScenarioGateTarget(event.target ?? event.action)));
  const meaningful = scenarioEvents.filter((event) => meaningfulTypes.has(event.type));
  const screens = events.flatMap((event) => event.screen ? [event.screen] : []);
  const last = events.at(-1) ?? null;
  const startedAt = session.startedAt ? new Date(session.startedAt).getTime() : new Date(session.createdAt).getTime();
  const lastObservedAt = session.endedAt ? new Date(session.endedAt).getTime() : last ? Math.max(new Date(last.timestamp).getTime(), nowMs) : nowMs;
  const missclickCount = countDemoMissclicks(events, verdictFor);
  const scenarioErrorCount = scenarioEvents.filter((event) => verdictFor(event) === "error").length;
  const correctTapCount = scenarioEvents.filter((event) => verdictFor(event) === "correct").length;
  const recoveryCount = scenarioEvents.filter((event) => verdictFor(event) === "recovery").length;
  const infoTapCount = scenarioEvents.filter((event) => verdictFor(event) === "info").length;
  const erroneousTaps = scenarioEvents.filter((event) => verdictFor(event) === "error");
  const duplicateDemoCount = events.filter((event) => event.type === "action" && event.action === "demo.unavailable" && erroneousTaps.some((tap) => {
    const actionTime = Number(event.metadata.clientTimeMs) || new Date(event.timestamp).getTime();
    const tapTime = Number(tap.metadata.clientTimeMs) || new Date(tap.timestamp).getTime();
    return tap.screen === event.screen && tap.target === event.target && Math.abs(tapTime - actionTime) < 500;
  })).length;
  const duplicateLegacyCount = erroneousTaps.filter((tap) => isDemoMissclick(tap) && !events.some((event) => {
    if (event.type !== "action" || event.action !== "demo.unavailable") return false;
    const actionTime = Number(event.metadata.clientTimeMs) || new Date(event.timestamp).getTime();
    const tapTime = Number(tap.metadata.clientTimeMs) || new Date(tap.timestamp).getTime();
    return tap.screen === event.screen && tap.target === event.target && Math.abs(tapTime - actionTime) < 500;
  })).length;
  return {
    durationMs: Math.max(0, lastObservedAt - startedAt),
    eventCount: events.length,
    tapCount: scenarioEvents.filter((event) => event.type === "tap").length,
    meaningfulSteps: meaningful.length,
    screenViewCount: events.filter((event) => event.type === "screen_view").length,
    uniqueScreens: new Set(screens).size,
    navigationCount: events.filter((event) => event.type === "navigation").length,
    productStateChanges: events.filter((event) => event.type === "product_state_change").length,
    demoFeedbackCount: missclickCount,
    missclickCount: missclickCount + scenarioErrorCount - duplicateDemoCount - duplicateLegacyCount,
    scenarioErrorCount,
    correctTapCount,
    recoveryCount,
    infoTapCount,
    firstMeaningfulAction: meaningful[0]?.action ?? meaningful[0]?.target ?? null,
    lastAction: last?.action ?? last?.target ?? last?.type ?? null,
    lastScreen: [...screens].at(-1) ?? "/",
    sequence: scenarioEvents.filter((event) => event.type === "screen_view" || meaningfulTypes.has(event.type)).map((event) => [event.type, event.screen, event.action ?? event.target].filter(Boolean).join(":")),
  };
}
