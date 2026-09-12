"use client";

import Link from "next/link";
import { useState } from "react";
import { FaqList, ProfileHeader, styles } from "@/features/bank/bank-ui";
import { useParticipant } from "@/features/usability/participant-provider";
import { track } from "@/lib/testing/tracking";

function DisconnectedCashback() {
  return (
    <main className={styles.screen}>
      <ProfileHeader />
      <div className={styles.pageContent}>
        <section className={styles.benefitBento} aria-label="Условия кешбэка">
          <article className={styles.benefitTile}><strong className={styles.benefitValue}>1.5%</strong><span className={styles.benefitLabel}>На любые покупки</span></article>
          <article className={styles.benefitTile}><strong className={styles.benefitLabel}>Выгода у партнёров</strong><span className={styles.benefitSub}>Более 100 сервисов</span><span className={styles.partnerDots} aria-hidden="true"><span className={styles.partnerDot}>Я</span><span className={styles.partnerDot}>5</span><span className={styles.partnerDot}>WB</span></span></article>
          <article className={`${styles.benefitTile} ${styles.benefitTileWide}`}><strong className={styles.benefitValue}>1 балл = 1 ₽</strong><span className={styles.benefitSub}>Как и за что начисляем</span><div className={styles.benefitChips}><span className={styles.benefitChip}>Ежемесячно</span><span className={styles.benefitChip}>до 5 000 ₽</span></div></article>
          <article className={`${styles.benefitTile} ${styles.benefitTileWide}`}><strong className={styles.benefitValue}>25%</strong><span className={styles.benefitLabel}>Повышенный кешбэк</span><span className={styles.benefitSub}>На первые 3 месяца</span></article>
        </section>
        <div className={styles.buttonInset}>
          <Link className={`${styles.primaryButton} ${styles.fullButton}`} href="/cashback/categories" data-track="cashback.connect.start">Хочу подключить</Link>
          <button className={`${styles.textButton} ${styles.fullButton}`} data-track="cashback.terms.open">Подробнее об условиях</button>
        </div>
        <FaqList />
      </div>
    </main>
  );
}

function ConnectedCashback() {
  const { productState, replayVisualState } = useParticipant();
  const [livePeriod, setPeriod] = useState<"month" | "year">("month");
  const period = replayVisualState?.cashbackPeriod ?? livePeriod;
  const choosePeriod = (next: "month" | "year") => {
    setPeriod(next);
    track("action", { screen: "/cashback", action: `cashback.period.${next}` });
  };
  return (
    <main className={styles.screen}>
      <ProfileHeader />
      <div className={styles.screenStack}>
        <section className={styles.cashbackConnectedHero}>
          <p className={styles.points}>1 245 баллов</p>
          <p className={styles.pointsSub}>Кэшбек приходит с 5 до 20 числа</p>
          <div className={styles.nextCategories}>
            <span className={styles.nextCategoriesTitle}>Категории на май</span>
            <span className={styles.nextCategoriesText}>
              {productState.nextMonthCashbackSelectionStatus === "confirmed"
                ? productState.nextMonthCashbackCategories.join(", ")
                : productState.nextMonthCashbackSelectionStatus === "draft"
                  ? `Выбрано ${productState.nextMonthCashbackCategories.length} из 3 — подтвердите выбор`
                  : "Вы уже можете выбрать категории на следующий месяц"}
            </span>
            <Link className={styles.chooseButton} href="/cashback/categories" data-track="cashback.next_month.categories.open">
              {productState.nextMonthCashbackSelectionStatus === "confirmed" ? "Изменить" : "Выбрать"}
            </Link>
          </div>
        </section>

        <section className={styles.chartBlock}>
          <div className={styles.chartTop}>
            <div><span className={styles.chartLabel}>{period === "month" ? "В этом месяце" : "За весь год"}</span><strong className={styles.chartValue}>{period === "month" ? "4 859" : "18 760"}</strong></div>
            <div className={styles.miniSegments} aria-label="Период">
              <button className={`${styles.miniSegment} ${period === "month" ? styles.miniSegmentActive : ""}`} onClick={() => choosePeriod("month")} data-track="cashback.period.month">Месяц</button>
              <button className={`${styles.miniSegment} ${period === "year" ? styles.miniSegmentActive : ""}`} onClick={() => choosePeriod("year")} data-track="cashback.period.year">Весь год</button>
            </div>
          </div>
          {period === "month" ? (
            <>
              <div className={styles.chart}><span className={styles.chartSegment} /><span className={styles.chartSegment} /><span className={styles.chartSegment} /></div>
              <div className={styles.chartNumbers}><span>834</span><span>2 814</span><span>1 211</span></div>
              <div className={styles.chartLegend}><span><i className={styles.legendDot} style={{ background: "#e76e39" }} />1,5% на все</span><span><i className={styles.legendDot} style={{ background: "#7bd7e5" }} />2% Авиабилеты</span><span><i className={styles.legendDot} style={{ background: "#8778b6" }} />3% Транспорт</span></div>
            </>
          ) : <p className={styles.yearTotal}>18 760 баллов</p>}
        </section>
        <div className={styles.buttonInset}>
          <button className={`${styles.primaryButton} ${styles.fullButton}`} data-track="cashback.exchange.open">Обменять на рубли</button>
          <button className={`${styles.textButton} ${styles.fullButton}`} data-track="cashback.terms.open">Подробнее об условиях</button>
        </div>
        <FaqList />
      </div>
    </main>
  );
}

export default function CashbackPage() {
  const { productState } = useParticipant();
  return productState.cashbackConnected ? <ConnectedCashback /> : <DisconnectedCashback />;
}
