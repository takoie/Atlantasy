/**
 * Spilleranalyse: synker spillerkatalogen fra FPL (bootstrap-static) til Convex,
 * logger prisendringer og leverer data til Analyse-fanene.
 */
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  query,
  type ActionCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { FPL_HEADERS } from "./fpl";
import {
  detectPriceChange,
  num,
  rowChanged,
  selectMovers,
  toMover,
  toPlayerRow,
  type PlayerRow,
} from "./playerMath";

const FPL_API = "https://fantasy.premierleague.com/api";
/** Hver batch er én commit som får abonnenter av `listPlayers` til å lese tabellen på nytt. */
const BATCH_SIZE = 250;
/** Manuell oppdatering fra klienten ignoreres hvis siste synk er nyere enn dette. */
const MIN_REFRESH_MS = 30 * 60 * 1000;

const playerRowValidator = v.object({
  elementId: v.number(),
  webName: v.string(),
  fullName: v.string(),
  clubId: v.number(),
  position: v.number(),
  cost: v.number(),
  costChangeStart: v.number(),
  costChangeEvent: v.number(),
  selectedBy: v.number(),
  totalPoints: v.number(),
  eventPoints: v.number(),
  form: v.number(),
  pointsPerGame: v.number(),
  epNext: v.number(),
  minutes: v.number(),
  starts: v.number(),
  goals: v.number(),
  assists: v.number(),
  cleanSheets: v.number(),
  bonus: v.number(),
  xg: v.number(),
  xa: v.number(),
  xgi: v.number(),
  xgc: v.number(),
  xgPer90: v.number(),
  xaPer90: v.number(),
  xgiPer90: v.number(),
  xgcPer90: v.number(),
  ict: v.number(),
  defCon: v.number(),
  defConPer90: v.number(),
  status: v.string(),
  news: v.string(),
  chanceNextRound: v.optional(v.number()),
});

const moverValidator = v.object({
  elementId: v.number(),
  webName: v.string(),
  clubId: v.number(),
  position: v.number(),
  cost: v.number(),
  transfersInEvent: v.number(),
  transfersOutEvent: v.number(),
  priceChangePercent: v.number(),
  priceProjections: v.array(
    v.object({ offset: v.number(), percent: v.number(), likelihood: v.number() })
  ),
});

/* ------------------------------------------------------------------ */
/* Synk                                                                */
/* ------------------------------------------------------------------ */

export const upsertClubs = internalMutation({
  args: {
    clubs: v.array(v.object({ clubId: v.number(), name: v.string(), shortName: v.string() })),
  },
  handler: async (ctx, args) => {
    for (const club of args.clubs) {
      const existing = await ctx.db
        .query("fpl_clubs")
        .withIndex("by_clubId", (q) => q.eq("clubId", club.clubId))
        .unique();
      if (!existing) {
        await ctx.db.insert("fpl_clubs", club);
      } else if (existing.name !== club.name || existing.shortName !== club.shortName) {
        await ctx.db.patch("fpl_clubs", existing._id, club);
      }
    }
    return null;
  },
});

/** Oppdaterer bare rader som faktisk har endret seg, og logger prisendringer. */
export const upsertPlayers = internalMutation({
  args: { rows: v.array(playerRowValidator), at: v.number() },
  handler: async (ctx, args) => {
    let inserted = 0;
    let updated = 0;
    let priceChanges = 0;

    for (const row of args.rows) {
      const existing = await ctx.db
        .query("fpl_players")
        .withIndex("by_elementId", (q) => q.eq("elementId", row.elementId))
        .unique();

      if (!existing) {
        await ctx.db.insert("fpl_players", row);
        inserted++;
        continue;
      }

      const change = detectPriceChange(existing.cost, row.cost);
      if (change) {
        await ctx.db.insert("fpl_price_changes", {
          elementId: row.elementId,
          webName: row.webName,
          clubId: row.clubId,
          position: row.position,
          oldCost: change.oldCost,
          newCost: change.newCost,
          at: args.at,
        });
        priceChanges++;
      }

      const { _id, _creationTime, ...stored } = existing;
      if (rowChanged(stored as PlayerRow, row)) {
        // `replace` fjerner også valgfrie felt (chanceNextRound) som FPL har droppet.
        await ctx.db.replace("fpl_players", _id, row);
        updated++;
      }
    }
    return { inserted, updated, priceChanges };
  },
});

/** Erstatter pris-/overføringsdokumentet. Ett dokument på ca. 10 KB, i stedet for 669 spillerrader. */
export const saveMovers = internalMutation({
  args: { at: v.number(), players: v.array(moverValidator) },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("fpl_price_movers").first();
    if (existing) await ctx.db.replace("fpl_price_movers", existing._id, args);
    else await ctx.db.insert("fpl_price_movers", args);
    return null;
  },
});

export const recordSync = internalMutation({
  args: {
    at: v.number(),
    ok: v.boolean(),
    error: v.optional(v.string()),
    playerCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const state = await ctx.db.query("fpl_players_sync").first();
    const next = {
      lastAttemptAt: args.at,
      lastSyncedAt: args.ok ? args.at : (state?.lastSyncedAt ?? 0),
      lastError: args.ok ? undefined : args.error,
      playerCount: args.playerCount ?? state?.playerCount ?? 0,
    };
    if (state) await ctx.db.replace("fpl_players_sync", state._id, next);
    else await ctx.db.insert("fpl_players_sync", next);
    return null;
  },
});

