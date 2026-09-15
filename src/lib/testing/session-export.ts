import { getTask, interactiveScenarios, type InteractiveScenarioCode } from "@/config/test-scenarios";
import { calculateTaskMetrics } from "./metrics";
import { isScenarioGateTarget, scenarioProgress, scenarioVerdictForEvent, type ScenarioVerdict } from "./scenario-progress";
import type { SessionSnapshot, TaskRun, TrackedEvent } from "./types";

export const STARL_EXPORT_SCHEMA_VERSION = "psb.usability.starl.v2";

const expectedPaths: Record<InteractiveScenarioCode, Array<{ step: number; purpose: string; acceptedSemanticIds: string[] }>> = {
  CARD_COPY: [
    { step: 1, purpose: "Открыть текущий счёт", acceptedSemanticIds: ["home.account.open"] },
    { step: 2, purpose: "Открыть карту счёта", acceptedSemanticIds: ["account.card.primary.open", "account.card.strong.open", "account.card.salary.open"] },
    { step: 3, purpose: "Раскрыть данные карты", acceptedSemanticIds: ["card.night.flip", "card.orange.flip", "card.salary.flip"] },
    { step: 4, purpose: "Скопировать поле карты", acceptedSemanticIds: ["card.*.number.copy", "card.*.expiry.copy", "card.*.cvv.copy"] },
    { step: 5, purpose: "Дождаться закрытия подтверждения", acceptedSemanticIds: ["card.copy.toast.closed", "card.copy.toast.dismiss"] },
  ],
  CASHBACK_CONNECT: [
    { step: 1, purpose: "Открыть кешбэк", acceptedSemanticIds: ["home.cashback.open", "cashback.tab.open"] },
    { step: 2, purpose: "Начать подключение", acceptedSemanticIds: ["cashback.connect.start"] },
    { step: 3, purpose: "Выбрать три категории", acceptedSemanticIds: ["cashback.category.*.toggle"] },
    { step: 4, purpose: "Подтвердить выбор", acceptedSemanticIds: ["cashback.categories.confirm"] },
    { step: 5, purpose: "Закрыть успешное подтверждение", acceptedSemanticIds: ["cashback.success.close", "cashback.success.drag", "cashback.success.dismissed"] },
  ],
  CASHBACK_NEXT: [
    { step: 1, purpose: "Открыть кешбэк", acceptedSemanticIds: ["home.cashback.open", "cashback.tab.open"] },
    { step: 2, purpose: "Открыть выбор на октябрь", acceptedSemanticIds: ["cashback.next_month.categories.open"] },
    { step: 3, purpose: "Выбрать три категории", acceptedSemanticIds: ["cashback.category.*.toggle"] },
    { step: 4, purpose: "Подтвердить выбор", acceptedSemanticIds: ["cashback.categories.confirm"] },
    { step: 5, purpose: "Закрыть успешное подтверждение", acceptedSemanticIds: ["cashback.next_month.success.close", "cashback.next_month.success.drag", "cashback.next_month.success.dismissed"] },
  ],
};

function elapsedMs(timestamp: string, origin: string | null | undefined) {
  if (!origin) return null;
  const value = new Date(timestamp).getTime() - new Date(origin).getTime();
  return Number.isFinite(value) ? Math.max(0, value) : null;
}

function semanticId(event: TrackedEvent) {
  return event.target ?? event.action;
}

function journeySegment(verdicts: Array<ScenarioVerdict | null>, run: TaskRun) {
  if (run.result === "corrupted") return "corrupted";
  if (!run.endedAt || !run.result) return "incomplete";
  if (run.result === "failed") return "failed";
  if (verdicts.includes("recovery")) return "detour_recovered";
  if (verdicts.includes("error")) return "completed_with_errors";
  if (verdicts.includes("info")) return "completed_with_exploration";
  return "ideal";
}

