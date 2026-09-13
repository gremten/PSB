import { describe, expect, it } from "vitest";
import { CARD_SWIPE_THRESHOLD, cardSwipeDestination } from "./card-gesture";

describe("card carousel swipe", () => {
  it("keeps the card when released before the 64 px drag threshold", () => {
    expect(cardSwipeDestination(0, -(CARD_SWIPE_THRESHOLD - 1), 2)).toBe(0);
    expect(cardSwipeDestination(1, CARD_SWIPE_THRESHOLD - 1, 2)).toBe(1);
  });

  it("switches in either direction after a deliberate short drag", () => {
    expect(cardSwipeDestination(0, -CARD_SWIPE_THRESHOLD, 2)).toBe(1);
    expect(cardSwipeDestination(1, CARD_SWIPE_THRESHOLD, 2)).toBe(0);
  });

  it("does not leave the carousel at either edge", () => {
    expect(cardSwipeDestination(0, CARD_SWIPE_THRESHOLD * 2, 2)).toBe(0);
    expect(cardSwipeDestination(1, -CARD_SWIPE_THRESHOLD * 2, 2)).toBe(1);
  });
});
