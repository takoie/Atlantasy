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
 * Oppretter et nytt rom
 */
export const createRoom = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    accentColor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingRooms = await ctx.db.query("rooms").collect();
    const maxNumber = existingRooms.reduce(
      (max, r) => Math.max(max, r.roomNumber || 0),
      0
    );

    const colors = [
      "#1eb854", "#1fd65f", "#d99330", "#38bdf8",
      "#a855f7", "#ec4899", "#f59e0b", "#10b981",
      "#6366f1", "#14b8a6", "#84cc16", "#e11d48"
    ];
    const defaultColor = colors[maxNumber % colors.length] || "#1eb854";

    const roomId = await ctx.db.insert("rooms", {
      roomNumber: maxNumber + 1,
      name: args.name.trim() || `A${maxNumber + 1}`,
      description: args.description?.trim(),
      accentColor: args.accentColor || defaultColor,
      createdAt: Date.now(),
    });

    return roomId;
  },
});

/**
 * Sletter et rom og frigjør/sletter tilhørende lag og historikk
 */
export const deleteRoom = mutation({
  args: {
    roomId: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.roomId);

    const teamsInRoom = await ctx.db
      .query("fpl_teams")
      .withIndex("by_roomId", (q) => q.eq("roomId", args.roomId))
      .collect();

    for (const t of teamsInRoom) {
      await ctx.db.delete(t._id);
    }

    const roomScores = await ctx.db
      .query("room_gameweek_scores")
      .withIndex("by_roomId_and_gw", (q) => q.eq("roomId", args.roomId))
      .collect();

    for (const rs of roomScores) {
      await ctx.db.delete(rs._id);
    }
  },
});

/**
 * Endrer lagnavn for et FPL-lag i databasen
 */
