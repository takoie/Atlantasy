import { describe, expect, it } from "vitest";
import { displayedPoints, resolveSquad, type RawPick } from "./squadMath";

const pick = (element: number, position: number, over: Partial<RawPick> = {}): RawPick => ({
  element,
  position,
  multiplier: position <= 11 ? 1 : 0,
  is_captain: false,
  is_vice_captain: false,
  ...over,
});

/** 15 spillere der element-id = posisjon, kaptein = 9, visekaptein = 10. */
const squad = (captainMult = 2, bench = 0): RawPick[] =>
  Array.from({ length: 15 }, (_, i) => {
    const pos = i + 1;
    return pick(pos, pos, {
      multiplier: pos === 9 ? captainMult : pos === 10 ? 1 : pos <= 11 ? 1 : bench,
      is_captain: pos === 9,
      is_vice_captain: pos === 10,
    });
  });

const alwaysPlayed = { minutesOf: () => 90, fixturesDone: () => true };
const find = (r: ReturnType<typeof resolveSquad>, el: number) => r.find((p) => p.element === el)!;

describe("resolveSquad – kaptein og Triple Captain", () => {
  it("gir kapteinen 2×", () => {
    const r = resolveSquad({ picks: squad(2), automaticSubs: [], ...alwaysPlayed });
    expect(find(r, 9).multiplier).toBe(2);
    expect(find(r, 10).multiplier).toBe(1);
  });

  it("gir kapteinen 3× med Triple Captain", () => {
    const r = resolveSquad({ picks: squad(3), automaticSubs: [], ...alwaysPlayed });
    expect(find(r, 9).multiplier).toBe(3);
  });

  it("teller ikke benken uten Bench Boost, men gjør det med", () => {
    expect(find(resolveSquad({ picks: squad(2, 0), automaticSubs: [], ...alwaysPlayed }), 13).multiplier).toBe(0);
    expect(find(resolveSquad({ picks: squad(2, 1), automaticSubs: [], ...alwaysPlayed }), 13).multiplier).toBe(1);
  });
});

describe("resolveSquad – visekaptein", () => {
  const captainAbsent = {
    minutesOf: (el: number) => (el === 9 ? 0 : 90),
    fixturesDone: () => true,
  };

  it("overtar kapteinens multiplikator når kapteinen ikke spilte", () => {
    const r = resolveSquad({ picks: squad(2), automaticSubs: [], ...captainAbsent });
    expect(find(r, 10)).toMatchObject({ multiplier: 2, viceActivated: true });
    expect(find(r, 9)).toMatchObject({ multiplier: 1, captainOut: true });
  });

  it("overtar med Triple Captain-multiplikatoren", () => {
    const r = resolveSquad({ picks: squad(3), automaticSubs: [], ...captainAbsent });
    expect(find(r, 10).multiplier).toBe(3);
  });

  it("venter hvis kapteinens kamp ikke er ferdig", () => {
    const r = resolveSquad({
      picks: squad(2),
      automaticSubs: [],
      minutesOf: (el) => (el === 9 ? 0 : 90),
      fixturesDone: () => false,
    });
    expect(find(r, 10).multiplier).toBe(1);
    expect(find(r, 9).multiplier).toBe(2);
    expect(find(r, 10).viceActivated).toBeUndefined();
  });

  it("lar FPLs allerede flyttede armbind stå (kaptein 1×, visekaptein 2×)", () => {
    const picks = squad(2).map((p) =>
      p.element === 9 ? { ...p, multiplier: 1 } : p.element === 10 ? { ...p, multiplier: 2 } : p
    );
    const r = resolveSquad({ picks, automaticSubs: [], ...captainAbsent });
    expect(find(r, 10)).toMatchObject({ multiplier: 2, viceActivated: true });
    expect(find(r, 9)).toMatchObject({ multiplier: 1, captainOut: true });
  });

  it("overtar ikke hvis visekapteinen selv står på benken", () => {
    const picks = squad(2).map((p) => (p.element === 10 ? { ...p, position: 13, multiplier: 0 } : p.element === 13 ? { ...p, position: 10, multiplier: 1 } : p));
    const r = resolveSquad({ picks, automaticSubs: [], ...captainAbsent });
    expect(find(r, 10).multiplier).toBe(0);
    expect(find(r, 10).viceActivated).toBeUndefined();
  });
});

describe("resolveSquad – automatiske bytter", () => {
  it("flytter spillerne og setter multiplikator 1/0", () => {
    const r = resolveSquad({
      picks: squad(2),
      automaticSubs: [{ element_in: 13, element_out: 4 }],
      ...alwaysPlayed,
    });
    expect(find(r, 13)).toMatchObject({ onPitch: true, position: 4, multiplier: 1, autoSub: "in" });
    expect(find(r, 4)).toMatchObject({ onPitch: false, position: 13, multiplier: 0, autoSub: "out" });
    expect(r.filter((p) => p.onPitch)).toHaveLength(11);
  });

  it("bytter ikke plass på nytt når FPL allerede har gjort det i picks", () => {
    const picks = squad(2).map((p) =>
      p.element === 13 ? { ...p, position: 4, multiplier: 1 } : p.element === 4 ? { ...p, position: 13, multiplier: 0 } : p
    );
    const r = resolveSquad({ picks, automaticSubs: [{ element_in: 13, element_out: 4 }], ...alwaysPlayed });
    expect(find(r, 13)).toMatchObject({ onPitch: true, position: 4, multiplier: 1, autoSub: "in" });
    expect(find(r, 4)).toMatchObject({ onPitch: false, position: 13, multiplier: 0, autoSub: "out" });
  });

  it("returnerer spillerne sortert på ny plassering", () => {
    const r = resolveSquad({
      picks: squad(2),
      automaticSubs: [{ element_in: 12, element_out: 2 }],
      ...alwaysPlayed,
    });
    expect(r.map((p) => p.position)).toEqual(Array.from({ length: 15 }, (_, i) => i + 1));
  });
});

describe("displayedPoints", () => {
  it("ganger med multiplikatoren", () => {
    expect(displayedPoints(9, 2)).toBe(18);
    expect(displayedPoints(9, 3)).toBe(27);
  });
  it("viser råpoeng for spillere som ikke teller", () => {
    expect(displayedPoints(5, 0)).toBe(5);
  });
});
