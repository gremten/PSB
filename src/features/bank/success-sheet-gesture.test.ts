import { describe, expect, it } from "vitest";
import { shouldDismissSuccessSheet } from "./success-sheet-gesture";

describe("cashback success sheet gesture", () => {
  it("snaps back after a short downward pull", () => {
    expect(shouldDismissSuccessSheet(79)).toBe(false);
    expect(shouldDismissSuccessSheet(-100)).toBe(false);
  });

  it("dismisses after a deliberate downward pull", () => {
    expect(shouldDismissSuccessSheet(80)).toBe(true);
    expect(shouldDismissSuccessSheet(160)).toBe(true);
  });
});
