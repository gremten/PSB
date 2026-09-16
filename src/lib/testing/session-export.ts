import { getTask, interactiveScenarios, type InteractiveScenarioCode } from "@/config/test-scenarios";
import { sortTrackedEvents, trackedEventTime } from "./event-time";
import { calculateTaskMetrics } from "./metrics";
import type { ResearchSummary } from "./research-summary";
import { isScenarioGateTarget, scenarioProgress, scenarioVerdictForEvent, type ScenarioVerdict } from "./scenario-progress";
import type { SessionSnapshot, TaskRun, TrackedEvent } from "./types";

export const STARL_EXPORT_SCHEMA_VERSION = "psb.usability.starl.v5";

export const STARL_ANALYSIS_PROMPT_RU = `Проанализируй приложенную выгрузку юзабилити-теста по методике STARL (Situation, Task, Action, Result, Learning). Исследовались три сценария: просмотр и копирование данных карты; первое подключение кешбэка; выбор категорий кешбэка на октябрь как следующий месяц. Для каждого сценария восстанови хронологию только по action.interactionNarrative и action.chronologicalEvidence, отделяя observation от inference и recommendation и ссылаясь на evidenceEventIds. correct — ожидаемый шаг, error — действие вне активного сценария, recovery — возврат из неверного раздела, info — допустимое исследование интерфейса, а не ошибка; скроллы ошибками не являются. Попытка выбрать четвёртую категорию после достижения лимита трёх — это limit discovery: допустимое исследование ограничения, а не ошибка. Отдельно оцени идеальное прохождение, прохождение с исследованием, уход в другой раздел с возвратом, ошибки и восстановление, способ входа в кешбек через бейдж у суммы или таббар и время каждого сценария. Используй готовые result.firstClickCorrect, result.errorFree, result.directPath, result.excessTaps и result.easeScore; не подменяй распространённость проблемы долей событий — для групповой оценки нужен процент уникальных затронутых участников от начавших сценарий. Для времени используй только completionTimeMs и elapsedFromScenarioStartMs: они основаны на времени касания участника с серверным fallback; не вычисляй общее время сессии. Учитывай размер выборки и 95% доверительные интервалы, не называй описательную связь ошибки с completion причинной и не делай выводов о банковских значениях или личных данных. Сначала дай факты по каждому сценарию, затем общие паттерны, продуктовые выводы и приоритизированные рекомендации.`;

