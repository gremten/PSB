"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Suspense, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { DetailHeader, SettingsRow, styles } from "@/features/bank/bank-ui";
import { showDemoUnavailable } from "@/features/usability/demo-feedback";
import { useParticipant } from "@/features/usability/participant-provider";
import { track } from "@/lib/testing/tracking";
import { CARD_SWIPE_TRAVEL, cardSwipeDestination } from "./card-gesture";

export const fakeCard = { number: "4588 2344 4563 3124", expiry: "07/28", cvv: "456" };

const cards = [
  { id: "night", type: "night", ending: "2345", logo: "/figma/card/logo-night.svg", mir: "/figma/card/mir-night.svg" },
  { id: "orange", type: "orange", ending: "3124", logo: "/figma/card/logo-orange.svg", mir: "/figma/card/mir-orange.svg" },
] as const;

type CardType = (typeof cards)[number]["type"];
type CardGesture = { pointerId: number; startX: number; startY: number; width: number; cardIndex: number; dragging: boolean };

function CardFront({ type, ending, logo, mir, hidden }: { type: CardType; ending: string; logo: string; mir: string; hidden: boolean }) {
  return (
    <div aria-hidden={hidden} className={`${styles.flipFace} ${styles.flipFront} ${type === "orange" ? styles.flipFrontOrange : styles.flipFrontNight}`}>
      <Image className={styles.flipLogo} src={logo} alt="" width={213} height={213} unoptimized />
      <span className={styles.flipMir}><Image src={mir} alt="МИР" width={83} height={23} unoptimized /></span>
      <span className={`${styles.flipEnding} ${type === "orange" ? styles.flipEndingDark : ""}`}>*{ending}</span>
      <span className={styles.flipBadge}><Image src="/figma/card/show.svg" alt="" width={16} height={16} />Данные карты</span>
    </div>
  );
}

function CardField({ label, value, dataTrack, onCopy, wide = false, interactive }: { label: string; value: string; dataTrack: string; onCopy: () => void; wide?: boolean; interactive: boolean }) {
  return (
    <label className={`${styles.flipField} ${wide ? styles.flipFieldWide : ""}`}>
      <span>{label}</span>
      <button type="button" tabIndex={interactive ? 0 : -1} data-track={dataTrack} onClick={(event) => { event.stopPropagation(); onCopy(); }}>
        <strong>{value}</strong><Image src="/figma/card/copy.svg" alt="Скопировать" width={16} height={16} />
      </button>
    </label>
  );
}

function CardBack({ type, onCopy, onHide, visible }: { type: CardType; onCopy: (kind: keyof typeof fakeCard) => void; onHide: () => void; visible: boolean }) {
  return (
    <div aria-hidden={!visible} className={`${styles.flipFace} ${styles.flipBack} ${type === "orange" ? styles.flipBackOrange : styles.flipBackNight}`}>
      <div className={styles.flipFields}>
        <CardField wide interactive={visible} label="Номер карты" value={fakeCard.number} dataTrack={`card.${type}.number.copy`} onCopy={() => onCopy("number")} />
        <div className={styles.flipFieldPair}>
          <CardField interactive={visible} label="Срок" value={fakeCard.expiry} dataTrack={`card.${type}.expiry.copy`} onCopy={() => onCopy("expiry")} />
          <CardField interactive={visible} label="CVV" value={fakeCard.cvv} dataTrack={`card.${type}.cvv.copy`} onCopy={() => onCopy("cvv")} />
        </div>
      </div>
      <button type="button" tabIndex={visible ? 0 : -1} className={styles.flipBadge} data-track={`card.${type}.details.hide`} onClick={(event) => { event.stopPropagation(); onHide(); }}>
        <Image src="/figma/card/hide.svg" alt="" width={16} height={16} />Скрыть
      </button>
    </div>
  );
}

