import { interactiveScenarios } from "@/config/test-scenarios";
import { calculateTaskMetrics } from "./metrics";
import { scenarioProgress, scenarioVerdictForEvent } from "./scenario-progress";
import type { ResearchSession, TaskRun, TrackedEvent } from "./types";

export interface ResearchSummaryMetric {
  id: string;
  label: string;
  count: number;
  total: number;
  percent: number;
  denominatorLabel: string;
}

export interface ResearchSummary {
  recordedSessions: number;
  journeySegments: ResearchSummaryMetric[];
  metrics: ResearchSummaryMetric[];
  scenarioMetrics: ScenarioResearchMetrics[];
  issueMetrics: ResearchIssueMetric[];
}

export interface ScenarioResearchMetrics {
  code: string;
  title: string;
  startedParticipants: number;
  completedParticipants: number;
  unaidedParticipants: number;
  aidedParticipants: number;
  failedParticipants: number;
  completionRate: number;
  unaidedCompletionRate: number;
  aidedCompletionRate: number;
  failureRate: number;
  errorFreeCompletionRate: number;
  directPathRate: number;
  firstClickSuccessRate: number;
  medianCompletionTimeMs: number | null;
  p75CompletionTimeMs: number | null;
  medianExcessTaps: number | null;
  p75ExcessTaps: number | null;
  seqResponseCount: number;
  seqMedian: number | null;
  seqPositiveRate: number;
  dropoffs: Array<{ stage: number; label: string; count: number; total: number; percent: number }>;
}

export interface ResearchIssueMetric {
  scenarioCode: string;
  scenarioTitle: string;
  semanticId: string;
  label: string;
  affectedParticipants: number;
  startedParticipants: number;
  prevalencePercent: number;
  occurrenceCount: number;
}

