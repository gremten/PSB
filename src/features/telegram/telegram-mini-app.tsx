"use client";

import { useEffect } from "react";

const HEADER_COLOR = "#161A20";
const PAGE_COLOR = "#0A0C0F";
const BOTTOM_BAR_COLOR = "#242A33";
// Some Telegram iOS builds report an inset that covers the status bar but not
// the floating Close/menu controls. Keep the profile row below those controls.
const FULLSCREEN_TOP_CONTROLS_GUARD = 88;
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
      const top = Math.max(
        safeArea?.top ?? 0,
        contentSafeArea?.top ?? 0,
        webApp.isFullscreen ? FULLSCREEN_TOP_CONTROLS_GUARD : 0,
      );
      const right = Math.max(safeArea?.right ?? 0, contentSafeArea?.right ?? 0);
      const bottom = Math.max(safeArea?.bottom ?? 0, contentSafeArea?.bottom ?? 0);
      const left = Math.max(safeArea?.left ?? 0, contentSafeArea?.left ?? 0);

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
      root.style.removeProperty("--app-tg-viewport-height");
      root.style.removeProperty("--app-tg-safe-top");
      root.style.removeProperty("--app-tg-safe-right");
      root.style.removeProperty("--app-tg-safe-bottom");
      root.style.removeProperty("--app-tg-safe-left");
    };
  }, []);

  return null;
}
