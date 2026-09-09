"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getInitialParticipantState, loadParticipantState, resetParticipantState, saveParticipantState } from "@/lib/testing/participant-state";
import { track } from "@/lib/testing/tracking";
import type { ParticipantProductState, ResearchSessionState } from "@/lib/testing/types";

const idleResearchState: ResearchSessionState = {
  cashbackVariant: "disconnected", sessionId: null, participantCode: null,
  currentTask: null, currentTaskRunId: null, currentScreen: "/", resetVersion: 0, sessionStatus: "idle",
};

interface ParticipantContextValue {
  productState: ParticipantProductState;
  researchState: ResearchSessionState;
  updateProductState: (patch: Partial<ParticipantProductState>, action: string) => void;
}

const ParticipantContext = createContext<ParticipantContextValue | null>(null);

export function ParticipantProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [researchState, setResearchState] = useState(idleResearchState);
  const [productState, setProductState] = useState(getInitialParticipantState("disconnected"));
  const seenReset = useRef<number | null>(null);

  const applyResearchState = useCallback((next: ResearchSessionState, initial = false) => {
    const resetChanged = seenReset.current !== null && seenReset.current !== next.resetVersion;
    setResearchState(next);
    if (initial) setProductState(loadParticipantState(next.cashbackVariant));
    if (resetChanged) {
      setProductState(resetParticipantState(next.cashbackVariant));
      router.replace("/");
    }
    seenReset.current = next.resetVersion;
  }, [router]);

  useEffect(() => {
    fetch("/api/testing/state").then((response) => response.json()).then((data) => applyResearchState(data, true)).catch(() => {});
    const source = new EventSource("/api/testing/state/stream");
    source.addEventListener("control", (event) => applyResearchState(JSON.parse((event as MessageEvent).data)));
    return () => source.close();
  }, [applyResearchState]);

  useEffect(() => {
    track("screen_view", { screen: pathname, action: `screen.${pathname === "/" ? "home" : pathname.slice(1).replaceAll("/", ".")}.view` });
  }, [pathname, researchState.sessionId]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const element = (event.target as HTMLElement).closest<HTMLElement>("[data-track]");
      if (!element?.dataset.track) return;
      track("tap", { screen: pathname, action: element.dataset.track, target: element.dataset.track });
    };
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [pathname]);

  const updateProductState = useCallback((patch: Partial<ParticipantProductState>, action: string) => {
    setProductState((current) => {
      const next = { ...current, ...patch };
      saveParticipantState(next);
      return next;
    });
    track("product_state_change", { screen: pathname, action, metadata: { changed: true } });
  }, [pathname]);

  const value = useMemo(() => ({ productState, researchState, updateProductState }), [productState, researchState, updateProductState]);
  return <ParticipantContext.Provider value={value}>{children}</ParticipantContext.Provider>;
}

export function useParticipant() {
  const value = useContext(ParticipantContext);
  if (!value) throw new Error("useParticipant must be used inside ParticipantProvider");
  return value;
}
