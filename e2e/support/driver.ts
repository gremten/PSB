import { Builder, By, until, type WebDriver, type WebElement } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome.js";

export const BASE_URL = process.env.PSB_E2E_BASE_URL ?? "http://localhost:3000";
export const PARTICIPANT_VIEWPORT = { width: 440, height: 980 };
export const DEFAULT_TIMEOUT_MS = 15_000;

export async function createDriver(viewport = PARTICIPANT_VIEWPORT) {
  const options = new chrome.Options();
  // PSB_E2E_HEADED=1 shows the browser while debugging a failing case.
  if (process.env.PSB_E2E_HEADED !== "1") options.addArguments("--headless=new");
  options.addArguments("--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--disable-search-engine-choice-screen");
  options.addArguments(`--window-size=${viewport.width},${viewport.height}`);
  const driver = await new Builder().forBrowser("chrome").setChromeOptions(options).build();
  await driver.manage().setTimeouts({ implicit: 0, pageLoad: 60_000, script: 30_000 });
  await driver.manage().window().setRect({ width: viewport.width, height: viewport.height });
  return driver;
}

export function track(trackId: string) {
  return By.css(`[data-track="${trackId}"]`);
}

export async function waitForTrack(driver: WebDriver, trackId: string, timeout = DEFAULT_TIMEOUT_MS) {
  return driver.wait(until.elementLocated(track(trackId)), timeout, `Control "${trackId}" never appeared`);
}

/** Taps a semantic control the way a participant would, so the global tracker sees the click. */
export async function tap(driver: WebDriver, trackId: string, timeout = DEFAULT_TIMEOUT_MS) {
  const element = await waitForTrack(driver, trackId, timeout);
  await driver.executeScript("arguments[0].scrollIntoView({ block: 'center' })", element);
  try {
    await element.click();
  } catch {
    // Flip faces and sheets overlap by design; a dispatched click still reaches React and the tracker.
    await driver.executeScript("arguments[0].click()", element);
  }
  return element;
}

/** The tabbar is shared by every route, so navigation must be awaited by URL, not by control. */
export async function waitForRoute(driver: WebDriver, path: string, timeout = DEFAULT_TIMEOUT_MS) {
  await driver.wait(async () => new URL(await driver.getCurrentUrl()).pathname === path, timeout, `Never navigated to ${path}`);
}

export async function isPresent(driver: WebDriver, trackId: string) {
  return (await driver.findElements(track(trackId))).length > 0;
}

export async function textOf(element: WebElement) {
  return (await element.getText()).trim();
}

export async function sessionStorageItem(driver: WebDriver, key: string) {
  return driver.executeScript<string | null>("return window.sessionStorage.getItem(arguments[0])", key);
}

export async function consoleErrors(driver: WebDriver) {
  const logs = await driver.manage().logs().get("browser");
  return logs.filter((entry) => entry.level.name === "SEVERE").map((entry) => entry.message);
}
