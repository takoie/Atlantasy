import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./security";
import { buildCupPlan, type CupPlan } from "./cupEngine";
import { roomAccentColor } from "./roomColors";

/** Eldre formatnavn -> nye, generiske navn. */
function normalizeFormat(format: string): string {
  const map: Record<string, string> = {
    lucky_loser_12: "lucky_loser",
    double_elimination_12: "double_elimination",
    top8_single: "single_elimination",
    group_stage_12: "group_stage",
  };
  return map[format] ?? format;
}

/**
 * Gjør en generert plan om til cup_matches-rader og kobler nextMatchId i to steg.
 */
async function persistCupPlan(
  ctx: any,
  cupId: any,
  plan: CupPlan,
  seededRooms: any[],
  startGw: number
) {
  const now = Date.now();
  const keyToId = new Map<string, any>();

  for (const m of plan.matches) {
    const id = await ctx.db.insert("cup_matches", {
      cupId,
      bracketType: m.bracketType,
      stage: m.stage,
      group: m.group,
      roundNumber: m.roundNumber,
      roundTitle: m.roundTitle,
      matchIndex: m.matchIndex,
      gameweek: startGw + (m.roundNumber - 1),
      room1Id: m.seed1 != null ? seededRooms[m.seed1]?._id : undefined,
      room2Id: m.seed2 != null ? seededRooms[m.seed2]?._id : undefined,
      isLuckyLoser: m.isLuckyLoser || undefined,
      status: "scheduled",
      updatedAt: now,
    });
    keyToId.set(m.key, id);
  }

  for (const m of plan.matches) {
    const patch: Record<string, any> = {};
    if (m.nextWinnerKey && keyToId.has(m.nextWinnerKey)) {
      patch.nextMatchId = keyToId.get(m.nextWinnerKey);
      patch.nextMatchSlot = m.nextWinnerSlot ?? 1;
    }
    if (m.nextLoserKey && keyToId.has(m.nextLoserKey)) {
      patch.nextLoserMatchId = keyToId.get(m.nextLoserKey);
      patch.nextLoserMatchSlot = m.nextLoserSlot ?? 1;
    }
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(keyToId.get(m.key), patch);
    }
  }
}

/**
 * Convex Modul for Cup & Sluttspill (Flere Turneringsformater)
 */

/**
 * Henter alle opprettede cuper
 */
export const listCups = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("cups").order("desc").collect();
  },
});

/**
 * Henter aktiv eller nyeste cup med alle kamper og tilknyttede rom-detaljer
 */
export const getActiveCup = query({
  args: {},
  handler: async (ctx) => {
    let cup = await ctx.db
      .query("cups")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .first();

    if (!cup) {
      cup = await ctx.db.query("cups").order("desc").first();
    }

    if (!cup) return null;

    const matches = await ctx.db
      .query("cup_matches")
      .withIndex("by_cupId", (q) => q.eq("cupId", cup!._id))
      .collect();

    const rooms = await ctx.db.query("rooms").collect();
    const roomMap = new Map(rooms.map((r) => [r._id, { ...r, accentColor: roomAccentColor(r.roomNumber) }]));

    const populatedMatches = matches.map((m) => ({
      ...m,
      room1: m.room1Id ? roomMap.get(m.room1Id) || null : null,
      room2: m.room2Id ? roomMap.get(m.room2Id) || null : null,
      winnerRoom: m.winnerRoomId ? roomMap.get(m.winnerRoomId) || null : null,
      loserRoom: m.loserRoomId ? roomMap.get(m.loserRoomId) || null : null,
    }));

    // Gruppespilltabell med romdetaljer hvis gruppespill
    let populatedGroupStandings = null;
    if (cup.groupStandings && cup.groupStandings.length > 0) {
      populatedGroupStandings = cup.groupStandings.map((gs) => ({
        ...gs,
        room: roomMap.get(gs.roomId) || null,
      }));
    }

    return {
      ...cup,
      winnerRoom: cup.winnerRoomId ? roomMap.get(cup.winnerRoomId) || null : null,
      runnerUpRoom: cup.runnerUpRoomId ? roomMap.get(cup.runnerUpRoomId) || null : null,
      matches: populatedMatches,
      groupStandings: populatedGroupStandings,
    };
  },
});