const expectedPaths: Record<InteractiveScenarioCode, Array<{ step: number; purpose: string; acceptedSemanticIds: string[] }>> = {
  CARD_COPY: [
    { step: 1, purpose: "Открыть текущий счёт", acceptedSemanticIds: ["home.account.open"] },
    { step: 2, purpose: "Открыть карту счёта", acceptedSemanticIds: ["account.card.primary.open", "account.card.strong.open", "account.card.salary.open"] },
    { step: 3, purpose: "Раскрыть данные карты", acceptedSemanticIds: ["card.night.flip", "card.orange.flip", "card.salary.flip"] },
    { step: 4, purpose: "Скопировать поле карты", acceptedSemanticIds: ["card.*.number.copy", "card.*.expiry.copy", "card.*.cvv.copy"] },
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

function scenarioOriginMs(run: TaskRun | undefined, events: TrackedEvent[]) {
  if (!run) return null;
  const boundary = events.find((event) => event.taskRunId === run.id && event.type === "task_started");
  const value = boundary ? trackedEventTime(boundary) : new Date(run.startedAt).getTime();
  return Number.isFinite(value) ? value : null;
}

function elapsedMs(event: TrackedEvent, origin: number | null) {
  if (origin === null) return null;
  const value = trackedEventTime(event) - origin;
  return Number.isFinite(value) ? Math.max(0, value) : null;
}

function semanticId(event: TrackedEvent) {
  return event.target ?? event.action;
}

function semanticLabel(id: string | null | undefined, event?: TrackedEvent) {
  if (!id) return "событие без семантической метки";
  const labels: Record<string, string> = {
    "home.account.open": "открыл текущий счёт",
    "home.savings.open": "открыл накопительный счёт в старой версии интерфейса",
    "home.cashback.open": "открыл кешбек через бейдж рядом с общей суммой",
    "cashback.tab.open": "открыл кешбек через вкладку «Выгода»",
    "cashback.connect.start": "начал первое подключение кешбека",
    "cashback.next_month.categories.open": "открыл выбор категорий на октябрь",
    "cashback.categories.confirm": "подтвердил выбранные категории",
    "cashback.period.month": "переключил график на месяц",
    "cashback.period.year": "переключил график на год",
    "navigation.back": "вернулся на предыдущий экран",
    "tab.home.open": "перешёл на главную",
  };
  if (labels[id]) return labels[id];
  if (/^account\.card\.[^.]+\.open$/.test(id)) return "открыл карту счёта";
  if (/^card\.[^.]+\.flip$/.test(id)) return "раскрыл данные карты";
  if (/^card\.[^.]+\.(number|expiry|cvv)\.copy$/.test(id)) return "скопировал поле данных карты";
  if (/^cashback\.category\.[^.]+\.toggle$/.test(id)) {
    if (event?.metadata.selectionLimitReached === true || event?.metadata.scenarioVerdict === "error") return "проверил возможность выбрать больше трёх категорий; выбор не изменился";
    return "изменил выбор категории кешбека";
  }
  if (/^cashback\.category\.[^.]+\.faq\.open$/.test(id)) return "открыл пояснение категории";
  return id;
}

function interactionInterpretation(verdict: ScenarioVerdict | null) {
  if (verdict === "correct") return "ожидаемый шаг сценария";
  if (verdict === "info") return "исследование интерфейса — не ошибка";
  if (verdict === "recovery") return "возврат после отклонения от маршрута";
  if (verdict === "error") return "действие вне активного сценария";
  return "не классифицировано";
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
    events.some((event) => /^cashback\.category\.[^.]+\.toggle$/.test(semanticId(event) ?? "") && scenarioVerdictForEvent(event, taskCode) === "info")
      ? { code: "explored_category_selection_limit", evidenceEventIds: events.filter((event) => /^cashback\.category\.[^.]+\.toggle$/.test(semanticId(event) ?? "") && scenarioVerdictForEvent(event, taskCode) === "info").map((event) => event.id) }
      : null,
    ids.includes("cashback.period.year") ? { code: "explored_annual_chart", evidenceEventIds: events.filter((event) => semanticId(event) === "cashback.period.year").map((event) => event.id) } : null,
  ].filter((signal): signal is { code: string; evidenceEventIds: number[] } => signal !== null);
}

export function buildStarlSessionExport(snapshot: SessionSnapshot, generatedAt = new Date().toISOString()) {
  const taskRunById = new Map(snapshot.taskRuns.map((run) => [run.id, run]));
  const orderedEvents = sortTrackedEvents(snapshot.events);
  const originByRun = new Map(snapshot.taskRuns.map((run) => [run.id, scenarioOriginMs(run, orderedEvents)]));
  const starlRecords = snapshot.taskRuns.map((run) => {
    const task = getTask(run.taskCode);
    const runEvents = orderedEvents.filter((event) => event.taskRunId === run.id && !(event.type === "tap" && isScenarioGateTarget(semanticId(event))));
    const origin = originByRun.get(run.id) ?? null;
    const metrics = calculateTaskMetrics(run, runEvents, task);
    const verdicts = runEvents.map((event) => scenarioVerdictForEvent(event, run.taskCode));
    const interactive = interactiveScenarios.find((scenario) => scenario.code === run.taskCode);
    const progress = interactive ? scenarioProgress(interactive.code, runEvents) : null;
    const interactions = runEvents.filter((event) => event.type === "tap").map((event, index) => {
      const verdict = scenarioVerdictForEvent(event, run.taskCode);
      const label = semanticLabel(semanticId(event), event);
      return {
        order: index + 1,
        eventId: event.id,
        elapsedFromScenarioStartMs: elapsedMs(event, origin),
        screen: event.screen,
        semanticId: semanticId(event),
        semanticLabel: label,
        verdict,
        interpretation: interactionInterpretation(verdict),
        narrative: `${index === 0 ? "Сначала" : "Затем"} участник ${label}. ${interactionInterpretation(verdict)}.`,
      };
    });
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
        firstInteraction: interactions[0] ?? null,
        interactionNarrative: interactions,
        chronologicalEvidence: runEvents.map((event, index) => ({
          sequence: index + 1,
          eventId: event.id,
          timestamp: event.timestamp,
          capturedAt: new Date(trackedEventTime(event)).toISOString(),
          elapsedFromScenarioStartMs: elapsedMs(event, origin),
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
        firstClickCorrect: metrics.firstClickCorrect,
        errorFree: metrics.errorFree,
        directPath: metrics.directPath,
        excessTaps: metrics.excessTaps,
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
      standardMetrics: {
        taskCompletion: "completed participants / participants who started the scenario",
        errorFreeCompletion: "completed runs without an error verdict / completed runs",
        directPath: "unaided completion with only correct taps and no taps above the approved golden count",
        firstClickSuccess: "attempts whose first recorded tap is correct / attempts with a recorded tap",
        completionTime: "median and P75 of successful task-run duration",
        issuePrevalence: "unique affected participants / unique participants who started that scenario",
        uncertainty: "Wilson 95% confidence intervals for binary participant rates; descriptive association is not causation",
        seq: "Single Ease Question, 1 very difficult to 7 very easy, asked after each successful scenario",
      },
      references: [
        "https://www.iso.org/standard/63500.html",
        "https://www.nngroup.com/articles/usability-metrics/",
        "https://www.nngroup.com/articles/success-rate-the-simplest-usability-metric/",
        "https://research.google/pubs/measuring-the-user-experience-on-a-large-scale-user-centered-metrics-for-web-applications/",
        "https://measuringu.com/seq10/",
      ],
    },
    analysisContract: {
      timestampFormat: "ISO-8601 UTC",
      timestampSemantics: "timestamp is server receipt time; capturedAt and elapsedFromScenarioStartMs represent validated participant capture time",
      durationUnit: "milliseconds",
      timeBasis: "participant_capture_time_with_server_fallback",
      verdicts: {
        correct: "expected scenario tap",
        error: "tap unrelated to the active scenario",
        recovery: "return from a wrong section",
        info: "allowed exploration, not an error",
        null: "non-tap event or unclassified legacy event",
      },
      privacy: "participantCode is the study pseudonym. Event metadata is sanitized at ingestion; banking values, clipboard contents and other personal data are not exported.",
      automationGuidance: "Use only completionTimeMs and elapsedFromScenarioStartMs for timing analysis; these prefer participant capture time and fall back to server time. Session timestamps are audit context only: never calculate or aggregate total session duration because waiting and moderator discussion are outside the task. Use unique participants, not event totals, for issue prevalence. Report sample size and confidence intervals, and never describe an observed completion-rate difference as causal. Aggregate only records with result.completed=true; keep corrupted and incomplete records visible but outside success-rate denominators; cite eventId values for qualitative claims.",
    },
    analysisPrompt: {
      language: "ru",
      methodology: "STARL",
      text: STARL_ANALYSIS_PROMPT_RU,
    },
    coverage,
    starlRecords,
    session: snapshot.session,
    taskRuns: snapshot.taskRuns,
    events: orderedEvents.map((event) => ({
      ...event,
      capturedAt: new Date(trackedEventTime(event)).toISOString(),
      elapsedFromScenarioStartMs: elapsedMs(event, originByRun.get(event.taskRunId ?? "") ?? null),
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
  const orderedEvents = sortTrackedEvents(snapshot.events);
  const originByRun = new Map(snapshot.taskRuns.map((run) => [run.id, scenarioOriginMs(run, orderedEvents)]));
  const rows = [
    ["id", "timestamp", "type", "screen", "action", "target", "taskRunId", "metadata", "schemaVersion", "participantCode", "variant", "buildId", "taskCode", "taskResult", "elapsedTaskMs", "semanticId", "semanticLabel", "scenarioVerdict", "interpretation", "capturedAt"],
    ...orderedEvents.map((event) => {
      const run = event.taskRunId ? runs.get(event.taskRunId) : undefined;
      const verdict = scenarioVerdictForEvent(event, run?.taskCode);
      return [event.id, event.timestamp, event.type, event.screen, event.action, event.target, event.taskRunId, event.metadata, STARL_EXPORT_SCHEMA_VERSION, snapshot.session.participantCode, snapshot.session.variant, snapshot.session.buildId, run?.taskCode, run?.result, elapsedMs(event, originByRun.get(event.taskRunId ?? "") ?? null), semanticId(event), semanticLabel(semanticId(event), event), verdict, interactionInterpretation(verdict), new Date(trackedEventTime(event)).toISOString()];
    }),
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}

function markdownValue(value: unknown) {
  return String(value ?? "—").replace(/([\\`*_{}\[\]<>#|])/g, "\\$1");
}

function humanDuration(milliseconds: number | null) {
  if (milliseconds === null) return "не зафиксировано";
  const seconds = milliseconds / 1000;
  if (seconds < 60) return `${seconds.toFixed(1).replace(".", ",")} сек`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes} мин ${(seconds % 60).toFixed(1).replace(".", ",")} сек`;
}

function elapsedLabel(milliseconds: number | null) {
  if (milliseconds === null) return "время неизвестно";
  const seconds = milliseconds / 1000;
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${(seconds % 60).toFixed(1).padStart(4, "0").replace(".", ",")}`;
}

const resultLabels: Record<string, string> = {
  unaided: "завершён самостоятельно",
  aided: "завершён с помощью модератора",
  failed: "не завершён",
  corrupted: "запись повреждена",
  running: "ещё выполняется",
};

const journeyLabels: Record<string, string> = {
  ideal: "идеальное прохождение без отклонений",
  completed_with_exploration: "завершено с допустимым изучением интерфейса",
  completed_with_errors: "завершено с ошибочными действиями",
  detour_recovered: "участник отклонился от маршрута и вернулся",
  incomplete: "сценарий не завершён",
  failed: "сценарий завершился неуспешно",
  corrupted: "данных недостаточно из-за повреждения записи",
};

const screenLabels: Record<string, string> = {
  "/": "Главная",
  "/account": "Счёт",
  "/card": "Карта",
  "/cashback": "Выгода",
  "/cashback/categories": "Выбор категорий кешбека",
};

function percent(count: number, total: number) {
  return total ? Math.round(count / total * 100) : 0;
}

function confidenceText(range: { lower: number; upper: number } | null) {
  return range ? `${range.lower}–${range.upper}%` : "—";
}

function rankByLabel<T>(items: T[], labelFor: (item: T) => string, limit = 5) {
  const counts = new Map<string, number>();
  items.forEach((item) => {
    const label = labelFor(item);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ru")).slice(0, limit);
}

export function buildAllSessionsMarkdownReport(snapshots: SessionSnapshot[], researchSummary: ResearchSummary, generatedAt = new Date().toISOString()) {
  const reports = snapshots.map((snapshot) => buildStarlSessionExport(snapshot, generatedAt));
  const records = reports.flatMap((report) => report.starlRecords);
  const completedRecords = records.filter((record) => record.result.completed);
  const interactions = records.flatMap((record) => record.action.interactionNarrative.map((interaction) => ({ ...interaction, scenarioCode: record.scenarioCode, scenarioTitle: record.task.title, participantCode: record.situation.participantCode })));
  const errorInteractions = interactions.filter((interaction) => interaction.verdict === "error");
  const infoInteractions = interactions.filter((interaction) => interaction.verdict === "info");
  const recoveryInteractions = interactions.filter((interaction) => interaction.verdict === "recovery");
  const startedRuns = records.length;
  const completedRuns = completedRecords.length;
  const idealMetric = researchSummary.journeySegments.find((metric) => metric.id === "journey_ideal");
  const exploredMetric = researchSummary.journeySegments.find((metric) => metric.id === "journey_explored");
  const detourMetric = researchSummary.journeySegments.find((metric) => metric.id === "journey_detour");
  const errorMetric = researchSummary.journeySegments.find((metric) => metric.id === "journey_error");
  const behaviorMetric = (id: string) => researchSummary.metrics.find((metric) => metric.id === id);
  const participantCount = researchSummary.recordedSessions;
  const lines = [
    "# Общее MD-саммари PSB usability test",
    "",
    "> Групповой отчёт по всем записанным участникам. Сначала показана общая картина исследования, затем сценарии, паттерны и детализация по участникам. Pending-сессии без нажатия «Старт» не включены.",
    "",
    `- Сформировано: **${markdownValue(generatedAt)}**`,
    `- Версия схемы: **${STARL_EXPORT_SCHEMA_VERSION}**`,
    "- Общее время сессий намеренно не рассчитывается: в метрики входит только время внутри каждого сценария.",
    "- Банковские значения, данные карт, clipboard contents и чувствительные metadata не экспортируются.",
    "",
    "## 1. Общее резюме исследования",
    "",
  ];

  if (!snapshots.length) {
    lines.push(
      "Записанных сессий пока нет. Отчёт сформирован корректно, но метрики появятся после того, как хотя бы один участник нажмёт «Старт» и начнёт сценарий.",
      "",
      "## 5. STARL-блок и prompt для AI-анализа",
      "",
      ...STARL_ANALYSIS_PROMPT_RU.split("\n").map((line) => `> ${line}`),
      "",
    );
    return `\uFEFF${lines.join("\n")}`;
  }

  lines.push(
    `- Участников с начатой записью: **${participantCount}**.`,
    `- Начато сценариев: **${startedRuns}**.`,
    `- Завершено сценариев: **${completedRuns} из ${startedRuns} — ${percent(completedRuns, startedRuns)}%**.`,
    `- Идеальных завершённых прохождений: **${idealMetric?.count ?? 0} из ${idealMetric?.total ?? 0} — ${idealMetric?.percent ?? 0}%**.`,
    `- Завершений с ошибками: **${errorMetric?.count ?? 0} из ${errorMetric?.total ?? 0} — ${errorMetric?.percent ?? 0}%**.`,
    `- Завершений с допустимым исследованием интерфейса: **${exploredMetric?.count ?? 0} из ${exploredMetric?.total ?? 0} — ${exploredMetric?.percent ?? 0}%**.`,
    `- Уходили в другой раздел и возвращались: **${detourMetric?.count ?? 0} из ${detourMetric?.total ?? 0} — ${detourMetric?.percent ?? 0}%**.`,
    "",
    "### Ключевые проблемные места",
    "",
  );

  if (researchSummary.issueMetrics.length) {
    researchSummary.issueMetrics.slice(0, 5).forEach((issue) => {
      const comparison = issue.unaffectedCompletionRate === null ? "группы сравнения нет" : `completion без проблемы — ${issue.unaffectedCompletionRate}%, разница ${issue.completionDifferencePp! > 0 ? "+" : ""}${issue.completionDifferencePp} п.п.`;
      lines.push(`- **${markdownValue(issue.scenarioTitle)}:** ${markdownValue(issue.label)} — **${issue.affectedParticipants} из ${issue.startedParticipants} участников (${issue.prevalencePercent}%; 95% ДИ ${confidenceText(issue.prevalenceConfidence95)})**; completion с проблемой — **${issue.affectedCompletionRate}%**, ${comparison}; повторов — **${issue.occurrenceCount}**.`);
    });
  } else {
    lines.push("- Ошибочных действий в начатых сценариях пока не зафиксировано.");
  }

  lines.push(
    "",
    "### Главные UX-выводы",
    "",
    `- Completion rate по всем запускам сценариев сейчас **${percent(completedRuns, startedRuns)}%**; приоритет — смотреть не только факт завершения, но и долю direct path, first-click success и excess taps по каждому сценарию.`,
    `- Доля прохождений с допустимым исследованием интерфейса: **${exploredMetric?.count ?? 0} из ${exploredMetric?.total ?? 0} — ${exploredMetric?.percent ?? 0}%**. Эти действия показывают любопытство или проверку правил, но не считаются ошибками.`,
    `- Доля прохождений с уходом в другой раздел и возвратом: **${detourMetric?.count ?? 0} из ${detourMetric?.total ?? 0} — ${detourMetric?.percent ?? 0}%**. Это хороший сигнал для анализа навигационной уверенности.`,
    "- Все выводы ниже являются описательными наблюдениями этой выборки. Причинность нельзя утверждать без дополнительной проверки.",
    "",
    "## 2. Метрики по сценариям",
    "",
  );

  researchSummary.scenarioMetrics.forEach((scenario) => {
    lines.push(
      `### ${markdownValue(scenario.title)} (${scenario.code})`,
      "",
      `- Completion rate: **${scenario.completedParticipants} из ${scenario.startedParticipants} — ${scenario.completionRate}%**; 95% ДИ **${confidenceText(scenario.completionConfidence95)}**.`,
      `- Без помощи / с помощью / неуспешно: **${scenario.unaidedCompletionRate}% / ${scenario.aidedCompletionRate}% / ${scenario.failureRate}%**.`,
      `- Median/P75 task time: **${humanDuration(scenario.medianCompletionTimeMs)} / ${humanDuration(scenario.p75CompletionTimeMs)}**.`,
      `- SEQ mean/median: **${scenario.seqMean ?? "—"} / ${scenario.seqMedian ?? "—"} из 7**, ответов **${scenario.seqResponseCount}**, доля оценок 5–7 — **${scenario.seqPositiveRate}%**; 95% ДИ **${confidenceText(scenario.seqPositiveConfidence95)}**.`,
      `- First-click success: **${scenario.firstClickSuccessRate}%**; 95% ДИ **${confidenceText(scenario.firstClickConfidence95)}**.`,
      `- Direct path: **${scenario.directPathRate}%** завершивших; 95% ДИ **${confidenceText(scenario.directPathConfidence95)}**.`,
      `- Error-free completion: **${scenario.errorFreeCompletionRate}%** завершивших; 95% ДИ **${confidenceText(scenario.errorFreeConfidence95)}**.`,
      `- Excess taps median/P75: **${scenario.medianExcessTaps ?? "—"} / ${scenario.p75ExcessTaps ?? "—"}**.`,
      `- В процессе / исключено из расчётов: **${scenario.inProgressParticipants} / ${scenario.excludedParticipants}**.`,
    );
    if (scenario.dropoffs.length) {
      lines.push("- Drop-off stages:");
      scenario.dropoffs.forEach((dropoff) => lines.push(`  - ${markdownValue(dropoff.label)} — **${dropoff.count} из ${dropoff.total}, ${dropoff.percent}%**.`));
    }
    const issues = researchSummary.issueMetrics.filter((issue) => issue.scenarioCode === scenario.code);
    if (issues.length) {
      lines.push("- Issue prevalence:");
      issues.slice(0, 3).forEach((issue) => lines.push(`  - ${markdownValue(issue.label)} — **${issue.affectedParticipants} из ${issue.startedParticipants}, ${issue.prevalencePercent}%**; 95% ДИ **${confidenceText(issue.prevalenceConfidence95)}**.`));
    }
    lines.push("");
  });

  lines.push("## 3. Поведенческие паттерны", "");
  [
    behaviorMetric("cashback_badge_first"),
    behaviorMetric("cashback_tab_first"),
    behaviorMetric("year_chart"),
    behaviorMetric("category_help"),
    behaviorMetric("category_limit"),
    behaviorMetric("recovered"),
    behaviorMetric("explored"),
  ].filter((metric): metric is NonNullable<typeof metric> => Boolean(metric)).forEach((metric) => {
    lines.push(`- ${markdownValue(metric.label)}: **${metric.count} из ${metric.total}** ${markdownValue(metric.denominatorLabel)} — **${metric.percent}%**.`);
  });

  lines.push("", "### Ошибки и исследование интерфейса", "");
  if (errorInteractions.length) {
    lines.push("**Ошибочные действия:**");
    rankByLabel(errorInteractions, (interaction) => `${interaction.scenarioTitle}: ${interaction.semanticLabel}`).forEach(([label, count]) => lines.push(`- ${markdownValue(label)} — **${count}**.`));
  } else {
    lines.push("Ошибочных действий не зафиксировано.");
  }
  lines.push("");
  if (infoInteractions.length) {
    lines.push("**Исследовательские действия:**");
    rankByLabel(infoInteractions, (interaction) => `${interaction.scenarioTitle}: ${interaction.semanticLabel}`).forEach(([label, count]) => lines.push(`- ${markdownValue(label)} — **${count}**.`));
  } else {
    lines.push("Исследовательских действий не зафиксировано.");
  }
  if (recoveryInteractions.length) {
    lines.push("", "**Возвраты после отклонений:**");
    rankByLabel(recoveryInteractions, (interaction) => `${interaction.scenarioTitle}: ${interaction.semanticLabel}`).forEach(([label, count]) => lines.push(`- ${markdownValue(label)} — **${count}**.`));
  }

  lines.push("", "## 4. Детализация по участникам", "");
  reports.forEach((report) => {
    const started = report.starlRecords.length;
    const completed = report.starlRecords.filter((record) => record.result.completed).length;
    lines.push(
      `### ${markdownValue(report.session.participantCode)}`,
      "",
      `- Сборка: **${markdownValue(report.session.buildId)}**.`,
      `- Сценариев начато/завершено: **${started} / ${completed}**.`,
      "- Общее время сессии не используется; ниже указано только время внутри сценариев.",
      "",
    );
    report.starlRecords.forEach((record) => {
      const errorCount = record.action.counts.errorTaps;
      const infoCount = record.action.counts.informationalTaps;
      const recoveryCount = record.action.counts.recoveryTaps;
      const correctCount = record.action.counts.correctTaps;
      const firstError = record.action.interactionNarrative.find((interaction) => interaction.verdict === "error");
      const firstInfo = record.action.interactionNarrative.find((interaction) => interaction.verdict === "info");
      const screens = record.action.chronologicalEvidence
        .filter((event) => event.type === "screen_view" && event.screen)
        .map((event) => screenLabels[event.screen ?? ""] ?? event.screen ?? "Неизвестный экран")
        .filter((screen, index, all) => index === 0 || screen !== all[index - 1]);
      lines.push(
        `#### ${markdownValue(record.task.title)}`,
        "",
        `- Результат: **${resultLabels[record.result.taskResult ?? "running"] ?? markdownValue(record.result.taskResult ?? "running")}**.`,
        `- Время: **${humanDuration(record.result.completionTimeMs)}**.`,
        `- SEQ: **${record.result.easeScore ?? "—"} из 7**.`,
        `- Тип прохождения: **${journeyLabels[record.result.journeySegment] ?? markdownValue(record.result.journeySegment)}**.`,
        `- Правильно / ошибки / возвраты / изучение: **${correctCount} / ${errorCount} / ${recoveryCount} / ${infoCount}**.`,
        `- Путь экранов: ${screens.length ? screens.map((screen) => `**${markdownValue(screen)}**`).join(" → ") : "не зафиксирован"}.`,
        `- Что сделал верно: ${correctCount ? "прошёл ожидаемые шаги сценария по зелёным событиям." : "верные шаги не зафиксированы."}`,
        `- Где ошибся: ${firstError ? `${markdownValue(firstError.semanticLabel)} на экране «${markdownValue(firstError.screen ? screenLabels[firstError.screen] ?? firstError.screen : "экран не определён")}» [событие №${firstError.eventId}].` : "ошибочных действий нет."}`,
        `- Где исследовал интерфейс: ${firstInfo ? `${markdownValue(firstInfo.semanticLabel)} [событие №${firstInfo.eventId}].` : "исследовательских действий нет."}`,
        `- Краткая интерпретация: ${record.result.completed ? "цель сценария достигнута" : "цель сценария не подтверждена"}; ${errorCount ? "были действия вне маршрута" : "ошибок не зафиксировано"}; ${infoCount ? "были допустимые исследования интерфейса" : "без дополнительного исследования"}.`,
        "",
      );
    });
  });

  lines.push(
    "## 5. STARL-блок и prompt для AI-анализа",
    "",
    "### Цель исследования",
    "",
    "Проверить, насколько участники понимают и выполняют три ключевых сценария банковского прототипа: копирование данных карты, первое подключение кешбэка и выбор категорий кешбэка на октябрь как следующий месяц.",
    "",
    "### Идеальные сценарии",
    "",
  );
  interactiveScenarios.forEach((scenario) => {
    lines.push(`- **${markdownValue(scenario.title)}:** ${markdownValue(scenario.prompt)}`);
    const path = expectedPaths[scenario.code];
    if (path) path.forEach((step) => lines.push(`  - Шаг ${step.step}: ${markdownValue(step.purpose)}.`));
  });
  lines.push(
    "",
    "### Правила интерпретации",
    "",
    "- `correct` — ожидаемый шаг сценария.",
    "- `recovery` — возврат после отклонения от маршрута.",
    "- `error` — действие вне активного сценария.",
    "- `info` — допустимое исследование интерфейса, не ошибка.",
    "- `scroll` — не ошибка и не шаг сценария.",
    "- Ожидание модератора, объяснение задания и паузы до кнопки «Старт» не входят в task time.",
    "- Observation — только то, что есть в событиях; inference — осторожная интерпретация; recommendation — продуктовая рекомендация с указанием основания.",
    "- не делать причинные выводы без достаточных данных и отдельной проверки.",
    "",
    "### Prompt для дальнейшего AI-анализа",
    "",
    ...STARL_ANALYSIS_PROMPT_RU.split("\n").map((line) => `> ${line}`),
    "",
    "При анализе этого общего отчёта сначала опиши агрегированные факты, затем различия между сценариями, затем паттерны поведения и только после этого рекомендации. Ссылайся на участников и номера событий из детализации, если делаешь качественный вывод.",
    "",
  );

  return `\uFEFF${lines.join("\n")}`;
}

export function buildSessionMarkdownReport(snapshot: SessionSnapshot, generatedAt = new Date().toISOString(), researchSummary?: ResearchSummary) {
  const report = buildStarlSessionExport(snapshot, generatedAt);
  const startedScenarios = report.coverage.filter((item) => item.status !== "not_started").length;
  const completedScenarios = report.coverage.filter((item) => item.status === "completed").length;
  const completedRecords = report.starlRecords.filter((record) => record.result.completed);
  const allInteractions = report.starlRecords.flatMap((record) => record.action.interactionNarrative);
  const errorInteractions = allInteractions.filter((interaction) => interaction.verdict === "error");
  const infoInteractions = allInteractions.filter((interaction) => interaction.verdict === "info");
  const cashbackEntries = report.starlRecords
    .filter((record) => record.scenarioCode === "CASHBACK_CONNECT" || record.scenarioCode === "CASHBACK_NEXT")
    .map((record) => record.action.interactionNarrative.find((interaction) => interaction.semanticId === "home.cashback.open" || interaction.semanticId === "cashback.tab.open"))
    .filter((interaction) => interaction !== undefined);
  const badgeEntries = cashbackEntries.filter((interaction) => interaction.semanticId === "home.cashback.open").length;
  const tabEntries = cashbackEntries.filter((interaction) => interaction.semanticId === "cashback.tab.open").length;
  const ranked = (interactions: typeof allInteractions) => {
    const counts = new Map<string, number>();
    interactions.forEach((interaction) => counts.set(interaction.semanticLabel, (counts.get(interaction.semanticLabel) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ru")).slice(0, 3);
  };
  const journeyCounts = Object.fromEntries([
    "ideal",
    "completed_with_exploration",
    "completed_with_errors",
    "detour_recovered",
  ].map((segment) => [segment, completedRecords.filter((record) => record.result.journeySegment === segment).length]));
  const lines = [
    "# Отчёт о юзабилити-тесте",
    "",
    "> Человекочитаемая версия записи. Выводы ниже основаны только на зафиксированных событиях; ожидание старта и разговор с модератором во время сценариев не учитываются.",
    "",
    "## Кратко",
    "",
    `- Участник: **${markdownValue(snapshot.session.participantCode)}**`,
    `- Сборка: **${markdownValue(snapshot.session.buildId)}**`,
    `- Сформировано: **${markdownValue(generatedAt)}**`,
    `- Начато сценариев: **${startedScenarios} из ${report.coverage.length}**`,
    `- Завершено сценариев: **${completedScenarios} из ${report.coverage.length}**`,
    "- Общее время сессии намеренно не рассчитывается. Ниже указано только время внутри каждого запущенного сценария.",
    "",
    "### Как читать отметки",
    "",
    "- **Верно** — ожидаемый шаг к цели.",
    "- **Ошибка** — действие не относится к активному сценарию.",
    "- **Возврат** — участник вернулся после отклонения от маршрута.",
    "- **Изучение** — допустимо исследовал интерфейс, не совершив ошибку.",
    "",
    "## Интерпретация результатов участника",
    "",
    "> Это описательная интерпретация зафиксированных действий, а не статистический вывод о всех пользователях.",
    "",
    `- Завершено **${completedScenarios} из ${startedScenarios}** начатых сценариев — **${percent(completedScenarios, startedScenarios)}%**.`,
    `- Идеально, без отклонений: **${journeyCounts.ideal ?? 0} из ${completedRecords.length}** завершённых — **${percent(journeyCounts.ideal ?? 0, completedRecords.length)}%**.`,
    `- С допустимым изучением: **${journeyCounts.completed_with_exploration ?? 0} из ${completedRecords.length}** — **${percent(journeyCounts.completed_with_exploration ?? 0, completedRecords.length)}%**.`,
    `- С ошибками: **${journeyCounts.completed_with_errors ?? 0} из ${completedRecords.length}** — **${percent(journeyCounts.completed_with_errors ?? 0, completedRecords.length)}%**.`,
    `- С уходом от маршрута и возвратом: **${journeyCounts.detour_recovered ?? 0} из ${completedRecords.length}** — **${percent(journeyCounts.detour_recovered ?? 0, completedRecords.length)}%**.`,
  ];

  if (cashbackEntries.length) {
    lines.push(
      `- Вход в кешбек через бейдж у общей суммы: **${badgeEntries} из ${cashbackEntries.length}** запусков — **${percent(badgeEntries, cashbackEntries.length)}%**.`,
      `- Вход через вкладку «Выгода»: **${tabEntries} из ${cashbackEntries.length}** запусков — **${percent(tabEntries, cashbackEntries.length)}%**.`,
    );
  }

  lines.push("", "### Самые частые действия, влияющие на прохождение", "");
  if (errorInteractions.length) {
    lines.push("**Ошибочные действия:**", "");
    ranked(errorInteractions).forEach(([label, count]) => lines.push(`- ${markdownValue(label)} — **${count}**, или **${percent(count, errorInteractions.length)}%** всех ошибочных нажатий участника.`));
  } else {
    lines.push("Ошибочных действий не зафиксировано.");
  }
  lines.push("");
  if (infoInteractions.length) {
    lines.push("**Дополнительное изучение:**", "");
    ranked(infoInteractions).forEach(([label, count]) => lines.push(`- ${markdownValue(label)} — **${count}**, или **${percent(count, infoInteractions.length)}%** исследовательских нажатий участника.`));
  } else {
    lines.push("Дополнительного изучения интерфейса не зафиксировано.");
  }

  if (researchSummary) {
    lines.push(
      "",
      "## Контекст всей выборки на момент выгрузки",
      "",
      `В расчёт вошло **${researchSummary.recordedSessions}** записанных сессий. Все проценты ниже сопровождаются числителем и знаменателем, чтобы их можно было корректно использовать в кейсе.`,
      "",
      "### Как пользователи проходили завершённые сценарии",
      "",
      ...researchSummary.journeySegments.map((metric) => `- ${markdownValue(metric.label)}: **${metric.count} из ${metric.total}** ${markdownValue(metric.denominatorLabel)} — **${metric.percent}%**.`),
      "",
      "### Популярные продуктовые метрики",
      "",
      ...researchSummary.metrics.map((metric) => `- ${markdownValue(metric.label)}: **${metric.count} из ${metric.total}** ${markdownValue(metric.denominatorLabel)} — **${metric.percent}%**.`),
    );
    lines.push("", "### Стандартные метрики по сценариям", "");
    researchSummary.scenarioMetrics.forEach((scenario) => {
      const completionCi = scenario.completionConfidence95 ? `${scenario.completionConfidence95.lower}–${scenario.completionConfidence95.upper}%` : "—";
      const firstClickCi = scenario.firstClickConfidence95 ? `${scenario.firstClickConfidence95.lower}–${scenario.firstClickConfidence95.upper}%` : "—";
      const errorFreeCi = scenario.errorFreeConfidence95 ? `${scenario.errorFreeConfidence95.lower}–${scenario.errorFreeConfidence95.upper}%` : "—";
      const directPathCi = scenario.directPathConfidence95 ? `${scenario.directPathConfidence95.lower}–${scenario.directPathConfidence95.upper}%` : "—";
      const seqPositiveCi = scenario.seqPositiveConfidence95 ? `${scenario.seqPositiveConfidence95.lower}–${scenario.seqPositiveConfidence95.upper}%` : "—";
      lines.push(
        `#### ${markdownValue(scenario.title)}`,
        "",
        `- Task completion: **${scenario.completedParticipants} из ${scenario.startedParticipants} — ${scenario.completionRate}%**; 95% ДИ **${completionCi}**.`,
        `- Без помощи: **${scenario.unaidedCompletionRate}%**; с помощью: **${scenario.aidedCompletionRate}%**; неуспешно: **${scenario.failureRate}%**.`,
        `- Error-free completion: **${scenario.errorFreeCompletionRate}%** завершивших; 95% ДИ **${errorFreeCi}**.`,
        `- Direct path: **${scenario.directPathRate}%** завершивших прошли без ошибок, изучения, возвратов и лишних тапов; 95% ДИ **${directPathCi}**.`,
        `- Успешный первый клик: **${scenario.firstClickSuccessRate}%** запусков с зафиксированным первым тапом; 95% ДИ **${firstClickCi}**.`,
        `- Время выполнения: median **${humanDuration(scenario.medianCompletionTimeMs)}**, P75 **${humanDuration(scenario.p75CompletionTimeMs)}**.`,
        `- Лишние тапы сверх эталонного пути: median **${scenario.medianExcessTaps ?? "—"}**, P75 **${scenario.p75ExcessTaps ?? "—"}**.`,
        `- SEQ: среднее **${scenario.seqMean ?? "—"}**, median **${scenario.seqMedian ?? "—"} из 7**, ответов **${scenario.seqResponseCount}**, оценили лёгкость на 5–7 — **${scenario.seqPositiveRate}%**; 95% ДИ **${seqPositiveCi}**.`,
        `- Сейчас выполняют: **${scenario.inProgressParticipants}**; исключено повреждённых попыток: **${scenario.excludedParticipants}**. Они не входят в проценты выше.`,
      );
      if (scenario.dropoffs.length) {
        lines.push("- Точки схода:", ...scenario.dropoffs.map((dropoff) => `  - ${markdownValue(dropoff.label)} — **${dropoff.count} из ${dropoff.total}, ${dropoff.percent}%**.`));
      }
      lines.push("");
    });
    lines.push("### Распространённость проблем", "", "Ниже показана описательная связь с завершением в этой выборке. Она помогает приоритизировать наблюдения, но не доказывает причинность.", "");
    if (researchSummary.issueMetrics.length) {
      lines.push(...researchSummary.issueMetrics.map((issue) => {
        const confidence = issue.prevalenceConfidence95 ? `${issue.prevalenceConfidence95.lower}–${issue.prevalenceConfidence95.upper}%` : "—";
        const comparison = issue.unaffectedCompletionRate === null ? "группы сравнения нет" : `без проблемы — ${issue.unaffectedCompletionRate}%, разница ${issue.completionDifferencePp! > 0 ? "+" : ""}${issue.completionDifferencePp} п.п.`;
        return `- **${markdownValue(issue.scenarioTitle)}:** ${markdownValue(issue.label)} — затронуло **${issue.affectedParticipants} из ${issue.startedParticipants} участников (${issue.prevalencePercent}%; 95% ДИ ${confidence})**; completion с проблемой — **${issue.affectedCompletionRate}%**, ${comparison}; вернулись после отклонения — **${issue.recoveredParticipants} (${issue.recoveryRate}%)**; всего повторов: **${issue.occurrenceCount}**.`;
      }));
    } else {
      lines.push("Ошибочных действий в выборке пока не зафиксировано.");
    }
  }

  report.starlRecords.forEach((record, index) => {
    const evidence = record.action.chronologicalEvidence;
    const screens = evidence
      .filter((event) => event.type === "screen_view" && event.screen)
      .map((event) => screenLabels[event.screen ?? ""] ?? event.screen ?? "Неизвестный экран")
      .filter((screen, screenIndex, all) => screenIndex === 0 || screen !== all[screenIndex - 1]);
    const scrollCount = evidence.filter((event) => event.type === "scroll").length;
    const result = record.result.taskResult ?? "running";

    lines.push(
      "",
      `## Сценарий ${index + 1}. ${markdownValue(record.task.title)}`,
      "",
      `**Задание участнику:** ${markdownValue(record.task.participantPrompt ?? "Описание не задано")}`,
      "",
      `- Результат: **${resultLabels[result] ?? markdownValue(result)}**.`,
      `- Время выполнения: **${humanDuration(record.result.completionTimeMs)}**.`,
      `- Характер прохождения: **${journeyLabels[record.result.journeySegment] ?? markdownValue(record.result.journeySegment)}**.`,
      `- Действия: **${record.action.counts.correctTaps} верных**, **${record.action.counts.errorTaps} ошибочных**, **${record.action.counts.recoveryTaps} возвратов**, **${record.action.counts.informationalTaps} исследовательских**.`,
      `- Скроллы: **${scrollCount}** зафиксированных движений. Они не считаются ошибками или шагами.`,
      `- Путь по экранам: ${screens.length ? screens.map((screen) => `**${markdownValue(screen)}**`).join(" → ") : "не зафиксирован"}.`,
      "",
      "### Хронология действий",
      "",
    );

    if (record.action.interactionNarrative.length === 0) {
      lines.push("Зафиксированных нажатий нет.");
    } else {
      record.action.interactionNarrative.forEach((interaction, interactionIndex) => {
        const verdict = interaction.verdict === "correct" ? "Верно"
          : interaction.verdict === "error" ? "Ошибка"
            : interaction.verdict === "recovery" ? "Возврат"
              : interaction.verdict === "info" ? "Изучение" : "Без оценки";
        const screen = interaction.screen ? screenLabels[interaction.screen] ?? interaction.screen : "экран не определён";
        lines.push(`${interactionIndex + 1}. **${elapsedLabel(interaction.elapsedFromScenarioStartMs)}** — участник ${markdownValue(interaction.semanticLabel)} на экране «${markdownValue(screen)}». **${verdict}.** [Событие №${interaction.eventId}]`);
      });
    }

    lines.push("", "### Фактический итог", "");
    if (record.result.completed) {
      lines.push(`Сценарий завершён. Последовательность событий ${record.result.completionSupportedByEventSequence ? "подтверждает достижение целевого состояния" : "не позволяет однозначно подтвердить целевое состояние"}.`);
    } else {
      lines.push("Сценарий не имеет подтверждённого завершения. Его нельзя включать в показатель успешности как завершённый.");
    }
    if (record.result.moderatorNote) lines.push(`Заметка модератора: ${markdownValue(record.result.moderatorNote)}`);
    if (record.result.corruptedReason) lines.push(`Причина повреждения записи: ${markdownValue(record.result.corruptedReason)}`);
  });

  lines.push(
    "",
    "## Как интерпретировать метрики в кейсе",
    "",
    "- **Effectiveness:** Task completion, error-free completion и успешный первый клик показывают, смог ли участник достичь цели и насколько хорошо интерфейс направил первое действие.",
    "- **Efficiency:** task time, direct path и лишние тапы показывают цену достижения цели. Время считается только внутри сценария по моментам действий участника.",
    "- **Satisfaction:** SEQ — самостоятельная субъективная оценка лёгкости сразу после задания; она дополняет, но не заменяет наблюдаемое поведение.",
    "- **Проблемы:** распространённость считается по уникальным участникам. Количество повторных кликов лишь показывает интенсивность проблемы.",
    "- **Неопределённость:** рядом с бинарными долями указан Wilson 95% ДИ. При небольшой выборке он закономерно широк, поэтому выводы следует формулировать как наблюдения этой выборки и проверять на следующей итерации.",
    "- **Влияние:** разница completion у столкнувшихся и не столкнувшихся с проблемой — описательная связь, а не доказательство причинности.",
    "",
    "Методическая опора: [ISO 9241-11](https://www.iso.org/standard/63500.html), [Nielsen Norman Group — Usability Metrics](https://www.nngroup.com/articles/usability-metrics/), [Nielsen Norman Group — Success Rate](https://www.nngroup.com/articles/success-rate-the-simplest-usability-metric/), [Google HEART](https://research.google/pubs/measuring-the-user-experience-on-a-large-scale-user-centered-metrics-for-web-applications/), [MeasuringU — SEQ](https://measuringu.com/seq10/).",
    "",
    "## Инструкция для анализа нейросетью",
    "",
    ...STARL_ANALYSIS_PROMPT_RU.split("\n").map((line) => `> ${line}`),
    "",
    "При формулировании выводов необходимо ссылаться на номера событий из хронологии и отдельно обозначать наблюдения, интерпретации и рекомендации.",
    "",
  );

  return `\uFEFF${lines.join("\n")}`;
}
