import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { WebDriver } from "selenium-webdriver";
import { createDriver, isPresent, tap, waitForRoute } from "./support/driver";
import { deleteSession, getSnapshot, runOf, startParticipantSession, startScenario, tapsOf, verdictOf, waitForEaseQuestion, waitForRunResult, waitForTapTarget } from "./support/app";

const TOAST_DURATION_MS = 3000;

describe("B. CARD_COPY", () => {
  let driver: WebDriver;
  const createdSessions: string[] = [];

  beforeAll(async () => { driver = await createDriver(); }, 60_000);
  afterAll(async () => {
    await driver?.quit();
    // Keep the dev dashboard free of test participants. PSB_E2E_KEEP=1 preserves them for debugging.
    if (process.env.PSB_E2E_KEEP === "1") return;
    for (const sessionId of createdSessions) await deleteSession(sessionId).catch(() => undefined);
  });

  async function openCardScenario(participantName: string) {
    const sessionId = await startParticipantSession(driver, participantName);
    createdSessions.push(sessionId);
    await startScenario(driver, sessionId, "CARD_COPY");
    return sessionId;
  }

  async function walkToCardDetails(cardTrack = "card.night.flip") {
    await tap(driver, "home.account.open");
    await waitForRoute(driver, "/account");
    await tap(driver, "account.card.strong.open");
    await waitForRoute(driver, "/card");
    await tap(driver, cardTrack);
  }

  it("B1 completes the golden path and asks for the ease score", async () => {
    const sessionId = await openCardScenario("E2E-B1");
    await walkToCardDetails();
    await tap(driver, "card.night.number.copy");

    const run = await waitForRunResult(sessionId, "CARD_COPY");
    expect(run.result).toBe("unaided");
    const taps = tapsOf(await getSnapshot(sessionId), "CARD_COPY");
    expect(taps.map((event) => event.target)).toEqual([
      "home.account.open", "account.card.strong.open", "card.night.flip", "card.night.number.copy",
    ]);
    expect(taps.map(verdictOf)).toEqual(["correct", "correct", "correct", "correct"]);
    await waitForEaseQuestion(driver);
  }, 90_000);

  it("B2 finishes at the copy tap, long before the copied toast could fade", async () => {
    const sessionId = await openCardScenario("E2E-B2");
    await walkToCardDetails();
    const copiedAt = Date.now();
    await tap(driver, "card.night.number.copy");

    const run = await waitForRunResult(sessionId, "CARD_COPY", TOAST_DURATION_MS - 1000);
    expect(run.result).toBe("unaided");
    expect(Date.now() - copiedAt).toBeLessThan(TOAST_DURATION_MS);
  }, 90_000);

  it.each(["expiry", "cvv"])("B3 completes on a first copy of %s, not only the card number", async (field) => {
    const sessionId = await openCardScenario(`E2E-B3-${field}`);
    await walkToCardDetails();
    await tap(driver, `card.night.${field}.copy`);

    const run = await waitForRunResult(sessionId, "CARD_COPY");
    expect(run.result).toBe("unaided");
    const taps = tapsOf(await getSnapshot(sessionId), "CARD_COPY");
    expect(verdictOf(taps.at(-1)!)).toBe("correct");
    expect(taps.map(verdictOf)).not.toContain("error");
  }, 90_000);

  it("B4 accepts a copy from a card the participant switched to", async () => {
    const sessionId = await openCardScenario("E2E-B4");
    await tap(driver, "home.account.open");
    await waitForRoute(driver, "/account");
    await tap(driver, "account.card.strong.open");
    await waitForRoute(driver, "/card");
    await tap(driver, "card.orange.select");
    await tap(driver, "card.orange.flip");
    await tap(driver, "card.orange.cvv.copy");

    const run = await waitForRunResult(sessionId, "CARD_COPY");
    expect(run.result).toBe("unaided");
    const taps = tapsOf(await getSnapshot(sessionId), "CARD_COPY");
    expect(taps.map((event) => event.target)).toContain("card.orange.cvv.copy");
    expect(taps.map(verdictOf)).not.toContain("error");
  }, 90_000);

  it("B6 marks the savings account as an off-path error without leaving home", async () => {
    const sessionId = await openCardScenario("E2E-B6");
    await tap(driver, "home.savings.open");

    await waitForTapTarget(sessionId, "home.savings.open");
    const savings = tapsOf(await getSnapshot(sessionId), "CARD_COPY").find((event) => event.target === "home.savings.open");
    expect(verdictOf(savings!)).toBe("error");
    expect((await runOf(sessionId, "CARD_COPY"))?.result).toBeNull();
    expect(await isPresent(driver, "home.account.open")).toBe(true);
  }, 90_000);

  it("B7 treats returning from a detour as recovery, not as another error", async () => {
    const sessionId = await openCardScenario("E2E-B7");
    await tap(driver, "cashback.tab.open");
    await waitForRoute(driver, "/cashback");
    await tap(driver, "tab.home.open");
    await waitForRoute(driver, "/");
    await waitForTapTarget(sessionId, "tab.home.open");

    const taps = tapsOf(await getSnapshot(sessionId), "CARD_COPY");
    expect(verdictOf(taps.find((event) => event.target === "cashback.tab.open")!)).toBe("error");
    expect(verdictOf(taps.find((event) => event.target === "tab.home.open")!)).toBe("recovery");
  }, 90_000);

  it("B8 records no copied card data in the event metadata", async () => {
    const sessionId = await openCardScenario("E2E-B8");
    await walkToCardDetails();
    await tap(driver, "card.night.number.copy");
    await waitForRunResult(sessionId, "CARD_COPY");

    const snapshot = await getSnapshot(sessionId);
    const serialized = JSON.stringify(snapshot.events);
    expect(serialized).not.toContain("4588");
    expect(serialized).not.toMatch(/"(clipboard|value|cardNumber|cvv)"\s*:/);
  }, 90_000);
});
