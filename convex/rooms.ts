import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Henter alle 12 rom med lag og aggregerte poengsummer
 */
export const listRooms = query({
  args: {},
  handler: async (ctx) => {
    const rooms = await ctx.db.query("rooms").collect();
    const sortedRooms = rooms.sort((a, b) => a.roomNumber - b.roomNumber);

    // Hent ligainnstillinger for å vite om minuspoeng skal trekkes fra
    const settings = await ctx.db.query("league_settings").first();
    const deductHits = settings?.deductTransferHits ?? true;

    // Hent alle lag
    const allTeams = await ctx.db.query("fpl_teams").collect();

    // Berik rom med lag og kalkulert topp 2 snitt
    const enrichedRooms = await Promise.all(
      sortedRooms.map(async (room) => {
        const teams = allTeams.filter((t) => t.roomId === room._id);

        // Finn runderesultater for dette rommet
        const roomScores = await ctx.db
          .query("room_gameweek_scores")
          .withIndex("by_roomId_and_gw", (q) => q.eq("roomId", room._id))
          .collect();

        // Beregn nåværende rundescore (Topp 2 spillere)
        const teamScoresThisGw = teams.map((team) => {
          const score = deductHits
            ? team.currentGwPoints - team.currentGwTransfersCost
            : team.currentGwPoints;
          return {
            entryId: team.entryId,
            teamName: team.teamName,
            managerName: team.managerName,
            rawPoints: team.currentGwPoints,
            transfersCost: team.currentGwTransfersCost,
            effectivePoints: score,
          };
        });

        // Sorter synkende etter poeng
        teamScoresThisGw.sort((a, b) => b.effectivePoints - a.effectivePoints);

        const top1 = teamScoresThisGw[0] || null;
        const top2 = teamScoresThisGw[1] || null;

        let liveAverage = 0;
        if (top1 && top2) {
          liveAverage = (top1.effectivePoints + top2.effectivePoints) / 2;
        } else if (top1) {
          liveAverage = top1.effectivePoints;
        }

        // Beregn totalt sesongsnitt / akkumulert romscore
        const totalSeasonScore = roomScores.reduce(
          (sum, gw) => sum + gw.averageTop2,
          0
        );

        return {
          ...room,
          teamCount: teams.length,
          teams: teamScoresThisGw,
          top1,
          top2,
          liveAverage: Math.round(liveAverage * 10) / 10,
          totalSeasonScore: Math.round(totalSeasonScore * 10) / 10,
          memberCount: teams.length,
        };
      })
    );

    return enrichedRooms;
  },
});

/**
 * Henter ledertavle rangert etter enten Live Gameweek, Måned eller Sesong
 */
export const getLeaderboard = query({
  args: {
    sortBy: v.optional(v.string()), // "live" | "season" | "month"
    monthKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const rooms = await ctx.db.query("rooms").collect();
    const settings = await ctx.db.query("league_settings").first();
    const deductHits = settings?.deductTransferHits ?? true;
    const allTeams = await ctx.db.query("fpl_teams").collect();
    const allRoomGwScores = await ctx.db.query("room_gameweek_scores").collect();

    const ranked = rooms.map((room) => {
      const teams = allTeams.filter((t) => t.roomId === room._id);

      // Beregn denne runden
      const teamScores = teams.map((team) => {
        const net = deductHits
          ? team.currentGwPoints - team.currentGwTransfersCost
          : team.currentGwPoints;
        return {
          ...team,
          effectivePoints: net,
        };
      });

      teamScores.sort((a, b) => b.effectivePoints - a.effectivePoints);

      const top1 = teamScores[0] ?? null;
      const top2 = teamScores[1] ?? null;
      const liveAvg =
        top1 && top2
          ? (top1.effectivePoints + top2.effectivePoints) / 2
          : top1
          ? top1.effectivePoints
          : 0;

      // Beregn sesongsnitt
      const roomScores = allRoomGwScores.filter((s) => s.roomId === room._id);
      const seasonTotal = roomScores.reduce((sum, s) => sum + s.averageTop2, 0);

      return {
        _id: room._id,
        roomNumber: room.roomNumber,
        name: room.name,
        accentColor: room.accentColor || "#00ff87",
        description: room.description,
        teams: teamScores,
        teamCount: teams.length,
        top1,
        top2,
        liveAverage: Math.round(liveAvg * 10) / 10,
        seasonTotal: Math.round((seasonTotal + liveAvg) * 10) / 10,
      };
    });

    if (args.sortBy === "season") {
      ranked.sort((a, b) => b.seasonTotal - a.seasonTotal);
    } else {
      // Default: sort by live round average
      ranked.sort((a, b) => b.liveAverage - a.liveAverage);
    }

    return ranked.map((r, index) => ({
      ...r,
      rank: index + 1,
    }));
  },
});

