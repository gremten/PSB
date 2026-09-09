"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { HorizontalScroller } from "@/components/ui";
import { ProfileHeader, Transaction, styles } from "@/features/bank/bank-ui";
import { showDemoUnavailable } from "@/features/usability/demo-feedback";
import { useParticipant } from "@/features/usability/participant-provider";

const quickActions = [
  { label: "Сканер QR", icon: "/figma/home/quick-qr.svg", track: "home.qr.open", primary: true },
  { label: "Перевести", icon: "/figma/home/quick-send.svg", track: "home.transfer.open" },
  { label: "По номеру", icon: "/figma/home/quick-sbp.svg", track: "home.phone.open" },
  { label: "Пополнить", icon: "/figma/home/quick-add.svg", track: "home.topup.open" },
];

const currencies = [
  { code: "USD", name: "Доллар США", value: "87,36", change: "5,55%", trend: "down" },
  { code: "EUR", name: "Евро", value: "101,07", change: "8,91%", trend: "up" },
  { code: "CNY", name: "Юань", value: "12,62", change: "1,23%", trend: "down" },
] as const;

function SectionBar({ title, action, track }: { title: string; action: string; track: string }) {
  return (
    <div className={styles.sectionBar}>
      <button className={styles.sectionTitleButton} data-track={`${track}.toggle`} onClick={showDemoUnavailable}>
        <span>{title}</span>
        <Image src="/figma/home/chevron-up.svg" alt="" width={16} height={16} />
      </button>
      <button className={styles.sectionPill} data-track={`${track}.action`} onClick={showDemoUnavailable}>{action}</button>
    </div>
  );
}

