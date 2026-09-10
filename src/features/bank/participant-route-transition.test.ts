import { describe, expect, it } from "vitest";
import { getParticipantRouteDirection } from "./participant-route-transition";

describe("getParticipantRouteDirection", () => {
  it("treats home to account and account to card as forward pushes", () => {
    expect(getParticipantRouteDirection("/", "/account")).toBe("forward");
    expect(getParticipantRouteDirection("/account", "/card")).toBe("forward");
  });

  it("treats detail routes returning toward home as back pops", () => {
    expect(getParticipantRouteDirection("/card", "/account")).toBe("back");
    expect(getParticipantRouteDirection("/account", "/")).toBe("back");
  });

  it("does not slide between routes at the same navigation depth", () => {
    expect(getParticipantRouteDirection("/account", "/cashback")).toBeNull();
    expect(getParticipantRouteDirection("/", "/")).toBeNull();
  });

  it("lets the shared navigation.back control force a back transition", () => {
    expect(getParticipantRouteDirection("/card", "/", true)).toBe("back");
  });
});