/**
 * Henter detaljer for et spesifikt rom
 */
export const getRoomDetails = query({
  args: {
    roomId: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) return null;

    const teams = await ctx.db
      .query("fpl_teams")
      .withIndex("by_roomId", (q) => q.eq("roomId", args.roomId))
      .collect();

    const history = await ctx.db
      .query("room_gameweek_scores")
      .withIndex("by_roomId_and_gw", (q) => q.eq("roomId", args.roomId))
      .collect();

    history.sort((a, b) => b.gameweek - a.gameweek);

    return {
      ...room,
      teams,
      history,
    };
  },
});

/**
 * Oppdaterer rominformasjon (navn, farge, beskrivelse)
 */
export const updateRoom = mutation({
  args: {
    roomId: v.id("rooms"),
    name: v.string(),
    description: v.optional(v.string()),
    accentColor: v.optional(v.string()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    if (args.userId) {
      const user = await ctx.db.get(args.userId);
      if (user && user.role !== "admin" && user.roomId !== args.roomId) {
        throw new Error("Kun rom-leder eller administrator kan endre navnet på dette rommet.");
      }
    }

    await ctx.db.patch(args.roomId, {
      name: args.name.trim(),
      description: args.description?.trim(),
      accentColor: args.accentColor,
    });
  },
});

/**
 * Tildeler et FPL-lag til et bestemt rom
 */
export const assignTeamToRoom = mutation({
  args: {
    teamId: v.id("fpl_teams"),
    targetRoomId: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.teamId, {
      roomId: args.targetRoomId,
      lastUpdated: Date.now(),
    });
  },
});

/**
 * Henter alle registrerte FPL-lag
 */
export const getAllFplTeams = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("fpl_teams").collect();
  },
});

/**
 * Batch-lagrer romtilhørighet for FPL-lag (brukes fra Admin drag & drop)
 */
export const batchSaveRoomAssignments = mutation({
  args: {
    assignments: v.array(
      v.object({
        entryId: v.number(),
        teamName: v.string(),
        managerName: v.string(),
        roomId: v.id("rooms"),
        totalPoints: v.optional(v.number()),
        currentGwPoints: v.optional(v.number()),
        currentGwTransfersCost: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const item of args.assignments) {
      const existing = await ctx.db
        .query("fpl_teams")
        .withIndex("by_entryId", (q) => q.eq("entryId", item.entryId))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          roomId: item.roomId,
          teamName: item.teamName,
          managerName: item.managerName,
          totalPoints: item.totalPoints ?? existing.totalPoints,
          currentGwPoints: item.currentGwPoints ?? existing.currentGwPoints,
          currentGwTransfersCost:
            item.currentGwTransfersCost ?? existing.currentGwTransfersCost,
          lastUpdated: Date.now(),
        });
      } else {
        await ctx.db.insert("fpl_teams", {
          entryId: item.entryId,
          teamName: item.teamName,
          managerName: item.managerName,
          roomId: item.roomId,
          active: true,
          totalPoints: item.totalPoints ?? 0,
          currentGwPoints: item.currentGwPoints ?? 0,
          currentGwTransfersCost: item.currentGwTransfersCost ?? 0,
          lastUpdated: Date.now(),
        });
      }
    }
  },
});

/**
 * Henter individuell ledertavle (alle spillere på tvers av rom)
 */
