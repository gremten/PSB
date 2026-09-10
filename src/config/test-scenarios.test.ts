import { describe, expect, it } from "vitest";
import { tasksForVariant, usabilityTasks } from "./test-scenarios";

describe("frozen usability scenario registry", () => {
  it("keeps stable task codes and ordering", () => {
    expect(usabilityTasks.map((task) => task.code)).toEqual([
      "A1", "A2", "A3", "A4", "B1", "B2", "B3", "B4", "B5",
    ]);
  });

  it("keeps scenario sets isolated by starting variant", () => {
    expect(tasksForVariant("disconnected").map((task) => task.code)).toEqual(["A1", "A2", "A3", "A4"]);
    expect(tasksForVariant("connected").map((task) => task.code)).toEqual(["B1", "B2", "B3", "B4", "B5"]);
  });

  it("keeps every task uniquely addressable with an absolute start route", () => {
    expect(new Set(usabilityTasks.map((task) => task.code)).size).toBe(usabilityTasks.length);
    expect(usabilityTasks.every((task) => task.startRoute.startsWith("/") && !task.startRoute.startsWith("//"))).toBe(true);
  });
});
