"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { Tabbar } from "@/components/ui";
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

function ShellBody({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideTabs = pathname === "/account" || pathname === "/card" || pathname === "/payment" || pathname.startsWith("/cashback/categories");
  return <div className="participant-stage"><div className="participant-phone"><div className="participant-content">{children}</div><ConceptNotice />{!hideTabs && <Tabbar items={tabs} pathname={pathname} />}</div></div>;
}

export function ParticipantShell({ children }: { children: React.ReactNode }) {
  return <ParticipantProvider><ShellBody>{children}</ShellBody></ParticipantProvider>;
}
