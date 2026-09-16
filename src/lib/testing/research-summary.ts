import { interactiveScenarios } from "@/config/test-scenarios";
import { sortTrackedEvents, trackedEventTime } from "./event-time";
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
  inProgressParticipants: number;
  excludedParticipants: number;
  completionRate: number;
  completionConfidence95: ConfidenceRange | null;
  unaidedCompletionRate: number;
  aidedCompletionRate: number;
  failureRate: number;
  errorFreeCompletionRate: number;
  errorFreeConfidence95: ConfidenceRange | null;
  directPathRate: number;
  directPathConfidence95: ConfidenceRange | null;
  firstClickSuccessRate: number;
  firstClickConfidence95: ConfidenceRange | null;
  medianCompletionTimeMs: number | null;
  p75CompletionTimeMs: number | null;
  medianExcessTaps: number | null;
  p75ExcessTaps: number | null;
  seqResponseCount: number;
  seqMean: number | null;
  seqMedian: number | null;
  seqPositiveRate: number;
  seqPositiveConfidence95: ConfidenceRange | null;
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
  prevalenceConfidence95: ConfidenceRange | null;
  occurrenceCount: number;
  affectedCompletionRate: number;
  unaffectedParticipants: number;
  unaffectedCompletionRate: number | null;
  completionDifferencePp: number | null;
  recoveredParticipants: number;
  recoveryRate: number;
}

export interface ConfidenceRange { lower: number; upper: number }

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

function mean(values: number[]) {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 10) / 10 : null;
}

function wilson95(count: number, total: number): ConfidenceRange | null {
  if (!total) return null;
  const z = 1.96;
  const proportion = count / total;
  const denominator = 1 + z * z / total;
  const centre = (proportion + z * z / (2 * total)) / denominator;
  const margin = z * Math.sqrt((proportion * (1 - proportion) + z * z / (4 * total)) / total) / denominator;
  return { lower: Math.max(0, Math.round((centre - margin) * 100)), upper: Math.min(100, Math.round((centre + margin) * 100)) };
}

const stageLabels: Record<string, string[]> = {
  CARD_COPY: ["не открыл текущий счёт", "не открыл карту", "не раскрыл данные карты", "не скопировал поле"],
  CASHBACK_CONNECT: ["не открыл кешбэк", "не начал подключение", "не подтвердил три категории", "не закрыл подтверждение подключения"],
  CASHBACK_NEXT: ["не открыл кешбэк", "не открыл выбор на октябрь", "не подтвердил три категории", "не закрыл подтверждение выбора"],
};

const hiddenLegacyIssueIds = new Set(["home.savings.open"]);