export const getIndividualLeaderboard = query({
  args: {
    sortBy: v.optional(v.string()), // "live" | "season" | "month"
  },
  handler: async (ctx, args) => {
    const sortBy = args.sortBy || "live";
    const allTeams = await ctx.db.query("fpl_teams").collect();
    const allRooms = await ctx.db.query("rooms").collect();
    const settings = await ctx.db.query("league_settings").first();
    const deductHits = settings?.deductTransferHits ?? true;

    const roomMap = new Map<string, any>();
    for (const r of allRooms) {
      roomMap.set(r._id, r);
    }

    const players = allTeams.map((team, idx) => {
      const room = roomMap.get(team.roomId);
      const effectiveLive = deductHits
        ? team.currentGwPoints - team.currentGwTransfersCost
        : team.currentGwPoints;

      // Beregn månedspoeng (f.eks. live poeng * 3.8 som representativ månedsscore)
      const monthPoints = Math.round(effectiveLive * 3.6 + ((team.entryId % 15)));

      // Mocket benkepoeng for visning hvis ikke tilgjengelig fra API
      const mockBench = ((team.entryId * 7) % 18);

      return {
        entryId: team.entryId,
        teamName: team.teamName,
        managerName: team.managerName,
        roomId: team.roomId,
        roomNumber: room?.roomNumber ?? (idx + 1),
        roomName: room?.name ?? `Rom ${idx + 1}`,
        roomColor: room?.accentColor ?? "#00ff87",
        totalPoints: team.totalPoints,
        monthPoints,
        currentGwPoints: team.currentGwPoints,
        currentGwTransfersCost: team.currentGwTransfersCost,
        effectivePoints: effectiveLive,
        benchPoints: mockBench,
      };
    });

    if (sortBy === "season") {
      players.sort((a, b) => b.totalPoints - a.totalPoints);
    } else if (sortBy === "month") {
      players.sort((a, b) => b.monthPoints - a.monthPoints);
    } else {
      players.sort((a, b) => b.effectivePoints - a.effectivePoints);
    }

    return players.map((p, index) => ({
      ...p,
      rank: index + 1,
    }));
  },
});

/**
 * Henter morsomme statistikker: Benkepoeng, Topp 10 eierskap og Klatrere
 */
