const categoryPresentation: Record<string, { image: string; summary: string }> = {
  "На все покупки": { image: "/figma/categories/asset-06.webp", summary: "1,5% на все покупки" },
  Авиабилеты: { image: "/figma/categories/asset-04.webp", summary: "2% авиабилеты" },
  Самокаты: { image: "/figma/categories/asset-05.webp", summary: "2% самокаты" },
  Такси: { image: "/figma/categories/asset-01.webp", summary: "3% на такси" },
  Деливери: { image: "/figma/categories/asset-03.webp", summary: "7% Деливери" },
  Бензин: { image: "/figma/categories/asset-12.webp", summary: "3% на бензин" },
  "Укрепление семьи": { image: "/figma/categories/asset-08.webp", summary: "2% на укрепление семьи" },
};

export const nextMonthConfirmationHref = "/cashback?next-month-success=1";

export function shouldShowNextMonthSuccess(search: string, confirmed: boolean) {
  return confirmed && new URLSearchParams(search).get("next-month-success") === "1";
}

export function getNextMonthPresentation(labels: string[]) {
  return labels.map((label) => ({
    label,
    image: categoryPresentation[label]?.image,
    summary: categoryPresentation[label]?.summary ?? label,
  }));
}
