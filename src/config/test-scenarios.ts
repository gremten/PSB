import type { CashbackVariant } from "@/lib/testing/types";

export interface UsabilityTask {
  code: string;
  set: "A" | "B";
  title: string;
  prompt: string;
  startRoute: string;
  successCondition: string;
  goldenStepCount: number | null;
}

export const usabilityTasks: UsabilityTask[] = [
  {
    code: "A1",
    set: "A",
    title: "Реквизиты карты",
    prompt: "Найдите данные карты и заполните форму оплаты.",
    startRoute: "/",
    successCondition: "Fake payment form validates all three fields.",
    goldenStepCount: null,
  },
  {
    code: "A2",
    set: "A",
    title: "Понять выгоду",
    prompt: "Разберитесь, что даёт кешбэк.",
    startRoute: "/",
    successCondition: "Participant reaches and understands the benefit screen.",
    goldenStepCount: null,
  },
  {
    code: "A3",
    set: "A",
    title: "Подключить кешбэк",
    prompt: "Решите, подключать кешбэк или нет, и выполните решение.",
    startRoute: "/cashback",
    successCondition: "Cashback connection success state is reached.",
    goldenStepCount: null,
  },
  {
    code: "A4",
    set: "A",
    title: "Выбрать категории",
    prompt: "Выберите три категории кешбэка на этот месяц.",
    startRoute: "/cashback",
    successCondition: "Exactly three categories are selected and confirmed.",
    goldenStepCount: null,
  },
  {
    code: "B1",
    set: "B",
    title: "Реквизиты карты",
    prompt: "Найдите данные карты и заполните форму оплаты.",
    startRoute: "/",
    successCondition: "Fake payment form validates all three fields.",
    goldenStepCount: null,
  },
  {
    code: "B2",
    set: "B",
    title: "Текущие категории",
    prompt: "Узнайте, какие категории выбраны в этом месяце.",
    startRoute: "/",
    successCondition: "Participant identifies all current categories.",
    goldenStepCount: null,
  },
  {
    code: "B3",
    set: "B",
    title: "Новый период",
    prompt: "Обновите категории на новый месяц.",
    startRoute: "/cashback",
    successCondition: "Three new categories are confirmed.",
    goldenStepCount: null,
  },
  {
    code: "B4",
    set: "B",
    title: "Выгода за год",
    prompt: "Узнайте, сколько кешбэка получено за год.",
    startRoute: "/cashback",
    successCondition: "Year segment is opened and total is identified.",
    goldenStepCount: null,
  },
  {
    code: "B5",
    set: "B",
    title: "Последние операции",
    prompt: "Проверьте, прошёл ли вчерашний платёж.",
    startRoute: "/",
    successCondition: "Yesterday transaction is found in home history.",
    goldenStepCount: null,
  },
];

export function tasksForVariant(variant: CashbackVariant) {
  return usabilityTasks.filter((task) => task.set === (variant === "connected" ? "B" : "A"));
}

export function getTask(taskCode: string) {
  return usabilityTasks.find((task) => task.code === taskCode) ?? null;
}
