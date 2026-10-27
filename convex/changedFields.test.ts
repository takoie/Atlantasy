import { describe, expect, it } from "vitest";
import { changedFields, hasChanges } from "./changedFields";

describe("changedFields", () => {
  it("returnerer bare feltene som er endret", () => {
    const existing = { a: 1, b: "x", c: undefined, extra: true };
    expect(changedFields(existing, { a: 1, b: "y", c: undefined })).toEqual({ b: "y" });
  });

  it("er tom når ingenting er endret, så skrivingen kan hoppes over", () => {
    const changes = changedFields({ a: 1, b: undefined }, { a: 1, b: undefined });
    expect(hasChanges(changes)).toBe(false);
  });

  it("regner et felt som er fjernet (undefined) som endret", () => {
    expect(changedFields({ captain: "Haaland" }, { captain: undefined })).toEqual({
      captain: undefined,
    });
  });

  it("regner et nytt felt som endret", () => {
    expect(changedFields({}, { chip: "bboost" })).toEqual({ chip: "bboost" });
  });
});
