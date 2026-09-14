"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { FaqList, ProfileHeader, styles } from "@/features/bank/bank-ui";
import { useParticipant } from "@/features/usability/participant-provider";
import { showDemoUnavailable } from "@/features/usability/demo-feedback";
import { track } from "@/lib/testing/tracking";

function DisconnectedCashback() {
  return (
    <main className={`${styles.screen} ${styles.cashbackScreen} ${styles.cashbackDisconnectedScreen}`}>
      <ProfileHeader />
      <div className={styles.pageContent}>
        <section className={styles.benefitBento} aria-label="Условия кешбэка">
          <div className={`${styles.cashbackBentoRow} ${styles.cashbackBentoRowTop}`}>
            <article className={styles.benefitTile}>
              <button type="button" className={styles.benefitTileHit} aria-label="Подробнее о кэшбэке 1,5% на любые покупки" data-track="cashback.benefit.all_purchases.open" onClick={showDemoUnavailable} />
              <strong className={styles.benefitValue}>1.5%</strong>
              <span className={styles.benefitLabel}>На <span className={styles.cashbackAccent}>любые</span> покупки</span>
            </article>
            <article className={styles.benefitTile}>
              <button type="button" className={styles.benefitTileHit} aria-label="Подробнее о выгоде у партнёров" data-track="cashback.benefit.partners.open" onClick={showDemoUnavailable} />
              <div><strong className={styles.cashbackCellTitle}>Выгода у партнёров</strong><span className={styles.benefitSub}>Более 100 сервисов</span></div>
              <span className={styles.cashbackPartnerLogos} aria-hidden="true">
                {[1, 2, 3, 4].map((number) => <Image key={number} src={`/figma/cashback/partner-${number}.svg`} alt="" width={40} height={40} />)}
                <span className={styles.cashbackPartnerCount}><Image src="/figma/cashback/partner-5.svg" alt="" width={40} height={40} /><span>+96</span></span>
              </span>
            </article>
          </div>
          <div className={`${styles.cashbackBentoRow} ${styles.cashbackBentoRowBottom}`}>
            <article className={styles.benefitTile}>
              <button type="button" className={styles.benefitTileHit} aria-label="Подробнее о начислении баллов" data-track="cashback.benefit.points.open" onClick={showDemoUnavailable} />
              <div><strong className={styles.cashbackCellTitle}><span className={styles.cashbackAccent}>1 балл</span> = 1 ₽</strong><span className={styles.benefitSub}>Как и за что начисляем</span></div>
              <div className={styles.benefitChips}><span className={styles.benefitChip}>Ежемесячно</span><span className={styles.benefitChip}>до 5 000 ₽</span></div>
            </article>
            <article className={styles.benefitTile}>
              <button type="button" className={styles.benefitTileHit} aria-label="Подробнее о повышенном кэшбэке 25%" data-track="cashback.benefit.boost.open" onClick={showDemoUnavailable} />
              <strong className={styles.cashbackCellTitle}>Повышенный кэшбэк <span className={styles.cashbackAccent}>25%</span></strong>
              <span className={styles.benefitSub}>На первые<br />3 месяца</span>
            </article>
          </div>
        </section>
        <div className={`${styles.buttonInset} ${styles.cashbackDisconnectedActions}`}>
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
    <main className={`${styles.screen} ${styles.cashbackScreen} ${styles.cashbackConnectedScreen}`}>
      <ProfileHeader />
      <div className={`${styles.screenStack} ${styles.cashbackConnectedStack}`}>
        <section className={styles.cashbackConnectedHero}>
          <p className={styles.points}>1 245 баллов</p>
          <p className={styles.pointsSub}>Кэшбек приходит с 5 до 20 числа</p>
          <div className={styles.nextCategories}>
            <Image className={styles.nextCategoriesBackdrop} src="/figma/home/banner-new-bg.svg" alt="" width={655} height={510} />
            <div className={styles.nextCategoriesCopy}>
              <span className={styles.nextCategoriesTitle}>Категории на май</span>
              <span className={styles.nextCategoriesText}>
                {productState.nextMonthCashbackSelectionStatus === "confirmed"
                  ? productState.nextMonthCashbackCategories.join(", ")
                  : productState.nextMonthCashbackSelectionStatus === "draft"
                    ? `Выбрано ${productState.nextMonthCashbackCategories.length} из 3 — подтвердите выбор`
                    : "Вы уже можете выбрать категории на следующий месяц"}
              </span>
            </div>
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
        <div className={`${styles.buttonInset} ${styles.cashbackConnectedActions}`}>
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
