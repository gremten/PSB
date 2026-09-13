"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DetailHeader, styles } from "@/features/bank/bank-ui";
import { useParticipant } from "@/features/usability/participant-provider";
import { track } from "@/lib/testing/tracking";

const categories = [
  { id: "all", title: "1.5% На все покупки", stateLabel: "На все покупки", description: "Любые покупки с дебетовой карты", image: "/figma/categories/asset-06.webp" },
  { id: "flights", title: "2% Авиабилеты", stateLabel: "Авиабилеты", description: "Только на авиасейлс", image: "/figma/categories/asset-04.webp" },
  { id: "scooters", title: "2% Самокаты", stateLabel: "Самокаты", description: "Яндекс, Whoosh и Юрент", image: "/figma/categories/asset-05.webp" },
  { id: "taxi", title: "3% На такси", stateLabel: "Такси", description: "Яндекс GO и Ситимобил", image: "/figma/categories/asset-01.webp" },
  { id: "delivery", title: "7% Деливери", stateLabel: "Деливери", description: "Все виды доставок", image: "/figma/categories/asset-03.webp" },
  { id: "fuel", title: "3% На бензин", stateLabel: "Бензин", description: "Лукойл, ТНК, Газпром", image: "/figma/categories/asset-12.webp" },
  { id: "family", title: "2% На укрепление семьи", stateLabel: "Укрепление семьи", description: "Розовый кролик", image: "/figma/categories/asset-08.webp" },
] as const;

export default function CashbackCategoriesPage() {
  const router = useRouter();
  const { productState, replayVisualState, updateProductState } = useParticipant();
  const selectingNextMonth = productState.cashbackConnected;
  const [liveSelected, setSelected] = useState<string[]>(() => selectingNextMonth
    ? categories.filter((category) => productState.nextMonthCashbackCategories.includes(category.stateLabel)).map((category) => category.id)
    : []);
  const selected = replayVisualState?.selectedCategoryIds ?? liveSelected;
  const [shake, setShake] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hero = heroRef.current;
    const scroller = hero?.closest<HTMLElement>(".participant-content");
    if (!hero || !scroller) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      hero.style.setProperty("--category-card-parallax", `${Math.min(32, scroller.scrollTop * 0.2)}px`);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    scroller.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  const toggle = (id: string) => {
    setSelected((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : current.length < 3 ? [...current, id] : current;
      const period = selectingNextMonth ? "next_month" : "current_month";
      track("action", { screen: "/cashback/categories", action: "cashback.category.selection_changed", target: id, metadata: { period, selectedCount: next.length } });
      if (selectingNextMonth) {
        const selectedLabels = categories.filter((category) => next.includes(category.id)).map((category) => category.stateLabel);
        updateProductState({
          nextMonthCashbackCategories: selectedLabels,
          nextMonthCashbackSelectionStatus: next.length ? "draft" : "available",
        }, "cashback.next_month.selection.changed", {
          period,
          selectedCount: next.length,
          status: next.length ? "draft" : "available",
        });
      }
      return next;
    });
  };

  const confirm = () => {
    if (selected.length !== 3) {
      setShake((value) => value + 1);
      track("action", { screen: "/cashback/categories", action: "cashback.categories.invalid_confirm", metadata: { selectedCount: selected.length } });
      return;
    }
    const selectedLabels = categories.filter((category) => selected.includes(category.id)).map((category) => category.stateLabel);
    updateProductState(productState.cashbackConnected ? {
      nextMonthCashbackCategories: selectedLabels,
      nextMonthCashbackSelectionStatus: "confirmed",
    } : {
      cashbackConnected: true,
      selectedCashbackCategories: selectedLabels,
      nextMonthCashbackSelectionStatus: "available",
      cashbackSuccessVisible: true,
    }, productState.cashbackConnected ? "cashback.next_month.categories.confirmed" : "cashback.categories.confirmed", {
      period: productState.cashbackConnected ? "next_month" : "current_month",
      selectedCount: selectedLabels.length,
      status: productState.cashbackConnected ? "confirmed" : "connected",
    });
    router.push("/");
  };

  return (
    <>
    <main className={`${styles.screen} ${styles.categoryScreen}`} data-screen="categories">
      <div className={styles.accountGradientFrame} aria-hidden="true">
        <div className={styles.accountGradientPosition}>
          <div className={styles.accountGradientRotation}>
            <div className={styles.accountGradientBlob}>
              <Image src="/figma/categories/background-blob-soft.svg" alt="" width={979} height={994} unoptimized />
            </div>
          </div>
        </div>
      </div>
      <DetailHeader title="Категории кешбека" backHref="/cashback" />
      <div ref={heroRef} className={styles.categoryHero}>
        <Image src="/figma/categories/hero-card.png" alt="" width={283} height={282} priority />
      </div>
      <section className={styles.categorySheet}>
        <h1 className={styles.categoryTitle}>Какие категории<br />подключить на апрель?</h1>
        <div className={styles.categoryList}>
          {categories.map((category) => {
            const active = selected.includes(category.id);
            return (
              <button key={category.id} className={styles.categoryRow} onClick={() => toggle(category.id)} data-track={`cashback.category.${category.id}.toggle`} aria-pressed={active}>
                <span className={styles.categoryIcon}><Image src={category.image} alt="" width={32} height={32} /></span>
                <span><span className={styles.categoryName}>{category.title}</span><span className={styles.categoryDescription}>{category.description}</span></span>
                <Image className={styles.faqIcon} src="/figma/icons/faq.svg" alt="" width={24} height={24} />
                <span className={`${styles.checkbox} ${active ? styles.checkboxSelected : ""}`}>{active && <Image src="/figma/icons/check.svg" alt="" width={16} height={16} />}</span>
              </button>
            );
          })}
        </div>
      </section>
    </main>
    <div className={styles.categoryActionBar}>
      <button key={shake} className={`${styles.primaryButton} ${styles.fullButton} ${styles.categoryCta} ${shake ? styles.shake : ""}`} onClick={confirm} data-track="cashback.categories.confirm">
        {selected.length === 3 ? "Подключить" : `Выбрано ${selected.length} из 3`}
      </button>
    </div>
    </>
  );
}
