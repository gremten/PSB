"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { FaqList, ProfileHeader, styles } from "@/features/bank/bank-ui";
import { shouldDismissSuccessSheet } from "@/features/bank/success-sheet-gesture";
import { useParticipant } from "@/features/usability/participant-provider";
import { showDemoUnavailable } from "@/features/usability/demo-feedback";
import { track } from "@/lib/testing/tracking";
import { getNextMonthPresentation, shouldShowNextMonthSuccess } from "./next-month-view";

const yearlyPoints = [
  { month: "Май", fullMonth: "май", points: 3240 },
  { month: "Июн", fullMonth: "июнь", points: 4725 },
  { month: "Июл", fullMonth: "июль", points: 1980 },
  { month: "Авг", fullMonth: "август", points: 4950 },
  { month: "Сен", fullMonth: "сентябрь", points: 2765 },
  { month: "Окт", fullMonth: "октябрь", points: 4380 },
  { month: "Ноя", fullMonth: "ноябрь", points: 4678 },
  { month: "Дек", fullMonth: "декабрь", points: 5123 },
  { month: "Янв", fullMonth: "январь", points: 0 },
  { month: "Фев", fullMonth: "февраль", points: 4290 },
  { month: "Мар", fullMonth: "март", points: 4710 },
  { month: "Апр", fullMonth: "апрель", points: 3680 },
] as const;
const maxYearlyPoints = Math.max(...yearlyPoints.map(({ points }) => points));
const currentMonthPoints = 4859;
const formatPoints = new Intl.NumberFormat("ru-RU");

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
              <span className={styles.benefitLabel}>На&nbsp;<span className={styles.cashbackAccent}>любые</span> покупки</span>
            </article>
            <article className={styles.benefitTile}>
              <button type="button" className={styles.benefitTileHit} aria-label="Подробнее о выгоде у партнёров" data-track="cashback.benefit.partners.open" onClick={showDemoUnavailable} />
              <div><strong className={styles.cashbackCellTitle}>Выгода&nbsp;у партнёров</strong><span className={styles.benefitSub}>Более 100 сервисов</span></div>
              <span className={styles.cashbackPartnerLogos} aria-hidden="true">
                {[1, 2, 3, 4].map((number) => <Image key={number} src={`/figma/cashback/partner-${number}.svg`} alt="" width={40} height={40} />)}
                <span className={styles.cashbackPartnerCount}><Image src="/figma/cashback/partner-5.svg" alt="" width={40} height={40} /><span>+96</span></span>
              </span>
            </article>
          </div>
          <div className={`${styles.cashbackBentoRow} ${styles.cashbackBentoRowBottom}`}>
            <article className={styles.benefitTile}>
              <button type="button" className={styles.benefitTileHit} aria-label="Подробнее о начислении баллов" data-track="cashback.benefit.points.open" onClick={showDemoUnavailable} />
              <div><strong className={styles.cashbackCellTitle}><span className={styles.cashbackAccent}>1 балл</span> = 1 ₽</strong><span className={styles.benefitSub}>Как&nbsp;и&nbsp;за что начисляем</span></div>
              <div className={styles.benefitChips}><span className={styles.benefitChip}>Ежемесячно</span><span className={styles.benefitChip}>до&nbsp;5 000 ₽</span></div>
            </article>
            <article className={styles.benefitTile}>
              <button type="button" className={styles.benefitTileHit} aria-label="Подробнее о повышенном кэшбэке 25%" data-track="cashback.benefit.boost.open" onClick={showDemoUnavailable} />
              <strong className={styles.cashbackCellTitle}>Повышенный кэшбэк <span className={styles.cashbackAccent}>25%</span></strong>
              <span className={styles.benefitSub}>На&nbsp;первые<br />3 месяца</span>
            </article>
          </div>
        </section>
        <div className={`${styles.buttonInset} ${styles.cashbackDisconnectedActions}`}>
          <Link className={`${styles.primaryButton} ${styles.fullButton}`} href="/cashback/categories" data-track="cashback.connect.start">Хочу подключить</Link>
          <button className={`${styles.textButton} ${styles.fullButton}`} data-track="cashback.terms.open" onClick={showDemoUnavailable}>Подробнее об&nbsp;условиях</button>
        </div>
        <FaqList />
      </div>
    </main>
  );
}

