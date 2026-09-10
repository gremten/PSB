const PULL_LIMIT = 6;
const PULL_RANGE = 24;
const PRESSED_SCALE = 0.975;
const MAX_STRETCH = 0.02;
const MAX_SQUASH = 0.01;

function rubberAxis(delta: number) {
  if (delta === 0) return 0;
  const magnitude = PULL_LIMIT * (1 - Math.exp(-Math.abs(delta) / PULL_RANGE));
  return Math.sign(delta) * magnitude;
}

export function getElasticGlassPull(deltaX: number, deltaY: number) {
  const x = rubberAxis(deltaX);
  const y = rubberAxis(deltaY);
  const magnitude = Math.min(1, Math.hypot(x, y) / PULL_LIMIT);
  const total = Math.abs(x) + Math.abs(y);
  const xWeight = total > 0 ? Math.abs(x) / total : 0;
  const yWeight = total > 0 ? Math.abs(y) / total : 0;

  return {
    x,
    y,
    scaleX: PRESSED_SCALE + magnitude * (MAX_STRETCH * xWeight - MAX_SQUASH * yWeight),
    scaleY: PRESSED_SCALE + magnitude * (MAX_STRETCH * yWeight - MAX_SQUASH * xWeight),
  };
}
