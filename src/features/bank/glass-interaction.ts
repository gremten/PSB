const PULL_LIMIT = 7;
const PULL_RANGE = 24;
const CENTER_RANGE = 0.16;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function rubberAxis(delta: number) {
  if (delta === 0) return 0;
  const magnitude = PULL_LIMIT * (1 - Math.exp(-Math.abs(delta) / PULL_RANGE));
  return Math.sign(delta) * magnitude;
}

export function getElasticGlassPull(deltaX: number, deltaY: number, width: number, height: number) {
  const x = rubberAxis(deltaX);
  const y = rubberAxis(deltaY);
  const safeWidth = Math.max(width, 1);
  const safeHeight = Math.max(height, 1);

  return {
    x,
    y,
    centerX: clamp(0.5 + deltaX / (safeWidth * 2.5), 0.5 - CENTER_RANGE, 0.5 + CENTER_RANGE),
    centerY: clamp(0.5 + deltaY / (safeHeight * 2.5), 0.5 - CENTER_RANGE, 0.5 + CENTER_RANGE),
  };
}
