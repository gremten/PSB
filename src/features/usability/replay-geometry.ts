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

export function interpolateReplayScroll(
  events: Array<{ screen: string | null; metadata: Record<string, unknown> }>,
  times: number[],
  safeIndex: number,
  playheadMs: number,
  screen: string,
) {
  let previousIndex = -1;
  for (let index = safeIndex; index >= 0; index--) {
    if (events[index].screen && events[index].screen !== screen) break;
    if (events[index].screen === screen && finiteNumber(events[index].metadata.scrollY) !== null) {
      previousIndex = index;
      break;
    }
  }
  if (previousIndex < 0) return 0;
  const previous = finiteNumber(events[previousIndex].metadata.scrollY) ?? 0;
  let nextIndex = -1;
  for (let index = safeIndex + 1; index < events.length; index++) {
    if (events[index].screen && events[index].screen !== screen) break;
    if (events[index].screen === screen && finiteNumber(events[index].metadata.scrollY) !== null) {
      nextIndex = index;
      break;
    }
  }
  if (nextIndex < 0 || times[nextIndex] <= times[previousIndex]) return previous;
  const next = finiteNumber(events[nextIndex].metadata.scrollY) ?? previous;
  const progress = clamp((playheadMs - times[previousIndex]) / (times[nextIndex] - times[previousIndex]));
  return previous + (next - previous) * progress;
}
