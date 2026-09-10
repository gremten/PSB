import { describe, expect, it } from "vitest";
import { getElasticGlassPull } from "./glass-interaction";

describe("getElasticGlassPull", () => {
  it("uses the shared pressed scale at the grab point", () => {
    expect(getElasticGlassPull(0, 0)).toEqual({ x: 0, y: 0, scaleX: 0.975, scaleY: 0.975 });
  });

  it("follows the pointer without moving the optical crop inside the lens", () => {
    const pull = getElasticGlassPull(80, 0);
    expect(Math.abs(pull.x)).toBeLessThanOrEqual(6);
    expect(pull.y).toBe(0);
    expect(pull.scaleX).toBeGreaterThan(pull.scaleY);
    expect(pull.scaleX).toBeLessThanOrEqual(0.995);
  });
});
