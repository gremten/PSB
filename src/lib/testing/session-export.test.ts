import { describe, expect, it } from "vitest";
import { buildSessionEventsCsv, buildSessionMarkdownReport, buildStarlSessionExport, STARL_EXPORT_SCHEMA_VERSION } from "./session-export";
import type { SessionSnapshot, TrackedEvent } from "./types";

const event = (id: number, type: string, target: string, verdict?: string): TrackedEvent => ({
  id,
  sessionId: "session-1",
  taskRunId: "run-1",
  timestamp: new Date(Date.UTC(2026, 8, 15, 10, 0, id)).toISOString(),
  type,
  screen: target.includes("category") ? "/cashback/categories" : "/cashback",
  action: target,
  target,
  metadata: verdict ? { scenarioVerdict: verdict } : {},
});

const snapshot: SessionSnapshot = {
  session: {
    id: "session-1",
    participantCode: "P-01",
    variant: "disconnected",
    createdAt: "2026-09-15T09:59:00.000Z",
    startedAt: "2026-09-15T10:00:00.000Z",
    endedAt: "2026-09-15T10:00:08.000Z",
    endReason: "all_scenarios_completed",
    buildId: "test-build",
  },
  taskRuns: [{
    id: "run-1",
    sessionId: "session-1",
    taskCode: "CASHBACK_CONNECT",
    startedAt: "2026-09-15T10:00:00.000Z",
    endedAt: "2026-09-15T10:00:08.000Z",
    result: "unaided",
    wasAided: false,
    easeScore: null,
    easeReason: null,
    moderatorNote: null,
    corruptedReason: null,
  }],
  events: [
    event(1, "tap", "home.cashback.open", "correct"),
    event(2, "tap", "cashback.connect.start", "correct"),
    event(3, "tap", "cashback.category.fuel.faq.open", "info"),
    event(4, "tap", "cashback.category.all.toggle", "correct"),
    event(5, "tap", "cashback.category.flights.toggle", "correct"),
    event(6, "tap", "cashback.category.taxi.toggle", "correct"),
    { ...event(7, "tap", "cashback.categories.confirm", "correct"), metadata: { scenarioVerdict: "correct", selectedCount: 3 } },
    event(8, "tap", "cashback.success.close", "correct"),
  ],
};

describe("STARL session export", () => {
  it("keeps raw evidence and adds a deterministic STARL record", () => {
    const result = buildStarlSessionExport(snapshot, "2026-09-15T11:00:00.000Z");
    expect(result.schemaVersion).toBe(STARL_EXPORT_SCHEMA_VERSION);
    expect(result.events).toHaveLength(snapshot.events.length);
    expect(result.coverage.find((item) => item.scenarioCode === "CASHBACK_CONNECT")).toMatchObject({ status: "completed", completedRuns: 1 });
    expect(result.starlRecords[0]).toMatchObject({
      scenarioCode: "CASHBACK_CONNECT",
      task: { goldenTapCount: 7 },
      action: { counts: { correctTaps: 7, errorTaps: 0, informationalTaps: 1 } },
      result: { completed: true, journeySegment: "completed_with_exploration", completionSupportedByEventSequence: true },
      learning: { status: "evidence_only_requires_interpretation" },
    });
    expect(result.analysisContract.timeBasis).toBe("task_run_only");
    expect(result.analysisPrompt.text).toContain("просмотр и копирование данных карты");
    expect(result.analysisPrompt.text).toContain("не вычисляй общее время сессии");
    expect(result.starlRecords[0].situation).not.toHaveProperty("sessionStartedAt");
    expect(result.events[0]).not.toHaveProperty("elapsedFromSessionStartMs");
    expect(result.events[0].elapsedFromScenarioStartMs).toBe(1_000);
    expect(result.starlRecords[0].learning.signals).toContainEqual({ code: "opened_category_explanation", evidenceEventIds: [3] });
    expect(result.starlRecords[0].action.firstInteraction).toMatchObject({
      eventId: 1,
      semanticLabel: "открыл кешбек через бейдж рядом с общей суммой",
      interpretation: "ожидаемый шаг сценария",
    });
    expect(result.starlRecords[0].action.interactionNarrative[2].narrative).toContain("исследование интерфейса — не ошибка");
  });

  it("adds stable automation columns to CSV without removing legacy columns", () => {
    const csv = buildSessionEventsCsv(snapshot);
    expect(csv).toContain('"id","timestamp","type","screen","action","target","taskRunId","metadata"');
    expect(csv).toContain(`"${STARL_EXPORT_SCHEMA_VERSION}"`);
    expect(csv).toContain('"CASHBACK_CONNECT","unaided"');
    expect(csv).toContain('"home.cashback.open","открыл кешбек через бейдж рядом с общей суммой","correct"');
    expect(csv).toContain('"elapsedTaskMs"');
    expect(csv).toContain('"semanticLabel"');
    expect(csv).toContain('"исследование интерфейса — не ошибка"');
    expect(csv).not.toContain('"elapsedSessionMs"');
  });

  it("builds a human-readable Russian Markdown report", () => {
    const markdown = buildSessionMarkdownReport(snapshot, "2026-09-15T11:00:00.000Z");
    expect(markdown).toContain("# Отчёт о юзабилити-тесте");
    expect(markdown).toContain("Участник: **P-01**");
    expect(markdown).toContain("## Сценарий 1.");
    expect(markdown).toContain("открыл кешбек через бейдж рядом с общей суммой");
    expect(markdown).toContain("**Изучение.** [Событие №3]");
    expect(markdown).toContain("Общее время сессии намеренно не рассчитывается");
    expect(markdown).toContain("## Интерпретация результатов участника");
    expect(markdown).toContain("Завершено **1 из 1** начатых сценариев — **100%**");
    expect(markdown).toContain("С допустимым изучением: **1 из 1** — **100%**");
    expect(markdown).toContain("Вход в кешбек через бейдж у общей суммы: **1 из 1** запусков — **100%**");
    expect(markdown).toContain("### Самые частые действия, влияющие на прохождение");
    expect(markdown).toContain("## Инструкция для анализа нейросетью");
    expect(markdown).not.toContain('"scenarioCode"');
  });
});
