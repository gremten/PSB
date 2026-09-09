import type { UsabilityTask } from "@/config/test-scenarios";
import type { TaskRun, TrackedEvent } from "./types";

const meaningfulTypes = new Set(["tap", "action", "navigation", "product_state_change"]);

export interface TaskMetrics {
  taskCode: string;
  result: TaskRun["result"];
  completionTimeMs: number | null;
  meaningfulSteps: number;
  goldenPathSteps: number | null;
  deviationFromGoldenPath: number | null;
  easeScore: number | null;
  firstMeaningfulAction: string | null;
  sequence: string[];
}

export function calculateTaskMetrics(
  run: TaskRun,
  events: TrackedEvent[],
  task: UsabilityTask | null,
): TaskMetrics {
  const relevant = events.filter((event) => event.taskRunId === run.id);
  const meaningful = relevant.filter((event) => meaningfulTypes.has(event.type));
  const golden = task?.goldenStepCount ?? null;
  return {
    taskCode: run.taskCode,
    result: run.result,
    completionTimeMs:
      run.endedAt === null
        ? null
        : Math.max(0, new Date(run.endedAt).getTime() - new Date(run.startedAt).getTime()),
    meaningfulSteps: meaningful.length,
    goldenPathSteps: golden,
    deviationFromGoldenPath: golden === null ? null : meaningful.length - golden,
    easeScore: run.easeScore,
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

export interface AggregateTaskMetrics {
  taskCode: string;
  includedCount: number;
  unaidedCompletionRate: number;
  aidedCount: number;
  failedCount: number;
  corruptedCount: number;
  medianCompletionTimeMs: number | null;
  medianSteps: number | null;
  medianDeviationFromGoldenPath: number | null;
  easeMedian: number | null;
  easeDistribution: Record<number, number>;
}

export function aggregateTaskMetrics(metrics: TaskMetrics[]): AggregateTaskMetrics[] {
  const groups = new Map<string, TaskMetrics[]>();
  for (const metric of metrics) groups.set(metric.taskCode, [...(groups.get(metric.taskCode) ?? []), metric]);

  return [...groups.entries()].map(([taskCode, all]) => {
    const included = all.filter((item) => item.result !== "corrupted");
    const completionTimes = included.flatMap((item) =>
      item.completionTimeMs === null ? [] : [item.completionTimeMs],
    );
    const deviations = included.flatMap((item) =>
      item.deviationFromGoldenPath === null ? [] : [item.deviationFromGoldenPath],
    );
    const easeScores = included.flatMap((item) => (item.easeScore === null ? [] : [item.easeScore]));
    const easeDistribution = Object.fromEntries(
      [1, 2, 3, 4, 5, 6, 7].map((score) => [score, easeScores.filter((item) => item === score).length]),
    );
    return {
      taskCode,
      includedCount: included.length,
      unaidedCompletionRate: included.length
        ? included.filter((item) => item.result === "unaided").length / included.length
        : 0,
      aidedCount: included.filter((item) => item.result === "aided").length,
      failedCount: included.filter((item) => item.result === "failed").length,
      corruptedCount: all.filter((item) => item.result === "corrupted").length,
      medianCompletionTimeMs: median(completionTimes),
      medianSteps: median(included.map((item) => item.meaningfulSteps)),
      medianDeviationFromGoldenPath: median(deviations),
      easeMedian: median(easeScores),
      easeDistribution,
    };
  });
}
