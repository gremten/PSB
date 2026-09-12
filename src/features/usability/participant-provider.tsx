"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getInitialParticipantState, loadParticipantState, saveParticipantState } from "@/lib/testing/participant-state";
import { PARTICIPANT_SESSION_CHANGED, PARTICIPANT_SESSION_KEY, track } from "@/lib/testing/tracking";
import { SESSION_HEARTBEAT_MS } from "@/lib/testing/session-presence";
import type { ParticipantProductState, ResearchSessionState } from "@/lib/testing/types";
import { REPLAY_APPLIED, REPLAY_MESSAGE, REPLAY_READY, REPLAY_SCREENS, type ReplayVisualState } from "./replay-state";

const idleResearchState: ResearchSessionState = {
  cashbackVariant: "disconnected", sessionId: null, participantCode: null,
  currentTask: null, currentTaskRunId: null, currentScreen: "/", resetVersion: 0, sessionStatus: "idle",
};

interface ParticipantContextValue {
  productState: ParticipantProductState;
  researchState: ResearchSessionState;
  replayVisualState: ReplayVisualState | null;
  updateProductState: (patch: Partial<ParticipantProductState>, action: string, metadata?: Record<string, unknown>) => void;
}

const ParticipantContext = createContext<ParticipantContextValue | null>(null);

export function ParticipantProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [researchState] = useState(idleResearchState);
  const [productState, setProductState] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("replay")
    ? getInitialParticipantState("disconnected") : loadParticipantState("disconnected"));
  const [replayVisualState, setReplayVisualState] = useState<ReplayVisualState | null>(null);
  const [replayIndex, setReplayIndex] = useState(-1);
  const [replayScreen, setReplayScreen] = useState<string | null>(null);

  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("replay") || window.parent === window) return;
    const receive = (event: MessageEvent) => {
      if (event.source !== window.parent || event.origin !== window.location.origin) return;
      const message = event.data as { type?: string; index?: number; screen?: string; state?: ReplayVisualState } | null;
      if (message?.type !== REPLAY_MESSAGE || typeof message.index !== "number" || !message.state?.productState || !message.screen || !REPLAY_SCREENS.has(message.screen)) return;
      setProductState(message.state.productState);
      setReplayVisualState(message.state);
      setReplayIndex(message.index);
      setReplayScreen(message.screen);
    };
    window.addEventListener("message", receive);
    window.parent.postMessage({ type: REPLAY_READY }, window.location.origin);
    return () => window.removeEventListener("message", receive);
  }, []);

  useEffect(() => {
    if (replayScreen && pathname !== replayScreen) router.replace(`${replayScreen}?replay=1`, { scroll: false });
  }, [pathname, replayScreen, router]);

  useEffect(() => {
    if (replayIndex < 0 || pathname !== replayScreen) return;
    const frame = window.requestAnimationFrame(() => window.parent.postMessage({ type: REPLAY_APPLIED, index: replayIndex }, window.location.origin));
    return () => window.cancelAnimationFrame(frame);
  }, [pathname, replayIndex, replayScreen, replayVisualState]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("replay")) return;
    let pending = false;
    let disposed = false;
    const heartbeat = async () => {
      const id = window.sessionStorage.getItem(PARTICIPANT_SESSION_KEY);
      if (!id || document.hidden || pending) return;
      pending = true;
      try {
        const response = await fetch(`/api/testing/sessions/${encodeURIComponent(id)}/heartbeat`, { method: "POST", keepalive: true });
        if (response.ok) {
          const { active } = await response.json() as { active: boolean };
          if (!disposed && !active && window.sessionStorage.getItem(PARTICIPANT_SESSION_KEY) === id) {
            window.sessionStorage.removeItem(PARTICIPANT_SESSION_KEY);
          }
        }
      } catch { /* Retry on the next heartbeat; temporary connectivity must not block the demo. */ }
      finally { pending = false; }
    };
    void heartbeat();
    const interval = window.setInterval(heartbeat, SESSION_HEARTBEAT_MS);
    window.addEventListener(PARTICIPANT_SESSION_CHANGED, heartbeat);
    document.addEventListener("visibilitychange", heartbeat);
    window.addEventListener("pageshow", heartbeat);
    return () => {
      disposed = true;
      window.clearInterval(interval);
      window.removeEventListener(PARTICIPANT_SESSION_CHANGED, heartbeat);
      document.removeEventListener("visibilitychange", heartbeat);
      window.removeEventListener("pageshow", heartbeat);
    };
  }, []);

  useEffect(() => {
    const handleReset = (event: Event) => setProductState((event as CustomEvent<ParticipantProductState>).detail);
    window.addEventListener("psb:participant-reset", handleReset);
    return () => window.removeEventListener("psb:participant-reset", handleReset);
  }, []);

  useEffect(() => {
    track("screen_view", { screen: pathname, action: `screen.${pathname === "/" ? "home" : pathname.slice(1).replaceAll("/", ".")}.view` });
  }, [pathname]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const element = (event.target as HTMLElement).closest<HTMLElement>("[data-track]");
      if (!element?.dataset.track) return;
      const rect = element.getBoundingClientRect();
      const scrollContainer = element.closest<HTMLElement>(".participant-content");
      track("tap", {
        screen: pathname,
        action: element.dataset.track,
        target: element.dataset.track,
        metadata: {
          x: Math.round(event.clientX),
          y: Math.round(event.clientY),
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          scrollY: Math.round(scrollContainer?.scrollTop ?? window.scrollY ?? document.documentElement.scrollTop ?? 0),
          targetX: Math.round(rect.left),
          targetY: Math.round(rect.top),
          targetWidth: Math.round(rect.width),
          targetHeight: Math.round(rect.height),
        },
      });
    };
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [pathname]);

  const updateProductState = useCallback((patch: Partial<ParticipantProductState>, action: string, metadata: Record<string, unknown> = {}) => {
    if (new URLSearchParams(window.location.search).has("replay")) return;
    setProductState((current) => {
      const next = { ...current, ...patch };
      saveParticipantState(next);
      return next;
    });
    track("product_state_change", { screen: pathname, action, metadata: { changed: true, ...metadata } });
  }, [pathname]);

  const value = useMemo(() => ({ productState, researchState, replayVisualState, updateProductState }), [productState, researchState, replayVisualState, updateProductState]);
  return <ParticipantContext.Provider value={value}>{children}</ParticipantContext.Provider>;
}

export function useParticipant() {
  const value = useContext(ParticipantContext);
  if (!value) throw new Error("useParticipant must be used inside ParticipantProvider");
  return value;
}
