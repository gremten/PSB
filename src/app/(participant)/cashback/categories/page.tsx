"use client";

import Image from "next/image";
import { useState } from "react";
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
  const { updateProductState } = useParticipant();
  const [selected, setSelected] = useState<string[]>([]);
  const [shake, setShake] = useState(0);

  const toggle = (id: string) => {
    setSelected((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : current.length < 3 ? [...current, id] : current;
      track("action", { screen: "/cashback/categories", action: "cashback.category.selection_changed", target: id, metadata: { selectedCount: next.length } });
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
    updateProductState({
      cashbackConnected: true,
      selectedCashbackCategories: selectedLabels,
      cashbackSuccessVisible: true,
    }, "cashback.categories.confirmed");
    router.push("/");
  };

  return (
    <main className={`${styles.screen} ${styles.categoryScreen}`}>
      <DetailHeader title="Категории кешбека" backHref="/cashback" />
      <div className={styles.categoryHero}>
        <Image src="/figma/categories/asset-02.webp" alt="" width={310} height={310} priority />
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
                <Image className={styles.faqIcon} src="/figma/icons/faq.svg" alt="" width={20} height={20} />
                <span className={`${styles.checkbox} ${active ? styles.checkboxSelected : ""}`}>{active && <Image src="/figma/icons/check.svg" alt="" width={16} height={16} />}</span>
              </button>
            );
          })}
        </div>
      </section>
      <button key={shake} className={`${styles.primaryButton} ${styles.fullButton} ${styles.categoryCta} ${shake ? styles.shake : ""}`} onClick={confirm} data-track="cashback.categories.confirm">
        {selected.length === 3 ? "Подключить" : `Выбрано ${selected.length} из 3`}
      </button>
    </main>
  );
}
