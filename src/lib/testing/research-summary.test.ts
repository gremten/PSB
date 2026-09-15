import { describe, expect, it } from "vitest";
import { calculateResearchSummary } from "./research-summary";
import type { ResearchSession, TaskRun, TrackedEvent } from "./types";

const session = (id: string): ResearchSession => ({ id, participantCode: id, variant: "disconnected", createdAt: "2026-01-01T00:00:00.000Z", startedAt: "2026-01-01T00:00:01.000Z", endedAt: null, buildId: "test" });
const run = (id: string, sessionId: string, taskCode: string, result: TaskRun["result"] = "unaided"): TaskRun => ({ id, sessionId, taskCode, startedAt: "2026-01-01T00:00:01.000Z", endedAt: result ? "2026-01-01T00:00:10.000Z" : null, result, wasAided: false, easeScore: null, easeReason: null, moderatorNote: null, corruptedReason: null });
const tap = (id: number, sessionId: string, taskRunId: string, target: string, verdict: string): TrackedEvent => ({ id, sessionId, taskRunId, timestamp: new Date(id * 1000).toISOString(), type: "tap", screen: "/cashback", action: target, target, metadata: { scenarioVerdict: verdict } });

describe("case-study research summary", () => {
  it("counts participants and preserves meaningful denominators", () => {
    const sessions = [session("s1"), session("s2"), session("s3")];
    const runs = [
      { ...run("r1", "s1", "CASHBACK_CONNECT"), easeScore: 6 }, run("r2", "s1", "CARD_COPY"), run("r3", "s1", "CASHBACK_NEXT"),
      run("r4", "s2", "CASHBACK_CONNECT", null), run("r5", "s3", "CARD_COPY"),
    ];
    const events = [
      tap(1, "s1", "r1", "home.cashback.open", "correct"),
      tap(2, "s2", "r4", "cashback.tab.open", "correct"),
      tap(3, "s1", "r1", "cashback.category.fuel.faq.open", "error"),
      tap(4, "s2", "r4", "cashback.period.year", "error"),
      tap(5, "s1", "r2", "card.block.open", "error"),
      tap(6, "s1", "r3", "navigation.back", "recovery"),
    ];
    const summary = calculateResearchSummary(sessions, runs, events);
    const byId = Object.fromEntries(summary.metrics.map((item) => [item.id, item]));
    expect(byId.cashback_badge_first).toMatchObject({ count: 1, total: 2, percent: 50 });
    expect(byId.cashback_tab_first).toMatchObject({ count: 1, total: 2, percent: 50 });
    expect(byId.all_scenarios_completed).toMatchObject({ count: 1, total: 3, percent: 33 });
    expect(byId.category_help.count).toBe(1);
    expect(byId.year_chart.count).toBe(1);
    expect(byId.without_errors.count).toBe(2);
    expect(Object.fromEntries(summary.journeySegments.map((item) => [item.id, item.percent]))).toEqual({
      journey_ideal: 25,
      journey_explored: 25,
      journey_detour: 25,
      journey_error: 25,
    });
    expect(summary.scenarioMetrics.find((item) => item.code === "CASHBACK_CONNECT")).toMatchObject({
      startedParticipants: 2,
      completedParticipants: 1,
      inProgressParticipants: 1,
      excludedParticipants: 0,
      completionRate: 50,
      completionConfidence95: { lower: 9, upper: 91 },
      firstClickSuccessRate: 100,
      firstClickConfidence95: { lower: 34, upper: 100 },
      seqMedian: 6,
      seqMean: 6,
      seqResponseCount: 1,
      seqPositiveConfidence95: { lower: 21, upper: 100 },
    });
    expect(summary.issueMetrics.find((item) => item.semanticId === "card.block.open")).toMatchObject({
      affectedParticipants: 1,
      startedParticipants: 2,
      prevalencePercent: 50,
      prevalenceConfidence95: { lower: 9, upper: 91 },
      affectedCompletionRate: 100,
      unaffectedCompletionRate: 100,
      completionDifferencePp: 0,
    });
  });
});
