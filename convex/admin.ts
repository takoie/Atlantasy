import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin, sanitizeSettings, hashPassword } from "./security";

/**
 * Henter globale ligainnstillinger (uten sensitive hemmeligheter)
 */
export const getSettings = query({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db.query("league_settings").first();
    return sanitizeSettings(settings);
  },
});

/**
 * Oppdaterer ligainnstillinger (Kun for Administrator)
 */
export const updateSettings = mutation({
  args: {
    adminUserId: v.optional(v.id("users")),
    leagueId: v.optional(v.number()),
    leagueName: v.optional(v.string()),
    currentGameweek: v.optional(v.number()),
    deductTransferHits: v.optional(v.boolean()),
    autoSyncEnabled: v.optional(v.boolean()),
    syncIntervalMinutes: v.optional(v.number()),
    adminPin: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminUserId);

    const { adminUserId, ...settingsArgs } = args;
    const existing = await ctx.db.query("league_settings").first();

    if (!existing) {
      return await ctx.db.insert("league_settings", {
        leagueId: settingsArgs.leagueId || 464734,
        leagueName: settingsArgs.leagueName || "Atlantis Bedriftsliga",
        currentGameweek: settingsArgs.currentGameweek || 1,
        deductTransferHits: settingsArgs.deductTransferHits ?? true,
        autoSyncEnabled: settingsArgs.autoSyncEnabled ?? true,
        syncIntervalMinutes: settingsArgs.syncIntervalMinutes || 10,
        lastSyncedAt: Date.now(),
        adminPin: settingsArgs.adminPin || "1234",
      });
    }

    await ctx.db.patch(existing._id, {
      ...settingsArgs,
      lastSyncedAt: Date.now(),
    });
    return existing._id;
  },
});

/**
 * Henter alle invitasjonskoder (Kun for Administrator)
 */
export const getInviteCodes = query({
  args: {
    adminUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    if (args.adminUserId) {
      await requireAdmin(ctx, args.adminUserId);
    }
    return await ctx.db.query("invite_codes").collect();
  },
});

export const listInviteCodes = query({
  args: {
    adminUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    if (args.adminUserId) {
      await requireAdmin(ctx, args.adminUserId);
    }
    return await ctx.db.query("invite_codes").collect();
  },
});

/**
 * Oppretter eller fornyer en tidsbegrenset invitasjonskode (Kun for Administrator)
 */
export const createInviteCode = mutation({
  args: {
    adminUserId: v.optional(v.id("users")),
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
    await requireAdmin(ctx, args.adminUserId);

    const rawCode = (args.customCode || args.code || `LIGA-${Math.random().toString(36).substring(2, 8)}`).toUpperCase().trim();
    const existing = await ctx.db
      .query("invite_codes")
      .withIndex("by_code", (q) => q.eq("code", rawCode))
      .first();

    const validDays = args.validDays ?? args.durationDays ?? 7;
    const expiresAt = validDays <= 0 || validDays >= 9999
      ? Date.now() + 10 * 365 * 24 * 60 * 60 * 1000
      : Date.now() + validDays * 24 * 60 * 60 * 1000;

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
      createdBy: args.createdBy || args.adminUserId,
      createdAt: Date.now(),
    });
  },
});

/**
 * Sletter en invitasjonskode (Kun for Administrator)
 */
export const deleteInviteCode = mutation({
  args: {
    adminUserId: v.optional(v.id("users")),
    codeId: v.id("invite_codes"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminUserId);

    const existing = await ctx.db.get(args.codeId);
    if (existing) {
      await ctx.db.delete(args.codeId);
    }
    return { success: true };
  },
});

/**
 * Kårer månedens vinner (rom- eller solovinner) (Kun for Administrator)
 */
