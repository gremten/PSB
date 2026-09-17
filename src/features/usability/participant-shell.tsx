"use client";

import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getInteractiveScenario } from "@/config/test-scenarios";
import { Tabbar } from "@/components/ui";
import { TelegramMiniAppBridge } from "@/features/telegram/telegram-mini-app";
import bankStyles from "@/features/bank/bank.module.css";
import { DEMO_UNAVAILABLE_EVENT, showDemoUnavailable } from "./demo-feedback";
import { GlassToast } from "./glass-toast";
import { ParticipantProvider } from "./participant-provider";
import {
  PARTICIPANT_ACTIVE_SCENARIO_KEY,
  PARTICIPANT_COMPLETION_LOCK_KEY,
  PARTICIPANT_NAME_KEY,
  PARTICIPANT_SCENARIO_COMPLETED,
  PARTICIPANT_SCENARIO_COMPLETING,
  PARTICIPANT_SCENARIO_COMPLETION_FAILED,
  PARTICIPANT_SESSION_CHANGED,
  PARTICIPANT_SESSION_KEY,
} from "@/lib/testing/tracking";
import { resetParticipantState } from "@/lib/testing/participant-state";
import gateStyles from "./scenario-gate.module.css";

interface ScenarioStatus {
  assignedScenario: string | null;
  activeScenario: string | null;
  completedScenarios: string[];
  ended: boolean;
  endReason: string | null;
  completedScenario?: string | null;
}

const tabs = [
  { href: "/", label: "Главная", icon: "/figma/home/tab-home.svg", dataTrack: "tab.home.open" },
  { href: "/payment", label: "Платежи", icon: "/figma/home/tab-payments.svg", dataTrack: "tab.payments.unavailable", unavailable: true },
  { href: "/cashback", label: "Выгода", icon: "/figma/home/tab-benefit.svg", dataTrack: "cashback.tab.open" },
  { href: "/chat", label: "Чат", icon: "/figma/home/tab-chat.svg", dataTrack: "tab.chat.unavailable", unavailable: true },
  { href: "/more", label: "Ещё", icon: "/figma/home/tab-more.svg", dataTrack: "tab.more.unavailable", unavailable: true },
];

const ROLE_SESSION_KEY = "psb-entry-role-v1";
const ROLE_CHANGED_EVENT = "psb:entry-role-changed";
const SESSION_CACHE_CLEARED_PREFIX = "psb-session-router-cache-cleared-v1:";
const PENDING_EASE_SCORE_KEY = "psb-participant-pending-ease-score-v1";
const participantRoutes = ["/", "/account", "/card?card=night", "/card?card=orange", "/card?card=salary", "/cashback", "/cashback/categories"];
const participantAssets = [
  "/figma/home/avatar.svg", "/figma/home/bell.svg", "/figma/home/search.svg", "/figma/icons/back.svg",
  "/figma/home/banner-new-bg.svg", "/figma/home/banner-new.webp", "/figma/home/banner-strong-bg.svg", "/figma/home/banner-strong.webp",
  "/figma/account/background-blob.svg", "/figma/account/add-card.svg", "/figma/account/topup.svg", "/figma/account/send.svg",
  "/figma/account/chevron-open.svg", "/figma/account/arrow-forward.svg", "/figma/account/merchant-bbq.webp", "/figma/account/merchant-five.webp", "/figma/account/merchant-psb.webp",
  "/figma/card/logo-night.svg", "/figma/card/logo-orange.svg", "/figma/card/mir-night.svg", "/figma/card/mir-orange.svg", "/figma/card/show.svg", "/figma/card/hide.svg", "/figma/card/copy.svg",
  "/figma/categories/background-blob-soft.svg", "/figma/categories/hero-card.png", "/figma/categories/asset-01.webp", "/figma/categories/asset-03.webp", "/figma/categories/asset-04.webp", "/figma/categories/asset-05.webp", "/figma/categories/asset-06.webp", "/figma/categories/asset-08.webp", "/figma/categories/asset-12.webp",
  "/figma/cashback/partner-5.svg", "/figma/cashback/next-month-delivery.png", "/figma/cashback/next-month-fuel.png", "/figma/cashback/next-month-family.png", "/figma/success/asset-14.webp",
];

