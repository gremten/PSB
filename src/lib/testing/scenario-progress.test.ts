import { describe, expect, it } from "vitest";
import type { InteractiveScenarioCode } from "@/config/test-scenarios";
import type { TrackedEvent } from "./types";
import { classifyScenarioTap, scenarioProgress, scenarioVerdictForEvent } from "./scenario-progress";

function event(id: number, type: string, action: string, metadata: Record<string, unknown> = {}): TrackedEvent {
  return { id, sessionId: "session", taskRunId: "run", timestamp: new Date(id * 1000).toISOString(), type, screen: "/", action, target: action, metadata };
}

describe("three recorded usability flows", () => {
  it("finishes card copy only after the copied toast disappears", () => {
    const steps = [event(1, "tap", "home.account.open"), event(2, "tap", "account.card.salary.open"), event(3, "tap", "card.salary.flip"), event(4, "tap", "card.salary.number.copy")];
    expect(scenarioProgress("CARD_COPY", steps)).toMatchObject({ stage: 4, completed: false });
    expect(scenarioProgress("CARD_COPY", [...steps, event(5, "action", "card.copy.toast.closed")]).completed).toBe(true);
  });

  it.each(["CASHBACK_CONNECT", "CASHBACK_NEXT"] as InteractiveScenarioCode[])("requires three categories and accepts either sheet dismissal in %s", (code) => {
    const entry = code === "CASHBACK_CONNECT" ? "cashback.connect.start" : "cashback.next_month.categories.open";
    const close = code === "CASHBACK_CONNECT" ? "cashback.success" : "cashback.next_month.success";
    const steps = [event(1, "tap", "cashback.tab.open"), event(2, "tap", entry), event(3, "tap", "cashback.category.all.toggle"), event(4, "tap", "cashback.category.flights.toggle")];
    expect(classifyScenarioTap(code, steps, "cashback.categories.confirm", { selectedCount: 2 }, "/cashback/categories")).toBe("error");
    steps.push(event(5, "tap", "cashback.category.taxi.toggle"));
    steps.push(event(6, "tap", "cashback.categories.confirm", { selectedCount: 3 }));
    expect(scenarioProgress(code, steps).completed).toBe(false);
    expect(scenarioProgress(code, [...steps, event(7, "tap", `${close}.close`)]).completed).toBe(true);
    expect(scenarioProgress(code, [...steps, event(7, "action", `${close}.dismissed`)]).completed).toBe(true);
    const dismissedFirst = [...steps, event(7, "action", `${close}.dismissed`)];
    expect(classifyScenarioTap(code, dismissedFirst, `${close}.close`, {}, "/cashback")).toBe("correct");
    expect(scenarioVerdictForEvent(event(8, "tap", `${close}.close`, { scenarioVerdict: "error" }), code)).toBe("correct");
  });

  it("marks a wrong section red, its back navigation as recovery, and ignores scrolling", () => {
    const before = [event(1, "tap", "home.account.open")];
    expect(classifyScenarioTap("CARD_COPY", before, "cashback.tab.open", {}, "/account")).toBe("error");
    expect(classifyScenarioTap("CARD_COPY", before, "navigation.back", {}, "/cashback")).toBe("recovery");
    expect(scenarioProgress("CARD_COPY", [...before, event(2, "screen_view", "/cashback")]).stage).toBe(1);
  });

  it("classifies category help and chart period changes as informational", () => {
    const categories = [event(1, "tap", "cashback.tab.open"), event(2, "tap", "cashback.next_month.categories.open")];
    expect(classifyScenarioTap("CASHBACK_NEXT", categories, "cashback.category.fuel.faq.open", {}, "/cashback/categories")).toBe("info");
    expect(classifyScenarioTap("CASHBACK_NEXT", [event(1, "tap", "cashback.tab.open")], "cashback.period.year", {}, "/cashback")).toBe("info");
    expect(scenarioProgress("CASHBACK_NEXT", [...categories, event(3, "tap", "cashback.category.fuel.faq.open")]).stage).toBe(2);
  });
});
