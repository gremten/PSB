"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
  const hideTabs = pathname === "/account" || pathname === "/card" || pathname.startsWith("/cashback/categories");
  return <><TelegramMiniAppBridge /><div className="participant-stage"><div className="telegram-demo-label">Демо-интерфейс</div><div className="participant-phone"><div className="participant-content">{children}</div><DemoUnavailableToast />{!hideTabs && <Tabbar items={tabs} pathname={pathname} onUnavailable={showDemoUnavailable} />}</div></div></>;
}

export function ParticipantShell({ children }: { children: React.ReactNode }) {
  return <ParticipantProvider><ShellBody>{children}</ShellBody></ParticipantProvider>;
}
