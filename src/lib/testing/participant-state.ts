import type { CashbackVariant, ParticipantProductState } from "./types";

export const PARTICIPANT_STATE_KEY = "psb-participant-product-state-v1";

export function getInitialParticipantState(variant: CashbackVariant): ParticipantProductState {
  return {
    cashbackConnected: variant === "connected",
    selectedCashbackCategories:
      variant === "connected" ? ["На все покупки", "Авиабилеты", "Транспорт"] : [],
    cardDetailsRevealed: false,
    cashbackSuccessVisible: false,
  };
}

export function resetParticipantState(
  variant: CashbackVariant = "disconnected",
): ParticipantProductState {
  const nextState = getInitialParticipantState(variant);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(PARTICIPANT_STATE_KEY, JSON.stringify(nextState));
    window.dispatchEvent(new CustomEvent("psb:participant-reset", { detail: nextState }));
  }
  return nextState;
}

export function loadParticipantState(variant: CashbackVariant): ParticipantProductState {
  if (typeof window === "undefined") return getInitialParticipantState(variant);
  const saved = window.localStorage.getItem(PARTICIPANT_STATE_KEY);
  if (!saved) return resetParticipantState(variant);
  try {
    const parsed = JSON.parse(saved) as ParticipantProductState;
    if (
      typeof parsed.cashbackConnected !== "boolean" ||
      !Array.isArray(parsed.selectedCashbackCategories) ||
      typeof parsed.cardDetailsRevealed !== "boolean"
    ) {
      return resetParticipantState(variant);
    }
    return { ...parsed, cashbackSuccessVisible: Boolean(parsed.cashbackSuccessVisible) };
  } catch {
    return resetParticipantState(variant);
  }
}

export function saveParticipantState(state: ParticipantProductState) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(PARTICIPANT_STATE_KEY, JSON.stringify(state));
  }
}
