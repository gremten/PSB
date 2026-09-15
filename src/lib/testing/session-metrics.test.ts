import { describe, expect, it } from "vitest";
import { calculateSessionInteractionMetrics } from "./session-metrics";
import type { ResearchSession, TrackedEvent } from "./types";

const session: ResearchSession = {
  id: "session-1", participantCode: "P-01", variant: "disconnected", createdAt: "2026-01-01T00:00:00.000Z",
  startedAt: "2026-01-01T00:00:00.000Z", endedAt: null, buildId: "test",
};
function event(id: number, type: string, action: string, target: string | null, time: number): TrackedEvent {
  return { id, sessionId: session.id, taskRunId: null, timestamp: new Date(time).toISOString(), type, screen: "/account", action, target, metadata: { clientTimeMs: time } };
}

describe("moderator missclick metric", () => {
  it("counts unavailable attempts even when the control ID has no unavailable suffix", () => {
    const time = Date.parse("2026-01-01T00:00:01.000Z");
    const events = [event(1, "tap", "account.topup.open", "account.topup.open", time), event(2, "action", "demo.unavailable", "account.topup.open", time + 10)];
    const metrics = calculateSessionInteractionMetrics(session, events, time + 100);
    expect(metrics.missclickCount).toBe(1);
    expect(metrics.demoFeedbackCount).toBe(1);
  });

  it("retains legacy unavailable taps without double-counting new paired actions", () => {
    const time = Date.parse("2026-01-01T00:00:01.000Z");
    const events = [event(1, "tap", "tab.chat.unavailable", "tab.chat.unavailable", time), event(2, "action", "demo.unavailable", "tab.chat.unavailable", time + 10), event(3, "tap", "tab.payment.unavailable", "tab.payment.unavailable", time + 1000)];
    expect(calculateSessionInteractionMetrics(session, events, time + 1100).missclickCount).toBe(2);
  });

  it("counts a scenario error and its demo toast as one missclick", () => {
    const time = Date.parse("2026-01-01T00:00:01.000Z");
    const wrong = event(1, "tap", "account.topup.open", "account.topup.open", time);
    wrong.metadata.scenarioVerdict = "error";
    const recovery = event(3, "tap", "navigation.back", "navigation.back", time + 500);
    recovery.metadata.scenarioVerdict = "recovery";
    const metrics = calculateSessionInteractionMetrics(session, [wrong, event(2, "action", "demo.unavailable", "account.topup.open", time + 10), recovery], time + 700);
    expect(metrics.missclickCount).toBe(1);
    expect(metrics.scenarioErrorCount).toBe(1);
    expect(metrics.recoveryCount).toBe(1);
  });

  it("does not count a raced scenario Start tap as a click or error", () => {
    const time = Date.parse("2026-01-01T00:00:01.000Z");
    const start = event(2, "tap", "participant.scenario.start", "participant.scenario.start", time);
    start.metadata.scenarioVerdict = "error";
    const metrics = calculateSessionInteractionMetrics(session, [start], time + 100);
    expect(metrics.tapCount).toBe(0);
    expect(metrics.scenarioErrorCount).toBe(0);
    expect(metrics.missclickCount).toBe(0);
  });

  it("counts category help as exploration, not a missclick, including its demo feedback", () => {
    const time = Date.parse("2026-01-01T00:00:01.000Z");
    const help = event(1, "tap", "cashback.category.fuel.faq.open", "cashback.category.fuel.faq.open", time);
    help.metadata.scenarioVerdict = "info";
    const feedback = event(2, "action", "demo.unavailable", "cashback.category.fuel.faq.open", time + 10);
    const metrics = calculateSessionInteractionMetrics(session, [help, feedback], time + 100);
    expect(metrics.infoTapCount).toBe(1);
    expect(metrics.scenarioErrorCount).toBe(0);
    expect(metrics.missclickCount).toBe(0);
    expect(metrics.demoFeedbackCount).toBe(0);
  });
});
