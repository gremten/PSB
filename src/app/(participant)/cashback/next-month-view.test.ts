import { describe, expect, it } from "vitest";
import { getNextMonthPresentation, nextMonthConfirmationHref, shouldShowNextMonthSuccess } from "./next-month-view";

describe("next-month cashback presentation", () => {
  it("summarizes the confirmed categories in their saved order with existing artwork", () => {
    expect(getNextMonthPresentation(["Деливери", "Бензин", "Укрепление семьи"])).toEqual([
      { label: "Деливери", image: "/figma/categories/asset-03.webp", summary: "7% Деливери" },
      { label: "Бензин", image: "/figma/categories/asset-12.webp", summary: "3% на бензин" },
      { label: "Укрепление семьи", image: "/figma/categories/asset-08.webp", summary: "2% на укрепление семьи" },
    ]);
  });

  it("shows the confirmation sheet only for a confirmed next-month choice", () => {
    expect(nextMonthConfirmationHref).toBe("/cashback?next-month-success=1");
    expect(shouldShowNextMonthSuccess("?next-month-success=1", true)).toBe(true);
    expect(shouldShowNextMonthSuccess("?next-month-success=1", false)).toBe(false);
    expect(shouldShowNextMonthSuccess("?replay=1", true)).toBe(false);
  });
});
