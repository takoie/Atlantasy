import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Henter globale ligainnstillinger
 */
export const getSettings = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("league_settings").first();
  },
});

/**
 * Oppdaterer ligainnstillinger
 */
export const updateSettings = mutation({
  args: {
    leagueId: v.optional(v.number()),
    leagueName: v.optional(v.string()),
    currentGameweek: v.optional(v.number()),
    deductTransferHits: v.optional(v.boolean()),
    autoSyncEnabled: v.optional(v.boolean()),
    syncIntervalMinutes: v.optional(v.number()),
    adminPin: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("league_settings").first();
    if (!existing) {
      return await ctx.db.insert("league_settings", {
        leagueId: args.leagueId || 464734,
        leagueName: args.leagueName || "Atlantis Bedriftsliga",
        currentGameweek: args.currentGameweek || 1,
        deductTransferHits: args.deductTransferHits ?? true,
        autoSyncEnabled: args.autoSyncEnabled ?? true,
        syncIntervalMinutes: args.syncIntervalMinutes || 10,
        lastSyncedAt: Date.now(),
        adminPin: args.adminPin || "1234",
      });
    }

    await ctx.db.patch(existing._id, {
      ...args,
      lastSyncedAt: Date.now(),
    });
    return existing._id;
  },
});

/**
 * Henter alle invitasjonskoder
 */
export const getInviteCodes = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("invite_codes").collect();
  },
});

export const listInviteCodes = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("invite_codes").collect();
  },
});

/**
 * Oppretter eller fornyer en tidsbegrenset invitasjonskode
 */
export const createInviteCode = mutation({
  args: {
    code: v.optional(v.string()),
    customCode: v.optional(v.string()),
    role: v.optional(v.string()),
    targetRoomId: v.optional(v.id("rooms")),
    durationDays: v.optional(v.number()),
    validDays: v.optional(v.number()),
    maxUses: v.optional(v.number()),
    createdBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const rawCode = (args.customCode || args.code || `LIGA-${Math.random().toString(36).substring(2, 8)}`).toUpperCase().trim();
    const existing = await ctx.db
      .query("invite_codes")
      .withIndex("by_code", (q) => q.eq("code", rawCode))
      .first();

    const validDays = args.validDays ?? args.durationDays ?? 7;
    const expiresAt = validDays <= 0 || validDays >= 9999
      ? Date.now() + 10 * 365 * 24 * 60 * 60 * 1000
      : Date.now() + validDays * 24 * 60 * 60 * 1000;

    // Hvis koden allerede eksisterer, oppdaterer og fornyer vi den
    if (existing) {
      await ctx.db.patch(existing._id, {
        role: args.role || existing.role || "user",
        targetRoomId: args.targetRoomId ?? existing.targetRoomId,
        expiresAt,
        maxUses: args.maxUses ?? existing.maxUses ?? 999,
      });
      return existing._id;
    }

    return await ctx.db.insert("invite_codes", {
      code: rawCode,
      role: args.role || "user",
      targetRoomId: args.targetRoomId,
      expiresAt,
      maxUses: args.maxUses ?? 999,
      usedCount: 0,
      createdBy: args.createdBy,
      createdAt: Date.now(),
    });
  },
});

/**
 * Sletter en invitasjonskode
 */
export const deleteInviteCode = mutation({
  args: {
    codeId: v.id("invite_codes"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.codeId);
  },
});

/**
 * Kårer månedens vinner (rom- eller solovinner)
 */
