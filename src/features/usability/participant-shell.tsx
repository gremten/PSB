"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Tabbar } from "@/components/ui";
import { DEMO_UNAVAILABLE_EVENT } from "./demo-feedback";
import { ParticipantProvider } from "./participant-provider";

const tabs = [
  { href: "/", label: "Главная", icon: "/figma/home/tab-home.svg", dataTrack: "tab.home.open" },
  { href: "/payment", label: "Платежи", icon: "/figma/home/tab-payments.svg", dataTrack: "tab.payments.open" },
  { href: "/cashback", label: "Выгода", icon: "/figma/home/tab-benefit.svg", dataTrack: "cashback.tab.open" },
  { href: "/chat", label: "Чат", icon: "/figma/home/tab-chat.svg", dataTrack: "tab.chat.open" },
  { href: "/more", label: "Ещё", icon: "/figma/home/tab-more.svg", dataTrack: "tab.more.open" },
];

function ConceptNotice() {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  return <div className="concept-notice"><span>Концепт интерфейса · не продукт банка</span><button aria-label="Закрыть уведомление" data-track="concept.notice.dismiss" onClick={() => { window.localStorage.setItem("psb-concept-notice-dismissed", "1"); setVisible(false); }}>×</button></div>;
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
  return <div className="demo-toast" role="status" aria-live="polite" data-track="demo.unavailable.toast">Недоступно в демо-демонстрации</div>;
}

function ShellBody({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideTabs = pathname === "/account" || pathname === "/card" || pathname.startsWith("/cashback/categories");
  return <div className="participant-stage"><div className="participant-phone"><div className="participant-content">{children}</div><ConceptNotice /><DemoUnavailableToast />{!hideTabs && <Tabbar items={tabs} pathname={pathname} />}</div></div>;
}

export function ParticipantShell({ children }: { children: React.ReactNode }) {
  return <ParticipantProvider><ShellBody>{children}</ShellBody></ParticipantProvider>;
}
