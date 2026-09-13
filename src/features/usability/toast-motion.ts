export const TOAST_DURATION_MS = 3000;
export const TOAST_TRANSITION_MS = 200;
export const TOAST_DISMISS_DISTANCE_PX = 56;

export function toastDragVisual(deltaY: number, placement: "top" | "bottom") {
  const towardEdge = placement === "top" ? Math.min(0, deltaY) : Math.max(0, deltaY);
  const progress = Math.min(Math.abs(towardEdge) / 120, 1);
  return { offsetY: towardEdge, scale: 1 - progress * 0.22, opacity: 1 - progress * 0.55 };
}

export function shouldDismissToast(deltaY: number, placement: "top" | "bottom") {
  return Math.abs(toastDragVisual(deltaY, placement).offsetY) >= TOAST_DISMISS_DISTANCE_PX;
}