export const declareMonthWinner = mutation({
  args: {
    adminUserId: v.optional(v.id("users")),
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
    await requireAdmin(ctx, args.adminUserId);

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
 * Fjerner / avpinner en kunngjøring fra skryteveggen (Kun for Administrator)
 */
export const unpinAnnouncement = mutation({
  args: {
    adminUserId: v.optional(v.id("users")),
    announcementId: v.id("announcements"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminUserId);
    await ctx.db.patch(args.announcementId, {
      isPinned: false,
    });
    return { success: true };
  },
});

/**
 * Starter en helt ny sesong (Kun for Administrator)
 */
export const startNewSeason = mutation({
  args: {
    adminUserId: v.optional(v.id("users")),
    seasonYear: v.string(),
    keepRoomStructure: v.boolean(),
    resetAllPoints: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminUserId);

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

    return { success: true };
  },
});

/**
 * Renser databasen 100% og bygger opp 12 rene standardrom (KUN FOR ADMINISTRATOR)
 */
export const wipeAllPreseededData = mutation({
  args: {
    adminUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminUserId);

    // 1. Slett ALLE eksisterende lag og spillere
    const allTeams = await ctx.db.query("fpl_teams").collect();
    for (const t of allTeams) {
      await ctx.db.delete(t._id);
    }

    // 2. Slett ALLE eksisterende rom
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

    // 8. Slett artikler
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

    // 10. Opprett 12 standardrom (A1-A12)
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
      message: "Databasen er nå tilbakestilt. 12 rene standardrom (A1-A12) er opprettet!",
    };
  },
});

/**
 * Sletter alle registrerte brukere (Kun for Administrator)
 */
export const deleteAllUsers = mutation({
  args: {
    adminUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminUserId);

    const users = await ctx.db.query("users").collect();
    for (const u of users) {
      await ctx.db.delete(u._id);
    }
    return { success: true, count: users.length };
  },
});

/**
 * Sletter en enkelt bruker (Kun for Administrator)
 */
export const deleteUser = mutation({
  args: {
    adminUserId: v.optional(v.id("users")),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminUserId);

    await ctx.db.delete(args.userId);
    return { success: true };
  },
});

/**
 * Administrator-funksjon for å koble, endre eller fjerne FPL-lag for en vilkårlig bruker
 */
export const adminLinkUserTeam = mutation({
  args: {
    adminUserId: v.optional(v.id("users")),
    targetUserId: v.id("users"),
    fplEntryId: v.optional(v.number()), // null/undefined for å fjerne tilknytning
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminUserId);

    const targetUser = await ctx.db.get(args.targetUserId);
    if (!targetUser) {
      throw new Error("Brukeren ble ikke funnet.");
    }

    const previousEntryId = targetUser.fplEntryId;

    // Hvis tilknytning skal fjernes
    if (!args.fplEntryId) {
      await ctx.db.patch(args.targetUserId, {
        fplEntryId: undefined,
        fplTeamName: undefined,
        fplManagerName: undefined,
      });

      if (previousEntryId) {
        const prevTeam = await ctx.db
          .query("fpl_teams")
          .withIndex("by_entryId", (q) => q.eq("entryId", previousEntryId))
          .first();
        if (prevTeam && prevTeam.userId === args.targetUserId) {
          await ctx.db.patch(prevTeam._id, {
            userId: undefined,
          });
        }
      }

      return { success: true, message: "Fjernet FPL-lagtilknytning for bruker." };
    }

    // Sjekk om det nye laget er i bruk av en annen bruker
    const existingHolder = await ctx.db
      .query("users")
      .withIndex("by_fplEntryId", (q) => q.eq("fplEntryId", args.fplEntryId!))
      .first();

    if (existingHolder && existingHolder._id !== args.targetUserId) {
      // Fjern tilknytning fra den gamle holderen
      await ctx.db.patch(existingHolder._id, {
        fplEntryId: undefined,
        fplTeamName: undefined,
        fplManagerName: undefined,
      });
    }

    // Hent lagdetaljer
    const team = await ctx.db
      .query("fpl_teams")
      .withIndex("by_entryId", (q) => q.eq("entryId", args.fplEntryId!))
      .first();

    const teamName = team?.teamName || "FPL-lag";
    const managerName = team?.managerName || targetUser.username;

    // Oppdater målbrukeren
    await ctx.db.patch(args.targetUserId, {
      fplEntryId: args.fplEntryId,
      fplTeamName: teamName,
      fplManagerName: managerName,
    });

    // Oppdater fpl_teams
    if (team) {
      await ctx.db.patch(team._id, {
        userId: targetUser._id,
        roomId: targetUser.roomId || team.roomId,
        lastUpdated: Date.now(),
      });
    }

    return {
      success: true,
      fplEntryId: args.fplEntryId,
      teamName,
    };
  },
});

