"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Suspense, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { flushSync } from "react-dom";
import { DetailHeader, SettingsRow, styles } from "@/features/bank/bank-ui";
import { showDemoUnavailable } from "@/features/usability/demo-feedback";
import { GlassToast } from "@/features/usability/glass-toast";
import { useParticipant } from "@/features/usability/participant-provider";
import { track } from "@/lib/testing/tracking";
import { CARD_SWIPE_TRAVEL, cardSwipeDestination } from "./card-gesture";

export const fakeCard = { number: "4588 2344 4563 3124", expiry: "07/28", cvv: "456" };

const cards = [
  { id: "night", type: "night", label: "Сильные люди", ending: "2345", logo: "/figma/card/logo-night.svg", mir: "/figma/card/mir-night.svg", data: { number: "4588 2344 4563 2345", expiry: "07/28", cvv: "456" } },
  { id: "orange", type: "orange", label: "Твой банк", ending: "3124", logo: "/figma/card/logo-orange.svg", mir: "/figma/card/mir-orange.svg", data: fakeCard },
  { id: "salary", type: "salary", label: "Зарплатная", ending: "3451", logo: "/figma/card/logo-night.svg", mir: "/figma/card/mir-night.svg", data: { number: "4588 2344 4563 3451", expiry: "07/28", cvv: "456" } },
] as const;

type CardType = (typeof cards)[number]["type"];
type CardGesture = { pointerId: number; startX: number; startY: number; cardIndex: number; dragging: boolean };

function CardFront({ type, ending, logo, mir, hidden }: { type: CardType; ending: string; logo: string; mir: string; hidden: boolean }) {
  return (
    <div aria-hidden={hidden} className={`${styles.flipFace} ${styles.flipFront} ${type === "orange" ? styles.flipFrontOrange : styles.flipFrontNight}`}>
      <Image className={styles.flipLogo} src={logo} alt="" width={213} height={213} loading="eager" decoding="sync" unoptimized />
      <span className={styles.flipMir}><Image src={mir} alt="МИР" width={83} height={23} loading="eager" decoding="sync" unoptimized /></span>
      <span className={`${styles.flipEnding} ${type === "orange" ? styles.flipEndingDark : ""}`}>*{ending}</span>
      <span className={styles.flipBadge}><Image src="/figma/card/show.svg" alt="" width={16} height={16} loading="eager" decoding="sync" unoptimized />Данные карты</span>
    </div>
  );
}

function CardField({ label, value, dataTrack, onCopy, wide = false, interactive }: { label: string; value: string; dataTrack: string; onCopy: () => void; wide?: boolean; interactive: boolean }) {
  return (
    <label className={`${styles.flipField} ${wide ? styles.flipFieldWide : ""}`}>
      <span>{label}</span>
      <button type="button" tabIndex={interactive ? 0 : -1} data-track={dataTrack} onClick={(event) => { event.stopPropagation(); onCopy(); }}>
        <strong>{value}</strong><Image src="/figma/card/copy.svg" alt="Скопировать" width={16} height={16} loading="eager" decoding="sync" unoptimized />
      </button>
    </label>
  );
}

function CardBack({ type, data, onCopy, onHide, visible }: { type: CardType; data: typeof fakeCard; onCopy: (kind: keyof typeof fakeCard) => void; onHide: () => void; visible: boolean }) {
  return (
    <div aria-hidden={!visible} className={`${styles.flipFace} ${styles.flipBack} ${type === "orange" ? styles.flipBackOrange : styles.flipBackNight}`}>
      <div className={styles.flipFields}>
        <CardField wide interactive={visible} label="Номер карты" value={data.number} dataTrack={`card.${type}.number.copy`} onCopy={() => onCopy("number")} />
        <div className={styles.flipFieldPair}>
          <CardField interactive={visible} label="Срок" value={data.expiry} dataTrack={`card.${type}.expiry.copy`} onCopy={() => onCopy("expiry")} />
          <CardField interactive={visible} label="CVV" value={data.cvv} dataTrack={`card.${type}.cvv.copy`} onCopy={() => onCopy("cvv")} />
        </div>
      </div>
      <button type="button" tabIndex={visible ? 0 : -1} className={styles.flipBadge} data-track={`card.${type}.details.hide`} onClick={(event) => { event.stopPropagation(); onHide(); }}>
        <Image src="/figma/card/hide.svg" alt="" width={16} height={16} loading="eager" decoding="sync" unoptimized />Скрыть
      </button>
    </div>
  );
}

