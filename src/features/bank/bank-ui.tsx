"use client";

import Image from "next/image";
import Link from "next/link";
import { Glass } from "@samasante/liquid-glass";
import { useRouter } from "next/navigation";
import { useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { showDemoUnavailable } from "@/features/usability/demo-feedback";
import { getElasticGlassPull, getToolbarGlassPull } from "./glass-interaction";
import styles from "./bank.module.css";

const FIGMA_GLASS_OPTICS = {
  // Figma Glass: Light -45° / 80%, Refraction 80, Depth 20, Dispersion 50, Frost 4, Splay 0.
  // The library uses normalized optics, so refraction is tuned to the same visual intensity
  // rather than copied as 0.8 (which would move pixels by ~80% of a 44 px lens).
  strength: 0.16,
  depth: 0.2,
  curvature: 0.72,
  dispersion: 0.5,
  bend: 0.8,
  bendWidth: 0.2,
  frost: 4,
  splay: 0,
  sheen: 0.8,
  sheenAngle: -45,
  specular: 0.8,
};

type PullState = { x: number; y: number; scaleX: number; scaleY: number; pressed: boolean };
const RESTING_PULL: PullState = { x: 0, y: 0, scaleX: 1, scaleY: 1, pressed: false };
const PRESSED_CONTENT_SCALE = 1;

const PRESSED_GLASS_OPTICS = {
  ...FIGMA_GLASS_OPTICS,
  strength: 0.2,
  depth: 0.28,
  curvature: 0.84,
  bend: 0.92,
  sheen: 0.92,
  specular: 0.92,
};

function BackGlass({ children }: { children: ReactNode }) {
  const [pull, setPull] = useState<PullState>(RESTING_PULL);
  const pointerId = useRef<number | null>(null);
  const pointerOrigin = useRef({ x: 0, y: 0 });
  const dragged = useRef(false);

  const beginPull = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointerId.current = event.pointerId;
    pointerOrigin.current = { x: event.clientX, y: event.clientY };
    dragged.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
    setPull({ ...getElasticGlassPull(0, 0), pressed: true });
  };

  const movePull = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerId.current !== event.pointerId) return;
    const deltaX = event.clientX - pointerOrigin.current.x;
    const deltaY = event.clientY - pointerOrigin.current.y;
    if (Math.hypot(deltaX, deltaY) > 4) dragged.current = true;
    setPull({ ...getElasticGlassPull(deltaX, deltaY), pressed: true });
  };

  const endPull = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerId.current !== event.pointerId) return;
    pointerId.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setPull(RESTING_PULL);
  };

  const contentScaleX = pull.pressed ? PRESSED_CONTENT_SCALE / pull.scaleX : 1;
  const contentScaleY = pull.pressed ? PRESSED_CONTENT_SCALE / pull.scaleY : 1;

  return (
    <div
      className={styles.backGlassPull}
      data-pulling={pull.pressed || undefined}
      onPointerDown={beginPull}
      onPointerMove={movePull}
      onPointerUp={endPull}
      onPointerCancel={endPull}
      onClickCapture={(event) => {
        if (!dragged.current) return;
        event.preventDefault();
        event.stopPropagation();
        dragged.current = false;
      }}
      style={{ transform: `translate3d(${pull.x}px, ${pull.y}px, 0) scale(${pull.scaleX}, ${pull.scaleY})` }}
    >
      <Glass
        className={styles.backGlass}
        width={44}
        height={44}
        radius={22}
        optics={pull.pressed ? PRESSED_GLASS_OPTICS : FIGMA_GLASS_OPTICS}
      >
        <div
          className={styles.backGlassContent}
          style={{ transform: `scale(${contentScaleX}, ${contentScaleY})` }}
        >
          {children}
        </div>
      </Glass>
    </div>
  );
}

function HeaderToolbar() {
  const [activeIndex, setActiveIndex] = useState<0 | 1>(0);
  const [pressed, setPressed] = useState(false);
  const [pull, setPull] = useState(() => getToolbarGlassPull(0, 0));
  const pointerId = useRef<number | null>(null);
  const pointerOrigin = useRef({ x: 0, y: 0 });
  const dragged = useRef(false);

  const beginPress = (index: 0 | 1) => (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (activeIndex !== index) setActiveIndex(index);
    pointerId.current = event.pointerId;
    pointerOrigin.current = { x: event.clientX, y: event.clientY };
    dragged.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
    setPull(getToolbarGlassPull(0, 0));
    setPressed(true);
  };

  const movePress = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (pointerId.current !== event.pointerId) return;
    const deltaX = event.clientX - pointerOrigin.current.x;
    const deltaY = event.clientY - pointerOrigin.current.y;
    if (Math.hypot(deltaX, deltaY) > 4) dragged.current = true;
    setPull(getToolbarGlassPull(deltaX, deltaY));
  };

  const endPress = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (pointerId.current !== event.pointerId) return;
    pointerId.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setPressed(false);
    setPull(getToolbarGlassPull(0, 0));
  };

  const suppressDraggedClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    if (!dragged.current) return;
    event.preventDefault();
    event.stopPropagation();
    dragged.current = false;
  };

  const origin = activeIndex === 0 ? "27% 50%" : "73% 50%";
  const contentScaleX = pressed ? PRESSED_CONTENT_SCALE / pull.scaleX : 1;
  const contentScaleY = pressed ? PRESSED_CONTENT_SCALE / pull.scaleY : 1;

  return (
    <div
      className={styles.toolbarGlassPull}
      data-pulling={pressed || undefined}
      style={{
        transform: pressed ? `translate3d(${pull.x}px, ${pull.y}px, 0) scale(${pull.scaleX}, ${pull.scaleY})` : undefined,
        transformOrigin: origin,
      }}
    >
      <Glass className={styles.toolbarGlass} width={88} height={44} radius={22} optics={pressed ? PRESSED_GLASS_OPTICS : FIGMA_GLASS_OPTICS}>
        <div
          className={styles.toolbar}
          style={{
            transform: pressed ? `scale(${contentScaleX}, ${contentScaleY})` : undefined,
            transformOrigin: origin,
          }}
        >
          <button
            className={styles.toolbarButton}
            aria-label="Поиск"
            data-track="header.search.open"
            onPointerDown={beginPress(0)}
            onPointerMove={movePress}
            onPointerUp={endPress}
            onPointerCancel={endPress}
            onClickCapture={suppressDraggedClick}
            onClick={showDemoUnavailable}
          ><Image src="/figma/home/search.svg" alt="" width={24} height={24} /></button>
          <button
            className={styles.toolbarButton}
            aria-label="Уведомления"
            data-track="header.notifications.open"
            onPointerDown={beginPress(1)}
            onPointerMove={movePress}
            onPointerUp={endPress}
            onPointerCancel={endPress}
            onClickCapture={suppressDraggedClick}
            onClick={showDemoUnavailable}
          ><Image src="/figma/home/bell.svg" alt="" width={24} height={24} /></button>
        </div>
      </Glass>
    </div>
  );
}

export function ProfileHeader() {
  return (
    <header className={styles.profileHeader}>
      <div className={styles.profile}>
        <span className={styles.avatar}><Image src="/figma/home/avatar.svg" alt="" width={38} height={54} /></span>
        <span>Александр К.</span>
      </div>
      <HeaderToolbar />
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