function buildLearningSignals(events: TrackedEvent[], verdicts: Array<ScenarioVerdict | null>, taskCode: string) {
  const ids = events.map(semanticId);
  const firstCashbackEntry = ids.find((id) => id === "home.cashback.open" || id === "cashback.tab.open");
  return [
    verdicts.includes("error") ? { code: "errors_observed", evidenceEventIds: events.filter((event) => scenarioVerdictForEvent(event, taskCode) === "error").map((event) => event.id) } : null,
    verdicts.includes("recovery") ? { code: "recovered_after_detour", evidenceEventIds: events.filter((event) => scenarioVerdictForEvent(event, taskCode) === "recovery").map((event) => event.id) } : null,
    verdicts.includes("info") ? { code: "optional_exploration", evidenceEventIds: events.filter((event) => scenarioVerdictForEvent(event, taskCode) === "info").map((event) => event.id) } : null,
    firstCashbackEntry === "home.cashback.open" ? { code: "discovered_cashback_via_balance_badge", evidenceEventIds: events.filter((event) => semanticId(event) === firstCashbackEntry).slice(0, 1).map((event) => event.id) } : null,
    firstCashbackEntry === "cashback.tab.open" ? { code: "entered_cashback_via_tabbar", evidenceEventIds: events.filter((event) => semanticId(event) === firstCashbackEntry).slice(0, 1).map((event) => event.id) } : null,
    ids.some((id) => /^cashback\.category\.[^.]+\.faq\.open$/.test(id ?? "")) ? { code: "opened_category_explanation", evidenceEventIds: events.filter((event) => /^cashback\.category\.[^.]+\.faq\.open$/.test(semanticId(event) ?? "")).map((event) => event.id) } : null,
    ids.includes("cashback.period.year") ? { code: "explored_annual_chart", evidenceEventIds: events.filter((event) => semanticId(event) === "cashback.period.year").map((event) => event.id) } : null,
  ].filter((signal): signal is { code: string; evidenceEventIds: number[] } => signal !== null);
}

