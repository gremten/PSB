import type { InteractiveScenarioCode } from "@/config/test-scenarios";
import type { TrackedEvent } from "./types";

export type ScenarioVerdict = "correct" | "error" | "recovery" | "info";

export interface ScenarioProgress {
  stage: number;
  selectedCategories: string[];
  completed: boolean;
}

const cardBadge = /^account\.card\.(primary|strong|salary)\.open$/;
const cardFlip = /^card\.(night|orange|salary)\.flip$/;
const cardCopy = /^card\.(night|orange|salary)\.(number|expiry|cvv)\.copy$/;
const categoryToggle = /^cashback\.category\.([a-z]+)\.toggle$/;

export function isScenarioGateTarget(target: string | null | undefined) {
  return target === "participant.scenario.start";
}

export function isScenarioInfoTarget(target: string | null | undefined) {
  return Boolean(target && (/^cashback\.category\.[^.]+\.faq\.open$/.test(target) || target === "cashback.period.month" || target === "cashback.period.year"));
}

export function scenarioVerdictForEvent(event: TrackedEvent, taskCode?: string): ScenarioVerdict | null {
  if (event.type !== "tap") return null;
  const target = event.target ?? event.action;
  // A sheet dismissal request can reach the server just before its captured click.
  // These controls exist only after success, so late-arriving taps remain correct.
  if (taskCode === "CASHBACK_CONNECT" && (target === "cashback.success.close" || target === "cashback.success.drag")) return "correct";
  if (taskCode === "CASHBACK_NEXT" && (target === "cashback.next_month.success.close" || target === "cashback.next_month.success.drag")) return "correct";
  if (taskCode && taskCode !== "CARD_COPY" && isScenarioInfoTarget(event.target ?? event.action)) return "info";
  const verdict = event.metadata.scenarioVerdict;
  return verdict === "correct" || verdict === "error" || verdict === "recovery" || verdict === "info" ? verdict : null;
}

export function scenarioProgress(code: InteractiveScenarioCode, events: TrackedEvent[]): ScenarioProgress {
  let stage = 0;
  let selectedCategories: string[] = [];
  for (const event of events) {
    const action = event.action ?? event.target ?? "";
    if (code === "CARD_COPY") {
      if (stage === 0 && event.type === "tap" && action === "home.account.open") stage = 1;
      else if (stage === 1 && event.type === "tap" && cardBadge.test(action)) stage = 2;
      else if (stage === 2 && event.type === "tap" && cardFlip.test(action)) stage = 3;
      else if (stage === 3 && event.type === "tap" && cardCopy.test(action)) stage = 4;
      else if (stage === 4 && event.type === "action" && action === "card.copy.toast.closed") stage = 5;
      continue;
    }
    const entry = code === "CASHBACK_CONNECT" ? "cashback.connect.start" : "cashback.next_month.categories.open";
    const finish = code === "CASHBACK_CONNECT" ? "cashback.success" : "cashback.next_month.success";
    if (stage === 0 && event.type === "tap" && (action === "home.cashback.open" || action === "cashback.tab.open")) stage = 1;
    else if (stage === 1 && event.type === "tap" && action === entry) stage = 2;
    else if (stage === 2 && event.type === "tap") {
      const match = categoryToggle.exec(action);
      if (match) {
        selectedCategories = selectedCategories.includes(match[1])
          ? selectedCategories.filter((id) => id !== match[1])
          : selectedCategories.length < 3 ? [...selectedCategories, match[1]] : selectedCategories;
      } else if (action === "cashback.categories.confirm" && (event.metadata.selectedCount === 3 || selectedCategories.length === 3)) stage = 3;
    } else if (stage === 3 && ((event.type === "tap" && action === `${finish}.close`)
      || ((event.type === "action" || event.type === "product_state_change") && action === `${finish}.dismissed`))) stage = 4;
  }
  return { stage, selectedCategories, completed: code === "CARD_COPY" ? stage === 5 : stage === 4 };
}

export function classifyScenarioTap(code: InteractiveScenarioCode, events: TrackedEvent[], target: string, metadata: Record<string, unknown> = {}, screen = "/"): ScenarioVerdict {
  const { stage, selectedCategories } = scenarioProgress(code, events);
  const expectedScreen = code === "CARD_COPY" ? ["/", "/account", "/card", "/card", "/card"][Math.min(stage, 4)]
    : ["/", "/cashback", "/cashback/categories", code === "CASHBACK_CONNECT" ? "/" : "/cashback"][Math.min(stage, 3)];
  if (target === "navigation.back" || target === "tab.home.open") return screen !== expectedScreen ? "recovery" : "error";
  if (code === "CARD_COPY") {
    if (stage === 0 && target === "home.account.open") return "correct";
    if (stage === 1 && cardBadge.test(target)) return "correct";
    if (stage === 2 && (cardFlip.test(target) || /^card\.[^.]+\.select$/.test(target))) return "correct";
    if (stage === 3 && (cardCopy.test(target) || cardFlip.test(target) || /^card\.[^.]+\.select$/.test(target) || /^card\.[^.]+\.details\.hide$/.test(target))) return "correct";
    if (stage === 4 && target === "card.copy.toast.dismiss") return "correct";
    return "error";
  }
  if (isScenarioInfoTarget(target)) return "info";
  const entry = code === "CASHBACK_CONNECT" ? "cashback.connect.start" : "cashback.next_month.categories.open";
  const finish = code === "CASHBACK_CONNECT" ? "cashback.success" : "cashback.next_month.success";
  if (stage === 0 && (target === "home.cashback.open" || target === "cashback.tab.open")) return "correct";
  if (stage === 1 && target === entry) return "correct";
  if (stage === 2) {
    const match = categoryToggle.exec(target);
    if (match) return selectedCategories.includes(match[1]) || selectedCategories.length < 3 ? "correct" : "error";
    if (target === "cashback.categories.confirm") return metadata.selectedCount === 3 || selectedCategories.length === 3 ? "correct" : "error";
  }
  if (stage >= 3 && (target === `${finish}.close` || target === `${finish}.drag`)) return "correct";
  return "error";
}
