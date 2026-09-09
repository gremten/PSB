import { describe, expect, it } from "vitest";
import { aggregateTaskMetrics, calculateTaskMetrics } from "./metrics";
import { sanitizeMetadata } from "./metadata";
import type { TaskRun, TrackedEvent } from "./types";

const run: TaskRun = {
  id: "run-1",
  sessionId: "session-1",
  taskCode: "A1",
  startedAt: "2026-01-01T00:00:00.000Z",
  endedAt: "2026-01-01T00:00:10.000Z",
  result: "unaided",
  wasAided: false,
  easeScore: 6,
  easeReason: null,
  moderatorNote: null,
  corruptedReason: null,
};

const events: TrackedEvent[] = [
  { id: 1, sessionId: "session-1", taskRunId: "run-1", timestamp: "", type: "screen_view", screen: "/", action: null, target: null, metadata: {} },
  { id: 2, sessionId: "session-1", taskRunId: "run-1", timestamp: "", type: "tap", screen: "/", action: "home.account.open", target: null, metadata: {} },
  { id: 3, sessionId: "session-1", taskRunId: "run-1", timestamp: "", type: "navigation", screen: "/account", action: "account.open", target: null, metadata: {} },
];

describe("usability metrics", () => {
  it("calculates timing, steps and deviation", () => {
    const metric = calculateTaskMetrics(run, events, {
      code: "A1", set: "A", title: "", prompt: "", startRoute: "/", successCondition: "", goldenStepCount: 1,
    });
    expect(metric.completionTimeMs).toBe(10_000);
    expect(metric.meaningfulSteps).toBe(2);
    expect(metric.deviationFromGoldenPath).toBe(1);
    expect(metric.firstMeaningfulAction).toBe("home.account.open");
  });

  it("excludes corrupted runs from aggregates", () => {
    const base = calculateTaskMetrics(run, events, null);
    const aggregate = aggregateTaskMetrics([base, { ...base, result: "corrupted" }])[0];
    expect(aggregate.includedCount).toBe(1);
    expect(aggregate.corruptedCount).toBe(1);
    expect(aggregate.unaidedCompletionRate).toBe(1);
  });
});

describe("analytics privacy", () => {
  it("drops sensitive metadata values", () => {
    expect(sanitizeMetadata({ value: "secret", clipboard: "secret", categoryCount: 3 })).toEqual({ categoryCount: 3 });
  });
});
