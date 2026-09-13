// The adjacent card is 336 px from the active card in the 402 px Figma frame.
export const CARD_SWIPE_TRAVEL = 336;
// A deliberate short drag is enough to select; the remaining travel animates on release.
export const CARD_SWIPE_THRESHOLD = 64;

export function cardSwipeDestination(activeIndex: number, deltaX: number, cardCount: number): number {
  if (Math.abs(deltaX) < CARD_SWIPE_THRESHOLD) return activeIndex;
  return Math.max(0, Math.min(cardCount - 1, activeIndex + (deltaX < 0 ? 1 : -1)));
}
