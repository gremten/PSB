"use client";

import { useEffect } from "react";

const HEADER_COLOR = "#161A20";
const PAGE_COLOR = "#0A0C0F";
const BOTTOM_BAR_COLOR = "#242A33";
// Some Telegram iOS builds report an inset that covers the status bar but not
// the floating Close/menu controls. The fallback is based on their measured
// lower edge; product content then keeps the requested 16px breathing room.
const FULLSCREEN_TOP_CONTROLS_FALLBACK = 76;
const FULLSCREEN_CONTENT_GAP = 16;
const MOBILE_TELEGRAM_PLATFORMS = new Set(["android", "android_x", "ios"]);

function setInset(name: string, value: number | undefined) {
  document.documentElement.style.setProperty(name, `${Math.max(0, value ?? 0)}px`);
}

export function TelegramMiniAppBridge() {
  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    if (!webApp || (!webApp.initData && webApp.platform === "unknown")) return;

    const root = document.documentElement;
    const shouldUseFullscreen = MOBILE_TELEGRAM_PLATFORMS.has(webApp.platform);
    root.dataset.telegramMiniApp = "true";

    const syncViewport = () => {
      const safeArea = webApp.safeAreaInset;
      const contentSafeArea = webApp.contentSafeAreaInset;
      const systemTop = safeArea?.top ?? 0;
      const reportedContentTop = contentSafeArea?.top ?? 0;
      const controlsBottom = webApp.isFullscreen
        ? Math.max(systemTop, reportedContentTop, FULLSCREEN_TOP_CONTROLS_FALLBACK)
        : Math.max(systemTop, reportedContentTop);
      const top = controlsBottom + (webApp.isFullscreen ? FULLSCREEN_CONTENT_GAP : 0);
      const right = Math.max(safeArea?.right ?? 0, contentSafeArea?.right ?? 0);
      const bottom = Math.max(safeArea?.bottom ?? 0, contentSafeArea?.bottom ?? 0);
      const left = Math.max(safeArea?.left ?? 0, contentSafeArea?.left ?? 0);

      root.dataset.telegramFullscreen = String(Boolean(webApp.isFullscreen));
      setInset("--app-tg-system-safe-top", systemTop);
      setInset("--app-tg-controls-bottom", controlsBottom);
      setInset("--app-tg-safe-top", top);
      setInset("--app-tg-safe-right", right);
      setInset("--app-tg-safe-bottom", bottom);
      setInset("--app-tg-safe-left", left);
      root.style.setProperty("--app-tg-viewport-height", `${webApp.viewportStableHeight || window.innerHeight}px`);
    };

    webApp.setHeaderColor(HEADER_COLOR);
    webApp.setBackgroundColor(PAGE_COLOR);
    if (webApp.isVersionAtLeast("7.10")) webApp.setBottomBarColor?.(BOTTOM_BAR_COLOR);
    if (webApp.isVersionAtLeast("7.7")) webApp.disableVerticalSwipes?.();

    webApp.onEvent("viewportChanged", syncViewport);
    webApp.onEvent("safeAreaChanged", syncViewport);
    webApp.onEvent("contentSafeAreaChanged", syncViewport);
    webApp.onEvent("fullscreenChanged", syncViewport);

    syncViewport();
    webApp.ready();
    webApp.expand();

    if (webApp.isVersionAtLeast("8.0") && shouldUseFullscreen && !webApp.isFullscreen) {
      try {
        webApp.requestFullscreen?.();
      } catch {
        // expand() above remains the compatible fallback for older clients.
      }
    } else if (webApp.isVersionAtLeast("8.0") && !shouldUseFullscreen && webApp.isFullscreen) {
      webApp.exitFullscreen?.();
    }

    return () => {
      webApp.offEvent("viewportChanged", syncViewport);
      webApp.offEvent("safeAreaChanged", syncViewport);
      webApp.offEvent("contentSafeAreaChanged", syncViewport);
      webApp.offEvent("fullscreenChanged", syncViewport);
      if (webApp.isVersionAtLeast("7.7")) webApp.enableVerticalSwipes?.();
      delete root.dataset.telegramMiniApp;
      delete root.dataset.telegramFullscreen;
      root.style.removeProperty("--app-tg-viewport-height");
      root.style.removeProperty("--app-tg-system-safe-top");
      root.style.removeProperty("--app-tg-controls-bottom");
      root.style.removeProperty("--app-tg-safe-top");
      root.style.removeProperty("--app-tg-safe-right");
      root.style.removeProperty("--app-tg-safe-bottom");
      root.style.removeProperty("--app-tg-safe-left");
    };
  }, []);

  return null;
}