function CardContent() {
  const params = useSearchParams();
  const { productState, replayVisualState, updateProductState } = useParticipant();
  const initialCardIndex = Math.max(0, cards.findIndex((card) => card.id === params.get("card")));
  const [liveActiveCard, setActiveCard] = useState(initialCardIndex);
  const [liveFlipped, setFlipped] = useState<boolean[]>(() => cards.map((_, index) => index === initialCardIndex && productState.cardDetailsRevealed));
  const activeCard = replayVisualState?.cardIndex ?? liveActiveCard;
  const flipped = replayVisualState?.flippedCards ?? liveFlipped;
  const [copied, setCopied] = useState<keyof typeof fakeCard | null>(null);
  const [copyToastId, setCopyToastId] = useState(0);
  const carouselRef = useRef<HTMLElement | null>(null);
  const slideRefs = useRef<Array<HTMLDivElement | null>>([]);
  const gesture = useRef<CardGesture | null>(null);
  const dragged = useRef(false);
  const visibleCopyToast = replayVisualState?.copyToastVisible ? "number" : copied;

  const setCardSide = (index: number, next: boolean) => {
    setFlipped((current) => current.map((value, cardIndex) => cardIndex === index ? next : value));
    updateProductState({ cardDetailsRevealed: next }, next ? `card.${cards[index].type}.details.reveal` : `card.${cards[index].type}.details.hide`);
    if (!next) setCopied(null);
  };

  const copy = async (kind: keyof typeof fakeCard, cardIndex: number) => {
    try { await navigator.clipboard.writeText(cards[cardIndex].data[kind]); } catch {}
    setCopied(kind);
    setCopyToastId((current) => current + 1);
  };

  const selectCard = (index: number, method: "tap" | "swipe") => {
    const revealedIndex = liveFlipped.findIndex(Boolean);
    const closedDetails = revealedIndex !== -1 || productState.cardDetailsRevealed;
    setFlipped(cards.map(() => false));
    if (closedDetails) {
      const cardToHide = cards[revealedIndex === -1 ? activeCard : revealedIndex];
      updateProductState({ cardDetailsRevealed: false }, `card.${cardToHide.type}.details.hide`, { reason: "card_switch" });
    }
    setActiveCard(index);
    setCopied(null);
    void track("card_selection", { screen: "/card", action: `card.${cards[index].type}.select.${method}`, target: cards[index].id, metadata: { index, closedDetails } });
  };

  const resetDragVisuals = () => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    delete carousel.dataset.dragging;
    // Keep the current drag position for one style calculation so the CSS snap animates from it.
    void carousel.offsetWidth;
    slideRefs.current.forEach((slide) => slide?.style.removeProperty("transform"));
  };

  const moveCardsWithPointer = (deltaX: number, current: CardGesture) => {
    const neighborIndex = current.cardIndex + (deltaX < 0 ? 1 : -1);
    const hasNeighbor = deltaX !== 0 && neighborIndex >= 0 && neighborIndex < cards.length;
    const progress = Math.min(Math.abs(deltaX) / CARD_SWIPE_TRAVEL, 1);
    const scaleDifference = 1 - 0.80625;

    slideRefs.current.forEach((slide, index) => {
      if (!slide) return;
      const distance = index - current.cardIndex;
      let offsetX = distance < 0 ? -274 + (distance + 1) * CARD_SWIPE_TRAVEL : distance * CARD_SWIPE_TRAVEL;
      let offsetY = index === current.cardIndex ? 0 : 20.5;
      let scale = index === current.cardIndex ? 1 : 0.80625;

      if (hasNeighbor && index === current.cardIndex) {
        offsetX += (deltaX < 0 ? -274 : CARD_SWIPE_TRAVEL) * progress;
        offsetY = 20.5 * progress;
        scale = 1 - scaleDifference * progress;
      } else if (hasNeighbor && index === neighborIndex) {
        offsetX += (deltaX < 0 ? -CARD_SWIPE_TRAVEL : 274) * progress;
        offsetY = 20.5 * (1 - progress);
        scale = 0.80625 + scaleDifference * progress;
      } else if (!hasNeighbor && index === current.cardIndex) {
        offsetX += Math.sign(deltaX) * Math.min(Math.abs(deltaX) * 0.2, 24);
      }

      slide.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0) scale(${scale})`;
    });
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (replayVisualState || (event.pointerType === "mouse" && event.button !== 0)) return;
    gesture.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, cardIndex: activeCard, dragging: false };
    dragged.current = false;
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - current.startX;
    const deltaY = event.clientY - current.startY;
    if (!current.dragging) {
      if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 8) return;
      if (Math.abs(deltaY) > Math.abs(deltaX)) { gesture.current = null; return; }
      current.dragging = true;
      dragged.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.dataset.dragging = "true";
    }
    moveCardsWithPointer(deltaX, current);
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    gesture.current = null;
    if (!current.dragging) return;
    const destination = cardSwipeDestination(current.cardIndex, event.clientX - current.startX, cards.length);
    if (destination !== current.cardIndex) {
      // Commit the new target class while the dragged transform still owns the visual position.
      flushSync(() => selectCard(destination, "swipe"));
    }
    resetDragVisuals();
  };

  const onPointerCancel = () => {
    const wasDragging = gesture.current?.dragging;
    gesture.current = null;
    if (wasDragging) resetDragVisuals();
  };

  return (
    <main className={`${styles.screen} ${styles.cardScreen}`} data-screen="card">
      <DetailHeader title={`Карта «${cards[activeCard].label}»`} subtitle="Платежный счет *6777" backHref="/account" />

      <section ref={carouselRef} className={styles.flipCarousel} aria-label="Карты счёта" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel} onClickCapture={(event) => { if (dragged.current && event.detail > 0) { event.preventDefault(); event.stopPropagation(); dragged.current = false; } }}>
        {cards.map((card, index) => {
          const positionClass = index === activeCard ? styles.cardSlideActive : index < activeCard ? styles.cardSlidePrevious : styles.cardSlideNext;
          const distance = index - activeCard;
          const restingOffset = distance < 0 ? -274 + (distance + 1) * CARD_SWIPE_TRAVEL : distance * CARD_SWIPE_TRAVEL;
          return (
            <div
              key={card.id}
              ref={(element) => { slideRefs.current[index] = element; }}
              className={`${styles.cardSlide} ${positionClass}`}
              style={{ "--card-offset": `${restingOffset}px` } as CSSProperties}
              role="button"
              tabIndex={index === activeCard ? 0 : -1}
              aria-label={`Карта ${card.label}, ${flipped[index] ? "данные показаны" : "лицевая сторона"}`}
              data-track={`card.${card.type}.${index === activeCard ? "flip" : "select"}`}
              onClick={() => {
                if (dragged.current) { dragged.current = false; return; }
                if (index !== activeCard) { selectCard(index, "tap"); return; }
                setCardSide(index, !flipped[index]);
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                if (index !== activeCard) selectCard(index, "tap"); else setCardSide(index, !flipped[index]);
              }}
            >
              <div className={`${styles.flipCardInner} ${flipped[index] ? styles.flipCardInnerBack : ""}`}>
                <CardFront type={card.type} ending={card.ending} logo={card.logo} mir={card.mir} hidden={flipped[index]} />
                <CardBack type={card.type} data={card.data} onCopy={(kind) => copy(kind, index)} onHide={() => setCardSide(index, false)} visible={flipped[index]} />
              </div>
            </div>
          );
        })}
        {visibleCopyToast && <GlassToast key={replayVisualState ? `replay-copy-${visibleCopyToast}` : copyToastId} placement="top" trackId="card.copy.toast.dismiss" className={styles.copiedToast} autoDismiss={!replayVisualState} onDone={() => { if (!replayVisualState) { void track("action", { screen: "/card", action: "card.copy.toast.closed" }); setCopied((current) => current === visibleCopyToast ? null : current); } }}><Image src="/figma/icons/check.svg" alt="" width={16} height={16} />Скопировано</GlassToast>}
      </section>

      <section className={styles.cardSettings}>
        <div className={styles.surface}>
          <h2 className={styles.sectionHeading}>Настройки карты</h2>
          <div className={styles.settingsList}>
            <SettingsRow label="Переименовать" dataTrack="card.rename.open" />
            <SettingsRow label="Узнать, куда привязана карта" dataTrack="card.links.open" />
            <SettingsRow label="Изменить PIN" dataTrack="card.pin.open" />
            <SettingsRow label="Перевыпустить" dataTrack="card.reissue.open" />
          </div>
          <div className={styles.dangerRow}>
            <button type="button" className={styles.dangerPill} data-track="card.block.open" onClick={showDemoUnavailable}>Заблокировать карту</button>
            <button type="button" className={styles.dangerPill} data-track="card.close.open" onClick={showDemoUnavailable}>Закрыть карту</button>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function CardPage() {
  return <Suspense><CardContent /></Suspense>;
}
