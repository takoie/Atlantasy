import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
/**
 * Henter de siste meldingene sortert synkende etter opprettetDato (eller stigende basert på grensesnittbehov)
 */
export const hentSisteMeldinger = query({
    args: {
        grense: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const grense = args.grense ?? 50;
        const meldinger = await ctx.db
            .query("meldinger")
            .withIndex("by_opprettetDato")
            .order("desc")
            .take(grense);
        // Returner sortert så de nyeste kan vises etter ønske
        return meldinger;
    },
});
/**
 * Oppretter og lagrer en ny melding
 */
export const sendMelding = mutation({
    args: {
        tittel: v.optional(v.string()),
        innhold: v.string(),
        type: v.string(),
        erAdminMelding: v.boolean(),
    },
    handler: async (ctx, args) => {
        const meldingId = await ctx.db.insert("meldinger", {
            tittel: args.tittel?.trim() || undefined,
            innhold: args.innhold.trim(),
            type: args.type,
            opprettetDato: Date.now(),
            erAdminMelding: args.erAdminMelding,
        });
        return meldingId;
    },
});
/**
 * Sletter en melding basert på ID
 */
export const slettMelding = mutation({
    args: {
        id: v.id("meldinger"),
    },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});