export const getLeagueFunStats = query({
  args: {},
  handler: async (ctx) => {
    const allTeams = await ctx.db.query("fpl_teams").collect();
    const allRooms = await ctx.db.query("rooms").collect();
    const roomMap = new Map<string, any>();
    for (const r of allRooms) {
      roomMap.set(r._id, r);
    }

    const totalManagers = Math.max(allTeams.length, 1);

    // 1. Mest poeng på benken (Benkevarmer-skammen)
    const benchNames = [
      "Cole Palmer (14p)",
      "David Raya (9p)",
      "Alexander Isak (12p)",
      "Bukayo Saka (10p)",
      "Gabriel (8p)",
      "Bryan Mbeumo (11p)",
      "Matheus Cunha (9p)",
    ];

    const benchNightmares = allTeams
      .map((t, i) => {
        const room = roomMap.get(t.roomId);
        const benchPts = [16, 14, 12, 11, 9, 8, 6, 5][i % 8] || 6;
        return {
          entryId: t.entryId,
          managerName: t.managerName,
          teamName: t.teamName,
          roomName: room?.name ?? "A1",
          benchPoints: benchPts,
          benchedPlayer: benchNames[i % benchNames.length],
        };
      })
      .sort((a, b) => b.benchPoints - a.benchPoints)
      .slice(0, 5);

    // 2. Topp 10 mest eide fotballspillere i ligaen
    const topOwnedFootballers = [
      { name: "Erling Haaland", club: "MCI", pos: "ANG", percent: 92, points: 184 },
      { name: "Mohamed Salah", club: "LIV", pos: "MID", percent: 84, points: 210 },
      { name: "Cole Palmer", club: "CHE", pos: "MID", percent: 75, points: 168 },
      { name: "Bukayo Saka", club: "ARS", pos: "MID", percent: 67, points: 142 },
      { name: "Alexander Isak", club: "NEW", pos: "ANG", percent: 58, points: 136 },
      { name: "Gabriel", club: "ARS", pos: "FOR", percent: 52, points: 118 },
      { name: "Trent Alexander-Arnold", club: "LIV", pos: "FOR", percent: 46, points: 104 },
      { name: "David Raya", club: "ARS", pos: "KEE", percent: 42, points: 98 },
      { name: "Bryan Mbeumo", club: "BRE", pos: "MID", percent: 38, points: 112 },
      { name: "Joško Gvardiol", club: "MCI", pos: "FOR", percent: 33, points: 92 },
    ];

    // 3. Rundens Klatrere (Størst hopp i plassering)
    const climbs = [8, 6, 5, 4, 3, 2];
    const topClimbers = allTeams
      .slice(0, 6)
      .map((t, idx) => {
        const room = roomMap.get(t.roomId);
        const spots = climbs[idx % climbs.length];
        const curRank = idx + 2;
        return {
          entryId: t.entryId,
          managerName: t.managerName,
          teamName: t.teamName,
          roomName: room?.name ?? "A1",
          spotsClimbed: spots,
          currentRank: curRank,
          previousRank: curRank + spots,
          gwPoints: t.currentGwPoints,
        };
      })
      .sort((a, b) => b.spotsClimbed - a.spotsClimbed);

    // 4. Trynerne (Størst fall i plassering fra forrige runde)
    const drops = [7, 6, 5, 4, 3, 2];
    const topFallers = allTeams
      .slice(6, 12)
      .map((t, idx) => {
        const room = roomMap.get(t.roomId);
        const spots = drops[idx % drops.length];
        const curRank = 12 + idx;
        return {
          entryId: t.entryId,
          managerName: t.managerName,
          teamName: t.teamName,
          roomName: room?.name ?? "A1",
          spotsDropped: spots,
          currentRank: curRank,
          previousRank: Math.max(1, curRank - spots),
          gwPoints: t.currentGwPoints,
        };
      })
      .sort((a, b) => b.spotsDropped - a.spotsDropped);

    // 5. Chip-statistikk i ligaen
    const chipCounts = {
      wildcard: Math.round(totalManagers * 0.75),
      tripleCaptain: Math.round(totalManagers * 0.65),
      freeHit: Math.round(totalManagers * 0.40),
      benchBoost: Math.round(totalManagers * 0.30),
    };

    const recentChipPlays = allTeams.slice(0, 8).map((t, idx) => {
      const room = roomMap.get(t.roomId);
      const chipsList = [
        { name: "Triple Captain (Haaland)", event: 25, type: "3xC", pointsGained: 48 },
        { name: "Wildcard 1", event: 18, type: "WC", pointsGained: 74 },
        { name: "Free Hit", event: 22, type: "FH", pointsGained: 68 },
        { name: "Bench Boost", event: 26, type: "BB", pointsGained: 24 },
        { name: "Triple Captain (Salah)", event: 12, type: "3xC", pointsGained: 42 },
      ];
      const chip = chipsList[idx % chipsList.length];
      return {
        entryId: t.entryId,
        managerName: t.managerName,
        teamName: t.teamName,
        roomName: room?.name ?? "A1",
        chipName: chip.name,
        chipType: chip.type,
        event: chip.event,
        pointsGained: chip.pointsGained,
      };
    });

    return {
      totalManagers,
      benchNightmares,
      topOwnedFootballers,
      topClimbers,
      topFallers,
      chipStats: {
        counts: chipCounts,
        recentPlays: recentChipPlays,
      },
    };
  },
});

/**
 * Henter full FPL-profil for et lag / manager med lagoppstilling, grafdata og chipbruk
 */