function CardContent() {
  const params = useSearchParams();
  const { productState, replayVisualState, updateProductState } = useParticipant();
  const [liveActiveCard, setActiveCard] = useState(params.get("card") === "orange" ? 1 : 0);
  const [liveFlipped, setFlipped] = useState<boolean[]>([productState.cardDetailsRevealed, false]);
  const activeCard = replayVisualState?.cardIndex ?? liveActiveCard;
  const flipped = replayVisualState?.flippedCards ?? liveFlipped;
  const [copied, setCopied] = useState<keyof typeof fakeCard | null>(null);
  const carouselRef = useRef<HTMLElement | null>(null);
  const slideRefs = useRef<Array<HTMLDivElement | null>>([]);
  const gesture = useRef<CardGesture | null>(null);
  const releaseFrame = useRef<number | null>(null);
  const dragged = useRef(false);

  const setCardSide = (index: number, next: boolean) => {
    setFlipped((current) => current.map((value, cardIndex) => cardIndex === index ? next : value));
    updateProductState({ cardDetailsRevealed: next }, next ? `card.${cards[index].type}.details.reveal` : `card.${cards[index].type}.details.hide`);
    if (!next) setCopied(null);
  };

  const copy = async (kind: keyof typeof fakeCard) => {
    try { await navigator.clipboard.writeText(fakeCard[kind]); } catch {}
    setCopied(kind);
    window.setTimeout(() => setCopied((current) => current === kind ? null : current), 1300);
  };

  const selectCard = (index: number, method: "tap" | "swipe") => {
    setActiveCard(index);
    setCopied(null);
    void track("card_selection", { screen: "/card", action: `card.${cards[index].type}.select.${method}`, target: cards[index].id, metadata: { index } });
  };

  const resetDragVisuals = () => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    delete carousel.dataset.dragging;
    // Keep the current drag position for one style calculation so the CSS snap animates from it.
    void carousel.offsetWidth;
    slideRefs.current.forEach((slide) => {
      slide?.style.removeProperty("left");
      slide?.style.removeProperty("top");
      slide?.style.removeProperty("transform");
    });
  };

  const moveCardsWithPointer = (deltaX: number, current: CardGesture) => {
    const center = current.width / 2 - 160;
    const neighborIndex = current.cardIndex + (deltaX < 0 ? 1 : -1);
    const hasNeighbor = deltaX !== 0 && neighborIndex >= 0 && neighborIndex < cards.length;
    const progress = Math.min(Math.abs(deltaX) / CARD_SWIPE_TRAVEL, 1);
    const scaleDifference = 1 - 0.80625;

    slideRefs.current.forEach((slide, index) => {
      if (!slide) return;
      let left = index < current.cardIndex ? center - 274 : index > current.cardIndex ? center + CARD_SWIPE_TRAVEL : center;
      let top = index === current.cardIndex ? 0 : 20.5;
      let scale = index === current.cardIndex ? 1 : 0.80625;

      if (hasNeighbor && index === current.cardIndex) {
        left += (deltaX < 0 ? -274 : CARD_SWIPE_TRAVEL) * progress;
        top = 20.5 * progress;
        scale = 1 - scaleDifference * progress;
      } else if (hasNeighbor && index === neighborIndex) {
        left += (deltaX < 0 ? -CARD_SWIPE_TRAVEL : 274) * progress;
        top = 20.5 * (1 - progress);
        scale = 0.80625 + scaleDifference * progress;
      } else if (!hasNeighbor && index === current.cardIndex) {
        left += Math.sign(deltaX) * Math.min(Math.abs(deltaX) * 0.2, 24);
      }

      slide.style.left = `${left}px`;
      slide.style.top = `${top}px`;
      slide.style.transform = `scale(${scale})`;
    });
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (replayVisualState || (event.pointerType === "mouse" && event.button !== 0)) return;
    if (releaseFrame.current !== null) {
      cancelAnimationFrame(releaseFrame.current);
      releaseFrame.current = null;
      resetDragVisuals();
    }
    gesture.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, width: event.currentTarget.clientWidth, cardIndex: activeCard, dragging: false };
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
      selectCard(destination, "swipe");
      releaseFrame.current = requestAnimationFrame(() => { releaseFrame.current = null; resetDragVisuals(); });
    } else {
      resetDragVisuals();
    }
  };

  const onPointerCancel = () => {
    const wasDragging = gesture.current?.dragging;
    gesture.current = null;
    if (wasDragging) resetDragVisuals();
  };

  return (
    <main className={`${styles.screen} ${styles.cardScreen}`} data-screen="card">
      <DetailHeader title="Карта «Твой банк»" subtitle="Платежный счет *6777" backHref="/account" />

      <section ref={carouselRef} className={styles.flipCarousel} aria-label="Карты счёта" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel} onClickCapture={(event) => { if (dragged.current && event.detail > 0) { event.preventDefault(); event.stopPropagation(); dragged.current = false; } }}>
        {cards.map((card, index) => {
          const positionClass = index === activeCard ? styles.cardSlideActive : index < activeCard ? styles.cardSlidePrevious : styles.cardSlideNext;
          return (
            <div
              key={card.id}
              ref={(element) => { slideRefs.current[index] = element; }}
              className={`${styles.cardSlide} ${positionClass}`}
              role="button"
              tabIndex={index === activeCard ? 0 : -1}
              aria-label={`${card.type === "night" ? "Карта Сильные люди" : "Карта Твой банк"}, ${flipped[index] ? "данные показаны" : "лицевая сторона"}`}
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
                <CardBack type={card.type} onCopy={copy} onHide={() => setCardSide(index, false)} visible={flipped[index]} />
              </div>
            </div>
          );
        })}
        {copied && <div className={styles.copiedToast} role="status"><Image src="/figma/icons/check.svg" alt="" width={16} height={16} />Скопировано</div>}
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