/**
 * Henter spesifikk cup med ID
 */
export const getCupDetails = query({
  args: { cupId: v.id("cups") },
  handler: async (ctx, args) => {
    const cup = await ctx.db.get(args.cupId);
    if (!cup) return null;

    const matches = await ctx.db
      .query("cup_matches")
      .withIndex("by_cupId", (q) => q.eq("cupId", cup._id))
      .collect();

    const rooms = await ctx.db.query("rooms").collect();
    const roomMap = new Map(rooms.map((r) => [r._id, { ...r, accentColor: roomAccentColor(r.roomNumber) }]));

    const populatedMatches = matches.map((m) => ({
      ...m,
      room1: m.room1Id ? roomMap.get(m.room1Id) || null : null,
      room2: m.room2Id ? roomMap.get(m.room2Id) || null : null,
      winnerRoom: m.winnerRoomId ? roomMap.get(m.winnerRoomId) || null : null,
      loserRoom: m.loserRoomId ? roomMap.get(m.loserRoomId) || null : null,
    }));

    let populatedGroupStandings = null;
    if (cup.groupStandings && cup.groupStandings.length > 0) {
      populatedGroupStandings = cup.groupStandings.map((gs) => ({
        ...gs,
        room: roomMap.get(gs.roomId) || null,
      }));
    }

    return {
      ...cup,
      winnerRoom: cup.winnerRoomId ? roomMap.get(cup.winnerRoomId) || null : null,
      runnerUpRoom: cup.runnerUpRoomId ? roomMap.get(cup.runnerUpRoomId) || null : null,
      matches: populatedMatches,
      groupStandings: populatedGroupStandings,
    };
  },
});

/**
 * Oppretter en ny Cup med valgfritt turneringsformat
 */