export default function HomePage() {
  const { productState, updateProductState } = useParticipant();
  const [currencyMode, setCurrencyMode] = useState<"buy" | "sell">("buy");

  return (
    <main className={`${styles.screen} ${styles.homeScreen}`}>
      <ProfileHeader />
      <section className={styles.homeTop}>
        <HorizontalScroller className={styles.promoScroller} ariaLabel="Предложения">
          <article className={styles.promoCard} aria-label="Новые возможности. Попробуйте новые карты с хорошими условиями">
            <Image className={styles.promoBackdrop} src="/figma/home/banner-new-bg.svg" alt="" width={438} height={290} priority />
            <div className={styles.promoCopy}><strong>Новые возможности</strong><span>Попробуйте новые карты<br />с хорошими условиями</span></div>
            <div className={`${styles.promoArtworkFrame} ${styles.promoArtworkCards}`}><Image src="/figma/home/banner-new.png" alt="" width={1200} height={1200} priority /></div>
            <button className={styles.promoCloseHit} aria-label="Закрыть предложение Новые возможности" data-track="home.promo.cards.dismiss" onClick={showDemoUnavailable}><Image src="/figma/home/close.svg" alt="" width={16} height={16} /></button>
          </article>
          <article className={styles.promoCard} aria-label="Время сильных. Получайте больше выгоды, инвестируя в заводы">
            <Image className={styles.promoBackdrop} src="/figma/home/banner-strong-bg.svg" alt="" width={438} height={290} priority />
            <div className={styles.promoCopy}><strong>Время сильных</strong><span>Получайте больше выгоды,<br />инвестируя в заводы</span></div>
            <div className={`${styles.promoArtworkFrame} ${styles.promoArtworkStrong}`}><Image src="/figma/home/banner-strong.png" alt="" width={800} height={800} priority /></div>
            <button className={styles.promoCloseHit} aria-label="Закрыть предложение Время сильных" data-track="home.promo.strong.dismiss" onClick={showDemoUnavailable}><Image src="/figma/home/close.svg" alt="" width={16} height={16} /></button>
          </article>
        </HorizontalScroller>

        <section className={styles.balanceArea} aria-label="Счета">
          <p className={styles.balanceCaption}>Всего на счетах</p>
          <div className={styles.balanceRow}>
            <div className={styles.balanceGroup}>
              <p className={styles.balance}>12 281 488,<span className={styles.kopecks}>65</span> ₽</p>
              <Link className={styles.cashbackBadge} href="/cashback" data-track="home.cashback.open">
                <span>{productState.cashbackConnected ? "1 200" : "0"}</span>
                <Image src="/figma/home/cashback.svg" alt="" width={16} height={16} />
              </Link>
            </div>
            <button className={styles.balanceVisibility} aria-label="Скрыть баланс" data-track="home.balance.hide" onClick={showDemoUnavailable}>
              <Image src="/figma/home/hide.svg" alt="" width={24} height={24} />
            </button>
          </div>

          <HorizontalScroller className={styles.accountScroller} ariaLabel="Счета и продукты">
            <Link className={styles.accountCard} href="/account" data-track="home.account.open">
              <span className={styles.accountBadge}>
                <Image src="/figma/home/bankcard.svg" alt="" width={16} height={16} />
                <span>3</span>
              </span>
              <span>
                <span className={styles.accountName}>Текущий счет *2307</span>
                <span className={styles.accountAmount}>11 726 777,<span className={styles.kopecks}>61</span> ₽</span>
              </span>
            </Link>
            <button className={styles.accountCard} data-track="home.savings.open" onClick={showDemoUnavailable}>
              <span className={styles.accountBadge}>ставка 5%</span>
              <span>
                <span className={styles.accountName}>Накопительный *1401</span>
                <span className={styles.accountAmount}>554 711,<span className={styles.kopecks}>04</span> ₽</span>
              </span>
            </button>
            <button className={`${styles.accountCard} ${styles.addProductCard}`} data-track="home.product.add" onClick={showDemoUnavailable}>
              <Image src="/figma/home/add-product.svg" alt="" width={32} height={32} />
              <span className={styles.addProductLabel}>Добавить</span>
            </button>
          </HorizontalScroller>
        </section>
      </section>

      <div className={styles.homeFlow}>
        <nav className={styles.quickActions} aria-label="Быстрые действия">
          {quickActions.map((item) => (
            <button className={styles.quickAction} key={item.track} data-track={item.track} onClick={showDemoUnavailable}>
              <span className={`${styles.quickIcon} ${item.primary ? styles.quickIconPrimary : ""}`}>
                <Image src={item.icon} alt="" width={32} height={32} />
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <section className={`${styles.surface} ${styles.historySurface}`}>
          <SectionBar title="История" action="Ещё" track="home.history" />
          <div className={styles.historyContent}>
            <div className={styles.historyDay}>
              <p className={styles.dateHeading}>21 марта, воскресенье</p>
              <div className={styles.historyList}>
                <Transaction imageSrc="/figma/home/merchant-reg.png" title="REG.RU MOSKVA RUS" meta="Оплата услуг" amount="– 1 161 ₽" bonus="+ 20 ₽" />
                <Transaction imageSrc="/figma/home/merchant-tpp.png" title="TPP_TRANSPORT_FIGMA RUS" meta="Оплата по QR-коду" amount="– 290 ₽" />
              </div>
            </div>
            <div className={styles.historyDay}>
              <p className={styles.dateHeading}>20 марта, суббота</p>
              <div className={styles.historyList}>
                <Transaction imageSrc="/figma/home/merchant-five.png" title="Пятёрочка" meta="Продукты" amount="– 290 ₽" bonus="+ 20 ₽" />
              </div>
            </div>
          </div>
        </section>

        <section className={`${styles.surface} ${styles.currencySurface}`}>
          <SectionBar title="Обмен валют" action="Изменить" track="home.currency" />
          <div className={styles.currencyContent}>
            <div className={styles.currencySegments} role="group" aria-label="Тип курса">
              <button className={currencyMode === "buy" ? styles.currencySegmentActive : ""} onClick={() => setCurrencyMode("buy")} data-track="home.currency.buy">Купить</button>
              <button className={currencyMode === "sell" ? styles.currencySegmentActive : ""} onClick={() => setCurrencyMode("sell")} data-track="home.currency.sell">Продать</button>
            </div>
            <div className={styles.currencyRows}>
              {currencies.map((currency) => (
                <div className={styles.currencyRow} key={currency.code}>
                  <span className={styles.currencyCode}>{currency.code}<small>{currency.name}</small></span>
                  <span className={styles.currencyValue}>{currency.value}<small className={currency.trend === "up" ? styles.trendUp : styles.trendDown}><Image src={`/figma/home/trend-${currency.trend}.svg`} alt="" width={16} height={16} />{currency.change}</small></span>
                </div>
              ))}
            </div>
            <button className={`${styles.secondaryButton} ${styles.fullButton} ${styles.exchangeButton}`} data-track="home.exchange.open" onClick={showDemoUnavailable}>Перейти к обмену</button>
          </div>
        </section>

        <div className={styles.buttonInset}>
          <button className={`${styles.primaryButton} ${styles.fullButton}`} data-track="home.customize.open" onClick={showDemoUnavailable}>Настроить экран</button>
        </div>
      </div>

      {productState.cashbackSuccessVisible && (
        <div className={styles.successOverlay} role="presentation">
          <section className={styles.successSheet} role="dialog" aria-modal="true" aria-labelledby="cashback-success-title">
            <div className={styles.grabber} />
            <Image className={styles.successImage} src="/figma/success/asset-14.png" alt="" width={164} height={164} priority />
            <h2 id="cashback-success-title" className={styles.successTitle}>Кешбек подключен!</h2>
            <p className={styles.successText}>Категории на апрель<br />активируются в течение 15 минут.</p>
            <button className={`${styles.primaryButton} ${styles.fullButton}`} data-track="cashback.success.close" onClick={() => updateProductState({ cashbackSuccessVisible: false }, "cashback.success.dismissed")}>Хорошо!</button>
          </section>
        </div>
      )}
    </main>
  );
}
