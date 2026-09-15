import type { UsabilityTask } from "@/config/test-scenarios";
import { isScenarioGateTarget, scenarioVerdictForEvent } from "./scenario-progress";
import type { TaskRun, TrackedEvent } from "./types";

const meaningfulTypes = new Set(["tap", "action", "navigation", "product_state_change"]);

export interface TaskMetrics {
  taskCode: string;
  result: TaskRun["result"];
  completionTimeMs: number | null;
  meaningfulSteps: number;
  correctTaps: number;
  wrongTaps: number;
  recoveryTaps: number;
  infoTaps: number;
  goldenPathSteps: number | null;
  deviationFromGoldenPath: number | null;
  easeScore: number | null;
  firstClickCorrect: boolean | null;
  errorFree: boolean;
  directPath: boolean;
  excessTaps: number | null;
  firstMeaningfulAction: string | null;
  sequence: string[];
}

export function calculateTaskMetrics(
  run: TaskRun,
  events: TrackedEvent[],
  task: UsabilityTask | { goldenStepCount: number | null; metricMode?: string } | null,
): TaskMetrics {
  const relevant = events.filter((event) => event.taskRunId === run.id && !(event.type === "tap" && isScenarioGateTarget(event.target ?? event.action)));
  const meaningful = relevant.filter((event) => meaningfulTypes.has(event.type));
  const steps = task && "metricMode" in task && task.metricMode === "taps" ? relevant.filter((event) => event.type === "tap") : meaningful;
  const golden = task?.goldenStepCount ?? null;
  const taps = relevant.filter((event) => event.type === "tap");
  const verdicts = taps.map((event) => scenarioVerdictForEvent(event, run.taskCode));
  const errorFree = !verdicts.includes("error");
  const excessTaps = golden === null ? null : Math.max(0, taps.length - golden);
  return {
    taskCode: run.taskCode,
    result: run.result,
    completionTimeMs:
      run.endedAt === null
        ? null
        : Math.max(0, new Date(run.endedAt).getTime() - new Date(run.startedAt).getTime()),
    meaningfulSteps: steps.length,
    correctTaps: relevant.filter((event) => scenarioVerdictForEvent(event, run.taskCode) === "correct").length,
    wrongTaps: relevant.filter((event) => scenarioVerdictForEvent(event, run.taskCode) === "error").length,
    recoveryTaps: relevant.filter((event) => scenarioVerdictForEvent(event, run.taskCode) === "recovery").length,
    infoTaps: relevant.filter((event) => scenarioVerdictForEvent(event, run.taskCode) === "info").length,
    goldenPathSteps: golden,
    deviationFromGoldenPath: golden === null ? null : steps.length - golden,
    easeScore: run.easeScore,
    firstClickCorrect: taps.length ? verdicts[0] === "correct" : null,
    errorFree,
    directPath: Boolean(run.result === "unaided" && taps.length > 0 && verdicts.every((verdict) => verdict === "correct") && excessTaps === 0),
    excessTaps,
    firstMeaningfulAction: meaningful[0]?.action ?? meaningful[0]?.target ?? null,
    sequence: relevant
      .filter((event) => event.type === "screen_view" || meaningfulTypes.has(event.type))
      .map((event) =>
        [event.type, event.screen, event.action ?? event.target].filter(Boolean).join(":"),
      ),
  };
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function percentile(values: number[], percentileValue: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * percentileValue;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

export interface AggregateTaskMetrics {
  taskCode: string;
  includedCount: number;
  completionRate: number;
  unaidedCompletionRate: number;
  aidedCompletionRate: number;
  failureRate: number;
  errorFreeCompletionRate: number;
  directPathRate: number;
  firstClickSuccessRate: number;
  aidedCount: number;
  failedCount: number;
  corruptedCount: number;
  medianCompletionTimeMs: number | null;
  p75CompletionTimeMs: number | null;
  medianSteps: number | null;
  medianDeviationFromGoldenPath: number | null;
  medianExcessTaps: number | null;
  p75ExcessTaps: number | null;
  easeMedian: number | null;
  easeResponseCount: number;
  easePositiveRate: number;
  easeDistribution: Record<number, number>;
}

export function aggregateTaskMetrics(metrics: TaskMetrics[]): AggregateTaskMetrics[] {
  const groups = new Map<string, TaskMetrics[]>();
  for (const metric of metrics) groups.set(metric.taskCode, [...(groups.get(metric.taskCode) ?? []), metric]);

  return [...groups.entries()].map(([taskCode, all]) => {
    const included = all.filter((item) => item.result !== "corrupted");
    const completed = included.filter((item) => item.result === "unaided" || item.result === "aided");
    const completionTimes = completed.flatMap((item) =>
      item.completionTimeMs === null ? [] : [item.completionTimeMs],
    );
    const deviations = included.flatMap((item) =>
      item.deviationFromGoldenPath === null ? [] : [item.deviationFromGoldenPath],
    );
    const easeScores = included.flatMap((item) => (item.easeScore === null ? [] : [item.easeScore]));
    const excessTaps = completed.flatMap((item) => item.excessTaps === null ? [] : [item.excessTaps]);
    const easeDistribution = Object.fromEntries(
      [1, 2, 3, 4, 5, 6, 7].map((score) => [score, easeScores.filter((item) => item === score).length]),
    );
    return {
      taskCode,
      includedCount: included.length,
      completionRate: included.length ? completed.length / included.length : 0,
      unaidedCompletionRate: included.length
        ? included.filter((item) => item.result === "unaided").length / included.length
        : 0,
      aidedCompletionRate: included.length ? included.filter((item) => item.result === "aided").length / included.length : 0,
      failureRate: included.length ? included.filter((item) => item.result === "failed").length / included.length : 0,
      errorFreeCompletionRate: completed.length ? completed.filter((item) => item.errorFree).length / completed.length : 0,
      directPathRate: completed.length ? completed.filter((item) => item.directPath).length / completed.length : 0,
      firstClickSuccessRate: included.filter((item) => item.firstClickCorrect !== null).length
        ? included.filter((item) => item.firstClickCorrect).length / included.filter((item) => item.firstClickCorrect !== null).length
        : 0,
      aidedCount: included.filter((item) => item.result === "aided").length,
      failedCount: included.filter((item) => item.result === "failed").length,
      corruptedCount: all.filter((item) => item.result === "corrupted").length,
      medianCompletionTimeMs: median(completionTimes),
      p75CompletionTimeMs: percentile(completionTimes, 0.75),
      medianSteps: median(included.map((item) => item.meaningfulSteps)),
      medianDeviationFromGoldenPath: median(deviations),
      medianExcessTaps: median(excessTaps),
      p75ExcessTaps: percentile(excessTaps, 0.75),
      easeMedian: median(easeScores),
      easeResponseCount: easeScores.length,
      easePositiveRate: easeScores.length ? easeScores.filter((score) => score >= 5).length / easeScores.length : 0,
      easeDistribution,
    };
  });
}