export const declareMonthWinner = mutation({
  args: {
    monthKey: v.string(),
    monthName: v.string(),
    winnerType: v.string(), // "room" | "individual"
    roomId: v.optional(v.id("rooms")),
    winnerName: v.string(),
    winnerTeamName: v.optional(v.string()),
    score: v.number(),
    message: v.string(),
    authorName: v.string(),
  },
  handler: async (ctx, args) => {
    const isRoom = args.winnerType === "room";

    // 1. Avpinn tidligere vinnere av SAMME type
    const pinnedSameType = await ctx.db
      .query("announcements")
      .withIndex("by_isPinned", (q) => q.eq("isPinned", true))
      .collect();

    for (const p of pinnedSameType) {
      const pType = p.winnerType || (p.type === "individual_winner" ? "individual" : "room");
      if (pType === args.winnerType) {
        await ctx.db.patch(p._id, { isPinned: false });
      }
    }

    // 2. Opprett den offisielle vinner-kunngjøringen
    const announcementId = await ctx.db.insert("announcements", {
      title: isRoom
        ? `🏆 Månedens Vinnerrom: ${args.winnerName}`
        : `👑 Månedens Solovinner: ${args.winnerName}`,
      content: args.message,
      type: isRoom ? "winner_celebration" : "individual_winner",
      winnerType: args.winnerType,
      winnerName: args.winnerName,
      winnerTeamName: args.winnerTeamName,
      winningRoomId: args.roomId,
      monthName: args.monthName,
      winningScore: args.score,
      authorName: args.authorName,
      isPinned: true,
      createdAt: Date.now(),
    });

    // 3. Post i liga-chatten
    await ctx.db.insert("messages", {
      senderId: (await ctx.db.query("users").first())?._id || ("bot" as any),
      senderName: "FPL Hedersbot 🤖",
      senderRole: "admin",
      channel: "banter",
      content: isRoom
        ? `🚨 **KÅRING AV MÅNEDENS VINNERROM (${args.monthName})** 🚨\nGratulerer til **${args.winnerName}** med et snitt på **${args.score} poeng**!\n\n"${args.message}"`
        : `👑 **KÅRING AV MÅNEDENS SOLOVINNER (${args.monthName})** 👑\nGratulerer til **${args.winnerName}** (${args.winnerTeamName || "Lag"}) med utrolige **${args.score} poeng**!\n\n"${args.message}"`,
      type: "announcement",
      isPinned: true,
      createdAt: Date.now(),
    });

    return announcementId;
  },
});

/**
 * Henter aktive månedsvinnere (både rom- og solovinner) samt full historikk for Skryteveggen
 */
export const getMonthWinners = query({
  args: {},
  handler: async (ctx) => {
    const allPinned = await ctx.db
      .query("announcements")
      .withIndex("by_isPinned", (q) => q.eq("isPinned", true))
      .order("desc")
      .collect();

    // 1. Finn pinned romvinner
    let roomWinnerAnn = allPinned.find(
      (a) => a.winnerType === "room" || a.type === "winner_celebration"
    );

    // 2. Finn pinned solovinner
    let soloWinnerAnn = allPinned.find(
      (a) => a.winnerType === "individual" || a.type === "individual_winner"
    );

    let roomWinner = null;
    if (roomWinnerAnn) {
      let winningRoom = null;
      if (roomWinnerAnn.winningRoomId) {
        winningRoom = await ctx.db.get(roomWinnerAnn.winningRoomId);
      }
      roomWinner = {
        ...roomWinnerAnn,
        winningRoom,
      };
    }

    let soloWinner = null;
    if (soloWinnerAnn) {
      let winningRoom = null;
      if (soloWinnerAnn.winningRoomId) {
        winningRoom = await ctx.db.get(soloWinnerAnn.winningRoomId);
      }
      soloWinner = {
        ...soloWinnerAnn,
        winningRoom,
      };
    }

    // 3. Hent historiske vinnere
    const allAnnouncements = await ctx.db
      .query("announcements")
      .withIndex("by_createdAt")
      .order("desc")
      .take(40);

    const history = await Promise.all(
      allAnnouncements.map(async (ann) => {
        let winningRoom = null;
        if (ann.winningRoomId) {
          winningRoom = await ctx.db.get(ann.winningRoomId);
        }
        return {
          ...ann,
          winningRoom,
        };
      })
    );

    return {
      roomWinner,
      soloWinner,
      history,
    };
  },
});

/**
 * Fjerner / avpinner en kunngjøring fra skryteveggen
 */
export const unpinAnnouncement = mutation({
  args: {
    announcementId: v.id("announcements"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.announcementId, {
      isPinned: false,
    });
  },
});

/**
 * Starter en helt ny sesong
 */
export const startNewSeason = mutation({
  args: {
    seasonYear: v.string(),
    keepRoomStructure: v.boolean(),
    resetAllPoints: v.boolean(),
  },
  handler: async (ctx, args) => {
    if (args.resetAllPoints) {
      const teams = await ctx.db.query("fpl_teams").collect();
      for (const t of teams) {
        await ctx.db.patch(t._id, {
          totalPoints: 0,
          currentGwPoints: 0,
          currentGwTransfersCost: 0,
          lastUpdated: Date.now(),
        });
      }
    }

    const settings = await ctx.db.query("league_settings").first();
    if (settings) {
      await ctx.db.patch(settings._id, {
        currentGameweek: 1,
        lastSyncedAt: Date.now(),
      });
    }

    await ctx.db.insert("announcements", {
      title: `Ny Sesong ${args.seasonYear} er offisielt i gang! 🚀`,
      content: `Velkommen til den nye Fantasy PL sesongen! Alle rom starter på 0 poeng. Måtte det beste rommet vinne!`,
      type: "league_update",
      authorName: "Admin",
      isPinned: true,
      createdAt: Date.now(),
    });
  },
});

