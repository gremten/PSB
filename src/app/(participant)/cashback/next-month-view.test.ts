import { describe, expect, it } from "vitest";
import { getNextMonthPresentation, nextMonthConfirmationHref, shouldShowNextMonthSuccess } from "./next-month-view";

describe("next-month cashback presentation", () => {
  it("summarizes the confirmed categories in their saved order with existing artwork", () => {
    expect(getNextMonthPresentation(["Деливери", "Бензин", "Укрепление семьи"])).toEqual([
      { label: "Деливери", image: "/figma/cashback/next-month-delivery.png", summary: "7% Деливери", background: undefined },
      { label: "Бензин", image: "/figma/cashback/next-month-fuel.png", summary: "3% на бензин", background: undefined },
      { label: "Укрепление семьи", image: "/figma/cashback/next-month-family.png", summary: "2% на укрепление семьи", background: undefined },
    ]);
    expect(getNextMonthPresentation(["Авиабилеты"])[0].background).toBe("#ffcfa3");
  });

  it("shows the confirmation sheet only for a confirmed next-month choice", () => {
    expect(nextMonthConfirmationHref).toBe("/cashback?next-month-success=1");
    expect(shouldShowNextMonthSuccess("?next-month-success=1", true)).toBe(true);
    expect(shouldShowNextMonthSuccess("?next-month-success=1", false)).toBe(false);
    expect(shouldShowNextMonthSuccess("?replay=1", true)).toBe(false);
  });
});
