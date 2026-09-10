"use client";

import { useEffect } from "react";

export type ParticipantRouteDirection = "forward" | "back";

const ROUTE_TRANSITION_MS = 280;
const ROUTE_COMMIT_TIMEOUT_MS = 900;

const ROUTE_DEPTHS: Array<[RegExp, number]> = [
  [/^\/$/, 0],
  [/^\/(?:account|cashback)\/?$/, 1],
  [/^\/card\/?$/, 2],
  [/^\/cashback\/categories\/?$/, 2],
];

let cleanupActiveTransition: (() => void) | null = null;

function routeDepth(pathname: string) {
  return ROUTE_DEPTHS.find(([pattern]) => pattern.test(pathname))?.[1] ?? null;
}

export function getParticipantRouteDirection(fromPath: string, toPath: string, explicitBack = false): ParticipantRouteDirection | null {
  if (explicitBack) return "back";
  if (fromPath === toPath) return null;

  const fromDepth = routeDepth(fromPath);
  const toDepth = routeDepth(toPath);
  if (fromDepth === null || toDepth === null || fromDepth === toDepth) return null;
  return toDepth > fromDepth ? "forward" : "back";
}

function copyScrollOffsets(source: HTMLElement, clone: HTMLElement) {
  const sources = [source, ...Array.from(source.querySelectorAll<HTMLElement>("*"))];
  const clones = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>("*"))];

  for (let index = 0; index < Math.min(sources.length, clones.length); index += 1) {
    if (sources[index].scrollTop) clones[index].scrollTop = sources[index].scrollTop;
    if (sources[index].scrollLeft) clones[index].scrollLeft = sources[index].scrollLeft;
  }
}

function beginParticipantRouteTransition(direction: ParticipantRouteDirection) {
  if (typeof window === "undefined") return;
  if (window.location.search.includes("replay=1")) return;
  if (!window.matchMedia("(max-width: 440px)").matches) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const stage = document.querySelector<HTMLElement>(".participant-stage");
  const phone = stage?.querySelector<HTMLElement>(":scope > .participant-phone");
  const currentScreen = phone?.querySelector<HTMLElement>("[data-screen]");
  if (!stage || !phone || !currentScreen) return;

  cleanupActiveTransition?.();

  const stageRect = stage.getBoundingClientRect();
  const phoneRect = phone.getBoundingClientRect();
  const snapshot = phone.cloneNode(true) as HTMLElement;
  snapshot.classList.add("participant-route-snapshot");
  snapshot.dataset.routeDirection = direction;
  snapshot.setAttribute("aria-hidden", "true");
  snapshot.style.left = `${phoneRect.left - stageRect.left}px`;
  snapshot.style.top = `${phoneRect.top - stageRect.top}px`;
  snapshot.style.width = `${phoneRect.width}px`;
  snapshot.style.height = `${phoneRect.height}px`;
  stage.append(snapshot);
  copyScrollOffsets(phone, snapshot);

  const initialScreen = currentScreen;
  const initialPath = window.location.pathname;
  let started = false;
  let finishTimer: ReturnType<typeof window.setTimeout> | null = null;
  let commitTimer: ReturnType<typeof window.setTimeout> | null = null;

  const cleanup = () => {
    observer.disconnect();
    if (finishTimer) window.clearTimeout(finishTimer);
    if (commitTimer) window.clearTimeout(commitTimer);
    phone.classList.remove("participant-route-live");
    delete phone.dataset.routeDirection;
    snapshot.remove();
    if (cleanupActiveTransition === cleanup) cleanupActiveTransition = null;
  };

  const start = () => {
    if (started) return;
    const nextScreen = phone.querySelector<HTMLElement>("[data-screen]");
    const pathChanged = window.location.pathname !== initialPath;
    const screenChanged = Boolean(nextScreen && nextScreen !== initialScreen);
    if (!pathChanged && !screenChanged) return;

    started = true;
    phone.dataset.routeDirection = direction;
    phone.classList.add("participant-route-live");
    snapshot.classList.add("participant-route-snapshot-active");
    finishTimer = window.setTimeout(cleanup, ROUTE_TRANSITION_MS + 80);
  };

  const observer = new MutationObserver(start);
  observer.observe(phone, { childList: true, subtree: true });
  commitTimer = window.setTimeout(cleanup, ROUTE_COMMIT_TIMEOUT_MS);
  cleanupActiveTransition = cleanup;
}

function internalPathFromAnchor(anchor: HTMLAnchorElement) {
  try {
    const url = new URL(anchor.href, window.location.href);
    if (url.origin !== window.location.origin) return null;
    return url.pathname;
  } catch {
    return null;
  }
}

function isTabNavigation(target: Element) {
  return Boolean(target.closest('nav[aria-label="Основная навигация"]'));
}

export function ParticipantRouteTransitionBridge() {
  useEffect(() => {
    const onClickCapture = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target : null;
      if (!target || isTabNavigation(target)) return;

      const backControl = target.closest<HTMLElement>('[data-track="navigation.back"]');
      if (backControl) {
        beginParticipantRouteTransition("back");
        return;
      }

      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const toPath = internalPathFromAnchor(anchor);
      if (!toPath) return;

      const direction = getParticipantRouteDirection(window.location.pathname, toPath);
      if (direction) beginParticipantRouteTransition(direction);
    };

    document.addEventListener("click", onClickCapture, true);
    return () => {
      document.removeEventListener("click", onClickCapture, true);
      cleanupActiveTransition?.();
    };
  }, []);

  return null;
}