export function buildStarlSessionExport(snapshot: SessionSnapshot, generatedAt = new Date().toISOString()) {
  const taskRunById = new Map(snapshot.taskRuns.map((run) => [run.id, run]));
  const starlRecords = snapshot.taskRuns.map((run) => {
    const task = getTask(run.taskCode);
    const runEvents = snapshot.events.filter((event) => event.taskRunId === run.id && !(event.type === "tap" && isScenarioGateTarget(semanticId(event))));
    const metrics = calculateTaskMetrics(run, runEvents, task);
    const verdicts = runEvents.map((event) => scenarioVerdictForEvent(event, run.taskCode));
    const interactive = interactiveScenarios.find((scenario) => scenario.code === run.taskCode);
    const progress = interactive ? scenarioProgress(interactive.code, runEvents) : null;
    return {
      recordId: run.id,
      scenarioCode: run.taskCode,
      situation: {
        participantCode: snapshot.session.participantCode,
        productVariantAtSessionStart: snapshot.session.variant,
        buildId: snapshot.session.buildId,
        scenarioStartedAt: run.startedAt,
        observedStartScreen: runEvents.find((event) => event.type === "screen_view")?.screen ?? task?.startRoute ?? null,
      },
      task: {
        title: task?.title ?? run.taskCode,
        participantPrompt: task?.prompt ?? null,
        startRoute: task?.startRoute ?? null,
        successCondition: task && "successCondition" in task ? task.successCondition : null,
        goldenTapCount: task?.goldenStepCount ?? null,
        expectedPath: interactive ? expectedPaths[interactive.code] : null,
      },
      action: {
        counts: {
          meaningfulSteps: metrics.meaningfulSteps,
          correctTaps: metrics.correctTaps,
          errorTaps: metrics.wrongTaps,
          recoveryTaps: metrics.recoveryTaps,
          informationalTaps: metrics.infoTaps,
        },
        firstMeaningfulAction: metrics.firstMeaningfulAction,
        chronologicalEvidence: runEvents.map((event, index) => ({
          sequence: index + 1,
          eventId: event.id,
          timestamp: event.timestamp,
          elapsedFromScenarioStartMs: elapsedMs(event.timestamp, run.startedAt),
          type: event.type,
          screen: event.screen,
          semanticId: semanticId(event),
          verdict: scenarioVerdictForEvent(event, run.taskCode),
          metadata: event.metadata,
        })),
      },
      result: {
        taskResult: run.result,
        completed: Boolean(run.endedAt && (run.result === "unaided" || run.result === "aided")),
        scenarioEndedAt: run.endedAt,
        completionTimeMs: metrics.completionTimeMs,
        wasAided: run.wasAided,
        easeScore: run.easeScore,
        deviationFromGoldenTapCount: metrics.deviationFromGoldenPath,
        journeySegment: journeySegment(verdicts, run),
        observedScenarioStage: progress?.stage ?? null,
        completionSupportedByEventSequence: progress?.completed ?? null,
        moderatorNote: run.moderatorNote,
        corruptedReason: run.corruptedReason,
      },
      learning: {
        status: "evidence_only_requires_interpretation",
        signals: buildLearningSignals(runEvents, verdicts, run.taskCode),
        instruction: "Сформулируйте вывод отдельно от фактов; укажите evidenceEventIds и пометьте каждое обобщение как observation, inference или recommendation.",
      },
    };
  });

  const coverage = interactiveScenarios.map((scenario) => {
    const runs = starlRecords.filter((record) => record.scenarioCode === scenario.code);
    return {
      scenarioCode: scenario.code,
      title: scenario.title,
      startedRuns: runs.length,
      completedRuns: runs.filter((record) => record.result.completed).length,
      status: runs.some((record) => record.result.completed) ? "completed" : runs.length ? "incomplete" : "not_started",
    };
  });

  return {
    schemaVersion: STARL_EXPORT_SCHEMA_VERSION,
    exportKind: "single_usability_session",
    generatedAt,
    methodology: {
      name: "STARL",
      dimensions: ["situation", "task", "action", "result", "learning"],
      evidencePolicy: "Situation–Result are derived from durable session data. Learning contains evidence signals, not an invented conclusion.",
    },
    analysisContract: {
      timestampFormat: "ISO-8601 UTC",
      durationUnit: "milliseconds",
      timeBasis: "task_run_only",
      verdicts: {
        correct: "expected scenario tap",
        error: "tap unrelated to the active scenario",
        recovery: "return from a wrong section",
        info: "allowed exploration, not an error",
        null: "non-tap event or unclassified legacy event",
      },
      privacy: "participantCode is the study pseudonym. Event metadata is sanitized at ingestion; banking values, clipboard contents and other personal data are not exported.",
      automationGuidance: "Use only scenarioStartedAt, scenarioEndedAt, completionTimeMs and elapsedFromScenarioStartMs for timing analysis. Session timestamps are audit context only: never calculate or aggregate total session duration because waiting and moderator discussion are outside the task. Aggregate only records with result.completed=true; keep corrupted and incomplete records visible but outside success-rate denominators; cite eventId values for qualitative claims.",
    },
    coverage,
    starlRecords,
    session: snapshot.session,
    taskRuns: snapshot.taskRuns,
    events: snapshot.events.map((event) => ({
      ...event,
      elapsedFromScenarioStartMs: elapsedMs(event.timestamp, taskRunById.get(event.taskRunId ?? "")?.startedAt),
      semanticId: semanticId(event),
      scenarioVerdict: scenarioVerdictForEvent(event, taskRunById.get(event.taskRunId ?? "")?.taskCode),
    })),
  };
}

function csvCell(value: unknown) {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export function buildSessionEventsCsv(snapshot: SessionSnapshot) {
  const runs = new Map(snapshot.taskRuns.map((run) => [run.id, run]));
  const rows = [
    ["id", "timestamp", "type", "screen", "action", "target", "taskRunId", "metadata", "schemaVersion", "participantCode", "variant", "buildId", "taskCode", "taskResult", "elapsedTaskMs", "semanticId", "scenarioVerdict"],
    ...snapshot.events.map((event) => {
      const run = event.taskRunId ? runs.get(event.taskRunId) : undefined;
      return [event.id, event.timestamp, event.type, event.screen, event.action, event.target, event.taskRunId, event.metadata, STARL_EXPORT_SCHEMA_VERSION, snapshot.session.participantCode, snapshot.session.variant, snapshot.session.buildId, run?.taskCode, run?.result, elapsedMs(event.timestamp, run?.startedAt), semanticId(event), scenarioVerdictForEvent(event, run?.taskCode)];
    }),
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}