export const createCupWithBracket = mutation({
  args: {
    adminUserId: v.optional(v.id("users")),
    name: v.string(),
    season: v.optional(v.string()),
    startGameweek: v.number(),
    format: v.optional(v.string()), // "single_elimination" | "double_elimination" | "round_robin" | "group_stage" | "lucky_loser"
    seedMethod: v.string(), // "leaderboard" | "manual" | "random"
    customSeedRoomIds: v.optional(v.array(v.id("rooms"))),
    groupCount: v.optional(v.number()), // antall grupper (kun round_robin/group_stage)
    roundGwMap: v.optional(
      v.array(
        v.object({
          roundNumber: v.number(),
          roundTitle: v.string(),
          gameweek: v.number(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminUserId);

    const allRooms = await ctx.db.query("rooms").collect();
    if (allRooms.length < 2) {
      throw new Error("Du må ha minst 2 rom i ligaen for å opprette en cup.");
    }

    const format = normalizeFormat(args.format || "single_elimination");

    // 1. Bestem seeding
    let seededRooms: any[] = [];
    if (args.seedMethod === "manual" && args.customSeedRoomIds && args.customSeedRoomIds.length > 0) {
      const roomMap = new Map(allRooms.map((r) => [r._id, { ...r, accentColor: roomAccentColor(r.roomNumber) }]));
      seededRooms = args.customSeedRoomIds
        .map((id) => roomMap.get(id))
        .filter((r): r is any => r !== undefined);
      const seededSet = new Set(args.customSeedRoomIds);
      const remaining = allRooms.filter((r) => !seededSet.has(r._id));
      seededRooms = [...seededRooms, ...remaining];
    } else if (args.seedMethod === "random") {
      seededRooms = [...allRooms].sort(() => Math.random() - 0.5);
    } else {
      // Leaderboard seeding (med fallback til roomNumber)
      const allTeams = await ctx.db.query("fpl_teams").collect();
      const scoredRooms = allRooms.map((r) => {
        const rTeams = allTeams.filter((t) => t.roomId === r._id);
        const total = rTeams.reduce((acc, cur) => acc + (cur.totalPoints || 0), 0);
        const avg = rTeams.length > 0 ? total / rTeams.length : 0;
        return { room: r, avg, total };
      });
      scoredRooms.sort(
        (a, b) =>
          b.avg - a.avg ||
          b.total - a.total ||
          (a.room.roomNumber || 0) - (b.room.roomNumber || 0)
      );
      seededRooms = scoredRooms.map((sr) => sr.room);
    }

    const teamCount = seededRooms.length;
    if (teamCount < 2) {
      throw new Error("Trenger minst 2 lag for å generere en cup.");
    }
    const startGw = args.startGameweek;

    // Bygg turneringsplanen for det faktiske antallet lag (9, 10, 12, oddetall …).
    const plan = buildCupPlan(format, teamCount, args.groupCount ?? 2);
    const totalRounds = plan.totalRounds;
    const roundGwMap =
      args.roundGwMap ||
      Array.from({ length: totalRounds }, (_, i) => {
        const r = i + 1;
        const first = plan.matches.find((m) => m.roundNumber === r);
        return {
          roundNumber: r,
          roundTitle: first?.roundTitle || `Runde ${r}`,
          gameweek: startGw + i,
        };
      });

    // Gruppespilltabeller ut fra faktisk gruppeinndeling.
    let groupStandings: any = undefined;
    if (plan.groupSizes && plan.groupSizes.length >= 2) {
      const letters = "ABCDEFGH";
      groupStandings = [];
      let idx = 0;
      plan.groupSizes.forEach((sz, gi) => {
        for (let k = 0; k < sz; k++) {
          groupStandings.push({
            group: letters[gi] ?? String(gi + 1),
            roomId: seededRooms[idx++]._id,
            played: 0,
            won: 0,
            drawn: 0,
            lost: 0,
            points: 0,
            totalRoomScore: 0,
          });
        }
      });
    }

    const cupId = await ctx.db.insert("cups", {
      name: args.name,
      season: args.season || "2025/2026",
      status: "active",
      startGameweek: startGw,
      currentRound: 1,
      totalRounds,
      format,
      roundGwMap,
      groupStandings,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await persistCupPlan(ctx, cupId, plan, seededRooms, startGw);

    return cupId;
  },
});


/**
 * Oppdaterer innstillinger for en Cup (Kun for Administrator)
 */
export const updateCupSettings = mutation({
  args: {
    adminUserId: v.optional(v.id("users")),
    cupId: v.id("cups"),
    name: v.optional(v.string()),
    status: v.optional(v.string()),
    currentRound: v.optional(v.number()),
    winnerRoomId: v.optional(v.id("rooms")),
    runnerUpRoomId: v.optional(v.id("rooms")),
    thirdPlaceRoomId: v.optional(v.id("rooms")),
    roundGwMap: v.optional(
      v.array(
        v.object({
          roundNumber: v.number(),
          roundTitle: v.string(),
          gameweek: v.number(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminUserId);

    const { adminUserId, cupId, ...rest } = args;
    await ctx.db.patch(cupId, {
      ...rest,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

/**
 * Oppdaterer eller overstyrer en enkelt match (Kun for Administrator)
 */
export const updateMatch = mutation({
  args: {
    adminUserId: v.optional(v.id("users")),
    matchId: v.id("cup_matches"),
    room1Id: v.optional(v.id("rooms")),
    room2Id: v.optional(v.id("rooms")),
    room1Score: v.optional(v.number()),
    room2Score: v.optional(v.number()),
    winnerRoomId: v.optional(v.id("rooms")),
    loserRoomId: v.optional(v.id("rooms")),
    status: v.optional(v.string()),
    gameweek: v.optional(v.number()),
    customNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminUserId);

    const { adminUserId, matchId, ...rest } = args;
    await ctx.db.patch(matchId, {
      ...rest,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

/**
 * Beregner poeng for en hel Cup-runde basert på gjennomsnittet av de to høyeste poengsummene per rom i den aktuelle Gameweeken.
 * Håndterer automatisk Lucky Loser, Double Elimination, Topp 8 og Gruppespill!
 */
export const calculateCupRoundScores = mutation({
  args: {
    adminUserId: v.optional(v.id("users")),
    cupId: v.id("cups"),
    roundNumber: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminUserId);

    const cup = await ctx.db.get(args.cupId);
    if (!cup) throw new Error("Cup ikke funnet.");

    const settings = await ctx.db.query("league_settings").first();
    const deductHits = settings?.deductTransferHits ?? true;

    // Finn alle kamper for denne runden
    const roundMatches = await ctx.db
      .query("cup_matches")
      .withIndex("by_cupId_and_round", (q) =>
        q.eq("cupId", args.cupId).eq("roundNumber", args.roundNumber)
      )
      .collect();

    if (roundMatches.length === 0) {
      throw new Error(`Ingen kamper funnet for runde ${args.roundNumber}.`);
    }

    const allTeams = await ctx.db.query("fpl_teams").collect();
    const allGwScores = await ctx.db.query("gameweek_scores").collect();

    const updatedMatches = [];
    const completedResults = [];

    for (const match of roundMatches) {
      // Hopp over kamper som mangler deltakere
      if (!match.room1Id || !match.room2Id) {
        continue;
      }

      const gw = match.gameweek;

      const calculateRoomGwStats = (roomId: any) => {
        if (!roomId) return { avg: 0, topPlayers: [], allPlayers: [], totalPoints: 0 };
        const roomTeams = allTeams.filter((t) => t.roomId === roomId);
        if (roomTeams.length === 0) return { avg: 0, topPlayers: [], allPlayers: [], totalPoints: 0 };

        const teamScores = roomTeams.map((t) => {
          const scoreRecord = allGwScores.find(
            (gs) => gs.entryId === t.entryId && gs.gameweek === gw
          );
          const rawPts = scoreRecord ? scoreRecord.points : (t.currentGwPoints || 0);
          const hits = scoreRecord ? scoreRecord.transfersCost : (t.currentGwTransfersCost || 0);
          const net = deductHits ? rawPts - hits : rawPts;

          return {
            entryId: t.entryId,
            name: t.managerName || t.teamName || `Lag ${t.entryId}`,
            points: net,
            hits,
          };
        });

        teamScores.sort((a, b) => b.points - a.points);
        const top1 = teamScores[0];
        const top2 = teamScores[1];

        let avg = 0;
        if (top1 && top2) {
          avg = (top1.points + top2.points) / 2;
        } else if (top1) {
          avg = top1.points;
        }

        const totalPoints = teamScores.reduce((acc, c) => acc + c.points, 0);

        return {
          avg: Math.round(avg * 10) / 10,
          topPlayers: teamScores.slice(0, 2),
          allPlayers: teamScores,
          totalPoints,
        };
      };

      const stats1 = calculateRoomGwStats(match.room1Id);
      const stats2 = calculateRoomGwStats(match.room2Id);

      let winnerId: any = null;
      let loserId: any = null;
      let isDraw = false;

      if (stats1.avg > stats2.avg) {
        winnerId = match.room1Id;
        loserId = match.room2Id;
      } else if (stats2.avg > stats1.avg) {
        winnerId = match.room2Id;
        loserId = match.room1Id;
      } else {
        // Tiebreaker: 1. Toppscorer
        const top1Pts1 = stats1.topPlayers[0]?.points || 0;
        const top1Pts2 = stats2.topPlayers[0]?.points || 0;
        if (top1Pts1 > top1Pts2) {
          winnerId = match.room1Id;
          loserId = match.room2Id;
        } else if (top1Pts2 > top1Pts1) {
          winnerId = match.room2Id;
          loserId = match.room1Id;
        } else {
          // 2. Total romscore
          if (stats1.totalPoints > stats2.totalPoints) {
            winnerId = match.room1Id;
            loserId = match.room2Id;
          } else if (stats2.totalPoints > stats1.totalPoints) {
            winnerId = match.room2Id;
            loserId = match.room1Id;
          } else {
            // Gruppespill kan ha uavgjort
            if (match.bracketType === "group") {
              isDraw = true;
            } else {
              winnerId = match.room1Id;
              loserId = match.room2Id;
            }
          }
        }
      }

      await ctx.db.patch(match._id, {
        room1Score: stats1.avg,
        room2Score: stats2.avg,
        room1TopPlayers: stats1.topPlayers,
        room2TopPlayers: stats2.topPlayers,
        winnerRoomId: winnerId,
        loserRoomId: loserId,
        status: "completed",
        updatedAt: Date.now(),
      });

      completedResults.push({
        match,
        winnerId,
        loserId,
        isDraw,
        stats1,
        stats2,
      });

      // Standard avansering (for DE og Topp 8 og Quarter-finalr i Lucky Loser)
      if (cup.format !== "lucky_loser_12" || args.roundNumber > 1) {
        if (winnerId && match.nextMatchId && match.nextMatchSlot) {
          const nextMatch = await ctx.db.get(match.nextMatchId);
          if (nextMatch) {
            const patchObj: any = { updatedAt: Date.now() };
            if (match.nextMatchSlot === 1) patchObj.room1Id = winnerId;
            else patchObj.room2Id = winnerId;
            await ctx.db.patch(match.nextMatchId, patchObj);
          }
        }

        if (loserId && match.nextLoserMatchId && match.nextLoserMatchSlot) {
          const nextLoserMatch = await ctx.db.get(match.nextLoserMatchId);
          if (nextLoserMatch) {
            const patchObj: any = { updatedAt: Date.now() };
            if (match.nextLoserMatchSlot === 1) patchObj.room1Id = loserId;
            else patchObj.room2Id = loserId;
            await ctx.db.patch(match.nextLoserMatchId, patchObj);
          }
        }
      }

      // Registrer 3. plass (Bronse) hvis dette er Taperfinalen (Double Elimination LB Final)
      if (
        loserId &&
        match.bracketType === "losers" &&
        (match.roundTitle.toLowerCase().includes("taperfinale") || match.nextMatchSlot === 2)
      ) {
        await ctx.db.patch(cup._id, {
          thirdPlaceRoomId: loserId,
          updatedAt: Date.now(),
        });
      }

      // Kår vinner og sølvvinner hvis dette er Grand Final / Finalen
      const isFinalRound =
        args.roundNumber === cup.totalRounds ||
        match.bracketType === "grand_final" ||
        match.roundTitle.includes("Grand Final") ||
        match.roundTitle.toLowerCase().includes("finale");

      if (isFinalRound && winnerId) {
        await ctx.db.patch(cup._id, {
          winnerRoomId: winnerId,
          runnerUpRoomId: loserId,
          status: "completed",
          updatedAt: Date.now(),
        });
      }

      updatedMatches.push({
        matchId: match._id,
        roundTitle: match.roundTitle,
        winnerId,
        loserId,
        stats1,
        stats2,
      });
    }

    // SPESIALHÅNDTERING: Lucky Loser 12 (Runde 1)
    if (cup.format === "lucky_loser_12" && args.roundNumber === 1 && completedResults.length === 6) {
      // 6 vinnere
      const winners = completedResults.map((r) => ({
        roomId: r.winnerId,
        score: r.winnerId === r.match.room1Id ? r.stats1.avg : r.stats2.avg,
        topPlayerScore: r.winnerId === r.match.room1Id ? r.stats1.topPlayers[0]?.points || 0 : r.stats2.topPlayers[0]?.points || 0,
        totalPoints: r.winnerId === r.match.room1Id ? r.stats1.totalPoints : r.stats2.totalPoints,
        matchIndex: r.match.matchIndex,
      }));

      // 6 tapere -> sorter for å finne de 2 beste "Lucky Losers"
      const losers = completedResults.map((r) => ({
        roomId: r.loserId,
        score: r.loserId === r.match.room1Id ? r.stats1.avg : r.stats2.avg,
        topPlayerScore: r.loserId === r.match.room1Id ? r.stats1.topPlayers[0]?.points || 0 : r.stats2.topPlayers[0]?.points || 0,
        totalPoints: r.loserId === r.match.room1Id ? r.stats1.totalPoints : r.stats2.totalPoints,
        matchIndex: r.match.matchIndex,
      }));

      losers.sort((a, b) => b.score - a.score || b.topPlayerScore - a.topPlayerScore || b.totalPoints - a.totalPoints);
      const luckyLoser1 = losers[0]; // Beste taper
      const luckyLoser2 = losers[1]; // Nest beste taper

      // Hent Quarter-final-kampene (Runde 2)
      const qfMatches = await ctx.db
        .query("cup_matches")
        .withIndex("by_cupId_and_round", (q) =>
          q.eq("cupId", args.cupId).eq("roundNumber", 2)
        )
        .collect();

      const qfMap = new Map(qfMatches.map((m) => [m.matchIndex, m]));

      // Finn vinnere fra kamp 1..6
      const winMap = new Map(winners.map((w) => [w.matchIndex, w.roomId]));

      // QF 1: Vinner K1 vs Vinner K6
      const qf1 = qfMap.get(1);
      if (qf1) {
        await ctx.db.patch(qf1._id, {
          room1Id: winMap.get(1),
          room2Id: winMap.get(6),
          updatedAt: Date.now(),
        });
      }

      // QF 2: Vinner K2 vs Vinner K5
      const qf2 = qfMap.get(2);
      if (qf2) {
        await ctx.db.patch(qf2._id, {
          room1Id: winMap.get(2),
          room2Id: winMap.get(5),
          updatedAt: Date.now(),
        });
      }

      // QF 3: Vinner K3 vs Lucky Loser 2
      const qf3 = qfMap.get(3);
      if (qf3) {
        await ctx.db.patch(qf3._id, {
          room1Id: winMap.get(3),
          room2Id: luckyLoser2?.roomId,
          isLuckyLoser: true,
          updatedAt: Date.now(),
        });
      }

      // QF 4: Vinner K4 vs Lucky Loser 1
      const qf4 = qfMap.get(4);
      if (qf4) {
        await ctx.db.patch(qf4._id, {
          room1Id: winMap.get(4),
          room2Id: luckyLoser1?.roomId,
          isLuckyLoser: true,
          updatedAt: Date.now(),
        });
      }
    }

    // SPESIALHÅNDTERING: Gruppespill tabelloppdatering & avansering til semi-final
    if (cup.format === "group_stage_12" && cup.groupStandings) {
      const standings = [...cup.groupStandings];
      for (const res of completedResults) {
        const entry1 = standings.find((s) => s.roomId === res.match.room1Id);
        const entry2 = standings.find((s) => s.roomId === res.match.room2Id);

        if (entry1 && entry2) {
          entry1.played += 1;
          entry2.played += 1;
          entry1.totalRoomScore += res.stats1.avg;
          entry2.totalRoomScore += res.stats2.avg;

          if (res.isDraw) {
            entry1.drawn += 1;
            entry2.drawn += 1;
            entry1.points += 1;
            entry2.points += 1;
          } else if (res.winnerId === res.match.room1Id) {
            entry1.won += 1;
            entry2.lost += 1;
            entry1.points += 3;
          } else if (res.winnerId === res.match.room2Id) {
            entry2.won += 1;
            entry1.lost += 1;
            entry2.points += 3;
          }
        }
      }

      await ctx.db.patch(cup._id, {
        groupStandings: standings,
        updatedAt: Date.now(),
      });

      // Etter runde 3 (siste gruppespillrunde), finn topp 2 i gruppe A og B og populer semi-finalne i runde 4!
      if (args.roundNumber === 3) {
        const groupAStandings = standings
          .filter((s) => s.group === "A")
          .sort((a, b) => b.points - a.points || b.totalRoomScore - a.totalRoomScore);
        const groupBStandings = standings
          .filter((s) => s.group === "B")
          .sort((a, b) => b.points - a.points || b.totalRoomScore - a.totalRoomScore);

        const a1 = groupAStandings[0]?.roomId;
        const a2 = groupAStandings[1]?.roomId;
        const b1 = groupBStandings[0]?.roomId;
        const b2 = groupBStandings[1]?.roomId;

        const semiMatches = await ctx.db
          .query("cup_matches")
          .withIndex("by_cupId_and_round", (q) =>
            q.eq("cupId", args.cupId).eq("roundNumber", 4)
          )
          .collect();

        const semi1 = semiMatches.find((m) => m.matchIndex === 1);
        const semi2 = semiMatches.find((m) => m.matchIndex === 2);

        if (semi1 && a1 && b2) {
          await ctx.db.patch(semi1._id, {
            room1Id: a1,
            room2Id: b2,
            updatedAt: Date.now(),
          });
        }

        if (semi2 && b1 && a2) {
          await ctx.db.patch(semi2._id, {
            room1Id: b1,
            room2Id: a2,
            updatedAt: Date.now(),
          });
        }
      }
    }

    // Oppdater gjeldende aktiv runde
    const nextRoundNumber = args.roundNumber + 1;
    if (nextRoundNumber <= cup.totalRounds) {
      await ctx.db.patch(cup._id, {
        currentRound: nextRoundNumber,
        updatedAt: Date.now(),
      });
    }

    return {
      success: true,
      roundNumber: args.roundNumber,
      updatedMatchesCount: updatedMatches.length,
      matches: updatedMatches,
    };
  },
});

/**
 * Manuell tvungen avansering av en kamp (admin override)
 */
export const advanceMatchManually = mutation({
  args: {
    adminUserId: v.optional(v.id("users")),
    matchId: v.id("cup_matches"),
    winnerRoomId: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminUserId);

    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Kamp ikke funnet.");

    const loserId = match.room1Id === args.winnerRoomId ? match.room2Id : match.room1Id;

    await ctx.db.patch(match._id, {
      winnerRoomId: args.winnerRoomId,
      loserRoomId: loserId,
      status: "completed",
      updatedAt: Date.now(),
    });

    if (match.nextMatchId && match.nextMatchSlot) {
      const patchObj: any = { updatedAt: Date.now() };
      if (match.nextMatchSlot === 1) patchObj.room1Id = args.winnerRoomId;
      else patchObj.room2Id = args.winnerRoomId;
      await ctx.db.patch(match.nextMatchId, patchObj);
    }

    if (loserId && match.nextLoserMatchId && match.nextLoserMatchSlot) {
      const patchObj: any = { updatedAt: Date.now() };
      if (match.nextLoserMatchSlot === 1) patchObj.room1Id = loserId;
      else patchObj.room2Id = loserId;
      await ctx.db.patch(match.nextLoserMatchId, patchObj);
    }

    if (
      match.bracketType === "grand_final" ||
      match.roundTitle?.includes("Grand Final") ||
      match.roundTitle?.toLowerCase().includes("finale")
    ) {
      await ctx.db.patch(match.cupId, {
        winnerRoomId: args.winnerRoomId,
        runnerUpRoomId: loserId,
        status: "completed",
        updatedAt: Date.now(),
      });
    } else if (
      loserId &&
      match.bracketType === "losers" &&
      (match.roundTitle?.toLowerCase().includes("taperfinale") || match.nextMatchSlot === 2)
    ) {
      await ctx.db.patch(match.cupId, {
        thirdPlaceRoomId: loserId,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * Sletter en hel cup og tilhørende kamper (Kun for Administrator)
 */
export const deleteCup = mutation({
  args: {
    adminUserId: v.optional(v.id("users")),
    cupId: v.id("cups"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminUserId);

    const matches = await ctx.db
      .query("cup_matches")
      .withIndex("by_cupId", (q) => q.eq("cupId", args.cupId))
      .collect();

    for (const m of matches) {
      await ctx.db.delete(m._id);
    }

    await ctx.db.delete(args.cupId);
    return { success: true };
  },
});
