import { interactiveScenarios } from "@/config/test-scenarios";
import { scenarioVerdictForEvent } from "./scenario-progress";
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
}

function metric(id: string, label: string, count: number, total: number, denominatorLabel: string): ResearchSummaryMetric {
  return { id, label, count, total, percent: total ? Math.round(count / total * 100) : 0, denominatorLabel };
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
  return { recordedSessions: total, journeySegments, metrics };
}
