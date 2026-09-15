"use client";

import { Glass } from "@samasante/liquid-glass";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { shouldDismissToast, TOAST_DURATION_MS, TOAST_TRANSITION_MS, toastDragVisual } from "./toast-motion";
import styles from "./glass-toast.module.css";

const OPTICS = { strength: 0.16, depth: 0.2, curvature: 0.72, dispersion: 0.5, bend: 0.8, bendWidth: 0.2, frost: 4, splay: 0, sheen: 0.8, sheenAngle: -45, specular: 0.8 };

export function GlassToast({ children, placement, tone = "neutral", trackId, className = "", autoDismiss = true, onDone }: {
  children: ReactNode;
  placement: "top" | "bottom";
  tone?: "neutral" | "orange";
  trackId: string;
  className?: string;
  autoDismiss?: boolean;
  onDone: () => void;
}) {
  const [phase, setPhase] = useState<"enter" | "visible" | "exit">("enter");
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const pointer = useRef<{ id: number; y: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onDoneRef = useRef(onDone);
  const exiting = useRef(false);
  const suppressClick = useRef(false);

  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  const dismiss = useCallback(() => {
    if (exiting.current) return;
    exiting.current = true;
    if (timer.current) clearTimeout(timer.current);
    setDragging(false);
    setPhase("exit");
    exitTimer.current = setTimeout(() => onDoneRef.current(), TOAST_TRANSITION_MS);
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setPhase("visible"));
    if (autoDismiss) timer.current = setTimeout(dismiss, TOAST_DURATION_MS + TOAST_TRANSITION_MS);
    return () => {
      cancelAnimationFrame(frame);
      if (timer.current) clearTimeout(timer.current);
      if (exitTimer.current) clearTimeout(exitTimer.current);
    };
  }, [autoDismiss, dismiss]);

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    // A toast can overlap the card carousel; its drag must not start a card gesture.
    event.stopPropagation();
    if (timer.current) clearTimeout(timer.current);
    suppressClick.current = false;
    pointer.current = { id: event.pointerId, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };
  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (pointer.current?.id !== event.pointerId) return;
    event.stopPropagation();
    setDragY(toastDragVisual(event.clientY - pointer.current.y, placement).offsetY);
  };
  const onPointerEnd = (event: PointerEvent<HTMLButtonElement>) => {
    if (pointer.current?.id !== event.pointerId) return;
    event.stopPropagation();
    const distance = event.clientY - pointer.current.y;
    pointer.current = null;
    setDragging(false);
    suppressClick.current = Math.abs(distance) > 6;
    if (shouldDismissToast(distance, placement)) {
      setDragY(toastDragVisual(distance, placement).offsetY);
      dismiss();
    } else {
      setDragY(0);
      if (autoDismiss) timer.current = setTimeout(dismiss, TOAST_DURATION_MS);
    }
  };
  const visual = toastDragVisual(dragY, placement);
  const edge = placement === "top" ? -1 : 1;
  const offset = phase === "visible" ? visual.offsetY : phase === "enter" ? edge * 12 : visual.offsetY + edge * 20;
  const style = {
    "--toast-opacity": phase === "visible" ? visual.opacity : 0,
    "--toast-offset": `${offset}px`,
    "--toast-scale": phase === "visible" ? visual.scale : Math.min(visual.scale, 0.88),
  } as CSSProperties;

  return <button type="button" className={`${styles.toast} ${styles[placement]} ${tone === "orange" ? styles.orange : ""} ${className}`} style={style} data-dragging={dragging} data-track={trackId} aria-live="polite" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerEnd} onPointerCancel={onPointerEnd} onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } dismiss(); }}>
    {placement === "top"
      ? <Glass className={styles.glass} optics={OPTICS} radius={24}><span className={styles.content}>{children}</span></Glass>
      : <span className={`${styles.solid} ${styles.content}`}>{children}</span>}
  </button>;
}
