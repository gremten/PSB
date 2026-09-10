import { describe, expect, it } from "vitest";
import { getElasticGlassPull } from "./glass-interaction";

describe("getElasticGlassPull", () => {
  it("rests in the optical centre", () => {
    expect(getElasticGlassPull(0, 0, 44, 44)).toEqual({ x: 0, y: 0, centerX: 0.5, centerY: 0.5 });
  });

  it("follows the pointer proportionally without leaving the gel range", () => {
    const small = getElasticGlassPull(4, -4, 44, 44);
    const large = getElasticGlassPull(80, -80, 44, 44);

    expect(small.x).toBeGreaterThan(0);
    expect(small.y).toBeLessThan(0);
    expect(Math.abs(large.x)).toBeLessThanOrEqual(7);
    expect(Math.abs(large.y)).toBeLessThanOrEqual(7);
    expect(large.centerX).toBe(0.66);
    expect(large.centerY).toBe(0.34);
  });
});
