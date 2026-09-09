"use client";

import { usePathname } from "next/navigation";
import { FormEvent, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Tabbar } from "@/components/ui";
import { TelegramMiniAppBridge } from "@/features/telegram/telegram-mini-app";
import { DEMO_UNAVAILABLE_EVENT, showDemoUnavailable } from "./demo-feedback";
import { ParticipantProvider } from "./participant-provider";
import { PARTICIPANT_SESSION_KEY, track } from "@/lib/testing/tracking";
import { resetParticipantState } from "@/lib/testing/participant-state";

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

function DemoUnavailableToast() {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const show = () => {
      setVisible(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setVisible(false), 2400);
    };
    window.addEventListener(DEMO_UNAVAILABLE_EVENT, show);
    return () => {
      window.removeEventListener(DEMO_UNAVAILABLE_EVENT, show);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!visible) return null;
  return <button type="button" className="demo-toast" aria-live="polite" data-track="demo.unavailable.toast.dismiss" onClick={() => setVisible(false)}>Недоступно в демо-демонстрации</button>;
}

function ShellBody({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const participantEntered = useSyncExternalStore(subscribeToRole, participantRoleSnapshot, () => false);
  const [participantName, setParticipantName] = useState("");
  const [entryError, setEntryError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const hideTabs = pathname === "/account" || pathname === "/card" || pathname.startsWith("/cashback/categories");

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
      resetParticipantState("disconnected");
      enterParticipant();
      void track("screen_view", { screen: pathname, action: "screen.home.view" });
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

  return <><TelegramMiniAppBridge /><div className="participant-stage"><div className="telegram-demo-label">Демо-интерфейс</div>{!participantEntered ? <section className="role-gate" aria-labelledby="role-gate-title"><p className="role-gate__eyebrow">PSB usability test</p><h1 id="role-gate-title">Начать тест</h1><p>Введите псевдоним или код участника — без фамилии и других личных данных.</p><form className="role-gate__form" onSubmit={createParticipantSession}><label htmlFor="participant-name">Псевдоним участника</label><div className="role-gate__input-row"><input id="participant-name" name="participantName" maxLength={32} autoComplete="off" placeholder="Например, P-01" value={participantName} onChange={(event) => setParticipantName(event.target.value)} /><button type="submit" aria-label="Продолжить" data-track="participant.session.create" disabled={!participantName.trim() || submitting}>→</button></div>{entryError && <p className="role-gate__error" role="alert">{entryError}</p>}<button type="button" className="role-gate__skip" data-track="participant.session.skip" onClick={skipParticipantSession}>Пропустить</button></form></section> : <div className="participant-phone"><div className="participant-content">{children}</div><DemoUnavailableToast />{!hideTabs && <Tabbar items={tabs} pathname={pathname} onUnavailable={showDemoUnavailable} />}</div>}</div></>;
}

export function ParticipantShell({ children }: { children: React.ReactNode }) {
  return <ParticipantProvider><ShellBody>{children}</ShellBody></ParticipantProvider>;
}
