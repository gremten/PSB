import { track } from "@/lib/testing/tracking";

export const DEMO_UNAVAILABLE_EVENT = "psb:demo-unavailable";

export function showDemoUnavailable(event?: { currentTarget?: EventTarget | null }) {
  const element = event?.currentTarget instanceof Element ? event.currentTarget.closest<HTMLElement>("[data-track]") : null;
  void track("action", { screen: window.location.pathname, action: "demo.unavailable", target: element?.dataset.track });
  window.dispatchEvent(new Event(DEMO_UNAVAILABLE_EVENT));
}
