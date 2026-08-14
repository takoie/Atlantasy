import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Henter gjeldende ligainnstillinger
 */
export const getSettings = query({
  args: {},
  handler: async (ctx) => {
    let settings = await ctx.db.query("league_settings").first();
    if (!settings) {
      // Opprett standardinnstillinger hvis de ikke finnes
      const id = await ctx.db.insert("league_settings", {
        leagueId: 123456,
        leagueName: "Atlantis FPL Bedriftsliga",
        currentGameweek: 1,
        deductTransferHits: true,
        autoSyncEnabled: true,
        syncIntervalMinutes: 15,
        lastSyncedAt: Date.now(),
        adminPin: "1234",
      });
      settings = await ctx.db.get(id);
    }
    return settings;
  },
});

/**
 * Oppdaterer ligainnstillinger (Admin)
 */
export const updateSettings = mutation({
  args: {
    leagueId: v.optional(v.number()),
    leagueName: v.optional(v.string()),
    currentGameweek: v.optional(v.number()),
    deductTransferHits: v.optional(v.boolean()),
    autoSyncEnabled: v.optional(v.boolean()),
    adminPin: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const settings = await ctx.db.query("league_settings").first();
    if (!settings) {
      throw new Error("Ligainnstillinger finnes ikke.");
    }

    await ctx.db.patch(settings._id, {
      ...(args.leagueId !== undefined && { leagueId: args.leagueId }),
      ...(args.leagueName !== undefined && { leagueName: args.leagueName.trim() }),
      ...(args.currentGameweek !== undefined && { currentGameweek: args.currentGameweek }),
      ...(args.deductTransferHits !== undefined && { deductTransferHits: args.deductTransferHits }),
      ...(args.autoSyncEnabled !== undefined && { autoSyncEnabled: args.autoSyncEnabled }),
      ...(args.adminPin !== undefined && { adminPin: args.adminPin.trim() }),
      lastSyncedAt: Date.now(),
    });
  },
});

/**
 * Genererer en tidsbegrenset invitasjonskode
 */
export const createInviteCode = mutation({
  args: {
    customCode: v.optional(v.string()),
    targetRoomId: v.optional(v.id("rooms")),
    role: v.optional(v.string()), // "user" | "admin"
    validDays: v.optional(v.number()), // F.eks. 7 dager
    maxUses: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const validDays = args.validDays ?? 7;
    const expiresAt = Date.now() + validDays * 24 * 60 * 60 * 1000;
    
    // Generer tilfeldig kode hvis ikke oppgitt
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    const code = args.customCode?.trim().toUpperCase() || `ATL-${randomSuffix}`;

    const id = await ctx.db.insert("invite_codes", {
      code,
      targetRoomId: args.targetRoomId,
      role: args.role ?? "user",
      expiresAt,
      maxUses: args.maxUses ?? 50,
      usedCount: 0,
      createdAt: Date.now(),
    });

    return { id, code, expiresAt };
  },
});

/**
 * Henter alle invitasjonskoder
 */
export const listInviteCodes = query({
  args: {},
  handler: async (ctx) => {
    const codes = await ctx.db.query("invite_codes").collect();
    const now = Date.now();

    return codes.map((c) => ({
      ...c,
      isExpired: c.expiresAt < now,
      isExhausted: c.usedCount >= c.maxUses,
    }));
  },
});

/**
 * Publiserer en offisiell kunngjøring (Skrytevegg / Vinnerhyllest)
 */
export const postAnnouncement = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    type: v.string(), // "winner_celebration" | "league_update" | "admin_alert"
    winningRoomId: v.optional(v.id("rooms")),
    monthName: v.optional(v.string()),
    authorName: v.string(),
    isPinned: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Hvis denne er pinned, unpin andre eldre hvis det er en vinnerhyllest
    if (args.isPinned) {
      const existingPinned = await ctx.db
        .query("announcements")
        .withIndex("by_isPinned", (q) => q.eq("isPinned", true))
        .collect();

      for (const ann of existingPinned) {
        await ctx.db.patch(ann._id, { isPinned: false });
      }
    }

    const id = await ctx.db.insert("announcements", {
      title: args.title.trim(),
      content: args.content.trim(),
      type: args.type,
      winningRoomId: args.winningRoomId,
      monthName: args.monthName?.trim(),
      authorName: args.authorName.trim(),
      isPinned: args.isPinned,
      createdAt: Date.now(),
    });

    return id;
  },
});

/**
 * Henter den festede (pinned) kunngjøringen for Skrytevegg-banneret
 */
export const getPinnedAnnouncement = query({
  args: {},
  handler: async (ctx) => {
    const pinned = await ctx.db
      .query("announcements")
      .withIndex("by_isPinned", (q) => q.eq("isPinned", true))
      .order("desc")
      .first();

    if (!pinned) {
      return null;
    }

    let winningRoom = null;
    if (pinned.winningRoomId) {
      winningRoom = await ctx.db.get(pinned.winningRoomId);
    }

    return {
      ...pinned,
      winningRoom,
    };
  },
});

/**
 * Kårer månedens vinnerrom og legger inn automatisk skrytevegg-kunngjøring
 */
export const declareMonthlyWinner = mutation({
  args: {
    monthKey: v.string(),
    monthName: v.string(),
    winningRoomId: v.id("rooms"),
    winningScore: v.number(),
    customMessage: v.optional(v.string()),
    authorName: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.winningRoomId);
    if (!room) throw new Error("Rommet finnes ikke.");

    // Lagre i monthly_standings
    const existing = await ctx.db
      .query("monthly_standings")
      .withIndex("by_monthKey", (q) => q.eq("monthKey", args.monthKey))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        winningRoomId: args.winningRoomId,
        winningScore: args.winningScore,
        isCompleted: true,
      });
    } else {
      await ctx.db.insert("monthly_standings", {
        monthKey: args.monthKey,
        monthName: args.monthName,
        gameweekStart: 1,
        gameweekEnd: 4,
        winningRoomId: args.winningRoomId,
        winningScore: args.winningScore,
        isCompleted: true,
      });
    }

    // Unpin eksisterende kunngjøringer
    const existingPinned = await ctx.db
      .query("announcements")
      .withIndex("by_isPinned", (q) => q.eq("isPinned", true))
      .collect();

    for (const ann of existingPinned) {
      await ctx.db.patch(ann._id, { isPinned: false });
    }

    // Sett inn offisiell vinnerkunngjøring
    const messageContent =
      args.customMessage ||
      `Gratulerer til ${room.name} som månedens ubestridte vinner for ${args.monthName} med et fantastisk snitt på ${args.winningScore} poeng! Pokalen heises til topps! 🏆✨`;

    await ctx.db.insert("announcements", {
      title: `🏆 Månedens Vinner: ${room.name} (${args.monthName})`,
      content: messageContent,
      type: "winner_celebration",
      winningRoomId: args.winningRoomId,
      monthName: args.monthName,
      authorName: args.authorName,
      isPinned: true,
      createdAt: Date.now(),
    });
  },
});
