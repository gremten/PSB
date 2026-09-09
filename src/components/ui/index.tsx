"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import styles from "./ui.module.css";

export { HorizontalScroller } from "./horizontal-scroller";

export function Screen({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <main className={`${styles.screen} ${className}`}>{children}</main>;
}

export function Header({
  title,
  leading,
  trailing,
}: {
  title: string;
  leading?: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <header className={styles.header}>
      <div className={styles.headerSide}>{leading}</div>
      <h1 className={styles.headerTitle}>{title}</h1>
      <div className={styles.headerSide}>{trailing}</div>
    </header>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  full?: boolean;
  dataTrack?: string;
};

export function Button({ variant = "primary", full, dataTrack, className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`${styles.button} ${styles[variant]} ${full ? styles.full : ""} ${className}`}
      data-track={dataTrack}
      {...props}
    />
  );
}

export function LinkButton({
  href,
  children,
  variant = "primary",
  full,
  dataTrack,
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  full?: boolean;
  dataTrack?: string;
}) {
  return (
    <Link
      href={href}
      className={`${styles.button} ${styles[variant]} ${full ? styles.full : ""}`}
      data-track={dataTrack}
    >
      {children}
    </Link>
  );
}

export function IconButton({ label, children, dataTrack, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode; dataTrack?: string }) {
  return <button aria-label={label} className={styles.iconButton} data-track={dataTrack} {...props}>{children}</button>;
}

export function Block({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`${styles.block} ${className}`}>{children}</section>;
}

export function Badge({ children, accent = false }: { children: ReactNode; accent?: boolean }) {
  return <span className={`${styles.badge} ${accent ? styles.badgeAccent : ""}`}>{children}</span>;
}

export function Cell({ href, label, description, leading, trailing = "›", dataTrack, onClick }: { href?: string; label: string; description?: string; leading?: ReactNode; trailing?: ReactNode; dataTrack: string; onClick?: () => void }) {
  const content = <><span className={styles.cellLeading}>{leading ?? "•"}</span><span><span className={styles.cellLabel}>{label}</span>{description && <span className={styles.cellDescription}>{description}</span>}</span><span className={styles.cellTrailing}>{trailing}</span></>;
  return href ? <Link href={href} className={styles.cell} data-track={dataTrack}>{content}</Link> : <button className={styles.cell} data-track={dataTrack} onClick={onClick}>{content}</button>;
}

export interface TabItem { href: string; label: string; icon: string; dataTrack: string; unavailable?: boolean }

export function Tabbar({ items, pathname, onUnavailable }: { items: TabItem[]; pathname: string; onUnavailable?: () => void }) {
  return <nav aria-label="Основная навигация" className={styles.tabbar}>{items.map((item) => { const active = !item.unavailable && (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)); const content = <><span aria-hidden="true" className={styles.tabIcon} style={{ "--tab-icon": `url("${item.icon}")` } as CSSProperties} /><span>{item.label}</span></>; return item.unavailable ? <button key={item.href} type="button" className={styles.tab} aria-label={`${item.label}: недоступно в демо`} data-track={item.dataTrack} onClick={onUnavailable}>{content}</button> : <Link key={item.href} href={item.href} className={`${styles.tab} ${active ? styles.tabActive : ""}`} data-track={item.dataTrack}>{content}</Link>; })}</nav>;
}

export function SegmentedControl<T extends string>({ options, value, onChange, dataTrackPrefix }: { options: { value: T; label: string }[]; value: T; onChange: (value: T) => void; dataTrackPrefix: string }) {
  return <div className={styles.segments}>{options.map((option) => <button key={option.value} className={`${styles.segment} ${value === option.value ? styles.segmentActive : ""}`} onClick={() => onChange(option.value)} data-track={`${dataTrackPrefix}.${option.value}`}>{option.label}</button>)}</div>;
}

export function BottomSheet({ open, title, children, onClose }: { open: boolean; title: string; children: ReactNode; onClose: () => void }) {
  if (!open) return null;
  return <div className={styles.sheetOverlay} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className={styles.sheet} role="dialog" aria-modal="true" aria-label={title}><div className={styles.sheetHandle} /><div className="row-between"><h2>{title}</h2><IconButton label="Закрыть" onClick={onClose}>×</IconButton></div>{children}</section></div>;
}