function issueLabel(id: string) {
  const labels: Record<string, string> = {
    "home.savings.open": "Тапнул удалённый элемент главного экрана в старой записи",
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
      .sort((a, b) => trackedEventTime(a) - trackedEventTime(b) || a.id - b.id)[0];
    if (firstEntry?.target === "home.cashback.open") badgeFirst += 1;
    if (firstEntry?.target === "cashback.tab.open") tabFirst += 1;
  }

  const eventsBySession = (predicate: (event: TrackedEvent) => boolean) => new Set(events.filter((event) => recordedIds.has(event.sessionId) && predicate(event)).map((event) => event.sessionId)).size;
  const sessionsWithErrors = eventsBySession((event) => verdictFor(event) === "error");
  const sessionsWithRecovery = eventsBySession((event) => verdictFor(event) === "recovery");
  const sessionsWithInfo = eventsBySession((event) => verdictFor(event) === "info");
  const helpUsers = eventsBySession((event) => /^cashback\.category\.[^.]+\.faq\.open$/.test(event.target ?? event.action ?? ""));
  const categoryLimitUsers = eventsBySession((event) => /^cashback\.category\.[^.]+\.toggle$/.test(event.target ?? event.action ?? "") && verdictFor(event) === "info");
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
    metric("category_limit", "Проверяли возможность выбрать больше трёх категорий", categoryLimitUsers, cashbackTotal, "участников кешбэк-сценариев"),
    metric("year_chart", "Переключали график на весь год", yearUsers, total, "всех записанных сессий"),
  ];

  const scenarioMetrics: ScenarioResearchMetrics[] = interactiveScenarios.map((scenario) => {
    const allScenarioRuns = runs.filter((run) => recordedIds.has(run.sessionId) && run.taskCode === scenario.code);
    const scenarioRuns = allScenarioRuns.filter((run) => run.result !== "corrupted");
    const excludedParticipants = new Set(allScenarioRuns.filter((run) => run.result === "corrupted").map((run) => run.sessionId)).size;
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
    const firstClickAttempts = calculated.filter(({ metric: item }) => item.firstClickCorrect !== null);
    const firstClickSuccesses = firstClickAttempts.filter(({ metric: item }) => item.firstClickCorrect).length;
    const errorFreeSuccesses = completed.filter(({ metric: item }) => item.errorFree).length;
    const directPathSuccesses = completed.filter(({ metric: item }) => item.directPath).length;
    const seqPositive = seqScores.filter((score) => score >= 5).length;
    const dropoffCounts = new Map<number, number>();
    calculated.filter(({ run }) => run.result === "failed").forEach(({ events: runEvents }) => {
      const stage = scenarioProgress(scenario.code, sortTrackedEvents(runEvents)).stage;
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
      inProgressParticipants: calculated.filter(({ run }) => run.result === null).length,
      excludedParticipants,
      completionRate: rate(completed.length),
      completionConfidence95: wilson95(completed.length, started),
      unaidedCompletionRate: rate(completed.filter(({ run }) => run.result === "unaided").length),
      aidedCompletionRate: rate(completed.filter(({ run }) => run.result === "aided").length),
      failureRate: rate(calculated.filter(({ run }) => run.result === "failed").length),
      errorFreeCompletionRate: rate(errorFreeSuccesses, completed.length),
      errorFreeConfidence95: wilson95(errorFreeSuccesses, completed.length),
      directPathRate: rate(directPathSuccesses, completed.length),
      directPathConfidence95: wilson95(directPathSuccesses, completed.length),
      firstClickSuccessRate: rate(firstClickSuccesses, firstClickAttempts.length),
      firstClickConfidence95: wilson95(firstClickSuccesses, firstClickAttempts.length),
      medianCompletionTimeMs: median(completionTimes),
      p75CompletionTimeMs: percentile(completionTimes, 0.75),
      medianExcessTaps: median(excessTaps),
      p75ExcessTaps: percentile(excessTaps, 0.75),
      seqResponseCount: seqScores.length,
      seqMean: mean(seqScores),
      seqMedian: median(seqScores),
      seqPositiveRate: rate(seqPositive, seqScores.length),
      seqPositiveConfidence95: wilson95(seqPositive, seqScores.length),
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
    const scenarioRuns = runs.filter((run) => recordedIds.has(run.sessionId) && run.taskCode === scenario.code && run.result !== "corrupted");
    const scenarioRunIds = new Set(scenarioRuns.map((run) => run.id));
    const startedSessionIds = new Set(scenarioRuns.map((run) => run.sessionId));
    const completedSessionIds = new Set(scenarioRuns.filter((run) => run.result === "unaided" || run.result === "aided").map((run) => run.sessionId));
    const recoveredSessionIds = new Set(events.filter((event) => event.taskRunId && scenarioRunIds.has(event.taskRunId) && verdictFor(event) === "recovery").map((event) => event.sessionId));
    const startedParticipants = startedSessionIds.size;
    const grouped = new Map<string, { sessions: Set<string>; occurrences: number }>();
    events.filter((event) => {
      if (!event.taskRunId || !scenarioRunIds.has(event.taskRunId) || verdictFor(event) !== "error") return false;
      return !hiddenLegacyIssueIds.has(event.target ?? event.action ?? "unknown");
    }).forEach((event) => {
      const semanticId = event.target ?? event.action ?? "unknown";
      const current = grouped.get(semanticId) ?? { sessions: new Set<string>(), occurrences: 0 };
      current.sessions.add(event.sessionId);
      current.occurrences += 1;
      grouped.set(semanticId, current);
    });
    return [...grouped.entries()].map(([semanticId, value]) => {
      const affectedCompleted = [...value.sessions].filter((sessionId) => completedSessionIds.has(sessionId)).length;
      const unaffected = [...startedSessionIds].filter((sessionId) => !value.sessions.has(sessionId));
      const unaffectedCompleted = unaffected.filter((sessionId) => completedSessionIds.has(sessionId)).length;
      const affectedCompletionRate = value.sessions.size ? Math.round(affectedCompleted / value.sessions.size * 100) : 0;
      const unaffectedCompletionRate = unaffected.length ? Math.round(unaffectedCompleted / unaffected.length * 100) : null;
      const recoveredParticipants = [...value.sessions].filter((sessionId) => recoveredSessionIds.has(sessionId)).length;
      return {
        scenarioCode: scenario.code,
        scenarioTitle: scenario.title,
        semanticId,
        label: issueLabel(semanticId),
        affectedParticipants: value.sessions.size,
        startedParticipants,
        prevalencePercent: startedParticipants ? Math.round(value.sessions.size / startedParticipants * 100) : 0,
        prevalenceConfidence95: wilson95(value.sessions.size, startedParticipants),
        occurrenceCount: value.occurrences,
        affectedCompletionRate,
        unaffectedParticipants: unaffected.length,
        unaffectedCompletionRate,
        completionDifferencePp: unaffectedCompletionRate === null ? null : affectedCompletionRate - unaffectedCompletionRate,
        recoveredParticipants,
        recoveryRate: value.sessions.size ? Math.round(recoveredParticipants / value.sessions.size * 100) : 0,
      };
    });
  }).sort((a, b) => b.prevalencePercent - a.prevalencePercent || b.affectedParticipants - a.affectedParticipants || a.label.localeCompare(b.label, "ru"));

  return { recordedSessions: total, journeySegments, metrics, scenarioMetrics, issueMetrics };
}
