import { describe, expect, it } from "vitest";
import { findReplayIndex, projectTrackedTap } from "./replay-geometry";

describe("moderator action replay", () => {
  it("anchors a tap to its target despite a changed Telegram top inset", () => {
    expect(projectTrackedTap(
      { x: 150, y: 260, targetX: 100, targetY: 240, targetWidth: 100, targetHeight: 40 },
      { left: 120, top: 90, width: 80, height: 32 },
      { left: 1, top: 1 },
    )).toEqual({ left: 161, top: 107 });
  });

  it("does not invent a marker when old event geometry is absent", () => {
    expect(projectTrackedTap({ x: 150, y: 260 }, { left: 0, top: 0, width: 100, height: 40 }, { left: 0, top: 0 })).toBeNull();
  });

  it("finds the event at a continuous playback time", () => {
    const times = [0, 250, 1000, 3000];
    expect(findReplayIndex(times, 999)).toBe(1);
    expect(findReplayIndex(times, 1000)).toBe(2);
    expect(findReplayIndex(times, 4000)).toBe(3);
  });
});
