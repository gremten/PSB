export const SUCCESS_SHEET_DISMISS_DISTANCE = 80;

export function shouldDismissSuccessSheet(dragDistance: number): boolean {
  return dragDistance >= SUCCESS_SHEET_DISMISS_DISTANCE;
}