function metric(id: string, label: string, count: number, total: number, denominatorLabel: string): ResearchSummaryMetric {
  return { id, label, count, total, percent: total ? Math.round(count / total * 100) : 0, denominatorLabel };
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function percentile(values: number[], value: number) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * value;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return lower === upper ? sorted[lower] : sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

const stageLabels: Record<string, string[]> = {
  CARD_COPY: ["не открыл текущий счёт", "не открыл карту", "не раскрыл данные карты", "не скопировал поле", "не дождался подтверждения копирования"],
  CASHBACK_CONNECT: ["не открыл кешбэк", "не начал подключение", "не подтвердил три категории", "не закрыл подтверждение подключения"],
  CASHBACK_NEXT: ["не открыл кешбэк", "не открыл выбор на октябрь", "не подтвердил три категории", "не закрыл подтверждение выбора"],
};

function issueLabel(id: string) {
  const labels: Record<string, string> = {
    "home.savings.open": "Открыл накопительный счёт в сценарии копирования карты",
    "navigation.back": "Вернулся назад в ожидаемом разделе",
    "tab.home.open": "Перешёл на главную в ожидаемом разделе",
    "cashback.categories.confirm": "Попытался подтвердить не три категории",
  };
  return labels[id] ?? id;
}

export function calculateResearchSummary(sessions: ResearchSession[], runs: TaskRun[], events: TrackedEvent[]): ResearchSummary {
  const recorded = sessions.filter((session) => session.startedAt);
  const recordedIds = new Set(recorded.map((session) => session.id));
  const taskCodeByRun = new Map(runs.map((run) => [run.id, run.taskCode]));
  const verdictFor = (event: TrackedEvent) => scenarioVerdictForEvent(event, event.taskRunId ? taskCodeByRun.get(event.taskRunId) : undefined);
  const successfulRuns = runs.filter((run) => recordedIds.has(run.sessionId) && (run.result === "unaided" || run.result === "aided"));
  const completedByScenario = new Map(interactiveScenarios.map((scenario) => [scenario.code, new Set(successfulRuns.filter((run) => run.taskCode === scenario.code).map((run) => run.sessionId))]));
  const startedByScenario = new Map(interactiveScenarios.map((scenario) => [scenario.code, new Set(runs.filter((run) => recordedIds.has(run.sessionId) && run.taskCode === scenario.code).map((run) => run.sessionId))]));
  const allCompleted = recorded.filter((session) => interactiveScenarios.every((scenario) => completedByScenario.get(scenario.code)?.has(session.id))).length;

  const cashbackRuns = runs.filter((run) => recordedIds.has(run.sessionId) && (run.taskCode === "CASHBACK_CONNECT" || run.taskCode === "CASHBACK_NEXT"));
  const cashbackRunIds = new Set(cashbackRuns.map((run) => run.id));
  const cashbackParticipants = new Set(cashbackRuns.map((run) => run.sessionId));
  let badgeFirst = 0;
  let tabFirst = 0;
  for (const sessionId of cashbackParticipants) {
    const firstEntry = events
      .filter((event) => event.sessionId === sessionId && event.taskRunId && cashbackRunIds.has(event.taskRunId) && event.type === "tap" && (event.target === "home.cashback.open" || event.target === "cashback.tab.open"))
      .sort((a, b) => a.id - b.id)[0];
    if (firstEntry?.target === "home.cashback.open") badgeFirst += 1;
    if (firstEntry?.target === "cashback.tab.open") tabFirst += 1;
  }

  const eventsBySession = (predicate: (event: TrackedEvent) => boolean) => new Set(events.filter((event) => recordedIds.has(event.sessionId) && predicate(event)).map((event) => event.sessionId)).size;
  const sessionsWithErrors = eventsBySession((event) => verdictFor(event) === "error");
  const sessionsWithRecovery = eventsBySession((event) => verdictFor(event) === "recovery");
  const sessionsWithInfo = eventsBySession((event) => verdictFor(event) === "info");
  const helpUsers = eventsBySession((event) => /^cashback\.category\.[^.]+\.faq\.open$/.test(event.target ?? event.action ?? ""));
  const yearUsers = eventsBySession((event) => (event.target ?? event.action) === "cashback.period.year");
  const total = recorded.length;
  const cashbackTotal = cashbackParticipants.size;
  const journeyCounts = { ideal: 0, explored: 0, detour: 0, error: 0 };
  for (const run of successfulRuns) {
    const runEvents = events.filter((event) => event.taskRunId === run.id);
    const verdicts = runEvents.map((event) => scenarioVerdictForEvent(event, run.taskCode));
    if (verdicts.includes("recovery")) journeyCounts.detour += 1;
    else if (verdicts.includes("error")) journeyCounts.error += 1;
    else if (verdicts.includes("info")) journeyCounts.explored += 1;
    else journeyCounts.ideal += 1;
  }
  const completedTotal = successfulRuns.length;
  const journeySegments = [
    metric("journey_ideal", "Идеально, без отклонений", journeyCounts.ideal, completedTotal, "завершённых сценариев"),
    metric("journey_explored", "Прошли нормально, но отвлекались на изучение", journeyCounts.explored, completedTotal, "завершённых сценариев"),
    metric("journey_detour", "Уходили в другой раздел и вернулись", journeyCounts.detour, completedTotal, "завершённых сценариев"),
    metric("journey_error", "Допустили другие ошибки", journeyCounts.error, completedTotal, "завершённых сценариев"),
  ];
  const metrics: ResearchSummaryMetric[] = [
    metric("cashback_badge_first", "Первый вход в кешбэк через бейдж у общей суммы", badgeFirst, cashbackTotal, "участников кешбэк-сценариев"),
    metric("cashback_tab_first", "Первый вход в кешбэк через «Выгоду»", tabFirst, cashbackTotal, "участников кешбэк-сценариев"),
    metric("all_scenarios_completed", "Завершили все три сценария", allCompleted, total, "всех записанных сессий"),
    ...interactiveScenarios.map((scenario) => metric(`completed_${scenario.code.toLowerCase()}`, `Завершили: ${scenario.title}`, completedByScenario.get(scenario.code)?.size ?? 0, startedByScenario.get(scenario.code)?.size ?? 0, "начавших этот сценарий")),
    metric("without_errors", "Прошли без ошибочных действий", total - sessionsWithErrors, total, "всех записанных сессий"),
    metric("recovered", "Возвращались после неверного раздела", sessionsWithRecovery, total, "всех записанных сессий"),
    metric("explored", "Изучали дополнительные элементы", sessionsWithInfo, total, "всех записанных сессий"),
    metric("category_help", "Открывали пояснение категории «?»", helpUsers, total, "всех записанных сессий"),
    metric("year_chart", "Переключали график на весь год", yearUsers, total, "всех записанных сессий"),
  ];

  const scenarioMetrics: ScenarioResearchMetrics[] = interactiveScenarios.map((scenario) => {
    const scenarioRuns = runs.filter((run) => recordedIds.has(run.sessionId) && run.taskCode === scenario.code && run.result !== "corrupted");
    const representatives = [...new Set(scenarioRuns.map((run) => run.sessionId))].map((sessionId) => {
      const participantRuns = scenarioRuns.filter((run) => run.sessionId === sessionId);
      return participantRuns.find((run) => run.result === "unaided" || run.result === "aided") ?? participantRuns.at(-1)!;
    });
    const calculated = representatives.map((run) => ({
      run,
      events: events.filter((event) => event.taskRunId === run.id),
      metric: calculateTaskMetrics(run, events, scenario),
    }));
    const completed = calculated.filter(({ run }) => run.result === "unaided" || run.result === "aided");
    const started = calculated.length;
    const completionTimes = completed.flatMap(({ metric: item }) => item.completionTimeMs === null ? [] : [item.completionTimeMs]);
    const excessTaps = completed.flatMap(({ metric: item }) => item.excessTaps === null ? [] : [item.excessTaps]);
    const seqScores = completed.flatMap(({ run }) => run.easeScore === null ? [] : [run.easeScore]);
    const dropoffCounts = new Map<number, number>();
    calculated.filter(({ run }) => run.result === "failed").forEach(({ events: runEvents }) => {
      const stage = scenarioProgress(scenario.code, runEvents).stage;
      dropoffCounts.set(stage, (dropoffCounts.get(stage) ?? 0) + 1);
    });
    const rate = (count: number, denominator = started) => denominator ? Math.round(count / denominator * 100) : 0;
    return {
      code: scenario.code,
      title: scenario.title,
      startedParticipants: started,
      completedParticipants: completed.length,
      unaidedParticipants: completed.filter(({ run }) => run.result === "unaided").length,
      aidedParticipants: completed.filter(({ run }) => run.result === "aided").length,
      failedParticipants: calculated.filter(({ run }) => run.result === "failed").length,
      completionRate: rate(completed.length),
      unaidedCompletionRate: rate(completed.filter(({ run }) => run.result === "unaided").length),
      aidedCompletionRate: rate(completed.filter(({ run }) => run.result === "aided").length),
      failureRate: rate(calculated.filter(({ run }) => run.result === "failed").length),
      errorFreeCompletionRate: rate(completed.filter(({ metric: item }) => item.errorFree).length, completed.length),
      directPathRate: rate(completed.filter(({ metric: item }) => item.directPath).length, completed.length),
      firstClickSuccessRate: rate(calculated.filter(({ metric: item }) => item.firstClickCorrect).length, calculated.filter(({ metric: item }) => item.firstClickCorrect !== null).length),
      medianCompletionTimeMs: median(completionTimes),
      p75CompletionTimeMs: percentile(completionTimes, 0.75),
      medianExcessTaps: median(excessTaps),
      p75ExcessTaps: percentile(excessTaps, 0.75),
      seqResponseCount: seqScores.length,
      seqMedian: median(seqScores),
      seqPositiveRate: rate(seqScores.filter((score) => score >= 5).length, seqScores.length),
      dropoffs: [...dropoffCounts.entries()].sort(([a], [b]) => a - b).map(([stage, count]) => ({
        stage,
        label: stageLabels[scenario.code]?.[stage] ?? `остановился на этапе ${stage}`,
        count,
        total: started,
        percent: rate(count),
      })),
    };
  });

  const issueMetrics: ResearchIssueMetric[] = interactiveScenarios.flatMap((scenario) => {
    const scenarioRunIds = new Set(runs.filter((run) => recordedIds.has(run.sessionId) && run.taskCode === scenario.code && run.result !== "corrupted").map((run) => run.id));
    const startedParticipants = new Set(runs.filter((run) => scenarioRunIds.has(run.id)).map((run) => run.sessionId)).size;
    const grouped = new Map<string, { sessions: Set<string>; occurrences: number }>();
    events.filter((event) => event.taskRunId && scenarioRunIds.has(event.taskRunId) && verdictFor(event) === "error").forEach((event) => {
      const semanticId = event.target ?? event.action ?? "unknown";
      const current = grouped.get(semanticId) ?? { sessions: new Set<string>(), occurrences: 0 };
      current.sessions.add(event.sessionId);
      current.occurrences += 1;
      grouped.set(semanticId, current);
    });
    return [...grouped.entries()].map(([semanticId, value]) => ({
      scenarioCode: scenario.code,
      scenarioTitle: scenario.title,
      semanticId,
      label: issueLabel(semanticId),
      affectedParticipants: value.sessions.size,
      startedParticipants,
      prevalencePercent: startedParticipants ? Math.round(value.sessions.size / startedParticipants * 100) : 0,
      occurrenceCount: value.occurrences,
    }));
  }).sort((a, b) => b.prevalencePercent - a.prevalencePercent || b.affectedParticipants - a.affectedParticipants || a.label.localeCompare(b.label, "ru"));

  return { recordedSessions: total, journeySegments, metrics, scenarioMetrics, issueMetrics };
}
