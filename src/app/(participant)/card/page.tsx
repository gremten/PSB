"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Suspense, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { DetailHeader, SettingsRow, styles } from "@/features/bank/bank-ui";
import { showDemoUnavailable } from "@/features/usability/demo-feedback";
import { useParticipant } from "@/features/usability/participant-provider";
import { track } from "@/lib/testing/tracking";

export const fakeCard = { number: "4588 2344 4563 3124", expiry: "07/28", cvv: "456" };

const cards = [
  { id: "night", type: "night", ending: "2345", logo: "/figma/card/logo-night.svg", mir: "/figma/card/mir-night.svg" },
  { id: "orange", type: "orange", ending: "3124", logo: "/figma/card/logo-orange.svg", mir: "/figma/card/mir-orange.svg" },
] as const;

type CardType = (typeof cards)[number]["type"];

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
  const { productState, updateProductState } = useParticipant();
  const [activeCard, setActiveCard] = useState(params.get("card") === "orange" ? 1 : 0);
  const [flipped, setFlipped] = useState<boolean[]>([productState.cardDetailsRevealed, false]);
  const [copied, setCopied] = useState<keyof typeof fakeCard | null>(null);
  const pointerStart = useRef<number | null>(null);
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

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointerStart.current = event.clientX;
    dragged.current = false;
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerStart.current === null) return;
    const delta = event.clientX - pointerStart.current;
    pointerStart.current = null;
    if (Math.abs(delta) < 40) return;
    dragged.current = true;
    const next = delta < 0 ? Math.min(cards.length - 1, activeCard + 1) : Math.max(0, activeCard - 1);
    if (next !== activeCard) selectCard(next, "swipe");
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerStart.current === null || dragged.current) return;
    const delta = event.clientX - pointerStart.current;
    if (Math.abs(delta) < 40) return;
    pointerStart.current = null;
    dragged.current = true;
    const next = delta < 0 ? Math.min(cards.length - 1, activeCard + 1) : Math.max(0, activeCard - 1);
    if (next !== activeCard) selectCard(next, "swipe");
  };

  return (
    <main className={styles.screen} data-screen="card">
      <DetailHeader title={`Карта «${activeCard === 0 ? "Сильные люди" : "Твой банк"}»`} subtitle="Платежный счет *6777" backHref="/account" />

      <section className={styles.flipCarousel} aria-label="Карты счёта" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={() => { pointerStart.current = null; }}>
        {cards.map((card, index) => {
          const positionClass = index === activeCard ? styles.cardSlideActive : index < activeCard ? styles.cardSlidePrevious : styles.cardSlideNext;
          return (
            <div
              key={card.id}
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
        {copied && <div className={styles.copiedToast} role="status">Скопировано</div>}
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
      <p className={styles.helperText}>Все реквизиты вымышлены и работают только в этой демонстрации.</p>
    </main>
  );
}

export default function CardPage() {
  return <Suspense><CardContent /></Suspense>;
}
