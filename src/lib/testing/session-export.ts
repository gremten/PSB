import { getTask, interactiveScenarios, type InteractiveScenarioCode } from "@/config/test-scenarios";
import { calculateTaskMetrics } from "./metrics";
import type { ResearchSummary } from "./research-summary";
import { isScenarioGateTarget, scenarioProgress, scenarioVerdictForEvent, type ScenarioVerdict } from "./scenario-progress";
import type { SessionSnapshot, TaskRun, TrackedEvent } from "./types";

export const STARL_EXPORT_SCHEMA_VERSION = "psb.usability.starl.v3";

export const STARL_ANALYSIS_PROMPT_RU = `Проанализируй приложенную выгрузку юзабилити-теста по методике STARL (Situation, Task, Action, Result, Learning). Исследовались три сценария: просмотр и копирование данных карты; первое подключение кешбэка; выбор категорий кешбэка на октябрь как следующий месяц. Для каждого сценария восстанови хронологию только по action.interactionNarrative и action.chronologicalEvidence, отделяя observation от inference и recommendation и ссылаясь на evidenceEventIds. correct — ожидаемый шаг, error — действие вне активного сценария, recovery — возврат из неверного раздела, info — допустимое исследование интерфейса, а не ошибка; скроллы ошибками не являются. Отдельно оцени идеальное прохождение, прохождение с исследованием, уход в другой раздел с возвратом, ошибки и восстановление, способ входа в кешбек через бейдж у суммы или таббар и время каждого сценария. Для времени используй только completionTimeMs и elapsedFromScenarioStartMs: не вычисляй общее время сессии, поскольку ожидание старта и разговор с модератором не относятся к задаче. Не делай выводов о банковских значениях или личных данных. Сначала дай факты по каждому сценарию, затем общие паттерны, продуктовые выводы и приоритизированные рекомендации.`;

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

function semanticLabel(id: string | null | undefined) {
  if (!id) return "событие без семантической метки";
  const labels: Record<string, string> = {
    "home.account.open": "открыл текущий счёт",
    "home.savings.open": "открыл накопительный счёт",
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
  if (/^cashback\.category\.[^.]+\.toggle$/.test(id)) return "изменил выбор категории кешбека";
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
    const interactions = runEvents.filter((event) => event.type === "tap").map((event, index) => {
      const verdict = scenarioVerdictForEvent(event, run.taskCode);
      const label = semanticLabel(semanticId(event));
      return {
        order: index + 1,
        eventId: event.id,
        elapsedFromScenarioStartMs: elapsedMs(event.timestamp, run.startedAt),
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
    analysisPrompt: {
      language: "ru",
      methodology: "STARL",
      text: STARL_ANALYSIS_PROMPT_RU,
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
    ["id", "timestamp", "type", "screen", "action", "target", "taskRunId", "metadata", "schemaVersion", "participantCode", "variant", "buildId", "taskCode", "taskResult", "elapsedTaskMs", "semanticId", "semanticLabel", "scenarioVerdict", "interpretation"],
    ...snapshot.events.map((event) => {
      const run = event.taskRunId ? runs.get(event.taskRunId) : undefined;
      const verdict = scenarioVerdictForEvent(event, run?.taskCode);
      return [event.id, event.timestamp, event.type, event.screen, event.action, event.target, event.taskRunId, event.metadata, STARL_EXPORT_SCHEMA_VERSION, snapshot.session.participantCode, snapshot.session.variant, snapshot.session.buildId, run?.taskCode, run?.result, elapsedMs(event.timestamp, run?.startedAt), semanticId(event), semanticLabel(semanticId(event)), verdict, interactionInterpretation(verdict)];
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
    "## Инструкция для анализа нейросетью",
    "",
    ...STARL_ANALYSIS_PROMPT_RU.split("\n").map((line) => `> ${line}`),
    "",
    "При формулировании выводов необходимо ссылаться на номера событий из хронологии и отдельно обозначать наблюдения, интерпретации и рекомендации.",
    "",
  );

  return `\uFEFF${lines.join("\n")}`;
}
