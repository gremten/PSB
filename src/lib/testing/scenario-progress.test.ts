import { describe, expect, it } from "vitest";
import type { InteractiveScenarioCode } from "@/config/test-scenarios";
import type { TrackedEvent } from "./types";
import { classifyScenarioTap, scenarioProgress, scenarioVerdictForEvent } from "./scenario-progress";

function event(id: number, type: string, action: string, metadata: Record<string, unknown> = {}): TrackedEvent {
  return { id, sessionId: "session", taskRunId: "run", timestamp: new Date(id * 1000).toISOString(), type, screen: "/", action, target: action, metadata };
}

describe("three recorded usability flows", () => {
  it("finishes card copy as soon as any field is copied", () => {
    const steps = [event(1, "tap", "home.account.open"), event(2, "tap", "account.card.salary.open"), event(3, "tap", "card.salary.flip")];
    expect(scenarioProgress("CARD_COPY", [...steps, event(4, "tap", "card.salary.number.copy")])).toMatchObject({ stage: 4, completed: true });
    expect(scenarioProgress("CARD_COPY", [...steps, event(4, "tap", "card.salary.cvv.copy")]).completed).toBe(true);
    // Hiding the details before the toast disappears must not undo the completion.
    expect(scenarioProgress("CARD_COPY", [...steps, event(4, "tap", "card.salary.expiry.copy"), event(5, "product_state_change", "card.salary.details.hide")]).completed).toBe(true);
  });

  it("never counts copying a field of any card as an error", () => {
    const steps = [event(1, "tap", "home.account.open"), event(2, "tap", "account.card.strong.open"), event(3, "tap", "card.night.flip")];
    expect(classifyScenarioTap("CARD_COPY", steps, "card.night.expiry.copy", {}, "/card")).toBe("correct");
    const copied = [...steps, event(4, "tap", "card.night.number.copy")];
    for (const field of ["number", "expiry", "cvv"]) {
      expect(classifyScenarioTap("CARD_COPY", copied, `card.orange.${field}.copy`, {}, "/card")).toBe("correct");
      expect(scenarioVerdictForEvent(event(5, "tap", `card.orange.${field}.copy`, { scenarioVerdict: "error" }), "CARD_COPY")).toBe("correct");
    }
    expect(classifyScenarioTap("CARD_COPY", copied, "card.night.details.hide", {}, "/card")).toBe("correct");
    expect(classifyScenarioTap("CARD_COPY", copied, "card.copy.toast.dismiss", {}, "/card")).toBe("correct");
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
    // Every way of closing the final sheet ends the scenario: button, drag, or the
    // product-state dismissal both of them emit.
    for (const closer of [event(7, "tap", `${close}.close`), event(7, "tap", `${close}.drag`), event(7, "action", `${close}.dismissed`), event(7, "product_state_change", `${close}.dismissed`)]) {
      const withDismissal = closer.type === "tap" ? [...steps, closer, event(8, "product_state_change", `${close}.dismissed`)] : [...steps, closer];
      expect(scenarioProgress(code, withDismissal).completed).toBe(true);
    }
  });

  it("marks a wrong section red, its back navigation as recovery, and ignores scrolling", () => {
    const before = [event(1, "tap", "home.account.open")];
    expect(classifyScenarioTap("CARD_COPY", before, "cashback.tab.open", {}, "/account")).toBe("error");
    expect(classifyScenarioTap("CARD_COPY", before, "navigation.back", {}, "/cashback")).toBe("recovery");
    expect(scenarioProgress("CARD_COPY", [...before, event(2, "screen_view", "/cashback")]).stage).toBe(1);
  });

  it("treats the savings account as an off-path error during card copy", () => {
    const savingsTap = event(1, "tap", "home.savings.open", { scenarioVerdict: "info" });
    expect(classifyScenarioTap("CARD_COPY", [], "home.savings.open", {}, "/")).toBe("error");
    expect(scenarioVerdictForEvent(savingsTap, "CARD_COPY")).toBe("error");
    expect(scenarioProgress("CARD_COPY", [savingsTap]).stage).toBe(0);
  });

  it("classifies category help and chart period changes as informational", () => {
    const categories = [event(1, "tap", "cashback.tab.open"), event(2, "tap", "cashback.next_month.categories.open")];
    expect(classifyScenarioTap("CASHBACK_NEXT", categories, "cashback.category.fuel.faq.open", {}, "/cashback/categories")).toBe("info");
    expect(classifyScenarioTap("CASHBACK_NEXT", [event(1, "tap", "cashback.tab.open")], "cashback.period.year", {}, "/cashback")).toBe("info");
    expect(scenarioProgress("CASHBACK_NEXT", [...categories, event(3, "tap", "cashback.category.fuel.faq.open")]).stage).toBe(2);
  });
});