/**
 * Renser databasen 100% for alt av rom, lag, spillere, meldinger og data,
 * og bygger opp 12 rene standardrom (Rom A1–A12) helt fra scratch!
 */
export const wipeAllPreseededData = mutation({
  args: {},
  handler: async (ctx) => {
    // 1. Slett ALLE eksisterende lag og spillere
    const allTeams = await ctx.db.query("fpl_teams").collect();
    for (const t of allTeams) {
      await ctx.db.delete(t._id);
    }

    // 2. Slett ALLE eksisterende rom (for å fjerne feilnavn og duplikater)
    const allRooms = await ctx.db.query("rooms").collect();
    for (const r of allRooms) {
      await ctx.db.delete(r._id);
    }

    // 3. Slett alle gamle brukere
    const users = await ctx.db.query("users").collect();
    for (const u of users) {
      await ctx.db.delete(u._id);
    }

    // 4. Slett alle gamle kunngjøringer og vinnere
    const announcements = await ctx.db.query("announcements").collect();
    for (const a of announcements) {
      await ctx.db.delete(a._id);
    }

    // 5. Slett alle gamle meldinger
    const messages = await ctx.db.query("messages").collect();
    for (const m of messages) {
      await ctx.db.delete(m._id);
    }

    // 6. Slett monthly standings
    const monthly = await ctx.db.query("monthly_standings").collect();
    for (const ms of monthly) {
      await ctx.db.delete(ms._id);
    }

    // 7. Slett alle runderesultater
    const roomScores = await ctx.db.query("room_gameweek_scores").collect();
    for (const rs of roomScores) {
      await ctx.db.delete(rs._id);
    }

    const gwScores = await ctx.db.query("gameweek_scores").collect();
    for (const gs of gwScores) {
      await ctx.db.delete(gs._id);
    }

    // 8. Slett artikler så nyhetsseksjonen også starter ren
    const articles = await ctx.db.query("articles").collect();
    for (const art of articles) {
      await ctx.db.delete(art._id);
    }

    // 9. Tilbakestill ligainnstillinger
    const settings = await ctx.db.query("league_settings").first();
    if (settings) {
      await ctx.db.patch(settings._id, {
        leagueId: 464734,
        leagueName: "Atlantis Bedriftsliga",
        currentGameweek: 1,
        deductTransferHits: true,
        autoSyncEnabled: true,
        syncIntervalMinutes: 10,
        lastSyncedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("league_settings", {
        leagueId: 464734,
        leagueName: "Atlantis Bedriftsliga",
        currentGameweek: 1,
        deductTransferHits: true,
        autoSyncEnabled: true,
        syncIntervalMinutes: 10,
        lastSyncedAt: Date.now(),
        adminPin: "1234",
      });
    }

    // 9. Opprett nøyaktig 12 rene, perfekte standardrom: A1 til A12
    const roomColors = [
      "#1eb854", "#38bdf8", "#d99330", "#a855f7",
      "#ec4899", "#f59e0b", "#10b981", "#6366f1",
      "#14b8a6", "#84cc16", "#e11d48", "#06b6d4"
    ];

    for (let i = 1; i <= 12; i++) {
      await ctx.db.insert("rooms", {
        roomNumber: i,
        name: `A${i}`,
        description: `Rom A${i}`,
        accentColor: roomColors[(i - 1) % roomColors.length],
        createdAt: Date.now(),
      });
    }

    return {
      success: true,
      message: "Databasen er nå 100% renset for alle lag, spillere, brukere og gamle rom. 12 rene standardrom (A1-A12) er opprettet!",
    };
  },
});

/**
 * Sletter alle registrerte brukere
 */
export const deleteAllUsers = mutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    for (const u of users) {
      await ctx.db.delete(u._id);
    }
    return { success: true, count: users.length };
  },
});

/**
 * Sletter en enkelt bruker
 */
export const deleteUser = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.userId);
    return { success: true };
  },
});
