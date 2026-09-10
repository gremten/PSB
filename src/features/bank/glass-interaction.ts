const BACK_PULL_LIMIT = 14;
const BACK_PULL_RANGE = 30;
const BACK_PRESS_SCALE = 1.16;
const BACK_MAX_STRETCH = 0.11;
const BACK_MAX_SQUASH = 0.025;

const TOOLBAR_PULL_LIMIT = 4;
const TOOLBAR_PULL_RANGE = 18;
const TOOLBAR_PRESS_SCALE = 1.08;
const TOOLBAR_MAX_STRETCH = 0.055;
const TOOLBAR_MAX_SQUASH = 0.018;

function rubberAxis(delta: number, limit: number, range: number) {
  if (delta === 0) return 0;
  const magnitude = limit * (1 - Math.exp(-Math.abs(delta) / range));
  return Math.sign(delta) * magnitude;
}

function liquidPull(
  deltaX: number,
  deltaY: number,
  config: {
    limit: number;
    range: number;
    pressedScale: number;
    maxStretch: number;
    maxSquash: number;
  },
) {
  const x = rubberAxis(deltaX, config.limit, config.range);
  const y = rubberAxis(deltaY, config.limit, config.range);
  const magnitude = Math.min(1, Math.hypot(x, y) / config.limit);
  const total = Math.abs(x) + Math.abs(y);
  const xWeight = total > 0 ? Math.abs(x) / total : 0;
  const yWeight = total > 0 ? Math.abs(y) / total : 0;

  return {
    x,
    y,
    scaleX: config.pressedScale + magnitude * (config.maxStretch * xWeight - config.maxSquash * yWeight),
    scaleY: config.pressedScale + magnitude * (config.maxStretch * yWeight - config.maxSquash * xWeight),
  };
}

/**
 * Telegram-like liquid-glass pull: the material blooms on touch, then follows the
 * finger with a bounded rubber-band stretch instead of sliding an optical crop.
 */
export function getElasticGlassPull(deltaX: number, deltaY: number) {
  return liquidPull(deltaX, deltaY, {
    limit: BACK_PULL_LIMIT,
    range: BACK_PULL_RANGE,
    pressedScale: BACK_PRESS_SCALE,
    maxStretch: BACK_MAX_STRETCH,
    maxSquash: BACK_MAX_SQUASH,
  });
}

/** Smaller Telegram-like deformation used by the compact two-icon home toolbar. */
export function getToolbarGlassPull(deltaX: number, deltaY: number) {
  return liquidPull(deltaX, deltaY, {
    limit: TOOLBAR_PULL_LIMIT,
    range: TOOLBAR_PULL_RANGE,
    pressedScale: TOOLBAR_PRESS_SCALE,
    maxStretch: TOOLBAR_MAX_STRETCH,
    maxSquash: TOOLBAR_MAX_SQUASH,
  });
}