function NextMonthSuccessSheet({ onDismiss }: { onDismiss: () => void }) {
  const [viewport, setViewport] = useState<HTMLElement | null>(null);
  const [closing, setClosing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const startY = useRef<number | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setViewport(document.querySelector<HTMLElement>(".participant-phone")));
    return () => {
      cancelAnimationFrame(frame);
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  const dismiss = () => {
    if (closing) return;
    setClosing(true);
    track("action", { screen: "/cashback", action: "cashback.next_month.success.dismissed" });
    closeTimer.current = setTimeout(onDismiss, 200);
  };

  const finishDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (startY.current === null) return;
    const distance = Math.max(0, event.clientY - startY.current);
    startY.current = null;
    setDragging(false);
    if (shouldDismissSuccessSheet(distance)) dismiss();
    else setDragOffset(0);
  };

  if (!viewport) return null;
  return createPortal(
    <div className={`${styles.successOverlay} ${closing ? styles.successOverlayClosing : ""}`} role="presentation">
      <section className={`${styles.successSheet} ${dragging ? styles.successSheetDragging : ""} ${closing ? styles.successSheetClosing : ""}`} role="dialog" aria-modal="true" aria-labelledby="next-month-success-title" style={{ "--success-drag": `${dragOffset}px` } as CSSProperties}>
        <div className={styles.grabberHit} aria-label="Потяните вниз, чтобы закрыть" data-track="cashback.next_month.success.drag" onPointerDown={(event) => { startY.current = event.clientY; setDragging(true); event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={(event) => { if (startY.current !== null) setDragOffset(Math.max(0, event.clientY - startY.current)); }} onPointerUp={finishDrag} onPointerCancel={() => { startY.current = null; setDragging(false); setDragOffset(0); }}><span className={styles.grabber} /></div>
        <Image className={styles.successImage} src="/figma/success/asset-14.webp" alt="" width={164} height={164} priority />
        <h2 id="next-month-success-title" className={styles.successTitle}>Категории на&nbsp;октябрь выбраны!</h2>
        <p className={styles.successText}>В&nbsp;следующем месяце они будут учитываться при оплате покупок.</p>
        <button className={`${styles.primaryButton} ${styles.fullButton} ${styles.successCloseButton}`} data-track="cashback.next_month.success.close" onClick={dismiss}>Хорошо!</button>
      </section>
    </div>, viewport,
  );
}

function ConnectedCashback() {
  const { productState, replayVisualState } = useParticipant();
  const router = useRouter();
  const [livePeriod, setPeriod] = useState<"month" | "year">("month");
  const period = replayVisualState?.cashbackPeriod ?? livePeriod;
  const nextMonthConfirmed = productState.nextMonthCashbackSelectionStatus === "confirmed";
  const [nextMonthSuccessOpen, setNextMonthSuccessOpen] = useState(false);
  const selectedNextMonth = getNextMonthPresentation(productState.nextMonthCashbackCategories);
  const yearChartRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setNextMonthSuccessOpen(shouldShowNextMonthSuccess(window.location.search, nextMonthConfirmed)));
    return () => cancelAnimationFrame(frame);
  }, [nextMonthConfirmed]);
  useEffect(() => {
    if (period !== "year") return;
    const viewport = yearChartRef.current;
    if (!viewport) return;
    const columns = Array.from(viewport.querySelectorAll<HTMLElement>("[data-year-column]"));
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const updateScales = () => {
      frame = 0;
      for (const column of columns) {
        const left = column.offsetLeft - viewport.scrollLeft;
        const visible = Math.max(0, Math.min(left + column.offsetWidth, viewport.clientWidth) - Math.max(left, 0));
        const fraction = visible / column.offsetWidth;
        column.style.setProperty("--year-column-scale", String(reducedMotion.matches ? 1 : 0.88 + fraction * 0.12));
      }
    };
    const scheduleScales = () => {
      if (!frame) frame = window.requestAnimationFrame(updateScales);
    };
    viewport.scrollLeft = viewport.scrollWidth - viewport.clientWidth;
    scheduleScales();
    viewport.addEventListener("scroll", scheduleScales, { passive: true });
    window.addEventListener("resize", scheduleScales);
    reducedMotion.addEventListener("change", scheduleScales);
    return () => {
      viewport.removeEventListener("scroll", scheduleScales);
      window.removeEventListener("resize", scheduleScales);
      reducedMotion.removeEventListener("change", scheduleScales);
      window.cancelAnimationFrame(frame);
    };
  }, [period]);
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
          <p className={styles.pointsSub}>Кэшбек приходит с&nbsp;5 до&nbsp;20 числа</p>
          {nextMonthConfirmed ? (
            <div className={`${styles.nextCategories} ${styles.nextCategoriesConfirmed}`}>
              <Image className={styles.nextCategoriesBackdrop} src="/figma/home/banner-new-bg.svg" alt="" width={655} height={510} />
              <span className={styles.nextCategoriesConfirmedContent}>
                <span className={styles.nextCategoriesTitle}>Категории на&nbsp;октябрь</span>
                <span className={styles.nextCategoriesDetails}>
                  <span className={styles.nextCategoriesIcons} aria-hidden="true">
                    {selectedNextMonth.map(({ label, image, background }) => image && <span className={styles.nextCategoriesIconTile} key={label} style={{ backgroundColor: background }}><Image src={image} alt="" width={32} height={32} /></span>)}
                  </span>
                  <span className={styles.nextCategoriesSummary}>{selectedNextMonth.map(({ summary }) => summary).join(", ")}</span>
                </span>
              </span>
            </div>
          ) : (
            <div className={styles.nextCategories}>
              <Image className={styles.nextCategoriesBackdrop} src="/figma/home/banner-new-bg.svg" alt="" width={655} height={510} />
              <div className={styles.nextCategoriesCopy}>
                <span className={styles.nextCategoriesTitle}>Категории на&nbsp;октябрь</span>
                <span className={styles.nextCategoriesText}>
                  {productState.nextMonthCashbackSelectionStatus === "draft"
                    ? `Выбрано ${productState.nextMonthCashbackCategories.length} из\u00a03 — подтвердите выбор`
                    : "Вы уже можете выбрать категории на\u00a0следующий месяц"}
                </span>
              </div>
              <Link className={styles.chooseButton} href="/cashback/categories" data-track="cashback.next_month.categories.open">Выбрать</Link>
            </div>
          )}
        </section>

        <section className={styles.chartBlock}>
          <div className={styles.chartTop}>
            <div><span className={styles.chartLabel}>В&nbsp;этом месяце</span><strong className={styles.chartValue}>{formatPoints.format(currentMonthPoints)}</strong></div>
            <div className={styles.miniSegments} aria-label="Период">
              <button className={`${styles.miniSegment} ${period === "month" ? styles.miniSegmentActive : ""}`} onClick={() => choosePeriod("month")} data-track="cashback.period.month">Месяц</button>
              <button className={`${styles.miniSegment} ${period === "year" ? styles.miniSegmentActive : ""}`} onClick={() => choosePeriod("year")} data-track="cashback.period.year">Весь год</button>
            </div>
          </div>
          {period === "month" ? (
            <>
              <div className={styles.chart}><span className={styles.chartSegment} /><span className={styles.chartSegment} /><span className={styles.chartSegment} /></div>
              <div className={styles.chartNumbers}><span>834</span><span>2 814</span><span>1 211</span></div>
              <div className={styles.chartLegend}><span><i className={styles.legendDot} style={{ background: "#e76e39" }} />1,5% на&nbsp;все</span><span><i className={styles.legendDot} style={{ background: "#7bd7e5" }} />2% Авиабилеты</span><span><i className={styles.legendDot} style={{ background: "#8778b6" }} />3% Транспорт</span></div>
            </>
          ) : (
            <div ref={yearChartRef} className={styles.yearChart} role="region" tabIndex={0} data-track="cashback.year_chart.scroll" aria-label={`Баллы по месяцам. Прокручиваемый график: ${yearlyPoints.map(({ fullMonth, points }) => `${fullMonth} ${formatPoints.format(points)}`).join(", ")}`}>
              <div className={styles.yearChartColumns}>
                {yearlyPoints.map(({ month, points }, index) => (
                  <div className={styles.yearChartColumn} key={`${month}-${index}`} data-year-column>
                    <span className={styles.yearChartValue}>{formatPoints.format(points)}</span>
                    <span className={`${styles.yearChartBar} ${month === "Апр" ? styles.yearChartBarCurrent : ""}`} style={{ "--bar-height": `${Math.max(3, Math.round(points / maxYearlyPoints * 135))}px` } as CSSProperties} />
                    <span className={styles.yearChartMonth}>{month}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
        <div className={`${styles.buttonInset} ${styles.cashbackConnectedActions}`}>
          <button className={`${styles.primaryButton} ${styles.fullButton}`} data-track="cashback.exchange.open" onClick={showDemoUnavailable}>Обменять на&nbsp;рубли</button>
          <button className={`${styles.textButton} ${styles.fullButton}`} data-track="cashback.terms.open" onClick={showDemoUnavailable}>Подробнее об&nbsp;условиях</button>
        </div>
        <FaqList />
      </div>
      {nextMonthSuccessOpen && <NextMonthSuccessSheet onDismiss={() => { setNextMonthSuccessOpen(false); router.replace("/cashback", { scroll: false }); }} />}
    </main>
  );
}

export default function CashbackPage() {
  const { productState } = useParticipant();
  return productState.cashbackConnected ? <ConnectedCashback /> : <DisconnectedCashback />;
}
