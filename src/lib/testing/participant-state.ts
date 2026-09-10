import type { CashbackVariant, NextMonthCashbackSelectionStatus, ParticipantProductState } from "./types";

export const PARTICIPANT_STATE_KEY = "psb-participant-product-state-v1";

export function getInitialParticipantState(variant: CashbackVariant): ParticipantProductState {
  return {
    cashbackConnected: variant === "connected",
    selectedCashbackCategories:
      variant === "connected" ? ["На все покупки", "Авиабилеты", "Транспорт"] : [],
    nextMonthCashbackCategories: [],
    nextMonthCashbackSelectionStatus: variant === "connected" ? "available" : "locked",
    cardDetailsRevealed: false,
    cashbackSuccessVisible: false,
    accountsHidden: false,
    dismissedHomePromos: [],
    homeHistoryCollapsed: false,
    homeCurrencyCollapsed: false,
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
    return normalizeParticipantState(JSON.parse(saved)) ?? resetParticipantState(variant);
  } catch {
    return resetParticipantState(variant);
  }
}

export function normalizeParticipantState(raw: unknown): ParticipantProductState | null {
  if (!raw || typeof raw !== "object") return null;
  const parsed = raw as Partial<ParticipantProductState> & { cashbackNextMonthSelectionAvailable?: boolean };
  if (
    typeof parsed.cashbackConnected !== "boolean" ||
    !Array.isArray(parsed.selectedCashbackCategories) ||
    typeof parsed.cardDetailsRevealed !== "boolean"
  ) return null;

  const cashbackConnected = parsed.cashbackConnected;
  const selectedCashbackCategories = parsed.selectedCashbackCategories.filter(
    (item): item is string => typeof item === "string",
  );
  const nextMonthCashbackCategories = cashbackConnected && Array.isArray(parsed.nextMonthCashbackCategories)
    ? parsed.nextMonthCashbackCategories.filter((item): item is string => typeof item === "string").slice(0, 3)
    : [];
  const validStatuses: NextMonthCashbackSelectionStatus[] = ["locked", "available", "draft", "confirmed"];
  const storedStatus = validStatuses.includes(parsed.nextMonthCashbackSelectionStatus as NextMonthCashbackSelectionStatus)
    ? parsed.nextMonthCashbackSelectionStatus as NextMonthCashbackSelectionStatus
    : null;
  const inferredStatus: NextMonthCashbackSelectionStatus = !cashbackConnected
    ? "locked"
    : nextMonthCashbackCategories.length === 3
      ? "confirmed"
      : nextMonthCashbackCategories.length > 0
        ? "draft"
        : "available";
  const nextMonthCashbackSelectionStatus: NextMonthCashbackSelectionStatus = !cashbackConnected
    ? "locked"
    : storedStatus === "confirmed" && nextMonthCashbackCategories.length === 3
      ? "confirmed"
      : storedStatus === "draft" && nextMonthCashbackCategories.length > 0
        ? "draft"
        : inferredStatus;

  return {
    cashbackConnected,
    selectedCashbackCategories,
    nextMonthCashbackCategories,
    nextMonthCashbackSelectionStatus,
    cardDetailsRevealed: parsed.cardDetailsRevealed,
    cashbackSuccessVisible: Boolean(parsed.cashbackSuccessVisible),
    accountsHidden: Boolean(parsed.accountsHidden),
    dismissedHomePromos: Array.isArray(parsed.dismissedHomePromos)
      ? parsed.dismissedHomePromos.filter((item): item is string => typeof item === "string")
      : [],
    homeHistoryCollapsed: Boolean(parsed.homeHistoryCollapsed),
    homeCurrencyCollapsed: Boolean(parsed.homeCurrencyCollapsed),
  };
}

export function saveParticipantState(state: ParticipantProductState) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(PARTICIPANT_STATE_KEY, JSON.stringify(state));
  }
}