function subscribeToRole(callback: () => void) {
  window.addEventListener(ROLE_CHANGED_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(ROLE_CHANGED_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function participantRoleSnapshot() {
  return new URLSearchParams(window.location.search).has("replay") || window.sessionStorage.getItem(ROLE_SESSION_KEY) === "participant";
}

function participantSessionSnapshot() {
  return window.sessionStorage.getItem(PARTICIPANT_SESSION_KEY);
}

function DemoUnavailableToast() {
  const [toastId, setToastId] = useState<number | null>(null);

  useEffect(() => {
    const show = () => setToastId((current) => (current ?? 0) + 1);
    window.addEventListener(DEMO_UNAVAILABLE_EVENT, show);
    return () => window.removeEventListener(DEMO_UNAVAILABLE_EVENT, show);
  }, []);

  if (toastId === null) return null;
  return <GlassToast key={toastId} placement="bottom" tone="orange" trackId="demo.unavailable.toast.dismiss" onDone={() => setToastId((current) => current === toastId ? null : current)}>Недоступно в&nbsp;демо-демонстрации</GlassToast>;
}

function ShellBody({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const participantEntered = useSyncExternalStore(subscribeToRole, participantRoleSnapshot, () => false);
  const sessionId = useSyncExternalStore((callback) => {
    window.addEventListener(PARTICIPANT_SESSION_CHANGED, callback);
    return () => window.removeEventListener(PARTICIPANT_SESSION_CHANGED, callback);
  }, participantSessionSnapshot, () => null);
  const replaying = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("replay");
  const [participantName, setParticipantName] = useState("");
  const [entryError, setEntryError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [scenarioStatus, setScenarioStatus] = useState<ScenarioStatus | null>(null);
  const [scenarioError, setScenarioError] = useState("");
  const [completingScenario, setCompletingScenario] = useState(false);
  const [pendingEaseScenario, setPendingEaseScenario] = useState<string | null>(() =>
    typeof window === "undefined" ? null : window.sessionStorage.getItem(PENDING_EASE_SCORE_KEY));
  const [easeStateReady] = useState(() => typeof window !== "undefined");
  const hideTabs = pathname === "/account" || pathname === "/card" || pathname.startsWith("/cashback/categories");
  const preloadImages = useRef<HTMLImageElement[]>([]);

  useEffect(() => {
    const begin = () => setCompletingScenario(true);
    const complete = (event: Event) => {
      const detail = (event as CustomEvent<ScenarioStatus>).detail;
      const completedScenario = detail.completedScenario ?? null;
      if (completedScenario) window.sessionStorage.setItem(PENDING_EASE_SCORE_KEY, completedScenario);
      setPendingEaseScenario(completedScenario);
      setScenarioStatus(detail);
      setCompletingScenario(false);
    };
    const fail = () => setCompletingScenario(false);
    window.addEventListener(PARTICIPANT_SCENARIO_COMPLETING, begin);
    window.addEventListener(PARTICIPANT_SCENARIO_COMPLETED, complete);
    window.addEventListener(PARTICIPANT_SCENARIO_COMPLETION_FAILED, fail);
    return () => {
      window.removeEventListener(PARTICIPANT_SCENARIO_COMPLETING, begin);
      window.removeEventListener(PARTICIPANT_SCENARIO_COMPLETED, complete);
      window.removeEventListener(PARTICIPANT_SCENARIO_COMPLETION_FAILED, fail);
    };
  }, []);

  useEffect(() => {
    if (scenarioStatus?.activeScenario) {
      window.sessionStorage.setItem(PARTICIPANT_ACTIVE_SCENARIO_KEY, scenarioStatus.activeScenario);
      window.sessionStorage.removeItem(PARTICIPANT_COMPLETION_LOCK_KEY);
    }
    else window.sessionStorage.removeItem(PARTICIPANT_ACTIVE_SCENARIO_KEY);
  }, [scenarioStatus?.activeScenario]);

  useEffect(() => {
    if ((!participantEntered && !replaying) || (sessionId && window.sessionStorage.getItem(`${SESSION_CACHE_CLEARED_PREFIX}${sessionId}`))) return;
    const frame = requestAnimationFrame(() => {
      participantRoutes.forEach((route) => router.prefetch(route));
      preloadImages.current = participantAssets.map((src) => {
        const image = new window.Image();
        image.decoding = "async";
        image.fetchPriority = "low";
        image.src = src;
        void image.decode().catch(() => undefined);
        return image;
      });
    });
    return () => {
      cancelAnimationFrame(frame);
      preloadImages.current.forEach((image) => { image.src = ""; });
      preloadImages.current = [];
    };
  }, [participantEntered, replaying, router, scenarioStatus?.assignedScenario, sessionId]);

  useEffect(() => {
    if (!sessionId || replaying || !scenarioStatus?.ended || !easeStateReady || pendingEaseScenario) return;
    const cacheKey = `${SESSION_CACHE_CLEARED_PREFIX}${sessionId}`;
    if (window.sessionStorage.getItem(cacheKey)) return;
    window.sessionStorage.setItem(cacheKey, "1");
    // A hard navigation discards Next's in-memory Router Cache for this research session.
    window.location.replace("/");
  }, [easeStateReady, pendingEaseScenario, replaying, scenarioStatus?.ended, sessionId]);

  useEffect(() => {
    if (!sessionId || replaying) return;
    let cancelled = false;
    let pending = false;
    const refresh = async () => {
      if (pending) return;
      pending = true;
      try {
        const response = await fetch(`/api/testing/sessions/${encodeURIComponent(sessionId)}/scenario`, { cache: "no-store" });
        if (response.status === 404) {
          if (!cancelled && window.sessionStorage.getItem(PARTICIPANT_SESSION_KEY) === sessionId) {
            window.sessionStorage.removeItem(PARTICIPANT_SESSION_KEY);
            window.sessionStorage.removeItem(PENDING_EASE_SCORE_KEY);
            window.dispatchEvent(new Event(PARTICIPANT_SESSION_CHANGED));
            setScenarioStatus(null);
            setPendingEaseScenario(null);
          }
          return;
        }
        if (!response.ok) return;
        const payload = await response.json() as { status: ScenarioStatus };
        if (!cancelled) {
          setScenarioStatus(payload.status);
          if (!payload.status.activeScenario && !window.sessionStorage.getItem(PARTICIPANT_COMPLETION_LOCK_KEY)) setCompletingScenario(false);
        }
      } catch { /* Presence and status polling retry without blocking product UI. */ }
      finally { pending = false; }
    };
    void refresh();
    const interval = window.setInterval(refresh, 750);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [sessionId, replaying]);

  const enterParticipant = () => {
    window.sessionStorage.setItem(ROLE_SESSION_KEY, "participant");
    window.dispatchEvent(new Event(ROLE_CHANGED_EVENT));
  };

  const createParticipantSession = async (event: FormEvent) => {
    event.preventDefault();
    const cleanName = participantName.trim();
    if (!cleanName) return;
    setSubmitting(true);
    setEntryError("");
    try {
      const response = await fetch("/api/testing/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantName: cleanName }),
      });
      const payload = await response.json() as { session?: { id: string }; error?: string };
      if (!response.ok || !payload.session) throw new Error(payload.error ?? "Не удалось начать тест");
      window.sessionStorage.setItem(PARTICIPANT_SESSION_KEY, payload.session.id);
      window.sessionStorage.setItem(PARTICIPANT_NAME_KEY, cleanName);
      window.sessionStorage.removeItem(PARTICIPANT_ACTIVE_SCENARIO_KEY);
      window.sessionStorage.removeItem(PARTICIPANT_COMPLETION_LOCK_KEY);
      window.sessionStorage.removeItem(PENDING_EASE_SCORE_KEY);
      window.dispatchEvent(new Event(PARTICIPANT_SESSION_CHANGED));
      resetParticipantState("disconnected");
      enterParticipant();
      setScenarioStatus({ assignedScenario: null, activeScenario: null, completedScenarios: [], ended: false, endReason: null });
    } catch (cause) {
      setEntryError(cause instanceof Error ? cause.message : "Не удалось начать тест");
    } finally {
      setSubmitting(false);
    }
  };

  const skipParticipantSession = () => {
    window.sessionStorage.removeItem(PARTICIPANT_SESSION_KEY);
    window.sessionStorage.removeItem(PARTICIPANT_NAME_KEY);
    window.sessionStorage.removeItem(PARTICIPANT_ACTIVE_SCENARIO_KEY);
    window.sessionStorage.removeItem(PARTICIPANT_COMPLETION_LOCK_KEY);
    window.sessionStorage.removeItem(PENDING_EASE_SCORE_KEY);
    setPendingEaseScenario(null);
    resetParticipantState("disconnected");
    enterParticipant();
  };

  const startScenario = async () => {
    if (!sessionId || !scenarioStatus?.assignedScenario || submitting) return;
    setSubmitting(true);
    setScenarioError("");
    try {
      const response = await fetch(`/api/testing/sessions/${encodeURIComponent(sessionId)}/scenario`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientTimeMs: performance.timeOrigin + performance.now() }),
      });
      const payload = await response.json() as { status?: ScenarioStatus; error?: string };
      if (!response.ok || !payload.status) throw new Error(payload.error ?? "Не удалось начать сценарий");
      window.sessionStorage.removeItem(PARTICIPANT_COMPLETION_LOCK_KEY);
      if (payload.status.activeScenario) window.sessionStorage.setItem(PARTICIPANT_ACTIVE_SCENARIO_KEY, payload.status.activeScenario);
      setScenarioStatus(payload.status);
      router.push(getInteractiveScenario(scenarioStatus.assignedScenario)?.startRoute ?? "/");
    } catch (cause) { setScenarioError(cause instanceof Error ? cause.message : "Не удалось начать сценарий"); }
    finally { setSubmitting(false); }
  };

  const submitEaseScore = async (easeScore: number) => {
    if (!sessionId || !pendingEaseScenario || submitting) return;
    setSubmitting(true);
    setScenarioError("");
    try {
      const response = await fetch(`/api/testing/sessions/${encodeURIComponent(sessionId)}/scenario`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ easeScore }),
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Не удалось сохранить оценку");
      window.sessionStorage.removeItem(PENDING_EASE_SCORE_KEY);
      setPendingEaseScenario(null);
    } catch (cause) { setScenarioError(cause instanceof Error ? cause.message : "Не удалось сохранить оценку"); }
    finally { setSubmitting(false); }
  };

  const awaitingScenario = participantEntered && !replaying && Boolean(sessionId) && (pendingEaseScenario || completingScenario || !scenarioStatus?.activeScenario);
  const assigned = getInteractiveScenario(scenarioStatus?.assignedScenario ?? "");

  return <><TelegramMiniAppBridge /><div className="participant-stage"><div className="telegram-demo-label">Демо-интерфейс</div>{!participantEntered ? <section className={`role-gate ${gateStyles.entry}`} aria-labelledby="role-gate-title"><button type="button" className={gateStyles.entrySkip} data-track="participant.session.skip" onClick={skipParticipantSession}>Без сессии</button><p className="role-gate__eyebrow">PSB usability test</p><h1 id="role-gate-title">Начать тест</h1><p>Введите имя, чтобы я мог сопоставить запись с участником исследования.</p><form className="role-gate__form" onSubmit={createParticipantSession}><label htmlFor="participant-name">Ваше имя</label><input className={gateStyles.entryInput} id="participant-name" name="participantName" maxLength={32} autoComplete="off" placeholder="Иван Иванов" value={participantName} onChange={(event) => setParticipantName(event.target.value)} />{entryError && <p className="role-gate__error" role="alert">{entryError}</p>}<button type="submit" className={gateStyles.entryStart} data-track="participant.session.create" disabled={!participantName.trim() || submitting}>Начать тест</button></form></section> : awaitingScenario ? <section className="role-gate" aria-labelledby="scenario-gate-title"><p className="role-gate__eyebrow">PSB usability test</p>{pendingEaseScenario ? <><h1 id="scenario-gate-title">Насколько легко было выполнить задание?</h1><p>Оцените последнее задание: 1 — очень сложно, 7 — очень легко.</p><div className={gateStyles.easeScale} role="group" aria-label="Оценка лёгкости задания от 1 до 7">{[1, 2, 3, 4, 5, 6, 7].map((score) => <button key={score} type="button" data-track={`participant.seq.score.${score}`} disabled={submitting} aria-label={`${score} из 7`} onClick={() => void submitEaseScore(score)}>{score}</button>)}</div><div className={gateStyles.easeLabels}><span>Очень сложно</span><span>Очень легко</span></div></> : <><h1 id="scenario-gate-title">{completingScenario ? "Задание завершено" : scenarioStatus?.ended ? scenarioStatus.endReason === "all_scenarios_completed" ? "Тест завершён" : "Сессия завершена" : assigned ? assigned.title : "Ожидаем задание"}</h1><p>{completingScenario ? "Сохраняем результат…" : scenarioStatus?.ended ? "Запись завершена. Спасибо за участие." : assigned ? assigned.prompt : "Модератор выберет следующее задание. Пожалуйста, оставайтесь на этом экране."}</p></>}{scenarioError && <p className="role-gate__error" role="alert">{scenarioError}</p>}<div className={gateStyles.actions}>{!pendingEaseScenario && !completingScenario && assigned && !scenarioStatus?.ended && <button type="button" className={gateStyles.start} data-track="participant.scenario.start" disabled={submitting} onClick={() => void startScenario()}>Старт</button>}</div></section> : <div className={`participant-phone ${bankStyles.bankUiRoot}`}><div className="participant-content"><div className="participant-route-surface" key={pathname}>{children}</div></div><DemoUnavailableToast />{!hideTabs && <Tabbar items={tabs} pathname={pathname} onUnavailable={showDemoUnavailable} />}</div>}</div></>;
}

export function ParticipantShell({ children }: { children: React.ReactNode }) {
  return <ParticipantProvider><ShellBody>{children}</ShellBody></ParticipantProvider>;
}
