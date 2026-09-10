import { describe, expect, it } from "vitest";
import { getInitialParticipantState, normalizeParticipantState } from "./participant-state";

describe("participant cashback state", () => {
  it("keeps next-month selection locked until cashback is connected", () => {
    expect(getInitialParticipantState("disconnected").nextMonthCashbackSelectionStatus).toBe("locked");
    expect(getInitialParticipantState("connected").nextMonthCashbackSelectionStatus).toBe("available");
  });

  it("migrates a legacy completed next-month selection to confirmed", () => {
    const legacy = {
      ...getInitialParticipantState("connected"),
      nextMonthCashbackSelectionStatus: undefined,
      cashbackNextMonthSelectionAvailable: true,
      nextMonthCashbackCategories: ["Деливери", "Бензин", "Укрепление семьи"],
    };
    expect(normalizeParticipantState(legacy)).toMatchObject({
      nextMonthCashbackSelectionStatus: "confirmed",
      nextMonthCashbackCategories: ["Деливери", "Бензин", "Укрепление семьи"],
    });
  });

  it("repairs contradictory stored status instead of exposing an impossible state", () => {
    expect(normalizeParticipantState({
      ...getInitialParticipantState("connected"),
      nextMonthCashbackSelectionStatus: "confirmed",
      nextMonthCashbackCategories: ["Деливери"],
    })?.nextMonthCashbackSelectionStatus).toBe("draft");
    expect(normalizeParticipantState({
      ...getInitialParticipantState("disconnected"),
      nextMonthCashbackSelectionStatus: "confirmed",
      nextMonthCashbackCategories: ["A", "B", "C"],
    })).toMatchObject({
      nextMonthCashbackSelectionStatus: "locked",
      nextMonthCashbackCategories: [],
    });
  });
});
