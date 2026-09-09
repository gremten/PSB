"use client";

import {
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

export function HorizontalScroller({
  children,
  className,
  ariaLabel,
}: {
  children: ReactNode;
  className: string;
  ariaLabel: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({ active: false, moved: false, startX: 0, scrollLeft: 0 });

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        scroller.scrollLeft = 0;
      });
    });
    const restoreGuard = window.setTimeout(() => {
      scroller.scrollLeft = 0;
    }, 120);
    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      window.clearTimeout(restoreGuard);
    };
  }, []);

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch" || event.button !== 0) return;
    if ((event.target as HTMLElement).closest("button, a")) return;
    const scroller = scrollerRef.current;
    if (!scroller) return;

    dragState.current = {
      active: true,
      moved: false,
      startX: event.clientX,
      scrollLeft: scroller.scrollLeft,
    };
    scroller.setPointerCapture(event.pointerId);
    scroller.dataset.dragging = "true";
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const scroller = scrollerRef.current;
    const state = dragState.current;
    if (!scroller || !state.active) return;

    const delta = event.clientX - state.startX;
    if (Math.abs(delta) > 4) state.moved = true;
    scroller.scrollLeft = state.scrollLeft - delta;
  }

  function finishDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const scroller = scrollerRef.current;
    if (!scroller || !dragState.current.active) return;
    dragState.current.active = false;
    if (scroller.hasPointerCapture(event.pointerId)) scroller.releasePointerCapture(event.pointerId);
    delete scroller.dataset.dragging;
  }

  return (
    <div
      ref={scrollerRef}
      className={className}
      aria-label={ariaLabel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      onClickCapture={(event) => {
        if (!dragState.current.moved) return;
        event.preventDefault();
        event.stopPropagation();
        dragState.current.moved = false;
      }}
    >
      {children}
    </div>
  );
}
