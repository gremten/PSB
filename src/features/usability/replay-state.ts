import { getInitialParticipantState } from "@/lib/testing/participant-state";
import type { ParticipantProductState, TrackedEvent } from "@/lib/testing/types";

export const REPLAY_MESSAGE = "psb:replay-state";
export const REPLAY_READY = "psb:replay-ready";
export const REPLAY_APPLIED = "psb:replay-applied";
export const REPLAY_SCREENS = new Set(["/", "/account", "/card", "/cashback", "/cashback/categories", "/payment", "/chat", "/more"]);

const categoryLabels: Record<string, string> = {
  all: "На все покупки", flights: "Авиабилеты", scooters: "Самокаты", taxi: "Такси",
  delivery: "Деливери", fuel: "Бензин", family: "Укрепление семьи",
};

export interface ReplayVisualState {
  productState: ParticipantProductState;
  cardIndex: 0 | 1;
  flippedCards: [boolean, boolean];
  currencyMode: "buy" | "sell";
  cashbackPeriod: "month" | "year";
  selectedCategoryIds: string[];
  openFaqIndex: number | null;
}

export function recordedEventTime(event: TrackedEvent) {
  const serverTime = new Date(event.timestamp).getTime();
  const clientTime = event.metadata.clientTimeMs;
  return typeof clientTime === "number" && Number.isFinite(clientTime) && Math.abs(clientTime - serverTime) < 300_000
    ? clientTime : serverTime;
}

// Keep real ordering and short pauses, but skip long idle periods in the visual replay.
export function replayEventTimes(events: TrackedEvent[]) {
  const times: number[] = [];
  for (let index = 0; index < events.length; index++) {
    const gap = index ? recordedEventTime(events[index]) - recordedEventTime(events[index - 1]) : 0;
    times.push((times.at(-1) ?? 0) + (index ? Math.max(120, Math.min(800, gap)) : 0));
  }
  return times;
}

export function deriveReplayState(events: TrackedEvent[], throughIndex: number): ReplayVisualState {
  const productState = getInitialParticipantState("disconnected");
  const flippedCards: [boolean, boolean] = [false, false];
  let cardIndex: 0 | 1 = 0;
  let currencyMode: "buy" | "sell" = "buy";
  let cashbackPeriod: "month" | "year" = "month";
  let selectedCategoryIds: string[] = [];
  let openFaqIndex: number | null = null;

  for (let index = 0; index <= Math.min(throughIndex, events.length - 1); index++) {
    const event = events[index];
    const action = event.action ?? "";
    if (event.type === "screen_view" && event.screen === "/cashback/categories") {
      selectedCategoryIds = productState.cashbackConnected
        ? Object.keys(categoryLabels).filter((id) => productState.nextMonthCashbackCategories.includes(categoryLabels[id]))
        : [];
    }
    if (event.type === "tap") {
      if (action === "account.card.primary.open") cardIndex = 1;
      if (action === "account.card.strong.open") cardIndex = 0;
      if (action === "home.currency.buy") currencyMode = "buy";
      if (action === "home.currency.sell") currencyMode = "sell";
      const faq = /^cashback\.faq\.(\d+)\.toggle$/.exec(action);
      if (faq) {
        const faqIndex = Number(faq[1]);
        openFaqIndex = openFaqIndex === faqIndex ? null : faqIndex;
      }
    }
    if (event.type === "card_selection") {
      const selected = event.metadata.index;
      cardIndex = selected === 1 || action.includes("orange") ? 1 : 0;
    }
    if (event.type === "action") {
      if (action === "cashback.period.month") cashbackPeriod = "month";
      if (action === "cashback.period.year") cashbackPeriod = "year";
      if (action === "cashback.category.selection_changed" && typeof event.target === "string" && categoryLabels[event.target]) {
        selectedCategoryIds = selectedCategoryIds.includes(event.target)
          ? selectedCategoryIds.filter((id) => id !== event.target)
          : selectedCategoryIds.length < 3 ? [...selectedCategoryIds, event.target] : selectedCategoryIds;
      }
    }
    if (event.type !== "product_state_change") continue;
    if (action === "home.accounts.hidden") productState.accountsHidden = true;
    if (action === "home.accounts.shown") productState.accountsHidden = false;
    const dismissed = /^home\.promo\.(cards|strong)\.dismissed$/.exec(action);
    if (dismissed && !productState.dismissedHomePromos.includes(dismissed[1])) productState.dismissedHomePromos.push(dismissed[1]);
    if (action === "home.history.collapsed") productState.homeHistoryCollapsed = true;
    if (action === "home.history.expanded") productState.homeHistoryCollapsed = false;
    if (action === "home.currency.collapsed") productState.homeCurrencyCollapsed = true;
    if (action === "home.currency.expanded") productState.homeCurrencyCollapsed = false;
    const cardSide = /^card\.(night|orange)\.details\.(reveal|hide)$/.exec(action);
    if (cardSide) {
      flippedCards[cardSide[1] === "orange" ? 1 : 0] = cardSide[2] === "reveal";
      productState.cardDetailsRevealed = cardSide[2] === "reveal";
    }
    if (action === "cashback.next_month.selection.changed") {
      productState.nextMonthCashbackCategories = selectedCategoryIds.map((id) => categoryLabels[id]);
      productState.nextMonthCashbackSelectionStatus = selectedCategoryIds.length ? "draft" : "available";
    }
    if (action === "cashback.categories.confirmed") {
      productState.cashbackConnected = true;
      productState.selectedCashbackCategories = selectedCategoryIds.map((id) => categoryLabels[id]);
      productState.nextMonthCashbackSelectionStatus = "available";
      productState.cashbackSuccessVisible = true;
    }
    if (action === "cashback.next_month.categories.confirmed") {
      productState.nextMonthCashbackCategories = selectedCategoryIds.map((id) => categoryLabels[id]);
      productState.nextMonthCashbackSelectionStatus = "confirmed";
    }
    if (action === "cashback.success.dismissed") productState.cashbackSuccessVisible = false;
  }

  return { productState, cardIndex, flippedCards, currencyMode, cashbackPeriod, selectedCategoryIds, openFaqIndex };
}
