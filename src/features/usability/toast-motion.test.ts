import { describe, expect, it } from "vitest";
import { shouldDismissToast, toastDragVisual } from "./toast-motion";

describe("toast swipe motion", () => {
  it("follows the finger toward the top edge and shrinks proportionally", () => {
    expect(toastDragVisual(-60, "top")).toEqual({ offsetY: -60, scale: 0.89, opacity: 0.725 });
    expect(toastDragVisual(60, "top")).toEqual({ offsetY: 0, scale: 1, opacity: 1 });
  });

  it("dismisses only after a deliberate swipe toward its edge", () => {
    expect(shouldDismissToast(-55, "top")).toBe(false);
    expect(shouldDismissToast(-56, "top")).toBe(true);
    expect(shouldDismissToast(56, "top")).toBe(false);
    expect(shouldDismissToast(56, "bottom")).toBe(true);
  });
});
