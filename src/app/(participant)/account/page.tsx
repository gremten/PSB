import Image from "next/image";
import Link from "next/link";
import { DetailHeader, SettingsRow, Transaction } from "@/features/bank/bank-ui";
import styles from "@/features/bank/bank.module.css";

export default function AccountPage() {
  return (
    <main className={styles.screen}>
      <DetailHeader title="Платежный счет *6777" backHref="/" />
      <div className={styles.screenStack}>
        <section className={styles.accountHero}>
          <div className={styles.accountHeroContent}>
            <p className={styles.balanceCaption}>На счету</p>
            <p className={styles.largeBalance}>12 281 488,<span className={styles.kopecks}>65</span> ₽</p>
            <div className={styles.cardPills} aria-label="Карты счета">
              <button className={styles.cardPill} aria-label="Добавить карту" data-track="account.card.add">＋</button>
              <Link className={styles.cardPill} href="/card" data-track="account.card.primary.open">Твой банк<br />*3124</Link>
              <button className={styles.cardPill} data-track="account.card.strong.open">Сильные люди<br />*2345</button>
              <button className={styles.cardPill} data-track="account.card.salary.open">Зарплатная<br />*3451</button>
            </div>
            <div className={styles.heroButtons}>
              <button className={styles.heroAction} data-track="account.topup.open"><Image src="/figma/icons/account-add.svg" alt="" width={24} height={24} />Пополнить</button>
              <button className={styles.heroAction} data-track="account.send.open"><Image src="/figma/icons/account-send.svg" alt="" width={24} height={24} />Отправить</button>
            </div>
          </div>
        </section>

        <section className={styles.surface}>
          <h2 className={styles.sectionHeading}>История</h2>
          <p className={styles.dateHeading}>21 марта · воскресенье</p>
          <div className={styles.historyList}>
            <Transaction icon="₽" title="Банкомат ПСБ" meta="Пополнение" amount="+2 000 ₽" />
            <Transaction icon="BBQ" title="BARBECUE Rostov RUS" meta="Рестораны" amount="−1 691 ₽" />
          </div>
          <p className={styles.dateHeading} style={{ marginTop: 18 }}>20 марта · суббота</p>
          <div className={styles.historyList}>
            <Transaction icon="5" title="Пятёрочка" meta="Продукты" amount="−6 563 ₽" bonus="+165 ₽" />
          </div>
        </section>

        <section className={styles.surface}>
          <div className={styles.settingsList}>
            <SettingsRow icon="≡" label="Реквизиты" dataTrack="account.details.open" />
            <SettingsRow icon="◫" label="Тарифы и лимиты" dataTrack="account.tariffs.open" />
            <SettingsRow icon="▤" label="Справки и выписки" dataTrack="account.statements.open" />
            <SettingsRow icon="◉" label="Уведомления об операциях" dataTrack="account.notifications.open" />
          </div>
          <div className={styles.dangerRow}>
            <button className={styles.dangerPill} data-track="account.block.open">Заблокировать счёт</button>
          </div>
        </section>
      </div>
    </main>
  );
}
