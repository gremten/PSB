"use client";

import Image from "next/image";
import { useState } from "react";
import { DetailHeader, RouteButton, SettingsRow, styles } from "@/features/bank/bank-ui";
import { useParticipant } from "@/features/usability/participant-provider";

export const fakeCard = { number: "4588 2344 4563 3124", expiry: "07/28", cvv: "456" };

export default function CardPage() {
  const { productState, updateProductState } = useParticipant();
  const [copied, setCopied] = useState<keyof typeof fakeCard | null>(null);

  const copy = async (kind: keyof typeof fakeCard) => {
    try { await navigator.clipboard.writeText(fakeCard[kind]); } catch {}
    setCopied(kind);
    window.setTimeout(() => setCopied((current) => current === kind ? null : current), 1300);
  };

  const toggleDetails = () => {
    const revealed = !productState.cardDetailsRevealed;
    updateProductState({ cardDetailsRevealed: revealed }, revealed ? "card.details.reveal" : "card.details.hide");
    if (!revealed) setCopied(null);
  };

  return (
    <main className={styles.screen}>
      <DetailHeader title="Карта «Твой банк»" subtitle="Платежный счет *6777" backHref="/account" />
      <div className={styles.cardCarousel}>
        <div className={styles.peekCard} aria-hidden="true" />
        {!productState.cardDetailsRevealed ? (
          <section className={`${styles.paymentCard} ${styles.paymentCardFront}`} aria-label="Карта Твой банк">
            <div className={styles.cardTop}>
              <Image src="/figma/icons/psb-logo.svg" alt="ПСБ" width={88} height={28} />
              <Image src="/figma/icons/mir-logo.svg" alt="МИР" width={54} height={18} />
            </div>
            <span className={styles.maskedNumber}>•••• •••• •••• 2345</span>
            <button className={styles.cardRevealButton} onClick={toggleDetails} data-track="card.details.reveal"><Image src="/figma/icons/card-show.svg" alt="" width={16} height={16} />Данные карты</button>
          </section>
        ) : (
          <section className={`${styles.paymentCard} ${styles.paymentCardBack}`} aria-label="Данные карты">
            {copied && <div className={styles.copiedToast} role="status">✓ Скопировано</div>}
            <div className={styles.cardFieldList}>
              <button className={styles.cardField} onClick={() => copy("number")} data-track="card.number.copy"><span><small>Номер карты</small><strong>{fakeCard.number}</strong></span><span className={styles.copyGlyph}>⧉</span></button>
              <button className={styles.cardField} onClick={() => copy("expiry")} data-track="card.expiry.copy"><span><small>Срок действия</small><strong>{fakeCard.expiry}</strong></span><span className={styles.copyGlyph}>⧉</span></button>
            </div>
            <div className={styles.backSide}>
              <button className={styles.cardField} onClick={() => copy("cvv")} data-track="card.cvv.copy"><span><small>CVV</small><strong>{fakeCard.cvv}</strong></span><span className={styles.copyGlyph}>⧉</span></button>
              <button className={styles.cardRevealButton} onClick={toggleDetails} data-track="card.details.hide">Скрыть</button>
            </div>
          </section>
        )}
      </div>

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
            <button className={styles.dangerPill} data-track="card.block.open">Заблокировать карту</button>
            <button className={styles.dangerPill} data-track="card.close.open">Закрыть карту</button>
          </div>
        </div>
      </section>
      <div className={styles.buttonInset} style={{ marginTop: 20 }}>
        <RouteButton href="/payment" className={styles.fullButton} dataTrack="card.payment.open">Перейти к тестовой оплате</RouteButton>
      </div>
      <p className={styles.helperText}>Все реквизиты вымышлены и работают только в этой демонстрации.</p>
    </main>
  );
}
