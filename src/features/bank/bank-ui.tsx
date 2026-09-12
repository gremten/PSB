"use client";

import Image from "next/image";
import Link from "next/link";
import { Glass } from "@samasante/liquid-glass";
import { useRouter } from "next/navigation";
import { useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { showDemoUnavailable } from "@/features/usability/demo-feedback";
import { useParticipant } from "@/features/usability/participant-provider";
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


const CENSOR_BUBBLE_PARTICLES = [{"x":61.2,"y":59.0,"size":2.8,"opacity":0.52,"dx":-1.9,"dy":-2.0,"duration":2.84,"delay":-0.17,"glow":3.6,"startDx":0.66,"startDy":0.7,"endDx":-0.66,"endDy":1.1,"startOpacity":0.371,"endOpacity":0.433},{"x":79.3,"y":50.6,"size":2.8,"opacity":0.33,"dx":0.8,"dy":-2.1,"duration":3.58,"delay":-2.52,"glow":1.8,"startDx":-0.28,"startDy":0.73,"endDx":0.28,"endDy":1.16,"startOpacity":0.235,"endOpacity":0.274},{"x":94.0,"y":55.1,"size":2.2,"opacity":0.66,"dx":-0.3,"dy":-2.0,"duration":3.47,"delay":-0.04,"glow":2.1,"startDx":0.1,"startDy":0.7,"endDx":-0.1,"endDy":1.1,"startOpacity":0.475,"endOpacity":0.554},{"x":76.4,"y":58.0,"size":2.2,"opacity":0.46,"dx":0.7,"dy":-1.3,"duration":4.14,"delay":-1.58,"glow":2.3,"startDx":-0.24,"startDy":0.45,"endDx":0.24,"endDy":0.72,"startOpacity":0.334,"endOpacity":0.389},{"x":11.3,"y":68.0,"size":2.2,"opacity":0.34,"dx":-0.7,"dy":-1.4,"duration":3.65,"delay":-2.45,"glow":1.2,"startDx":0.24,"startDy":0.49,"endDx":-0.24,"endDy":0.77,"startOpacity":0.241,"endOpacity":0.282},{"x":90.4,"y":39.3,"size":2.2,"opacity":0.36,"dx":1.1,"dy":-0.5,"duration":3.02,"delay":-0.01,"glow":1.7,"startDx":-0.39,"startDy":0.17,"endDx":0.39,"endDy":0.28,"startOpacity":0.257,"endOpacity":0.3},{"x":21.5,"y":43.3,"size":3.6,"opacity":0.49,"dx":-1.4,"dy":-1.9,"duration":3.74,"delay":-1.27,"glow":4.5,"startDx":0.49,"startDy":0.66,"endDx":-0.49,"endDy":1.04,"startOpacity":0.351,"endOpacity":0.41},{"x":90.6,"y":38.3,"size":2.8,"opacity":0.57,"dx":-0.1,"dy":-0.9,"duration":3.61,"delay":-2.04,"glow":2.3,"startDx":0.03,"startDy":0.32,"endDx":-0.03,"endDy":0.5,"startOpacity":0.412,"endOpacity":0.48},{"x":53.9,"y":56.6,"size":1.4,"opacity":0.73,"dx":-2.2,"dy":-1.0,"duration":2.59,"delay":-0.69,"glow":1.1,"startDx":0.77,"startDy":0.35,"endDx":-0.77,"endDy":0.55,"startOpacity":0.528,"endOpacity":0.616},{"x":58.2,"y":25.9,"size":1.8,"opacity":0.62,"dx":-0.1,"dy":1.8,"duration":4.1,"delay":-1.2,"glow":1.2,"startDx":0.03,"startDy":-0.63,"endDx":-0.03,"endDy":-0.99,"startOpacity":0.444,"endOpacity":0.518},{"x":60.5,"y":25.3,"size":3.6,"opacity":0.37,"dx":2.0,"dy":-0.7,"duration":2.95,"delay":-2.17,"glow":3.6,"startDx":-0.7,"startDy":0.24,"endDx":0.7,"endDy":0.39,"startOpacity":0.268,"endOpacity":0.312},{"x":27.6,"y":38.9,"size":2.8,"opacity":0.67,"dx":-2.9,"dy":-0.2,"duration":2.49,"delay":-0.81,"glow":3.0,"startDx":1.01,"startDy":0.07,"endDx":-1.01,"endDy":0.11,"startOpacity":0.481,"endOpacity":0.561},{"x":77.2,"y":84,"size":2.2,"opacity":0.47,"dx":0.5,"dy":-0.3,"duration":4.11,"delay":-1.62,"glow":2.1,"startDx":-0.17,"startDy":0.1,"endDx":0.17,"endDy":0.17,"startOpacity":0.338,"endOpacity":0.394},{"x":51.5,"y":59.2,"size":1.8,"opacity":0.59,"dx":-0.9,"dy":0.0,"duration":4.17,"delay":-0.96,"glow":1.9,"startDx":0.32,"startDy":-0.0,"endDx":-0.32,"endDy":-0.0,"startOpacity":0.426,"endOpacity":0.497},{"x":69.4,"y":60.7,"size":1.4,"opacity":0.73,"dx":1.2,"dy":-2.0,"duration":4.24,"delay":-0.38,"glow":0.9,"startDx":-0.42,"startDy":0.7,"endDx":0.42,"endDy":1.1,"startOpacity":0.528,"endOpacity":0.616},{"x":80.6,"y":60.3,"size":3.6,"opacity":0.43,"dx":-1.5,"dy":-0.4,"duration":3.94,"delay":-2.57,"glow":3.2,"startDx":0.52,"startDy":0.14,"endDx":-0.52,"endDy":0.22,"startOpacity":0.313,"endOpacity":0.365},{"x":18.3,"y":35.0,"size":1.8,"opacity":0.64,"dx":-1.2,"dy":-2.2,"duration":4.11,"delay":-0.7,"glow":2.0,"startDx":0.42,"startDy":0.77,"endDx":-0.42,"endDy":1.21,"startOpacity":0.46,"endOpacity":0.537},{"x":23.8,"y":56.7,"size":1.8,"opacity":0.53,"dx":-1.9,"dy":2.0,"duration":2.61,"delay":-0.46,"glow":1.9,"startDx":0.66,"startDy":-0.7,"endDx":-0.66,"endDy":-1.1,"startOpacity":0.381,"endOpacity":0.444},{"x":6.5,"y":39.6,"size":1.8,"opacity":0.42,"dx":-1.5,"dy":0.5,"duration":2.53,"delay":-2.14,"glow":1.5,"startDx":0.52,"startDy":-0.17,"endDx":-0.52,"endDy":-0.28,"startOpacity":0.302,"endOpacity":0.353},{"x":38.7,"y":84,"size":2.8,"opacity":0.31,"dx":-1.7,"dy":1.6,"duration":4.24,"delay":-1.62,"glow":3.5,"startDx":0.59,"startDy":-0.56,"endDx":-0.59,"endDy":-0.88,"startOpacity":0.226,"endOpacity":0.263},{"x":75.5,"y":43.2,"size":2.8,"opacity":0.57,"dx":1.2,"dy":-2.1,"duration":2.68,"delay":-0.71,"glow":2.1,"startDx":-0.42,"startDy":0.73,"endDx":0.42,"endDy":1.16,"startOpacity":0.414,"endOpacity":0.483},{"x":42.4,"y":42.3,"size":2.8,"opacity":0.57,"dx":-1.3,"dy":0.9,"duration":4.02,"delay":-2.68,"glow":2.3,"startDx":0.45,"startDy":-0.32,"endDx":-0.45,"endDy":-0.5,"startOpacity":0.408,"endOpacity":0.476},{"x":37.9,"y":34.4,"size":2.2,"opacity":0.77,"dx":0.8,"dy":-0.3,"duration":4.27,"delay":-0.44,"glow":2.2,"startDx":-0.28,"startDy":0.1,"endDx":0.28,"endDy":0.17,"startOpacity":0.556,"endOpacity":0.648},{"x":87.4,"y":82.3,"size":1.8,"opacity":0.5,"dx":2.4,"dy":-2.0,"duration":3.52,"delay":-0.4,"glow":2.3,"startDx":-0.84,"startDy":0.7,"endDx":0.84,"endDy":1.1,"startOpacity":0.359,"endOpacity":0.419},{"x":30.7,"y":45.3,"size":1.4,"opacity":0.42,"dx":0.9,"dy":2.1,"duration":3.57,"delay":-2.96,"glow":0.8,"startDx":-0.32,"startDy":-0.73,"endDx":0.32,"endDy":-1.16,"startOpacity":0.305,"endOpacity":0.356},{"x":61.4,"y":39.4,"size":3.6,"opacity":0.66,"dx":-1.8,"dy":0.4,"duration":3.51,"delay":-1.74,"glow":4.1,"startDx":0.63,"startDy":-0.14,"endDx":-0.63,"endDy":-0.22,"startOpacity":0.478,"endOpacity":0.558},{"x":50.2,"y":51.1,"size":2.2,"opacity":0.64,"dx":-1.8,"dy":1.5,"duration":2.96,"delay":-1.05,"glow":2.3,"startDx":0.63,"startDy":-0.52,"endDx":-0.63,"endDy":-0.83,"startOpacity":0.46,"endOpacity":0.537},{"x":70.6,"y":62.0,"size":3.6,"opacity":0.49,"dx":0.7,"dy":0.2,"duration":2.91,"delay":-1.42,"glow":3.4,"startDx":-0.24,"startDy":-0.07,"endDx":0.24,"endDy":-0.11,"startOpacity":0.349,"endOpacity":0.408},{"x":38.4,"y":56.8,"size":2.8,"opacity":0.42,"dx":1.6,"dy":-1.6,"duration":3.42,"delay":-1.16,"glow":2.2,"startDx":-0.56,"startDy":0.56,"endDx":0.56,"endDy":0.88,"startOpacity":0.301,"endOpacity":0.351},{"x":89.4,"y":42.2,"size":2.8,"opacity":0.62,"dx":1.1,"dy":-0.2,"duration":3.4,"delay":-2.66,"glow":3.0,"startDx":-0.39,"startDy":0.07,"endDx":0.39,"endDy":0.11,"startOpacity":0.444,"endOpacity":0.518},{"x":94.0,"y":61.7,"size":4.6,"opacity":0.36,"dx":-2.4,"dy":1.0,"duration":2.73,"delay":-2.32,"glow":3.9,"startDx":0.84,"startDy":-0.35,"endDx":-0.84,"endDy":-0.55,"startOpacity":0.256,"endOpacity":0.298},{"x":9.1,"y":57.0,"size":1.8,"opacity":0.57,"dx":-0.3,"dy":1.7,"duration":4.08,"delay":-2.78,"glow":0.9,"startDx":0.1,"startDy":-0.59,"endDx":-0.1,"endDy":-0.94,"startOpacity":0.413,"endOpacity":0.481},{"x":33.2,"y":45.8,"size":2.8,"opacity":0.67,"dx":2.0,"dy":1.2,"duration":3.99,"delay":-0.62,"glow":2.9,"startDx":-0.7,"startDy":-0.42,"endDx":0.7,"endDy":-0.66,"startOpacity":0.485,"endOpacity":0.566},{"x":94.9,"y":70.7,"size":2.2,"opacity":0.66,"dx":1.5,"dy":0.0,"duration":2.6,"delay":-1.56,"glow":1.4,"startDx":-0.52,"startDy":-0.0,"endDx":0.52,"endDy":-0.0,"startOpacity":0.472,"endOpacity":0.551},{"x":22.5,"y":61.2,"size":1.4,"opacity":0.71,"dx":-0.1,"dy":-0.7,"duration":2.89,"delay":-2.3,"glow":1.7,"startDx":0.03,"startDy":0.24,"endDx":-0.03,"endDy":0.39,"startOpacity":0.512,"endOpacity":0.598},{"x":25.5,"y":31.8,"size":2.2,"opacity":0.77,"dx":-0.9,"dy":0.3,"duration":3.98,"delay":-2.21,"glow":1.8,"startDx":0.32,"startDy":-0.1,"endDx":-0.32,"endDy":-0.17,"startOpacity":0.557,"endOpacity":0.65},{"x":60.3,"y":59.4,"size":2.2,"opacity":0.68,"dx":1.4,"dy":0.6,"duration":2.46,"delay":-1.91,"glow":1.7,"startDx":-0.49,"startDy":-0.21,"endDx":0.49,"endDy":-0.33,"startOpacity":0.49,"endOpacity":0.572},{"x":11.8,"y":45.7,"size":4.6,"opacity":0.3,"dx":1.6,"dy":1.3,"duration":2.81,"delay":-1.24,"glow":3.2,"startDx":-0.56,"startDy":-0.45,"endDx":0.56,"endDy":-0.72,"startOpacity":0.218,"endOpacity":0.255},{"x":50.6,"y":58.9,"size":2.2,"opacity":0.44,"dx":0.9,"dy":-1.4,"duration":3.96,"delay":-2.31,"glow":2.4,"startDx":-0.32,"startDy":0.49,"endDx":0.32,"endDy":0.77,"startOpacity":0.32,"endOpacity":0.373},{"x":7.3,"y":29.1,"size":2.2,"opacity":0.63,"dx":-0.5,"dy":0.3,"duration":2.67,"delay":-0.65,"glow":2.0,"startDx":0.17,"startDy":-0.1,"endDx":-0.17,"endDy":-0.17,"startOpacity":0.457,"endOpacity":0.533},{"x":49.4,"y":49.3,"size":4.6,"opacity":0.53,"dx":-1.3,"dy":-2.0,"duration":3.44,"delay":-0.32,"glow":3.5,"startDx":0.45,"startDy":0.7,"endDx":-0.45,"endDy":1.1,"startOpacity":0.382,"endOpacity":0.446},{"x":62.3,"y":66.4,"size":3.6,"opacity":0.63,"dx":-1.4,"dy":-1.2,"duration":4.1,"delay":-0.35,"glow":3.9,"startDx":0.49,"startDy":0.42,"endDx":-0.49,"endDy":0.66,"startOpacity":0.452,"endOpacity":0.528}] as const;

export function CensorBubbles({ variant = "transaction" }: { variant?: "balance" | "account" | "transaction" }) {
  return (
    <span
      className={`${styles.censorBubbles} ${variant === "balance" ? styles.censorBubblesBalance : variant === "account" ? styles.censorBubblesAccount : styles.censorBubblesTransaction}`}
      aria-hidden="true"
    >
      {CENSOR_BUBBLE_PARTICLES.map((particle, index) => (
        <span
          className={styles.censorBubble}
          key={index}
          style={{
            "--bubble-x": `${particle.x}%`,
            "--bubble-y": `${particle.y}%`,
            "--bubble-size": `${particle.size}px`,
            "--bubble-opacity": particle.opacity,
            "--bubble-opacity-start": particle.startOpacity,
            "--bubble-opacity-end": particle.endOpacity,
            "--bubble-dx": `${particle.dx}px`,
            "--bubble-dy": `${particle.dy}px`,
            "--bubble-start-dx": `${particle.startDx}px`,
            "--bubble-start-dy": `${particle.startDy}px`,
            "--bubble-end-dx": `${particle.endDx}px`,
            "--bubble-end-dy": `${particle.endDy}px`,
            "--bubble-duration": `${particle.duration}s`,
            "--bubble-delay": `${particle.delay}s`,
            "--bubble-glow": `${particle.glow}px`,
          } as CSSProperties}
        />
      ))}
    </span>
  );
}

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

  const beginPress = (event: ReactPointerEvent<HTMLButtonElement>, index: 0 | 1) => {
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
            onPointerDown={(event) => beginPress(event, 0)}
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
            onPointerDown={(event) => beginPress(event, 1)}
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

export function Transaction({ icon, imageSrc, title, meta, amount, bonus, hiddenAmount = false }: { icon?: string; imageSrc?: string; title: string; meta: string; amount: string; bonus?: string; hiddenAmount?: boolean }) {
  return (
    <div className={styles.transaction}>
      <span className={`${styles.merchantIcon} ${imageSrc ? styles.merchantImage : ""}`} aria-hidden="true">
        {imageSrc ? <Image src={imageSrc} alt="" width={32} height={32} /> : icon}
      </span>
      <span className={styles.transactionMain}>
        <span className={styles.transactionTitle}>{title}</span>
        <span className={styles.transactionMeta}>{meta}</span>
      </span>
      <span className={styles.transactionAmount} data-income={!hiddenAmount && (amount.startsWith("+") || undefined)}>
        {hiddenAmount ? <CensorBubbles variant="transaction" /> : <>{amount}{bonus && <span className={styles.transactionBonus}>{bonus}</span>}</>}
      </span>
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
  const { replayVisualState } = useParticipant();
  const [liveOpen, setOpen] = useState<string | null>(null);
  return (
    <section className={styles.faqBlock}>
      <h2 className={styles.sectionHeading}>Частые вопросы</h2>
      <div className={styles.faqList}>
        {Object.entries(faqAnswers).map(([question, answer], index) => {
          const isOpen = replayVisualState ? replayVisualState.openFaqIndex === index + 1 : liveOpen === question;
          return <div key={question}>
            <button className={styles.faqRow} onClick={() => setOpen(liveOpen === question ? null : question)} data-track={`cashback.faq.${index + 1}.toggle`} aria-expanded={isOpen}>
              <span>{question}</span><span className={styles.plus}>{isOpen ? "−" : "+"}</span>
            </button>
            {isOpen && <div className={styles.faqAnswer}>{answer}</div>}
          </div>;
        })}
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
