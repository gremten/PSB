import { until, type WebDriver } from "selenium-webdriver";
import type { SessionSnapshot, TaskRun, TrackedEvent } from "../../src/lib/testing/types";
import { BASE_URL, DEFAULT_TIMEOUT_MS, sessionStorageItem, tap, track, waitForTrack } from "./driver";

const MODERATOR_SECRET = process.env.MODERATOR_SECRET ?? "change-this-local-secret";
const PARTICIPANT_SESSION_KEY = "psb-participant-session-v1";

let moderatorCookie: string | null = null;

async function moderatorFetch(path: string, init: RequestInit = {}) {
  if (!moderatorCookie) {
    const auth = await fetch(`${BASE_URL}/api/moderator/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: MODERATOR_SECRET }),
    });
    if (!auth.ok) throw new Error(`Moderator login failed (${auth.status}). Is MODERATOR_SECRET the one the app runs with?`);
    const cookie = auth.headers.getSetCookie().find((value) => value.startsWith("psb_moderator="));
    if (!cookie) throw new Error("Moderator login returned no psb_moderator cookie");
    moderatorCookie = cookie.split(";")[0];
  }
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Cookie: moderatorCookie, ...init.headers },
  });
  if (!response.ok) throw new Error(`${init.method ?? "GET"} ${path} failed: ${response.status} ${await response.text()}`);
  return response.json();
}

export async function assignScenario(sessionId: string, scenarioCode: string) {
  return moderatorFetch(`/api/moderator/sessions/${sessionId}`, {
    method: "PATCH",
    body: JSON.stringify({ action: "assign_scenario", scenarioCode }),
  });
}

export async function getSnapshot(sessionId: string): Promise<SessionSnapshot> {
  const body = await moderatorFetch(`/api/moderator/sessions/${sessionId}`) as { snapshot: SessionSnapshot };
  return body.snapshot;
}

export async function deleteSession(sessionId: string) {
  await moderatorFetch(`/api/moderator/sessions/${sessionId}`, { method: "DELETE" });
}

export async function runOf(sessionId: string, taskCode: string): Promise<TaskRun | undefined> {
  return (await getSnapshot(sessionId)).taskRuns.find((run) => run.taskCode === taskCode);
}

/** Waits until the scenario run reaches a result, so assertions never race the write. */
export async function waitForRunResult(sessionId: string, taskCode: string, timeout = DEFAULT_TIMEOUT_MS) {
  const deadline = Date.now() + timeout;
  let last: TaskRun | undefined;
  while (Date.now() < deadline) {
    last = await runOf(sessionId, taskCode);
    if (last?.result) return last;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`${taskCode} never reached a result (last: ${JSON.stringify(last)})`);
}

/** Events reach the database over fetch, so wait for the tap instead of sleeping. */
export async function waitForTapTarget(sessionId: string, target: string, timeout = DEFAULT_TIMEOUT_MS) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const snapshot = await getSnapshot(sessionId);
    const event = snapshot.events.find((item) => item.type === "tap" && item.target === target);
    if (event) return event;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Tap "${target}" was never recorded for ${sessionId}`);
}

export function tapsOf(snapshot: SessionSnapshot, taskCode: string) {
  const runIds = new Set(snapshot.taskRuns.filter((run) => run.taskCode === taskCode).map((run) => run.id));
  return snapshot.events.filter((event) => event.type === "tap" && event.taskRunId && runIds.has(event.taskRunId));
}

export function verdictOf(event: TrackedEvent) {
  return event.metadata.scenarioVerdict as string | undefined;
}

/** Drops the participant gate, session and fake product state so each case starts clean. */
export async function resetBrowserState(driver: WebDriver) {
  await driver.get(BASE_URL);
  await driver.executeScript("window.sessionStorage.clear(); window.localStorage.clear();");
}

/** Walks the entry gate exactly as a participant does and returns the recorded session id. */
export async function startParticipantSession(driver: WebDriver, participantName: string) {
  await resetBrowserState(driver);
  await driver.get(BASE_URL);
  const input = await driver.wait(until.elementLocated({ css: "#participant-name" }), DEFAULT_TIMEOUT_MS);
  await input.sendKeys(participantName);
  await tap(driver, "participant.session.create");
  await driver.wait(async () => Boolean(await sessionStorageItem(driver, PARTICIPANT_SESSION_KEY)), DEFAULT_TIMEOUT_MS, "Participant session was never stored");
  const sessionId = await sessionStorageItem(driver, PARTICIPANT_SESSION_KEY);
  if (!sessionId) throw new Error("Participant session id is missing");
  return sessionId;
}

/** Assigns a scenario from the moderator side and starts it from the participant gate. */
export async function startScenario(driver: WebDriver, sessionId: string, scenarioCode: string) {
  await assignScenario(sessionId, scenarioCode);
  await driver.wait(until.elementLocated(track("participant.scenario.start")), DEFAULT_TIMEOUT_MS, "Scenario gate never offered Старт");
  await tap(driver, "participant.scenario.start");
  await waitForTrack(driver, "home.account.open");
}

export async function waitForEaseQuestion(driver: WebDriver) {
  await waitForTrack(driver, "participant.seq.score.6");
}
