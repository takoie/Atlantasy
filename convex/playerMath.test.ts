import { describe, expect, it } from "vitest";
import {
  detectPriceChange,
  formatPrice,
  num,
  overUnder,
  pointsPerMillion,
  priceDirection,
  rowChanged,
  toPlayerRow,
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
    expect(row.priceProjections[1]).toEqual({ offset: 1, percent: 58.3, likelihood: 3 });
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

  it("oppdager endret prisprognose og at et valgfritt felt forsvinner", () => {
    const a = toPlayerRow({ ...element, chance_of_playing_next_round: 50 });
    expect(rowChanged(a, toPlayerRow({ ...element, chance_of_playing_next_round: null }))).toBe(true);
    const b = toPlayerRow(element);
    const changed = {
      ...element,
      price_change_projections: [{ offset: 0, projected_percent: "40.0", likelihood: 3 }],
    };
    expect(rowChanged(b, toPlayerRow(changed))).toBe(true);
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
