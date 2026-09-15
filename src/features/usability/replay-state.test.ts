import { describe, expect, it } from "vitest";
import type { TrackedEvent } from "@/lib/testing/types";
import { deriveReplayState, replayEventTimes } from "./replay-state";

function event(id: number, type: string, action: string, screen = "/", target: string | null = null): TrackedEvent {
  return { id, sessionId: "test", taskRunId: null, timestamp: new Date(id * 1000).toISOString(), type, screen, action, target, metadata: {} };
}

describe("action replay state", () => {
  it("restores card selection and both flip sides at a selected timeline position", () => {
    const events = [
      event(1, "tap", "account.card.primary.open", "/account"),
      event(2, "screen_view", "screen.card.view", "/card"),
      event(3, "product_state_change", "card.orange.details.reveal", "/card"),
      event(4, "card_selection", "card.night.select.swipe", "/card", "night"),
      event(5, "product_state_change", "card.night.details.reveal", "/card"),
    ];
    expect(deriveReplayState(events, 2)).toMatchObject({ cardIndex: 1, flippedCards: [false, true, false] });
    expect(deriveReplayState(events, 4)).toMatchObject({ cardIndex: 0, flippedCards: [true, true, false] });
    expect(deriveReplayState(events, 1)).toMatchObject({ cardIndex: 1, flippedCards: [false, false, false] });
  });

  it("restores the copy toast until its recorded close event", () => {
    const events = [
      event(1, "tap", "card.orange.number.copy", "/card"),
      event(2, "action", "card.copy.toast.closed", "/card"),
    ];
    expect(deriveReplayState(events, 0).copyToastVisible).toBe(true);
    expect(deriveReplayState(events, 1).copyToastVisible).toBe(false);
  });

  it("closes all card backs on a new carousel selection, including when seeking backward", () => {
    const events = [
      event(1, "product_state_change", "card.orange.details.reveal", "/card"),
      { ...event(2, "card_selection", "card.night.select.swipe", "/card", "night"), metadata: { index: 0, closedDetails: true } },
      event(3, "product_state_change", "card.night.details.reveal", "/card"),
    ];
    expect(deriveReplayState(events, 0)).toMatchObject({ flippedCards: [false, true, false], productState: { cardDetailsRevealed: true } });
    expect(deriveReplayState(events, 1)).toMatchObject({ cardIndex: 0, flippedCards: [false, false, false], productState: { cardDetailsRevealed: false } });
    expect(deriveReplayState(events, 2)).toMatchObject({ flippedCards: [true, false, false] });
    expect(deriveReplayState(events, 0)).toMatchObject({ flippedCards: [false, true, false] });
  });

  it("opens the salary card from its account badge and replays its flip and switch", () => {
    const events = [
      event(1, "tap", "account.card.salary.open", "/account"),
      event(2, "screen_view", "screen.card.view", "/card"),
      event(3, "product_state_change", "card.salary.details.reveal", "/card"),
      { ...event(4, "card_selection", "card.orange.select.swipe", "/card", "orange"), metadata: { index: 1, closedDetails: true } },
    ];
    expect(deriveReplayState(events, 1)).toMatchObject({ cardIndex: 2, flippedCards: [false, false, false] });
    expect(deriveReplayState(events, 2)).toMatchObject({ cardIndex: 2, flippedCards: [false, false, true] });
    expect(deriveReplayState(events, 3)).toMatchObject({ cardIndex: 1, flippedCards: [false, false, false] });
  });

  it("restores category selection and the connected/next-month branches", () => {
    const events = [
      event(1, "screen_view", "screen.cashback.categories.view", "/cashback/categories"),
      event(2, "action", "cashback.category.selection_changed", "/cashback/categories", "all"),
      event(3, "action", "cashback.category.selection_changed", "/cashback/categories", "flights"),
      event(4, "action", "cashback.category.selection_changed", "/cashback/categories", "fuel"),
      event(5, "product_state_change", "cashback.categories.confirmed", "/cashback/categories"),
      event(6, "product_state_change", "cashback.success.dismissed"),
      event(7, "screen_view", "screen.cashback.categories.view", "/cashback/categories"),
      event(8, "action", "cashback.category.selection_changed", "/cashback/categories", "all"),
      event(9, "action", "cashback.category.selection_changed", "/cashback/categories", "delivery"),
      event(10, "product_state_change", "cashback.next_month.selection.changed", "/cashback/categories"),
    ];
    expect(deriveReplayState(events, 4)).toMatchObject({ successSheet: "current_month", productState: { cashbackConnected: true, selectedCashbackCategories: ["На все покупки", "Авиабилеты", "Бензин"], cashbackSuccessVisible: true } });
    expect(deriveReplayState(events, 5).successSheet).toBeNull();
    expect(deriveReplayState(events, 9).productState).toMatchObject({ nextMonthCashbackCategories: ["На все покупки", "Деливери"], nextMonthCashbackSelectionStatus: "draft" });
  });

  it("restores the next-month success sheet until dismissal", () => {
    const events = [
      event(1, "product_state_change", "cashback.next_month.categories.confirmed", "/cashback/categories"),
      event(2, "screen_view", "screen.cashback.view", "/cashback"),
      event(3, "action", "cashback.next_month.success.dismissed", "/cashback"),
    ];
    expect(deriveReplayState(events, 1).successSheet).toBe("next_month");
    expect(deriveReplayState(events, 2).successSheet).toBeNull();
  });

  it("shortens idle time without merging rapid consecutive events", () => {
    const events = [event(1, "tap", "a"), event(2, "action", "b"), event(3, "tap", "c")];
    events[1].timestamp = new Date(1100).toISOString();
    events[2].timestamp = new Date(600_000).toISOString();
    expect(replayEventTimes(events)).toEqual([0, 100, 1300]);
  });

  it("preserves frequent scroll samples for smooth interpolation", () => {
    const events = [event(1, "scroll", "screen.scroll"), event(2, "scroll", "screen.scroll")];
    events[1].timestamp = new Date(1040).toISOString();
    expect(replayEventTimes(events)).toEqual([0, 40]);
  });
});