export const getSyncState = internalQuery({
  args: {},
  handler: async (ctx) => await ctx.db.query("fpl_players_sync").first(),
});

async function runSync(ctx: ActionCtx) {
  const at = Date.now();
  try {
    const res = await fetch(`${FPL_API}/bootstrap-static/`, { headers: FPL_HEADERS });
    if (!res.ok) throw new Error(`bootstrap-static ga status ${res.status}`);
    const boot = await res.json();
    const elements: any[] = boot.elements ?? [];
    if (elements.length === 0) throw new Error("bootstrap-static inneholdt ingen spillere");

    const clubs = (boot.teams ?? []).map((t: any) => ({
      clubId: num(t.id),
      name: String(t.name ?? ""),
      shortName: String(t.short_name ?? ""),
    }));
    await ctx.runMutation(internal.players.upsertClubs, { clubs });

    const rows = elements.map(toPlayerRow);
    const totals = { inserted: 0, updated: 0, priceChanges: 0 };
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const r = await ctx.runMutation(internal.players.upsertPlayers, {
        rows: rows.slice(i, i + BATCH_SIZE),
        at,
      });
      totals.inserted += r.inserted;
      totals.updated += r.updated;
      totals.priceChanges += r.priceChanges;
    }

    await ctx.runMutation(internal.players.saveMovers, {
      at,
      players: selectMovers(elements.map(toMover)),
    });

    await ctx.runMutation(internal.players.recordSync, { at, ok: true, playerCount: rows.length });
    return { ok: true as const, ...totals };
  } catch (e: any) {
    // Beholder forrige data – UI viser bare "sist oppdatert".
    await ctx.runMutation(internal.players.recordSync, {
      at,
      ok: false,
      error: String(e?.message ?? e).slice(0, 300),
    });
    return { ok: false as const, error: String(e?.message ?? e) };
  }
}

/** Kjøres av cron (crons.ts). */
export const sync = internalAction({
  args: {},
  handler: async (ctx) => await runSync(ctx),
});

/**
 * Lar klienten be om en oppfriskning (f.eks. første gang tabellen er tom).
 * Henter bare offentlige data, men begrenses til én synk per 5. minutt.
 */
export const refresh = action({
  args: {},
  handler: async (ctx) => {
    const state = await ctx.runQuery(internal.players.getSyncState, {});
    if (state && Date.now() - state.lastAttemptAt < MIN_REFRESH_MS) {
      return { ok: true as const, skipped: true as const };
    }
    return await runSync(ctx);
  },
});

/* ------------------------------------------------------------------ */
/* Spørringer                                                          */
/* ------------------------------------------------------------------ */

/**
 * Alle spillere + klubber. Filtrering og sortering skjer i klienten. Synkstatus ligger i
 * `syncStatus`: statusdokumentet skrives ved hver synk, og leste vi det her ville hele listen
 * (ca. 300 KB) blitt lest på nytt etter hver synk selv om ingen spiller har endret seg.
 */
export const listPlayers = query({
  args: {},
  handler: async (ctx) => {
    const players = await ctx.db.query("fpl_players").take(1000);
    const clubs = await ctx.db.query("fpl_clubs").take(40);
    return {
      // Tomme standardverdier for feltene som er flyttet til fpl_price_movers, slik at
      // klienter fra før flyttingen (v1.4.0 og eldre) ikke krasjer i Prisfanen. Kan fjernes
      // når de fleste har oppdatert.
      players: players.map(({ _id, _creationTime, ...p }) => ({
        transfersInEvent: 0,
        transfersOutEvent: 0,
        priceChangePercent: 0,
        priceProjections: [],
        ...p,
      })),
      clubs: clubs.map(({ _id, _creationTime, ...c }) => c),
    };
  },
});

export const syncStatus = query({
  args: {},
  handler: async (ctx) => {
    const sync = await ctx.db.query("fpl_players_sync").first();
    return { syncedAt: sync?.lastSyncedAt ?? null, lastError: sync?.lastError ?? null };
  },
});

/** Prisfanens topplister (stigere, fallere, mest overført). */
export const listPriceMovers = query({
  args: {},
  handler: async (ctx) => {
    const doc = await ctx.db.query("fpl_price_movers").first();
    return { players: doc?.players ?? [], at: doc?.at ?? null };
  },
});

export const recentPriceChanges = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 60, 1), 200);
    const rows = await ctx.db.query("fpl_price_changes").withIndex("by_at").order("desc").take(limit);
    return rows.map(({ _id, _creationTime, ...r }) => r);
  },
});

/* ------------------------------------------------------------------ */
/* Detaljer for én spiller (hentes ved behov)                          */
/* ------------------------------------------------------------------ */

export const playerHistory = action({
  args: { elementId: v.number() },
  handler: async (_ctx, args) => {
    const res = await fetch(`${FPL_API}/element-summary/${Math.trunc(args.elementId)}/`, {
      headers: FPL_HEADERS,
    });
    if (!res.ok) throw new Error(`element-summary ga status ${res.status}`);
    const data = await res.json();
    return (data.history ?? []).map((h: any) => ({
      round: num(h.round),
      opponentId: num(h.opponent_team),
      wasHome: !!h.was_home,
      minutes: num(h.minutes),
      points: num(h.total_points),
      goals: num(h.goals_scored),
      assists: num(h.assists),
      xg: num(h.expected_goals),
      xa: num(h.expected_assists),
      xgi: num(h.expected_goal_involvements),
      xgc: num(h.expected_goals_conceded),
      bonus: num(h.bonus),
      value: num(h.value),
    }));
  },
});
