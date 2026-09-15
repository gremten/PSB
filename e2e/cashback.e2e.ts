import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { WebDriver } from "selenium-webdriver";
import { createDriver, dragDown, isPresent, scrollParticipantContent, tap, waitForRoute } from "./support/driver";
import { deleteSession, getSnapshot, runOf, startParticipantSession, startScenario, tapsOf, verdictOf, waitForEaseQuestion, waitForRunResult, waitForTapTarget } from "./support/app";

const CONNECT_CATEGORIES = ["all", "flights", "taxi"];
const NEXT_MONTH_CATEGORIES = ["delivery", "fuel", "family"];
const SHEET_DISMISS_PX = 90;

describe("C/D. Cashback flows", () => {
  let driver: WebDriver;
  const createdSessions: string[] = [];

  beforeAll(async () => { driver = await createDriver(); }, 60_000);
  afterAll(async () => {
    await driver?.quit();
    if (process.env.PSB_E2E_KEEP === "1") return;
    for (const sessionId of createdSessions) await deleteSession(sessionId).catch(() => undefined);
  });

  async function openScenario(participantName: string, scenarioCode: string) {
    const sessionId = await startParticipantSession(driver, participantName);
    createdSessions.push(sessionId);
    await startScenario(driver, sessionId, scenarioCode);
    return sessionId;
  }

  /** Both documented entries to the cashback screen: the badge by the balance and the tabbar. */
  async function openCashback(entry: "badge" | "tabbar") {
    await tap(driver, entry === "badge" ? "home.cashback.open" : "cashback.tab.open");
    await waitForRoute(driver, "/cashback");
  }

  async function chooseCategories(ids: string[]) {
    await waitForRoute(driver, "/cashback/categories");
    for (const id of ids) await tap(driver, `cashback.category.${id}.toggle`);
    await tap(driver, "cashback.categories.confirm");
  }

  async function connectCashback(entry: "badge" | "tabbar", dismiss: "button" | "drag") {
    await openCashback(entry);
    await tap(driver, "cashback.connect.start");
    await chooseCategories(CONNECT_CATEGORIES);
    // Confirming the current month returns to home, where the success sheet is shown.
    await waitForRoute(driver, "/");
    if (dismiss === "button") await tap(driver, "cashback.success.close");
    else await dragDown(driver, "cashback.success.drag", SHEET_DISMISS_PX);
  }

  it("C1 connects cashback from the balance badge and finishes on the sheet button", async () => {
    const sessionId = await openScenario("E2E-C1", "CASHBACK_CONNECT");
    await connectCashback("badge", "button");

    const run = await waitForRunResult(sessionId, "CASHBACK_CONNECT");
    expect(run.result).toBe("unaided");
    const taps = tapsOf(await getSnapshot(sessionId), "CASHBACK_CONNECT");
    expect(taps.map((event) => event.target)).toEqual([
      "home.cashback.open", "cashback.connect.start",
      ...CONNECT_CATEGORIES.map((id) => `cashback.category.${id}.toggle`),
      "cashback.categories.confirm", "cashback.success.close",
    ]);
    expect(taps.map(verdictOf)).not.toContain("error");
    await waitForEaseQuestion(driver);
  }, 120_000);

  it("C2 connects cashback from the tabbar and finishes by dragging the sheet away", async () => {
    const sessionId = await openScenario("E2E-C2", "CASHBACK_CONNECT");
    await connectCashback("tabbar", "drag");

    const run = await waitForRunResult(sessionId, "CASHBACK_CONNECT");
    expect(run.result).toBe("unaided");
    expect(await isPresent(driver, "cashback.success.close")).toBe(false);
    expect(tapsOf(await getSnapshot(sessionId), "CASHBACK_CONNECT").map(verdictOf)).not.toContain("error");
    // Closing by drag also hands the participant the ease-score question.
    await waitForEaseQuestion(driver);
  }, 120_000);

  it("C3 keeps the sheet and the scenario open after a short drag", async () => {
    const sessionId = await openScenario("E2E-C3", "CASHBACK_CONNECT");
    await openCashback("tabbar");
    await tap(driver, "cashback.connect.start");
    await chooseCategories(CONNECT_CATEGORIES);
    await waitForRoute(driver, "/");
    await dragDown(driver, "cashback.success.drag", 30);

    expect(await isPresent(driver, "cashback.success.close")).toBe(true);
    expect((await runOf(sessionId, "CASHBACK_CONNECT"))?.result).toBeNull();
    await tap(driver, "cashback.success.close");
    expect((await waitForRunResult(sessionId, "CASHBACK_CONNECT")).result).toBe("unaided");
  }, 120_000);

  it("C4 refuses a confirmation with fewer than three categories", async () => {
    const sessionId = await openScenario("E2E-C4", "CASHBACK_CONNECT");
    await openCashback("tabbar");
    await tap(driver, "cashback.connect.start");
    await waitForRoute(driver, "/cashback/categories");
    for (const id of CONNECT_CATEGORIES.slice(0, 2)) await tap(driver, `cashback.category.${id}.toggle`);
    await tap(driver, "cashback.categories.confirm");
    await waitForTapTarget(sessionId, "cashback.categories.confirm");

    expect(new URL(await driver.getCurrentUrl()).pathname).toBe("/cashback/categories");
    const confirm = tapsOf(await getSnapshot(sessionId), "CASHBACK_CONNECT").find((event) => event.target === "cashback.categories.confirm");
    expect(verdictOf(confirm!)).toBe("error");
    expect((await runOf(sessionId, "CASHBACK_CONNECT"))?.result).toBeNull();
  }, 120_000);

  it("C5 refuses a fourth category and keeps the selection at three", async () => {
    const sessionId = await openScenario("E2E-C5", "CASHBACK_CONNECT");
    await openCashback("tabbar");
    await tap(driver, "cashback.connect.start");
    await waitForRoute(driver, "/cashback/categories");
    for (const id of CONNECT_CATEGORIES) await tap(driver, `cashback.category.${id}.toggle`);
    await tap(driver, "cashback.category.scooters.toggle");
    await waitForTapTarget(sessionId, "cashback.category.scooters.toggle");

    const fourth = tapsOf(await getSnapshot(sessionId), "CASHBACK_CONNECT").find((event) => event.target === "cashback.category.scooters.toggle");
    expect(verdictOf(fourth!)).toBe("error");
    const selectedCount = await driver.executeScript<number>('return document.querySelectorAll(\'[data-track^="cashback.category."][aria-pressed="true"]\').length');
    expect(selectedCount).toBe(3);
  }, 120_000);

  it("C6 does not count studying the screens by scrolling as wrong clicks", async () => {
    const sessionId = await openScenario("E2E-C6", "CASHBACK_CONNECT");
    await scrollParticipantContent(driver, 600);
    await scrollParticipantContent(driver, -300);
    await openCashback("tabbar");
    await scrollParticipantContent(driver, 500);
    await tap(driver, "cashback.connect.start");
    await waitForRoute(driver, "/cashback/categories");
    await scrollParticipantContent(driver, 400);
    for (const id of CONNECT_CATEGORIES) await tap(driver, `cashback.category.${id}.toggle`);
    await tap(driver, "cashback.categories.confirm");
    await waitForRoute(driver, "/");
    await tap(driver, "cashback.success.close");

    const run = await waitForRunResult(sessionId, "CASHBACK_CONNECT");
    expect(run.result).toBe("unaided");
    const snapshot = await getSnapshot(sessionId);
    expect(snapshot.events.some((event) => event.type === "scroll")).toBe(true);
    expect(tapsOf(snapshot, "CASHBACK_CONNECT").map(verdictOf)).not.toContain("error");
  }, 150_000);

  /** CASHBACK_NEXT is only assignable once the connection scenario is complete. */
  async function openNextMonthScenario(participantName: string) {
    const sessionId = await openScenario(participantName, "CASHBACK_CONNECT");
    await connectCashback("tabbar", "button");
    await waitForRunResult(sessionId, "CASHBACK_CONNECT");
    await tap(driver, "participant.seq.score.6");
    await startScenario(driver, sessionId, "CASHBACK_NEXT");
    return sessionId;
  }

  it("D1 picks October categories from the tabbar and finishes on the sheet button", async () => {
    const sessionId = await openNextMonthScenario("E2E-D1");
    await openCashback("tabbar");
    await tap(driver, "cashback.next_month.categories.open");
    await chooseCategories(NEXT_MONTH_CATEGORIES);
    // The next-month confirmation is an overlay on the cashback screen, not on home.
    await waitForRoute(driver, "/cashback");
    await tap(driver, "cashback.next_month.success.close");

    const run = await waitForRunResult(sessionId, "CASHBACK_NEXT");
    expect(run.result).toBe("unaided");
    const taps = tapsOf(await getSnapshot(sessionId), "CASHBACK_NEXT");
    expect(taps.map((event) => event.target)).toEqual([
      "cashback.tab.open", "cashback.next_month.categories.open",
      ...NEXT_MONTH_CATEGORIES.map((id) => `cashback.category.${id}.toggle`),
      "cashback.categories.confirm", "cashback.next_month.success.close",
    ]);
    expect(taps.map(verdictOf)).not.toContain("error");
    await waitForEaseQuestion(driver);
  }, 180_000);

  it("D2 picks October categories from the balance badge and finishes by dragging the sheet away", async () => {
    const sessionId = await openNextMonthScenario("E2E-D2");
    await openCashback("badge");
    await tap(driver, "cashback.next_month.categories.open");
    await chooseCategories(NEXT_MONTH_CATEGORIES);
    await waitForRoute(driver, "/cashback");
    await dragDown(driver, "cashback.next_month.success.drag", SHEET_DISMISS_PX);

    const run = await waitForRunResult(sessionId, "CASHBACK_NEXT");
    expect(run.result).toBe("unaided");
    expect(await isPresent(driver, "cashback.next_month.success.close")).toBe(false);
    expect(tapsOf(await getSnapshot(sessionId), "CASHBACK_NEXT").map(verdictOf)).not.toContain("error");
  }, 180_000);
});