export const updateTeamName = mutation({
  args: {
    entryId: v.number(),
    newTeamName: v.string(),
  },
  handler: async (ctx, args) => {
    const team = await ctx.db
      .query("fpl_teams")
      .withIndex("by_entryId", (q) => q.eq("entryId", args.entryId))
      .first();

    if (team) {
      await ctx.db.patch(team._id, {
        teamName: args.newTeamName.trim(),
        lastUpdated: Date.now(),
      });
    }
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
 * Tømmer alle lag fra rommene og sletter mock/lag-data slik at rommene er helt rene for ekte data
 */
export const clearAllRoomAssignments = mutation({
  args: {},
  handler: async (ctx) => {
    const allTeams = await ctx.db.query("fpl_teams").collect();
    for (const t of allTeams) {
      await ctx.db.delete(t._id);
    }
    const allScores = await ctx.db.query("gameweek_scores").collect();
    for (const s of allScores) {
      await ctx.db.delete(s._id);
    }
    const allRoomScores = await ctx.db.query("room_gameweek_scores").collect();
    for (const rs of allRoomScores) {
      await ctx.db.delete(rs._id);
    }
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
    clearUnassigned: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const assignedEntryIds = new Set(args.assignments.map((a) => a.entryId));

    if (args.clearUnassigned) {
      const allExisting = await ctx.db.query("fpl_teams").collect();
      for (const t of allExisting) {
        if (!assignedEntryIds.has(t.entryId)) {
          await ctx.db.delete(t._id);
        }
      }
    }

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

      return {
        entryId: team.entryId,
        teamName: team.teamName,
        managerName: team.managerName,
        roomId: team.roomId,
        roomNumber: room?.roomNumber ?? (idx + 1),
        roomName: room?.name ?? `Rom ${idx + 1}`,
        roomColor: room?.accentColor ?? "#1eb854",
        totalPoints: team.totalPoints ?? 0,
        monthPoints: team.totalPoints ?? 0,
        currentGwPoints: team.currentGwPoints ?? 0,
        currentGwTransfersCost: team.currentGwTransfersCost ?? 0,
        effectivePoints: effectiveLive,
        benchPoints: 0,
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
 * Henter reelle og underholdende statistikker for ligaen med støtte for tidsrom (runde, måned, sesong)
 */
export const getLeagueFunStats = query({
  args: {
    timeframe: v.optional(v.string()), // "round" | "month" | "season"
  },
  handler: async (ctx, args) => {
    const timeframe = args.timeframe || "round";
    const allTeams = await ctx.db.query("fpl_teams").collect();
    const allRooms = await ctx.db.query("rooms").collect();
    const settings = await ctx.db.query("league_settings").first();
    const currentGw = settings?.currentGameweek ?? 1;

    const roomMap = new Map<string, any>();
    for (const r of allRooms) {
      roomMap.set(r._id, r);
    }

    const totalManagers = allTeams.length;

    // Sortert etter live GW-poeng eller sesongpoeng
    const sortedByScore = [...allTeams].sort((a, b) => {
      if (timeframe === "season") return b.totalPoints - a.totalPoints;
      return b.currentGwPoints - a.currentGwPoints;
    });

    // 1. Benkevarmer-skammen (kun reelle benkepoeng fra databasen)
    const benchNightmares = allTeams
      .filter((t) => (t as any).benchPoints && (t as any).benchPoints > 0)
      .map((t) => {
        const room = roomMap.get(t.roomId);
        return {
          entryId: t.entryId,
          managerName: t.managerName,
          teamName: t.teamName,
          roomName: room?.name ?? "Rom",
          benchPoints: (t as any).benchPoints || 0,
          benchedPlayer: (t as any).benchedPlayer || "Benk",
        };
      })
      .sort((a, b) => b.benchPoints - a.benchPoints)
      .slice(0, 8);

    // 2. Kapteinslotteriet & Kapteinsblemmen (kun dersom kaptein er registrert på lag)
    const teamsWithCaptains = allTeams.filter((t) => (t as any).captainName);
    const captainSuccess = teamsWithCaptains
      .map((t) => {
        const room = roomMap.get(t.roomId);
        const captainName = (t as any).captainName;
        const pts = (t as any).captainPoints || 0;
        return {
          entryId: t.entryId,
          managerName: t.managerName,
          teamName: t.teamName,
          roomName: room?.name ?? "Rom",
          captainName,
          points: pts * 2,
          rawPoints: pts,
        };
      })
      .sort((a, b) => b.points - a.points);

    const topCaptains = captainSuccess.slice(0, 5);
    const captainFails = [...captainSuccess].reverse().slice(0, 5);

    // Kapteinsfordeling i prosent
    const captainCounts = new Map<string, number>();
    captainSuccess.forEach((c) => {
      captainCounts.set(c.captainName, (captainCounts.get(c.captainName) || 0) + 1);
    });

    const captainDistribution = Array.from(captainCounts.entries())
      .map(([name, count]) => ({
        name,
        count,
        percent: teamsWithCaptains.length > 0 ? Math.round((count / teamsWithCaptains.length) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 3. Hit-jegeren & Overgangskaos (kun reelle transfer hits)
    const topHitTakers = allTeams
      .filter((t) => (t.currentGwTransfersCost && t.currentGwTransfersCost > 0) || ((t as any).totalHitsCost && (t as any).totalHitsCost > 0))
      .map((t) => {
        const room = roomMap.get(t.roomId);
        const gwHits = t.currentGwTransfersCost || 0;
        const totalHits = (t as any).totalHitsCost || gwHits;
        const hits = timeframe === "season" ? totalHits : gwHits;

        return {
          entryId: t.entryId,
          managerName: t.managerName,
          teamName: t.teamName,
          roomName: room?.name ?? "Rom",
          gwHits: hits,
          totalHits,
          hitsCount: Math.round(hits / 4),
        };
      })
      .sort((a, b) => b.gwHits - a.gwHits);

    const totalLeagueHits = topHitTakers.reduce((sum, t) => sum + t.gwHits, 0);

    // 4. Differensialer (populeres når runder starter og picks synkroniseres)
    const differentials: any[] = [];

    // 5. Formel 1-Poengtabell (beregnes kun hvis lag har spilt og fått poeng)
    const teamsWithPoints = sortedByScore.filter((t) => (timeframe === "season" ? t.totalPoints > 0 : t.currentGwPoints > 0));
    const f1PointsScale = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
    const f1Standings = teamsWithPoints.map((team, idx) => {
      const f1Pts = idx < f1PointsScale.length ? f1PointsScale[idx] : 0;
      const room = roomMap.get(team.roomId);
      return {
        entryId: team.entryId,
        managerName: team.managerName,
        teamName: team.teamName,
        roomName: room?.name ?? "Rom",
        f1Rank: idx + 1,
        f1Points: f1Pts,
        fplGwPoints: timeframe === "season" ? team.totalPoints : team.currentGwPoints,
        fplSeasonPoints: team.totalPoints,
        podiums: idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : "",
      };
    });

    // 6. Auto-Sub Mirakler (kun reelle auto subs)
    const autoSubs: any[] = [];

    // 7. Drømmeellever & Skrekkellever i ligaen (populeres fra live fpl-synk)
    const dreamXI: any[] = [];
    const nightmareXI: any[] = [];

    // 8. Topp mest eide fotballspillere i ligaen (populeres ved synk)
    const topOwnedFootballers: any[] = [];

    // 9. Rundens Klatrere & Trynerne (populeres etter at runder spilles)
    const topClimbers: any[] = [];
    const topFallers: any[] = [];

    // 10. Chip-statistikk i ligaen (kun reelle spilte chips)
    const chipCounts = {
      wildcard: 0,
      tripleCaptain: 0,
      freeHit: 0,
      benchBoost: 0,
    };

    const recentChipPlays: any[] = [];

    return {
      timeframe,
      totalManagers,
      benchNightmares,
      captainStats: {
        topCaptains,
        captainFails,
        distribution: captainDistribution,
      },
      transferHitStats: {
        topHitTakers,
        totalLeagueHits,
      },
      differentialStats: differentials,
      f1Standings,
      autoSubStats: autoSubs,
      dreamAndNightmareXI: {
        dreamTeam: dreamXI,
        nightmareTeam: nightmareXI,
      },
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
 * Henter FPL-profil for et lag / manager med reelle lag- og lagoppstillingsdata
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

    const settings = await ctx.db.query("league_settings").first();
    const currentGw = settings?.currentGameweek ?? 1;
    const managerName = team?.managerName || "Ukjent Manager";
    const teamName = team?.teamName || "FPL Lag";

    // Standard tilgjengelige chips for enhver FPL manager
    const chips = [
      { name: "Wildcard 1", status: "Tilgjengelig", gw: null },
      { name: "Triple Captain", status: "Tilgjengelig", gw: null },
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
      totalPoints: team?.totalPoints ?? 0,
      currentGwPoints: team?.currentGwPoints ?? 0,
      currentGwTransfersCost: team?.currentGwTransfersCost ?? 0,
      roomName: room?.name ?? "Ikke tildelt rom",
      roomColor: room?.accentColor ?? "#1eb854",
      roomNumber: room?.roomNumber ?? 1,
      overallFplRank: null,
      teamValue: "£100.0m",
      bank: "£0.0m",
      totalTransfers: 0,
      pitch: [],
      bench: [],
      history: [],
      chips,
      fplUrl: `https://fantasy.premierleague.com/entry/${args.entryId}/event/${currentGw}`,
    };
  },
});

