"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Tabbar } from "@/components/ui";
import { TelegramMiniAppBridge } from "@/features/telegram/telegram-mini-app";
import { DEMO_UNAVAILABLE_EVENT, showDemoUnavailable } from "./demo-feedback";
import { ParticipantProvider } from "./participant-provider";

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
  const router = useRouter();
  const participantEntered = useSyncExternalStore(subscribeToRole, participantRoleSnapshot, () => false);
  const hideTabs = pathname === "/account" || pathname === "/card" || pathname.startsWith("/cashback/categories");

  const enterParticipant = () => {
    window.sessionStorage.setItem(ROLE_SESSION_KEY, "participant");
    window.dispatchEvent(new Event(ROLE_CHANGED_EVENT));
  };

  return <><TelegramMiniAppBridge /><div className="participant-stage"><div className="telegram-demo-label">Демо-интерфейс</div>{!participantEntered ? <section className="role-gate" aria-labelledby="role-gate-title"><p className="role-gate__eyebrow">PSB usability test</p><h1 id="role-gate-title">Выберите роль</h1><p>Участник проходит тест. Доступ модератора защищён паролем.</p><div className="role-gate__actions"><button type="button" data-track="role.participant.enter" onClick={enterParticipant}>Участник</button><button type="button" className="role-gate__secondary" data-track="role.moderator.enter" onClick={() => router.push("/moderator")}>Модератор</button></div></section> : <div className="participant-phone"><div className="participant-content">{children}</div><DemoUnavailableToast />{!hideTabs && <Tabbar items={tabs} pathname={pathname} onUnavailable={showDemoUnavailable} />}</div>}</div></>;
}

export function ParticipantShell({ children }: { children: React.ReactNode }) {
  return <ParticipantProvider><ShellBody>{children}</ShellBody></ParticipantProvider>;
}
