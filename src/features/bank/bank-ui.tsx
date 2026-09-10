"use client";

import Image from "next/image";
import Link from "next/link";
import { Glass } from "@samasante/liquid-glass";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { showDemoUnavailable } from "@/features/usability/demo-feedback";
import styles from "./bank.module.css";

const FIGMA_BACK_GLASS_OPTICS = {
  strength: 0.8,
  depth: 0.2,
  dispersion: 0.5,
  frost: 4,
  splay: 0,
  sheen: 1,
  sheenAngle: -45,
  specular: 0.8,
};

function BackGlass({ children }: { children: ReactNode }) {
  return (
    <Glass className={styles.backGlass} size={44} radius={22} optics={FIGMA_BACK_GLASS_OPTICS}>
      {children}
    </Glass>
  );
}

export function ProfileHeader() {
  return (
    <header className={styles.profileHeader}>
      <div className={styles.profile}>
        <span className={styles.avatar}><Image src="/figma/home/avatar.svg" alt="" width={38} height={54} /></span>
        <span>Александр К.</span>
      </div>
      <div className={styles.toolbar}>
        <button className={styles.toolbarButton} aria-label="Поиск" data-track="header.search.open" onClick={showDemoUnavailable}><Image src="/figma/home/search.svg" alt="" width={24} height={24} /></button>
        <button className={styles.toolbarButton} aria-label="Уведомления" data-track="header.notifications.open" onClick={showDemoUnavailable}><Image src="/figma/home/bell.svg" alt="" width={24} height={24} /></button>
      </div>
    </header>
  );
}

export function DetailHeader({ title, subtitle, backHref, trailing }: { title: string; subtitle?: string; backHref: string; trailing?: ReactNode }) {
  return (
    <header className={styles.detailHeaderRow}>
      <BackGlass>
        <Link className={styles.backButton} href={backHref} aria-label="Назад" data-track="navigation.back">
          <Image src="/figma/icons/back.svg" alt="" width={24} height={24} />
        </Link>
      </BackGlass>
      <div className={styles.detailTitleWrap}>
        <h1 className={styles.detailTitle}>{title}</h1>
        {subtitle && <span className={styles.detailSubtitle}>{subtitle}</span>}
      </div>
      <div>{trailing}</div>
    </header>
  );
}

export function Transaction({ icon, imageSrc, title, meta, amount, bonus }: { icon?: string; imageSrc?: string; title: string; meta: string; amount: string; bonus?: string }) {
  return (
    <div className={styles.transaction}>
      <span className={`${styles.merchantIcon} ${imageSrc ? styles.merchantImage : ""}`} aria-hidden="true">
        {imageSrc ? <Image src={imageSrc} alt="" width={32} height={32} /> : icon}
      </span>
      <span className={styles.transactionMain}>
        <span className={styles.transactionTitle}>{title}</span>
        <span className={styles.transactionMeta}>{meta}</span>
      </span>
      <span className={styles.transactionAmount} data-income={amount.startsWith("+") || undefined}>{amount}{bonus && <span className={styles.transactionBonus}>{bonus}</span>}</span>
    </div>
  );
}

export function SettingsRow({ label, icon, dataTrack }: { label: string; icon?: string; dataTrack: string }) {
  return (
    <button type="button" className={`${styles.settingsRow} ${icon ? "" : styles.settingsRowSimple}`} data-track={dataTrack} onClick={showDemoUnavailable}>
      {icon && <span className={styles.settingIcon} aria-hidden="true">{icon}</span>}
      <span className={styles.settingsLabel}>{label}</span>
      <Image className={styles.settingsArrow} src="/figma/account/arrow-forward.svg" alt="" width={24} height={24} />
    </button>
  );
}

const faqAnswers: Record<string, string> = {
  "Как рассчитывается кэшбэк?": "Баллы начисляются как процент от суммы подходящих покупок по условиям выбранной категории.",
  "Как и когда приходит кэшбэк": "Баллы за подтверждённые операции начисляются в период с 5 по 20 число следующего месяца.",
  "Сколько действуют бонусные баллы?": "Баллы доступны, пока действует программа лояльности и соблюдаются её условия.",
  "Как обменять баллы на рубли?": "Нажмите «Обменять на рубли» и выберите счёт для зачисления.",
};

export function FaqList() {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <section className={styles.faqBlock}>
      <h2 className={styles.sectionHeading}>Частые вопросы</h2>
      <div className={styles.faqList}>
        {Object.entries(faqAnswers).map(([question, answer], index) => (
          <div key={question}>
            <button className={styles.faqRow} onClick={() => setOpen(open === question ? null : question)} data-track={`cashback.faq.${index + 1}.toggle`} aria-expanded={open === question}>
              <span>{question}</span><span className={styles.plus}>{open === question ? "−" : "+"}</span>
            </button>
            {open === question && <div className={styles.faqAnswer}>{answer}</div>}
          </div>
        ))}
      </div>
    </section>
  );
}

export function RouteButton({ href, children, className = "", dataTrack }: { href: string; children: ReactNode; className?: string; dataTrack: string }) {
  return <Link href={href} className={`${styles.primaryButton} ${className}`} data-track={dataTrack}>{children}</Link>;
}

export function RouterBackButton() {
  const router = useRouter();
  return (
    <BackGlass>
      <button className={styles.backButton} aria-label="Назад" onClick={() => router.back()} data-track="navigation.back">
        <Image src="/figma/icons/back.svg" alt="" width={24} height={24} />
      </button>
    </BackGlass>
  );
}

export { styles };
