import { describe, expect, it } from "vitest";
import { getElasticGlassPull, getToolbarGlassPull } from "./glass-interaction";

describe("getElasticGlassPull", () => {
  it("blooms the glass material on hold like Telegram instead of shrinking it", () => {
    expect(getElasticGlassPull(0, 0)).toEqual({ x: 0, y: 0, scaleX: 1.16, scaleY: 1.16 });
  });

  it("rubber-bands the whole lens and stretches it along the pull direction", () => {
    const pull = getElasticGlassPull(80, 0);
    expect(Math.abs(pull.x)).toBeLessThanOrEqual(14);
    expect(pull.y).toBe(0);
    expect(pull.scaleX).toBeGreaterThan(pull.scaleY);
    expect(pull.scaleX).toBeLessThanOrEqual(1.27);
  });
});

describe("getToolbarGlassPull", () => {
  it("uses a smaller liquid press response for the compact toolbar", () => {
    const pull = getToolbarGlassPull(40, 0);
    expect(Math.abs(pull.x)).toBeLessThanOrEqual(4);
    expect(pull.scaleX).toBeGreaterThan(1.08);
    expect(pull.scaleY).toBeLessThan(pull.scaleX);
  });
});
