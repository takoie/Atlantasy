import { describe, expect, it } from "vitest";
import {
  detectPriceChange,
  formatPrice,
  num,
  overUnder,
  pointsPerMillion,
  priceDirection,
  rowChanged,
  selectMovers,
  toMover,
  toPlayerRow,
  type Mover,
} from "./playerMath";

const element = {
  id: 355,
  web_name: "Haaland",
  first_name: "Erling",
  second_name: "Haaland",
  team: 13,
  element_type: 4,
  now_cost: 157,
  cost_change_start: 2,
  cost_change_event: 0,
  selected_by_percent: "76.7",
  transfers_in_event: 42957,
  transfers_out_event: 2195,
  total_points: 58,
  event_points: 9,
  form: "8.3",
  points_per_game: "8.3",
  ep_next: "8.3",
  minutes: 619,
  starts: 7,
  goals_scored: 7,
  assists: 1,
  clean_sheets: 2,
  bonus: 10,
  expected_goals: "5.67",
  expected_assists: "0.91",
  expected_goal_involvements: "6.58",
  expected_goals_conceded: "9.78",
  expected_goals_per_90: 0.82,
  expected_assists_per_90: 0.13,
  expected_goal_involvements_per_90: 0.96,
  expected_goals_conceded_per_90: 1.4,
  ict_index: "52.5",
  defensive_contribution: 27,
  defensive_contribution_per_90: 3.9,
  status: "a",
  news: "",
  chance_of_playing_next_round: null,
  price_change_percent: "28.5",
  price_change_projections: [
    { offset: 0, projected_percent: "32.7", likelihood: 2 },
    { offset: 1, projected_percent: "58.3", likelihood: 3 },
  ],
};

describe("num", () => {
  it("parser strenger, tall og ugyldige verdier", () => {
    expect(num("5.67")).toBe(5.67);
    expect(num(3)).toBe(3);
    expect(num(null)).toBe(0);
    expect(num(undefined)).toBe(0);
    expect(num("abc")).toBe(0);
    expect(num(NaN)).toBe(0);
  });
});

describe("toPlayerRow", () => {
  it("mapper en FPL-element til en rad", () => {
    const row = toPlayerRow(element);
    expect(row.elementId).toBe(355);
    expect(row.fullName).toBe("Erling Haaland");
    expect(row.xgi).toBe(6.58);
    expect(row.selectedBy).toBe(76.7);
    expect("priceProjections" in row).toBe(false);
    expect("transfersInEvent" in row).toBe(false);
  });

  it("utelater chanceNextRound når FPL sender null", () => {
    expect("chanceNextRound" in toPlayerRow(element)).toBe(false);
    expect(toPlayerRow({ ...element, chance_of_playing_next_round: 75 }).chanceNextRound).toBe(75);
  });
});

describe("rowChanged", () => {
  it("er usann for identiske rader og sann ved endring", () => {
    const a = toPlayerRow(element);
    expect(rowChanged(a, toPlayerRow(element))).toBe(false);
    expect(rowChanged(a, toPlayerRow({ ...element, expected_goals: "5.80" }))).toBe(true);
  });

  it("oppdager at et valgfritt felt forsvinner", () => {
    const a = toPlayerRow({ ...element, chance_of_playing_next_round: 50 });
    expect(rowChanged(a, toPlayerRow({ ...element, chance_of_playing_next_round: null }))).toBe(true);
  });

  it("ignorerer overføringstellere og prisprognoser, som ikke lagres i raden", () => {
    const a = toPlayerRow(element);
    const churned = {
      ...element,
      transfers_in_event: element.transfers_in_event + 5000,
      price_change_projections: [{ offset: 0, projected_percent: "40.0", likelihood: 3 }],
    };
    expect(rowChanged(a, toPlayerRow(churned))).toBe(false);
  });

  it("regner en lagret rad med gamle flyktige felt som endret, så de ryddes bort én gang", () => {
    const legacy = { ...toPlayerRow(element), transfersInEvent: 1, priceProjections: [] };
    expect(rowChanged(legacy as any, toPlayerRow(element))).toBe(true);
  });
});

describe("detectPriceChange", () => {
  it("returnerer null uten endring og delta ved endring", () => {
    expect(detectPriceChange(157, 157)).toBeNull();
    expect(detectPriceChange(157, 158)).toEqual({ oldCost: 157, newCost: 158, delta: 1 });
    expect(detectPriceChange(60, 59)?.delta).toBe(-1);
  });
});

describe("overUnder", () => {
  it("er positiv ved overprestasjon og negativ ved uflaks", () => {
    expect(overUnder({ goals: 7, assists: 1, xgi: 6.58 })).toBe(1.42);
    expect(overUnder({ goals: 1, assists: 0, xgi: 3.5 })).toBe(-2.5);
  });
});

describe("pointsPerMillion", () => {
  it("regner poeng per million og håndterer pris 0", () => {
    expect(pointsPerMillion(58, 157)).toBe(3.7);
    expect(pointsPerMillion(10, 0)).toBe(0);
  });
});

describe("priceDirection", () => {
  const make = (likelihood: number) => ({
    priceChangePercent: 0,
    priceProjections: [{ offset: 0, percent: 0, likelihood }],
  });
  it("tolker likelihood-skalaen", () => {
    expect(priceDirection(make(5))).toBe("rise");
    expect(priceDirection(make(3))).toBe("rise");
    expect(priceDirection(make(2))).toBeNull();
    expect(priceDirection(make(-4))).toBe("fall");
    expect(priceDirection({ priceChangePercent: 0, priceProjections: [] })).toBeNull();
  });
});

describe("formatPrice", () => {
  it("viser tidels millioner som £m", () => {
    expect(formatPrice(157)).toBe("£15.7m");
    expect(formatPrice(40)).toBe("£4.0m");
  });
});

describe("toMover / selectMovers", () => {
  const mover = (id: number, over: Partial<Mover> = {}): Mover => ({
    elementId: id,
    webName: `P${id}`,
    clubId: 1,
    position: 3,
    cost: 60,
    transfersInEvent: 0,
    transfersOutEvent: 0,
    priceChangePercent: 0,
    priceProjections: [{ offset: 0, percent: 0, likelihood: 0 }],
    ...over,
  });

  it("mapper flyktige felt fra FPL", () => {
    const m = toMover(element);
    expect(m.transfersInEvent).toBe(42957);
    expect(m.priceProjections[1]).toEqual({ offset: 1, percent: 58.3, likelihood: 3 });
  });

  it("beholder bare stigere, fallere og de mest overførte", () => {
    const all = Array.from({ length: 300 }, (_, i) => mover(i + 1));
    all[10] = mover(11, { priceProjections: [{ offset: 0, percent: 90, likelihood: 5 }] });
    all[20] = mover(21, { priceProjections: [{ offset: 0, percent: -90, likelihood: -4 }] });
    all[30] = mover(31, { transfersInEvent: 90_000 });
    all[40] = mover(41, { transfersOutEvent: 80_000 });

    const ids = selectMovers(all).map((m) => m.elementId);
    expect(ids).toEqual(expect.arrayContaining([11, 21, 31, 41]));
    expect(ids.length).toBeLessThan(40);
  });

  it("returnerer hver spiller bare én gang, sortert på id", () => {
    const all = [mover(5, { transfersInEvent: 9, transfersOutEvent: 9 }), mover(2)];
    expect(selectMovers(all).map((m) => m.elementId)).toEqual([2, 5]);
  });
});
