"use client";

import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState, useSyncExternalStore } from "react";
import { getInteractiveScenario } from "@/config/test-scenarios";
import { Tabbar } from "@/components/ui";
import { TelegramMiniAppBridge } from "@/features/telegram/telegram-mini-app";
import { DEMO_UNAVAILABLE_EVENT, showDemoUnavailable } from "./demo-feedback";
import { GlassToast } from "./glass-toast";
import { ParticipantProvider } from "./participant-provider";
import { PARTICIPANT_SESSION_CHANGED, PARTICIPANT_SESSION_KEY } from "@/lib/testing/tracking";
import { resetParticipantState } from "@/lib/testing/participant-state";
import gateStyles from "./scenario-gate.module.css";

interface ScenarioStatus {
  assignedScenario: string | null;
  activeScenario: string | null;
  completedScenarios: string[];
  ended: boolean;
  endReason: string | null;
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
  const hideTabs = pathname === "/account" || pathname === "/card" || pathname.startsWith("/cashback/categories");

  useEffect(() => {
    if (!sessionId || replaying) return;
    let cancelled = false;
    const refresh = async () => {
      try {
        const response = await fetch(`/api/testing/sessions/${encodeURIComponent(sessionId)}/scenario`, { cache: "no-store" });
        if (response.status === 404) {
          if (!cancelled && window.sessionStorage.getItem(PARTICIPANT_SESSION_KEY) === sessionId) {
            window.sessionStorage.removeItem(PARTICIPANT_SESSION_KEY);
            window.dispatchEvent(new Event(PARTICIPANT_SESSION_CHANGED));
            setScenarioStatus(null);
          }
          return;
        }
        if (!response.ok) return;
        const payload = await response.json() as { status: ScenarioStatus };
        if (!cancelled) setScenarioStatus(payload.status);
      } catch { /* Presence and status polling retry without blocking product UI. */ }
    };
    void refresh();
    const interval = window.setInterval(refresh, 2000);
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
    resetParticipantState("disconnected");
    enterParticipant();
  };

  const startScenario = async () => {
    if (!sessionId || !scenarioStatus?.assignedScenario || submitting) return;
    setSubmitting(true);
    setScenarioError("");
    try {
      const response = await fetch(`/api/testing/sessions/${encodeURIComponent(sessionId)}/scenario`, { method: "POST" });
      const payload = await response.json() as { status?: ScenarioStatus; error?: string };
      if (!response.ok || !payload.status) throw new Error(payload.error ?? "Не удалось начать сценарий");
      setScenarioStatus(payload.status);
      router.push(getInteractiveScenario(scenarioStatus.assignedScenario)?.startRoute ?? "/");
    } catch (cause) { setScenarioError(cause instanceof Error ? cause.message : "Не удалось начать сценарий"); }
    finally { setSubmitting(false); }
  };

  const leaveForDemo = async () => {
    if (!sessionId || submitting) return;
    setSubmitting(true);
    setScenarioError("");
    try {
      const response = await fetch(`/api/testing/sessions/${encodeURIComponent(sessionId)}/scenario`, { method: "DELETE" });
      if (!response.ok) throw new Error("Не удалось выйти из сессии");
      window.sessionStorage.removeItem(PARTICIPANT_SESSION_KEY);
      window.dispatchEvent(new Event(PARTICIPANT_SESSION_CHANGED));
      setScenarioStatus(null);
      router.push("/");
    } catch (cause) { setScenarioError(cause instanceof Error ? cause.message : "Не удалось выйти из сессии"); }
    finally { setSubmitting(false); }
  };

  const awaitingScenario = participantEntered && !replaying && Boolean(sessionId) && !scenarioStatus?.activeScenario;
  const assigned = getInteractiveScenario(scenarioStatus?.assignedScenario ?? "");

  return <><TelegramMiniAppBridge /><div className="participant-stage"><div className="telegram-demo-label">Демо-интерфейс</div>{!participantEntered ? <section className="role-gate" aria-labelledby="role-gate-title"><p className="role-gate__eyebrow">PSB usability test</p><h1 id="role-gate-title">Начать тест</h1><p>Введите псевдоним или код участника — без&nbsp;фамилии и&nbsp;других личных данных.</p><form className="role-gate__form" onSubmit={createParticipantSession}><label htmlFor="participant-name">Псевдоним участника</label><div className="role-gate__input-row"><input id="participant-name" name="participantName" maxLength={32} autoComplete="off" placeholder="Например, P-01" value={participantName} onChange={(event) => setParticipantName(event.target.value)} /><button type="submit" aria-label="Продолжить" data-track="participant.session.create" disabled={!participantName.trim() || submitting}>→</button></div>{entryError && <p className="role-gate__error" role="alert">{entryError}</p>}<button type="button" className="role-gate__skip" data-track="participant.session.skip" onClick={skipParticipantSession}>Пропустить</button></form></section> : awaitingScenario ? <section className="role-gate" aria-labelledby="scenario-gate-title"><p className="role-gate__eyebrow">PSB usability test</p><h1 id="scenario-gate-title">{scenarioStatus?.ended ? scenarioStatus.endReason === "all_scenarios_completed" ? "Тест завершён" : "Сессия завершена" : assigned ? assigned.title : "Ожидаем задание"}</h1><p>{scenarioStatus?.ended ? "Запись завершена. Спасибо за участие." : assigned ? assigned.prompt : "Модератор выберет следующее задание. Пожалуйста, оставайтесь на этом экране."}</p>{scenarioError && <p className="role-gate__error" role="alert">{scenarioError}</p>}<div className={gateStyles.actions}>{assigned && !scenarioStatus?.ended && <button type="button" className={gateStyles.start} data-track="participant.scenario.start" disabled={submitting} onClick={() => void startScenario()}>Старт</button>}<button type="button" className={gateStyles.skip} data-track="participant.scenario.skip" disabled={submitting} onClick={() => void leaveForDemo()}>Тест без сессии</button></div></section> : <div className="participant-phone"><div className="participant-content">{children}</div><DemoUnavailableToast />{!hideTabs && <Tabbar items={tabs} pathname={pathname} onUnavailable={showDemoUnavailable} />}</div>}</div></>;
}

export function ParticipantShell({ children }: { children: React.ReactNode }) {
  return <ParticipantProvider><ShellBody>{children}</ShellBody></ParticipantProvider>;
}