/**
 * Administrator-funksjon for å opprette en manuell bruker direkte
 */
export const createManualUser = mutation({
  args: {
    adminUserId: v.optional(v.id("users")),
    username: v.string(),
    password: v.string(),
    role: v.optional(v.string()), // "user" | "admin"
    roomId: v.optional(v.id("rooms")),
    fplEntryId: v.optional(v.number()),
    fplTeamName: v.optional(v.string()),
    fplManagerName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminUserId);

    const cleanUsername = args.username.trim();
    const cleanPassword = args.password.trim();

    if (!cleanUsername || cleanUsername.length < 2) {
      throw new Error("Brukernavn må være minst 2 tegn.");
    }
    if (!cleanPassword || cleanPassword.length < 4) {
      throw new Error("Passord må være minst 4 tegn.");
    }

    // 1. Sjekk om brukernavnet allerede eksisterer
    const existing = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", cleanUsername))
      .first();

    if (existing) {
      throw new Error(`Brukernavnet "${cleanUsername}" er allerede registrert.`);
    }

    // 2. Sjekk og hent FPL-lagdetaljer
    let teamName = args.fplTeamName?.trim();
    let managerName = args.fplManagerName?.trim() || cleanUsername;

    if (args.fplEntryId) {
      const team = await ctx.db
        .query("fpl_teams")
        .withIndex("by_entryId", (q) => q.eq("entryId", args.fplEntryId!))
        .first();

      if (team) {
        teamName = team.teamName;
        managerName = team.managerName;
      }
    }

    // 3. Hash passordet
    const { hash, salt } = await hashPassword(cleanPassword);

    // 4. Opprett brukeren
    const userId = await ctx.db.insert("users", {
      username: cleanUsername,
      passwordHash: hash,
      passwordSalt: salt,
      role: args.role === "admin" ? "admin" : "user",
      roomId: args.roomId,
      fplEntryId: args.fplEntryId,
      fplTeamName: teamName,
      fplManagerName: managerName,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanUsername)}`,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
    });

    // 5. Knytt fpl_teams til brukeren og eventuelt rom
    if (args.fplEntryId) {
      const existingTeam = await ctx.db
        .query("fpl_teams")
        .withIndex("by_entryId", (q) => q.eq("entryId", args.fplEntryId!))
        .first();

      if (existingTeam) {
        await ctx.db.patch(existingTeam._id, {
          userId,
          roomId: args.roomId || existingTeam.roomId,
          lastUpdated: Date.now(),
        });
      }
    }

    return {
      success: true,
      userId,
      username: cleanUsername,
    };
  },
});

/**
 * Tømmer chat-meldinger for et gitt omfang (Kun for Administrator)
 */
export const adminClearChat = mutation({
  args: {
    adminUserId: v.optional(v.id("users")),
    scope: v.string(), // "all" | "banter" | "room"
    roomId: v.optional(v.id("rooms")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminUserId);

    let messagesToDelete: any[] = [];

    if (args.scope === "banter") {
      messagesToDelete = await ctx.db
        .query("messages")
        .withIndex("by_channel_and_createdAt", (q) => q.eq("channel", "banter"))
        .collect();
    } else if (args.scope === "room") {
      if (args.roomId) {
        messagesToDelete = await ctx.db
          .query("messages")
          .withIndex("by_roomId_and_createdAt", (q) => q.eq("roomId", args.roomId!))
          .collect();
      } else {
        const allRoomMsgs = await ctx.db
          .query("messages")
          .withIndex("by_channel_and_createdAt", (q) => q.eq("channel", "room"))
          .collect();
        messagesToDelete = allRoomMsgs;
      }
    } else {
      // "all" - slett alle meldinger
      messagesToDelete = await ctx.db.query("messages").collect();
    }

    for (const msg of messagesToDelete) {
      await ctx.db.delete(msg._id);
    }

    return {
      success: true,
      deletedCount: messagesToDelete.length,
      scope: args.scope,
    };
  },
});

/**
 * Henter status for rundevinner og ledende rom, inkludert automatiske beregninger og eventuelle overstyringer
 */
export const getRoundAndRoomWinnersStatus = query({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db.query("league_settings").first();
    const currentGw = settings?.currentGameweek || 1;
    const deductHits = settings?.deductTransferHits ?? true;

    // 1. Hent alle lag og rom
    const allTeams = await ctx.db.query("fpl_teams").collect();
    const allRooms = await ctx.db.query("rooms").collect();
    const allUsers = await ctx.db.query("users").collect();

    const roomMap = new Map(allRooms.map((r) => [r._id, r]));
    const userByEntryMap = new Map(allUsers.filter((u) => u.fplEntryId).map((u) => [u.fplEntryId!, u]));

    // 2. Beregn automatisk rundevinner (spiller med høyest score i gjeldende GW)
    const teamsWithScore = allTeams.map((t) => {
      const netPoints = deductHits ? t.currentGwPoints - t.currentGwTransfersCost : t.currentGwPoints;
      const room = t.roomId ? roomMap.get(t.roomId) : null;
      const user = userByEntryMap.get(t.entryId) || null;
      return {
        entryId: t.entryId,
        managerName: t.managerName,
        teamName: t.teamName,
        points: netPoints,
        grossPoints: t.currentGwPoints,
        hits: t.currentGwTransfersCost,
        roomId: t.roomId,
        roomName: room?.name || "Uten rom",
        userUsername: user?.username || null,
        userAvatar: user?.avatar || null,
      };
    });

    teamsWithScore.sort((a, b) => b.points - a.points);
    const autoRoundWinner = teamsWithScore.length > 0 ? teamsWithScore[0] : null;

    // 3. Beregn automatisk romleder for runden
    const roomScores = await ctx.db
      .query("room_gameweek_scores")
      .withIndex("by_gameweek", (q) => q.eq("gameweek", currentGw))
      .collect();

    const roomsWithRoundScore = allRooms.map((room) => {
      const scoreDoc = roomScores.find((s) => s.roomId === room._id);
      const roomTeams = teamsWithScore.filter((t) => t.roomId === room._id);
      roomTeams.sort((a, b) => b.points - a.points);
      const avg = scoreDoc ? scoreDoc.averageTop2 : (roomTeams.length >= 2 ? (roomTeams[0].points + roomTeams[1].points) / 2 : (roomTeams[0]?.points || 0));

      return {
        roomId: room._id,
        roomNumber: room.roomNumber,
        name: room.name,
        accentColor: room.accentColor || "#1eb854",
        score: Math.round(avg * 10) / 10,
        topPlayers: roomTeams.slice(0, 2),
      };
    });

    roomsWithRoundScore.sort((a, b) => b.score - a.score);
    const autoTopRoomRound = roomsWithRoundScore.length > 0 ? roomsWithRoundScore[0] : null;

    // 4. Overstyrt eller aktiv rundevinner
    const isRoundWinnerOverridden = typeof settings?.overrideRoundWinnerEntryId === "number";
    let activeRoundWinner = autoRoundWinner;

    if (isRoundWinnerOverridden) {
      const matchedTeam = teamsWithScore.find((t) => t.entryId === settings!.overrideRoundWinnerEntryId);
      activeRoundWinner = {
        entryId: settings!.overrideRoundWinnerEntryId!,
        managerName: settings!.overrideRoundWinnerName || matchedTeam?.managerName || "Overstyrt vinner",
        teamName: settings!.overrideRoundWinnerTeamName || matchedTeam?.teamName || "FPL-lag",
        points: settings!.overrideRoundWinnerScore ?? (matchedTeam?.points || 0),
        grossPoints: matchedTeam?.grossPoints || 0,
        hits: matchedTeam?.hits || 0,
        roomId: matchedTeam?.roomId,
        roomName: matchedTeam?.roomName || "Overstyrt",
        userUsername: matchedTeam?.userUsername || null,
        userAvatar: matchedTeam?.userAvatar || null,
      };
    }

    // 5. Overstyrt eller aktiv romleder
    const isTopRoomOverridden = !!settings?.overrideTopRoomId;
    let activeTopRoom = autoTopRoomRound;

    if (isTopRoomOverridden && settings?.overrideTopRoomId) {
      const matchedRoom = allRooms.find((r) => r._id === settings!.overrideTopRoomId);
      activeTopRoom = {
        roomId: settings!.overrideTopRoomId,
        roomNumber: matchedRoom?.roomNumber || 1,
        name: matchedRoom?.name || "Overstyrt rom",
        accentColor: matchedRoom?.accentColor || "#1eb854",
        score: settings!.overrideTopRoomScore ?? (roomsWithRoundScore.find((r) => r.roomId === settings!.overrideTopRoomId)?.score || 0),
        topPlayers: roomsWithRoundScore.find((r) => r.roomId === settings!.overrideTopRoomId)?.topPlayers || [],
      };
    }

    return {
      currentGameweek: currentGw,
      deductTransferHits: deductHits,
      autoRoundWinner,
      activeRoundWinner,
      isRoundWinnerOverridden,
      autoTopRoomRound,
      activeTopRoom,
      isTopRoomOverridden,
      allTeamsCandidates: teamsWithScore,
      allRoomsCandidates: roomsWithRoundScore,
    };
  },
});

/**
 * Setter manuelle overstyringer for rundevinner og/eller ledende rom (Kun for Administrator)
 */
export const setRoundAndRoomOverrides = mutation({
  args: {
    adminUserId: v.optional(v.id("users")),
    overrideRoundWinnerEntryId: v.optional(v.number()),
    overrideRoundWinnerName: v.optional(v.string()),
    overrideRoundWinnerTeamName: v.optional(v.string()),
    overrideRoundWinnerScore: v.optional(v.number()),
    overrideTopRoomId: v.optional(v.id("rooms")),
    overrideTopRoomScore: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminUserId);

    const settings = await ctx.db.query("league_settings").first();
    if (!settings) {
      throw new Error("Fant ingen ligainnstillinger.");
    }

    const patchObj: any = {};

    if (args.overrideRoundWinnerEntryId !== undefined) {
      patchObj.overrideRoundWinnerEntryId = args.overrideRoundWinnerEntryId;
      patchObj.overrideRoundWinnerName = args.overrideRoundWinnerName;
      patchObj.overrideRoundWinnerTeamName = args.overrideRoundWinnerTeamName;
      patchObj.overrideRoundWinnerScore = args.overrideRoundWinnerScore;
    }

    if (args.overrideTopRoomId !== undefined) {
      patchObj.overrideTopRoomId = args.overrideTopRoomId;
      patchObj.overrideTopRoomScore = args.overrideTopRoomScore;
    }

    await ctx.db.patch(settings._id, patchObj);
    return { success: true };
  },
});

/**
 * Nullstiller overstyringer for rundevinner og/eller ledende rom (Kun for Administrator)
 */
export const resetRoundAndRoomOverrides = mutation({
  args: {
    adminUserId: v.optional(v.id("users")),
    resetRoundWinner: v.optional(v.boolean()),
    resetTopRoom: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminUserId);

    const settings = await ctx.db.query("league_settings").first();
    if (!settings) return { success: true };

    const patchObj: any = {};

    if (args.resetRoundWinner ?? true) {
      patchObj.overrideRoundWinnerEntryId = undefined;
      patchObj.overrideRoundWinnerName = undefined;
      patchObj.overrideRoundWinnerTeamName = undefined;
      patchObj.overrideRoundWinnerScore = undefined;
    }

    if (args.resetTopRoom ?? true) {
      patchObj.overrideTopRoomId = undefined;
      patchObj.overrideTopRoomScore = undefined;
    }

    await ctx.db.patch(settings._id, patchObj);
    return { success: true };
  },
});
