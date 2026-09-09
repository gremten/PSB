export const DEMO_UNAVAILABLE_EVENT = "psb:demo-unavailable";

export function showDemoUnavailable() {
  window.dispatchEvent(new Event(DEMO_UNAVAILABLE_EVENT));
}