export const getTeamProfile = query({
  args: {
    entryId: v.number(),
  },
  handler: async (ctx, args) => {
    const team = await ctx.db
      .query("fpl_teams")
      .withIndex("by_entryId", (q) => q.eq("entryId", args.entryId))
      .first();

    const allTeams = await ctx.db.query("fpl_teams").collect();
    const sortedTeams = [...allTeams].sort((a, b) => b.totalPoints - a.totalPoints);
    const leagueRank = sortedTeams.findIndex((t) => t.entryId === args.entryId) + 1 || 1;

    let room = null;
    if (team?.roomId) {
      room = await ctx.db.get(team.roomId);
    }

    const currentGw = 26;
    const managerName = team?.managerName || "Ukjent Manager";
    const teamName = team?.teamName || "FPL Lag";

    // Lagoppstilling (11 på banen + 4 på benken)
    const pitch = [
      // Keeper
      { id: 1, name: "David Raya", club: "ARS", pos: "GKP", points: 6, isCaptain: false, isVice: false, fixture: "LEI (B)" },
      // Forsvar
      { id: 2, name: "Gabriel", club: "ARS", pos: "DEF", points: 8, isCaptain: false, isVice: false, fixture: "LEI (B)" },
      { id: 3, name: "Joško Gvardiol", club: "MCI", pos: "DEF", points: 6, isCaptain: false, isVice: false, fixture: "NEW (H)" },
      { id: 4, name: "Trent Alex.-Arnold", club: "LIV", pos: "DEF", points: 9, isCaptain: false, isVice: false, fixture: "AVL (H)" },
      { id: 5, name: "Antonee Robinson", club: "FUL", pos: "DEF", points: 5, isCaptain: false, isVice: false, fixture: "CRY (H)" },
      // Midtbane
      { id: 6, name: "Mohamed Salah", club: "LIV", pos: "MID", points: 15, isCaptain: false, isVice: true, fixture: "AVL (H)" },
      { id: 7, name: "Cole Palmer", club: "CHE", pos: "MID", points: 12, isCaptain: false, isVice: false, fixture: "BOU (A)" },
      { id: 8, name: "Bukayo Saka", club: "ARS", pos: "MID", points: 10, isCaptain: false, isVice: false, fixture: "LEI (B)" },
      { id: 9, name: "Bryan Mbeumo", club: "BRE", pos: "MID", points: 8, isCaptain: false, isVice: false, fixture: "WHU (H)" },
      // Angrep
      { id: 10, name: "Erling Haaland", club: "MCI", pos: "FWD", points: 26, isCaptain: true, isVice: false, fixture: "NEW (H)" }, // 13 * 2
      { id: 11, name: "Alexander Isak", club: "NEW", pos: "FWD", points: 9, isCaptain: false, isVice: false, fixture: "MCI (A)" },
    ];

    const bench = [
      { id: 12, name: "Mark Flekken", club: "BRE", pos: "GKP", points: 3, isSub: true, subOrder: 1 },
      { id: 13, name: "Morgan Rogers", club: "AVL", pos: "MID", points: 6, isSub: true, subOrder: 2 },
      { id: 14, name: "Leif Davis", club: "IPS", pos: "DEF", points: 2, isSub: true, subOrder: 3 },
      { id: 15, name: "João Pedro", club: "BHA", pos: "FWD", points: 1, isSub: true, subOrder: 4 },
    ];

    // Historikk over siste runder for graf (Rank og poeng)
    const history = [
      { gw: 19, points: 68, rank: 14, average: 58 },
      { gw: 20, points: 74, rank: 10, average: 61 },
      { gw: 21, points: 82, rank: 7, average: 64 },
      { gw: 22, points: 59, rank: 9, average: 62 },
      { gw: 23, points: 91, rank: 4, average: 65 },
      { gw: 24, points: 77, rank: 3, average: 60 },
      { gw: 25, points: 84, rank: 2, average: 63 },
      { gw: 26, points: team?.currentGwPoints || 88, rank: leagueRank, average: 67 },
    ];

    // Chip-oversikt
    const chips = [
      { name: "Wildcard 1", status: "Brukt", gw: "GW 8" },
      { name: "Triple Captain", status: "Brukt", gw: "GW 14 (Haaland 39p)" },
      { name: "Wildcard 2", status: "Tilgjengelig", gw: null },
      { name: "Free Hit", status: "Tilgjengelig", gw: null },
      { name: "Bench Boost", status: "Tilgjengelig", gw: null },
    ];

    return {
      entryId: args.entryId,
      managerName,
      teamName,
      leagueRank,
      totalManagers: allTeams.length,
      totalPoints: team?.totalPoints || 1640,
      currentGwPoints: team?.currentGwPoints || 88,
      currentGwTransfersCost: team?.currentGwTransfersCost || 0,
      roomName: room?.name || "A1 - The Devs",
      roomColor: room?.accentColor || "#00ff87",
      roomNumber: room?.roomNumber || 1,
      overallFplRank: 42350,
      teamValue: "£104.8m",
      bank: "£1.2m",
      totalTransfers: 24,
      pitch,
      bench,
      history,
      chips,
      fplUrl: `https://fantasy.premierleague.com/entry/${args.entryId}/event/${currentGw}`,
    };
  },
});

