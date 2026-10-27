/// <reference types="vite/client" />
// @vitest-environment edge-runtime
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const HOUR = 60 * 60 * 1000;

const team = (entryId: number, over: Record<string, unknown> = {}) => ({
  entryId,
  teamName: `Lag ${entryId}`,
  managerName: `Manager ${entryId}`,
  totalPoints: 400,
  currentGwPoints: 50,
  currentGwTransfersCost: 0,
  captainName: "Haaland",
  captainPoints: 10,
  benchPoints: 2,
  benchedPlayer: "Wissa",
  totalHitsCost: 4,
  perGwHistory: [1, 2, 3, 4, 5, 6, 7].map((gw) => ({
    gw,
    points: 50,
    transfersCost: 0,
    benchPoints: 1,
  })),
  ...over,
});

const payload = (gw: number, teams: ReturnType<typeof team>[]) => ({
  currentGameweek: gw,
  gwMonth: Object.fromEntries(Array.from({ length: 38 }, (_, i) => [String(i + 1), "2026-10"])),
  monthRanges: [],
  teamsData: teams,
});

async function setup() {
  const t = convexTest(schema, modules);
  const roomId = await t.run((ctx) =>
    ctx.db.insert("rooms", { roomNumber: 1, name: "A1", createdAt: 1 })
  );
  return { t, roomId };
}

const snapshot = (t: Awaited<ReturnType<typeof setup>>["t"]) =>
  t.run(async (ctx) => ({
    teams: await ctx.db.query("fpl_teams").collect(),
    scores: await ctx.db.query("gameweek_scores").collect(),
    roomScores: await ctx.db.query("room_gameweek_scores").collect(),
  }));

describe("saveLiveFplSyncResult – skriver bare det som er endret", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-27T08:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("rører ingen rader når en ny synk gir identiske data", async () => {
    const { t, roomId } = await setup();
    await t.mutation(internal.fpl.saveLiveFplSyncResult, payload(8, [team(1), team(2)]));
    await t.run(async (ctx) => {
      for (const tm of await ctx.db.query("fpl_teams").collect()) {
        await ctx.db.patch(tm._id, { roomId });
      }
    });
    await t.mutation(internal.fpl.saveLiveFplSyncResult, payload(8, [team(1), team(2)]));
    const before = await snapshot(t);
    expect(before.roomScores.length).toBeGreaterThan(0);

    vi.setSystemTime(Date.now() + 3 * HOUR);
    await t.mutation(internal.fpl.saveLiveFplSyncResult, payload(8, [team(1), team(2)]));

    expect(await snapshot(t)).toEqual(before);
  });

  it("oppdaterer bare laget og radene som faktisk er endret", async () => {
    const { t, roomId } = await setup();
    await t.mutation(internal.fpl.saveLiveFplSyncResult, payload(8, [team(1), team(2)]));
    await t.run(async (ctx) => {
      for (const tm of await ctx.db.query("fpl_teams").collect()) {
        await ctx.db.patch(tm._id, { roomId });
      }
    });
    await t.mutation(internal.fpl.saveLiveFplSyncResult, payload(8, [team(1), team(2)]));
    const before = await snapshot(t);

    vi.setSystemTime(Date.now() + 3 * HOUR);
    await t.mutation(
      internal.fpl.saveLiveFplSyncResult,
      payload(8, [team(1, { currentGwPoints: 61, totalPoints: 411 }), team(2)])
    );
    const after = await snapshot(t);

    const byEntry = (rows: typeof before.teams) => new Map(rows.map((r) => [r.entryId, r]));
    expect(byEntry(after.teams).get(1)).toMatchObject({ currentGwPoints: 61, totalPoints: 411 });
    expect(byEntry(after.teams).get(1)!.lastUpdated).toBeGreaterThan(
      byEntry(before.teams).get(1)!.lastUpdated
    );
    expect(byEntry(after.teams).get(2)).toEqual(byEntry(before.teams).get(2));

    const liveRow = (snap: typeof before, entryId: number) =>
      snap.scores.find((s) => s.entryId === entryId && s.gameweek === 8)!;
    expect(liveRow(after, 1).points).toBe(61);
    expect(liveRow(after, 2)).toEqual(liveRow(before, 2));
  });
});

describe("saveLiveFplSyncResult – historikk-backfill", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-27T08:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("fyller inn tidligere runder første gang", async () => {
    const { t } = await setup();
    await t.mutation(internal.fpl.saveLiveFplSyncResult, payload(8, [team(1)]));
    const { scores } = await snapshot(t);
    expect(scores.map((s) => s.gameweek).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("kjører ikke backfill på nytt i samme runde, men gjør det når en ny runde starter", async () => {
    const { t } = await setup();
    await t.mutation(internal.fpl.saveLiveFplSyncResult, payload(8, [team(1)]));

    // En historikkrad forsvinner. Samme runde: skal IKKE gjenskapes (ingen ekstra oppslag).
    await t.run(async (ctx) => {
      const gw3 = await ctx.db
        .query("gameweek_scores")
        .withIndex("by_entryId_and_gw", (q) => q.eq("entryId", 1).eq("gameweek", 3))
        .unique();
      await ctx.db.delete(gw3!._id);
    });
    vi.setSystemTime(Date.now() + 3 * HOUR);
    await t.mutation(internal.fpl.saveLiveFplSyncResult, payload(8, [team(1)]));
    expect((await snapshot(t)).scores.some((s) => s.gameweek === 3)).toBe(false);

    // Ny runde: backfill kjører igjen og tetter hullet.
    vi.setSystemTime(Date.now() + 7 * 24 * HOUR);
    await t.mutation(
      internal.fpl.saveLiveFplSyncResult,
      payload(9, [
        team(1, {
          perGwHistory: [1, 2, 3, 4, 5, 6, 7, 8].map((gw) => ({
            gw,
            points: 50,
            transfersCost: 0,
            benchPoints: 1,
          })),
        }),
      ])
    );
    expect((await snapshot(t)).scores.some((s) => s.gameweek === 3)).toBe(true);
  });

  it("prøver backfill igjen når FPL-historikken mangler i en synk", async () => {
    const { t } = await setup();
    await t.mutation(internal.fpl.saveLiveFplSyncResult, payload(8, [team(1, { perGwHistory: [] })]));
    expect((await snapshot(t)).scores.map((s) => s.gameweek)).toEqual([8]);

    vi.setSystemTime(Date.now() + 3 * HOUR);
    await t.mutation(internal.fpl.saveLiveFplSyncResult, payload(8, [team(1)]));
    expect((await snapshot(t)).scores).toHaveLength(8);
  });
});
