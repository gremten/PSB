"use client";

import Image from "next/image";
import Link from "next/link";
import { DetailHeader, SettingsRow, Transaction } from "@/features/bank/bank-ui";
import styles from "@/features/bank/bank.module.css";
import { showDemoUnavailable } from "@/features/usability/demo-feedback";

export default function AccountPage() {
  return (
    <main className={`${styles.screen} ${styles.accountScreen}`} data-screen="account">
      <div className={styles.accountGradientFrame} aria-hidden="true">
        <div className={styles.accountGradientPosition}>
          <div className={styles.accountGradientRotation}>
            <div className={styles.accountGradientBlob}>
              <Image src="/figma/account/background-blob.svg" alt="" width={979} height={994} unoptimized />
            </div>
          </div>
        </div>
      </div>

      <div className={styles.accountForeground}>
        <DetailHeader title="Платежный счет *6777" backHref="/" />

        <div className={styles.accountPageContent}>
          <section className={styles.accountOverview} aria-labelledby="account-balance-title">
            <div className={styles.accountBalanceBlock}>
              <p id="account-balance-title" className={styles.balanceCaption}>На счету</p>
              <p className={styles.accountLargeBalance}>11 726 777,<span className={styles.kopecks}>61</span> ₽</p>
            </div>

            <div className={styles.accountCardBadges} aria-label="Карты счёта">
              <button type="button" className={styles.accountAddCard} aria-label="Добавить карту" data-track="account.card.add" onClick={showDemoUnavailable}>
                <Image src="/figma/account/add-card.svg" alt="" width={24} height={24} />
              </button>
              <Link className={styles.accountCardBadge} href="/card?card=orange" data-track="account.card.primary.open">
                <span className={`${styles.accountCardMiniature} ${styles.accountCardMiniatureOrange}`} aria-hidden="true" />
                <span className={styles.accountCardLabel}><span>Твой банк</span><span>*3124</span></span>
              </Link>
              <Link className={styles.accountCardBadge} href="/card?card=night" data-track="account.card.strong.open">
                <span className={`${styles.accountCardMiniature} ${styles.accountCardMiniaturePurple}`} aria-hidden="true" />
                <span className={styles.accountCardLabel}><span>Сильные люди</span><span>*2345</span></span>
              </Link>
              <button type="button" className={styles.accountCardBadge} data-track="account.card.salary.open" onClick={showDemoUnavailable}>
                <span className={`${styles.accountCardMiniature} ${styles.accountCardMiniatureOrange}`} aria-hidden="true" />
                <span className={styles.accountCardLabel}><span>Зарплатная</span><span>*3451</span></span>
              </button>
            </div>
          </section>

          <div className={styles.accountOperationBlock}>
            <div className={styles.accountActions}>
              <button type="button" className={styles.accountAction} data-track="account.topup.open" onClick={showDemoUnavailable}>
                <Image src="/figma/account/topup.svg" alt="" width={24} height={24} />Пополнить
              </button>
              <button type="button" className={styles.accountAction} data-track="account.send.open" onClick={showDemoUnavailable}>
                <Image src="/figma/account/send.svg" alt="" width={24} height={24} />Отправить
              </button>
            </div>

          <section className={`${styles.surface} ${styles.accountHistory}`}>
            <div className={styles.accountSectionBar}>
              <button type="button" className={styles.accountSectionTitle} data-track="account.history.toggle" onClick={showDemoUnavailable}>
                <span>История</span><Image src="/figma/account/chevron-open.svg" alt="" width={16} height={16} />
              </button>
              <button type="button" className={styles.accountMoreButton} data-track="account.history.more" onClick={showDemoUnavailable}>Ещё</button>
            </div>
            <p className={styles.dateHeading}>19 марта, четверг</p>
            <div className={styles.historyList}>
              <Transaction imageSrc="/figma/account/merchant-psb.webp" title="Банкомат ПСБ" meta="Внесение наличных" amount="+ 2 000 ₽" />
              <Transaction imageSrc="/figma/account/merchant-bbq.webp" title="BARBECUE Rostov RUS" meta="Оплата товаров и услуг" amount="− 1 691 ₽" />
            </div>
            <p className={`${styles.dateHeading} ${styles.accountSecondDate}`}>18 марта, среда</p>
            <div className={styles.historyList}>
              <Transaction imageSrc="/figma/account/merchant-five.webp" title="Пятёрочка" meta="Продукты" amount="− 6 563 ₽" bonus="+ 165 ₽" />
            </div>
          </section>
          </div>

          <section className={`${styles.surface} ${styles.accountSettings}`}>
            <h2 className={styles.accountSettingsTitle}>Настройки счёта</h2>
            <div className={styles.settingsList}>
              <SettingsRow label="Реквизиты" dataTrack="account.details.open" />
              <SettingsRow label="Тарифы и лимиты" dataTrack="account.tariffs.open" />
              <SettingsRow label="Справки и выписки" dataTrack="account.statements.open" />
              <SettingsRow label="Уведомления об операциях" dataTrack="account.notifications.open" />
            </div>
            <div className={styles.accountDangerRow}>
              <button type="button" className={styles.accountDangerButton} data-track="account.block.open" onClick={showDemoUnavailable}>Заблокировать счёт</button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
