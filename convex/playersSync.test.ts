/// <reference types="vite/client" />
// @vitest-environment edge-runtime
import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { selectMovers, toMover, toPlayerRow } from "./playerMath";

const modules = import.meta.glob("./**/*.ts");

const element = (id: number, over: Record<string, unknown> = {}) => ({
  id,
  web_name: `P${id}`,
  first_name: "Fornavn",
  second_name: `Etternavn${id}`,
  team: 1,
  element_type: 3,
  now_cost: 60,
  cost_change_start: 0,
  cost_change_event: 0,
  selected_by_percent: "5.0",
  transfers_in_event: 1000,
  transfers_out_event: 500,
  total_points: 30,
  event_points: 2,
  form: "3.0",
  points_per_game: "3.0",
  ep_next: "3.0",
  minutes: 400,
  starts: 5,
  goals_scored: 1,
  assists: 1,
  clean_sheets: 0,
  bonus: 2,
  expected_goals: "1.0",
  expected_assists: "1.0",
  expected_goal_involvements: "2.0",
  expected_goals_conceded: "4.0",
  expected_goals_per_90: "0.2",
  expected_assists_per_90: "0.2",
  expected_goal_involvements_per_90: "0.4",
  expected_goals_conceded_per_90: "0.9",
  ict_index: "20.0",
  defensive_contribution: 3,
  defensive_contribution_per_90: "0.7",
  status: "a",
  news: "",
  chance_of_playing_next_round: null,
  price_change_percent: "10.0",
  price_change_projections: [{ offset: 0, projected_percent: "10.0", likelihood: 1 }],
  ...over,
});

const rowsOf = (els: ReturnType<typeof element>[]) => els.map(toPlayerRow);

describe("spillersynk – bare stabile felt skrives til fpl_players", () => {
  it("skriver ingen rader når bare overføringstall og prisprognoser endrer seg", async () => {
    const t = convexTest(schema, modules);
    const first = [element(1), element(2), element(3)];
    await t.mutation(internal.players.upsertPlayers, { rows: rowsOf(first), at: 1 });
    const before = await t.run((ctx) => ctx.db.query("fpl_players").collect());

    const churned = first.map((e) =>
      element(e.id, {
        transfers_in_event: 9999,
        transfers_out_event: 8888,
        price_change_percent: "77.7",
        price_change_projections: [{ offset: 0, projected_percent: "77.7", likelihood: 4 }],
      })
    );
    const result = await t.mutation(internal.players.upsertPlayers, {
      rows: rowsOf(churned),
      at: 2,
    });

    expect(result).toMatchObject({ inserted: 0, updated: 0 });
    expect(await t.run((ctx) => ctx.db.query("fpl_players").collect())).toEqual(before);
  });

  it("skriver bare spilleren som faktisk har endret seg i kamper", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.players.upsertPlayers, {
      rows: rowsOf([element(1), element(2)]),
      at: 1,
    });
    const result = await t.mutation(internal.players.upsertPlayers, {
      rows: rowsOf([element(1, { goals_scored: 2, total_points: 36 }), element(2)]),
      at: 2,
    });
    expect(result).toMatchObject({ inserted: 0, updated: 1 });
  });

  it("rydder bort gamle flyktige felt på en rad skrevet før flyttingen, én gang", async () => {
    const t = convexTest(schema, modules);
    await t.run((ctx) =>
      ctx.db.insert("fpl_players", {
        ...toPlayerRow(element(1)),
        transfersInEvent: 1000,
        transfersOutEvent: 500,
        priceChangePercent: 10,
        priceProjections: [{ offset: 0, percent: 10, likelihood: 1 }],
      })
    );

    const run1 = await t.mutation(internal.players.upsertPlayers, { rows: rowsOf([element(1)]), at: 1 });
    expect(run1.updated).toBe(1);
    const [row] = await t.run((ctx) => ctx.db.query("fpl_players").collect());
    expect("transfersInEvent" in row).toBe(false);
    expect("priceProjections" in row).toBe(false);

    const run2 = await t.mutation(internal.players.upsertPlayers, { rows: rowsOf([element(1)]), at: 2 });
    expect(run2.updated).toBe(0);
  });
});

describe("pris- og overføringsdata", () => {
  it("lagres i ett lite dokument som erstattes, ikke i spillerradene", async () => {
    const t = convexTest(schema, modules);
    const all = Array.from({ length: 200 }, (_, i) =>
      element(i + 1, { transfers_in_event: i * 10 })
    );
    const movers = selectMovers(all.map(toMover));
    expect(movers.length).toBeLessThan(40);

    await t.mutation(internal.players.saveMovers, { at: 1, players: movers });
    await t.mutation(internal.players.saveMovers, { at: 2, players: movers });

    const docs = await t.run((ctx) => ctx.db.query("fpl_price_movers").collect());
    expect(docs).toHaveLength(1);
    expect(docs[0].at).toBe(2);

    const listed = await t.query(api.players.listPriceMovers, {});
    expect(listed.players.length).toBe(movers.length);
  });
});
