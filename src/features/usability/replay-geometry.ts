type Rect = { left: number; top: number; width: number; height: number };

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function clamp(value: number) {
  return Math.min(1, Math.max(0, value));
}

// A tap is stored relative to its semantic target. Re-anchor it to that same
// target in the replay, so Telegram safe areas and browser chrome cannot shift it.
export function projectTrackedTap(metadata: Record<string, unknown>, target: Rect, frameOffset: { left: number; top: number }) {
  const x = finiteNumber(metadata.x);
  const y = finiteNumber(metadata.y);
  const sourceX = finiteNumber(metadata.targetX);
  const sourceY = finiteNumber(metadata.targetY);
  const sourceWidth = finiteNumber(metadata.targetWidth);
  const sourceHeight = finiteNumber(metadata.targetHeight);
  if (x === null || y === null || sourceX === null || sourceY === null || !sourceWidth || !sourceHeight || sourceWidth <= 0 || sourceHeight <= 0) return null;
  if (target.width <= 0 || target.height <= 0) return null;

  return {
    left: frameOffset.left + target.left + clamp((x - sourceX) / sourceWidth) * target.width,
    top: frameOffset.top + target.top + clamp((y - sourceY) / sourceHeight) * target.height,
  };
}

export function findReplayIndex(times: number[], playheadMs: number) {
  let low = 0;
  let high = times.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (times[middle] <= playheadMs) low = middle + 1;
    else high = middle;
  }
  return low - 1;
}
