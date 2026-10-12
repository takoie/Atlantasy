import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { FPL_HEADERS, runLiveFplSync } from "./fpl";
import { decideAutoSync, type FixtureLite } from "./autoSyncLogic";

const FPL_API = "https://fantasy.premierleague.com/api";
const DAY_MS = 24 * 60 * 60 * 1000;

/** Tilstanden cronen trenger – ett enkelt dokumentoppslag per tick. */
export const getState = internalQuery({
  args: {},
  handler: async (ctx) => {
    const s = await ctx.db.query("league_settings").first();
    if (!s) return null;
    return {
      enabled: s.autoSyncEnabled,
      wakeAt: s.autoSyncWakeAt ?? 0,
      gw: s.autoSyncGw ?? null,
      stage: s.autoSyncStage ?? null,
    };
  },
});

export const saveState = internalMutation({
  args: {
    gw: v.optional(v.number()),
    stage: v.optional(v.union(v.literal("provisional"), v.literal("final"))),
    wakeAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const s = await ctx.db.query("league_settings").first();
    if (!s) return null;
    // patch med `undefined` fjerner feltet, så bare utelatte felter skal stå urørt.
    await ctx.db.patch(s._id, {
      ...(args.gw !== undefined && { autoSyncGw: args.gw }),
      ...(args.stage !== undefined && { autoSyncStage: args.stage }),
      ...(args.wakeAt !== undefined && { autoSyncWakeAt: args.wakeAt }),
    });
    return null;
  },
});

/**
 * Kjøres av cron (crons.ts). Synker FPL-data automatisk etter siste kamp i hver
 * gameweek – først når alle kamper er ferdigspilt, og igjen når FPL har bekreftet
 * poengene (bonus). Mellom kampene avsluttes tickene umiddelbart via `autoSyncWakeAt`.
 */
export const tick = internalAction({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const state = await ctx.runQuery(internal.autoSync.getState, {});
    if (!state || !state.enabled || now < state.wakeAt) return null;

    try {
      const bootRes = await fetch(`${FPL_API}/bootstrap-static/`, { headers: FPL_HEADERS });
      if (!bootRes.ok) throw new Error(`bootstrap-static ga status ${bootRes.status}`);
      const boot = await bootRes.json();
      const events: any[] = boot.events ?? [];
      const current = events.find((e) => e.is_current);
      const next = events.find((e) => e.is_next);
      const nextDeadline = next?.deadline_time ? Date.parse(next.deadline_time) : NaN;
      // Når neste runde starter, eller om en dag hvis vi ikke vet det (sesongslutt).
      const sleepUntilNextRound = Number.isNaN(nextDeadline) ? now + DAY_MS : nextDeadline;

      if (!current) {
        // Før sesongstart: ingenting å synke før første runde har startet.
        await ctx.runMutation(internal.autoSync.saveState, { wakeAt: sleepUntilNextRound });
        return null;
      }

      const fxRes = await fetch(`${FPL_API}/fixtures/?event=${current.id}`, {
        headers: FPL_HEADERS,
      });
      if (!fxRes.ok) throw new Error(`fixtures ga status ${fxRes.status}`);
      const fixtures: FixtureLite[] = await fxRes.json();

      const decision = decideAutoSync({
        fixtures,
        now,
        gw: current.id,
        doneGw: state.gw,
        doneStage: state.stage,
      });

      if (decision.kind === "sync") {
        const result = await runLiveFplSync(ctx);
        if (!result.success) {
          // Ikke merk som utført – neste tick prøver på nytt.
          console.warn(`Auto-synk GW ${current.id} (${decision.stage}) feilet: ${result.error}`);
          return null;
        }
        console.log(
          `Auto-synk GW ${current.id} (${decision.stage}): ${result.syncedCount} lag synket.`
        );
        await ctx.runMutation(internal.autoSync.saveState, {
          gw: current.id,
          stage: decision.stage,
          wakeAt: decision.stage === "final" ? sleepUntilNextRound : 0,
        });
      } else if (decision.kind === "done") {
        await ctx.runMutation(internal.autoSync.saveState, { wakeAt: sleepUntilNextRound });
      } else if (decision.wakeAt !== undefined && decision.wakeAt !== state.wakeAt) {
        await ctx.runMutation(internal.autoSync.saveState, { wakeAt: decision.wakeAt });
      }
    } catch (err: any) {
      // Midlertidig FPL-feil: tilstanden er uendret, så neste tick prøver igjen.
      console.warn("Auto-synk-sjekk feilet:", err?.message ?? err);
    }
    return null;
  },
});
