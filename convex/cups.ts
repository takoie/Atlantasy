import { internalMutation, mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { requireAdmin } from "./security";
import { buildCupPlan, GROUP_LETTERS } from "./cupEngine";
import { roomAccentColor } from "./roomColors";
import { effectiveCupName, effectiveSeason, seasonFor } from "./season";
import {
  advanceFromMatch,
  calculateGameweekForActiveCups,
  calculateRound,
  decide,
  persistCupPlan,
  roomStatsFor,
  refreshCupState,
} from "./cupScoring";

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

/** Legger rom-detaljer på cupen, kampene og gruppetabellene. */
async function populateCup(ctx: QueryCtx, cup: Doc<"cups">) {
  const matches = await ctx.db
    .query("cup_matches")
    .withIndex("by_cupId", (q) => q.eq("cupId", cup._id))
    .take(500);

  const rooms = await ctx.db.query("rooms").collect();
  const roomMap = new Map(
    rooms.map((r) => [r._id, { ...r, accentColor: roomAccentColor(r.roomNumber) }])
  );
  const room = (id: Id<"rooms"> | undefined) => (id ? roomMap.get(id) ?? null : null);

  // Foreløpige poeng for kamper som ikke er ferdig, men der gameweeken har startet.
  // Bruker samme regnestykke som den endelige rundeberegningen, så live-leder og
  // sluttresultat stemmer overens.
  const liveByMatch = new Map<
    Id<"cup_matches">,
    { score1: number; score2: number; leader: 1 | 2 | 0 }
  >();
  const settings = await ctx.db.query("league_settings").first();
  const currentGw = settings?.currentGameweek;
  const deductHits = settings?.deductTransferHits ?? true;
  const pending = matches.filter(
    (m) =>
      m.status !== "completed" &&
      !m.isBye &&
      m.room1Id &&
      m.room2Id &&
      currentGw !== undefined &&
      m.gameweek <= currentGw
  );
  if (pending.length > 0) {
    const teams = await ctx.db.query("fpl_teams").collect();
    for (const gw of new Set(pending.map((m) => m.gameweek))) {
      const gwScores = await ctx.db
        .query("gameweek_scores")
        .withIndex("by_gameweek", (q) => q.eq("gameweek", gw))
        .collect();
      const scoreByEntry = new Map(gwScores.map((s) => [s.entryId, s]));
      for (const m of pending.filter((p) => p.gameweek === gw)) {
        const s1 = roomStatsFor(m.room1Id!, teams, scoreByEntry, deductHits);
        const s2 = roomStatsFor(m.room2Id!, teams, scoreByEntry, deductHits);
        liveByMatch.set(m._id, { score1: s1.avg, score2: s2.avg, leader: decide(s1, s2) });
      }
    }
  }

  return {
    ...cup,
    name: effectiveCupName(cup),
    season: effectiveSeason(cup),
    winnerRoom: room(cup.winnerRoomId),
    runnerUpRoom: room(cup.runnerUpRoomId),
    thirdPlaceRoom: room(cup.thirdPlaceRoomId),
    matches: matches.map((m) => ({
      ...m,
      live: liveByMatch.get(m._id) ?? null,
      room1: room(m.room1Id),
      room2: room(m.room2Id),
      winnerRoom: room(m.winnerRoomId),
      loserRoom: room(m.loserRoomId),
    })),
    groupStandings:
      cup.groupStandings && cup.groupStandings.length > 0
        ? cup.groupStandings.map((gs) => ({ ...gs, room: room(gs.roomId) }))
        : null,
  };
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
    return await ctx.db.query("cups").order("desc").take(50);
  },
});

/**
 * Henter aktiv eller nyeste cup med alle kamper og tilknyttede rom-detaljer
 */
export const getActiveCup = query({
  args: {},
  handler: async (ctx) => {
    const cup =
      (await ctx.db
        .query("cups")
        .withIndex("by_status", (q) => q.eq("status", "active"))
        .first()) ?? (await ctx.db.query("cups").order("desc").first());
    if (!cup) return null;
    return await populateCup(ctx, cup);
  },
});

/**
 * Henter spesifikk cup med ID
 */
export const getCupDetails = query({
  args: { cupId: v.id("cups") },
  handler: async (ctx, args) => {
    const cup = await ctx.db.get("cups", args.cupId);
    if (!cup) return null;
    return await populateCup(ctx, cup);
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
    autoCalc: v.optional(v.boolean()),
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
    let seededRooms: Doc<"rooms">[];
    if (args.seedMethod === "manual" && args.customSeedRoomIds && args.customSeedRoomIds.length > 0) {
      const roomById = new Map(allRooms.map((r) => [r._id, r]));
      const picked = args.customSeedRoomIds
        .map((id) => roomById.get(id))
        .filter((r): r is Doc<"rooms"> => r !== undefined);
      const pickedSet = new Set(args.customSeedRoomIds);
      seededRooms = [...picked, ...allRooms.filter((r) => !pickedSet.has(r._id))];
    } else if (args.seedMethod === "manual") {
      // Standard romrekkefølge (rom 1, rom 2, …)
      seededRooms = [...allRooms].sort((a, b) => (a.roomNumber || 0) - (b.roomNumber || 0));
    } else if (args.seedMethod === "random") {
      seededRooms = [...allRooms];
      for (let i = seededRooms.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [seededRooms[i], seededRooms[j]] = [seededRooms[j], seededRooms[i]];
      }
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

    // Gruppespilltabeller ut fra faktisk gruppeinndeling (seedene deles ut i samme
    // slange-rekkefølge som i planen, så vi leser gruppene rett fra kampene).
    let groupStandings: NonNullable<Doc<"cups">["groupStandings"]> | undefined;
    if (plan.groupSizes) {
      groupStandings = [];
      const seen = new Set<string>();
      for (const m of plan.matches) {
        if (m.bracketType !== "group" || m.seed1 == null || m.seed2 == null) continue;
        for (const seed of [m.seed1, m.seed2]) {
          const room = seededRooms[seed];
          if (!room || seen.has(room._id)) continue;
          seen.add(room._id);
          groupStandings.push({
            group: m.group ?? GROUP_LETTERS[0],
            roomId: room._id,
            played: 0,
            won: 0,
            drawn: 0,
            lost: 0,
            points: 0,
            totalRoomScore: 0,
          });
        }
      }
      groupStandings.sort((a, b) => a.group.localeCompare(b.group));
    }

    const cupId = await ctx.db.insert("cups", {
      name: args.name,
      season: args.season || seasonFor(),
      status: "active",
      startGameweek: startGw,
      currentRound: 1,
      totalRounds,
      format,
      autoCalc: args.autoCalc ?? true,
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
    autoCalc: v.optional(v.boolean()),
    season: v.optional(v.string()),
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
    await ctx.db.patch("cups", cupId, {
      ...rest,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

/**
 * Oppdaterer eller overstyrer en enkelt match (Kun for Administrator).
 * Settes en vinner, sendes han videre i turneringen på samme måte som ved beregning.
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
    const match = await ctx.db.get("cup_matches", matchId);
    if (!match) throw new Error("Kamp ikke funnet.");

    await ctx.db.patch("cup_matches", matchId, { ...rest, updatedAt: Date.now() });

    const room1 = args.room1Id ?? match.room1Id;
    const room2 = args.room2Id ?? match.room2Id;
    if (args.winnerRoomId && args.winnerRoomId !== match.winnerRoomId) {
      if (args.winnerRoomId !== room1 && args.winnerRoomId !== room2) {
        throw new Error("Vinneren må være et av de to rommene i kampen.");
      }
      const loserId = args.winnerRoomId === room1 ? room2 : room1;
      await ctx.db.patch("cup_matches", matchId, {
        loserRoomId: loserId,
        status: "completed",
        updatedAt: Date.now(),
      });
      const cup = await ctx.db.get("cups", match.cupId);
      const fresh = await ctx.db.get("cup_matches", matchId);
      if (cup && fresh) await advanceFromMatch(ctx, cup, fresh, args.winnerRoomId, loserId);
      await refreshCupState(ctx, match.cupId);
    }
    return { success: true };
  },
});

/**
 * Bytter plass på to rom i bracketen (dra og slipp i admin). Gjelder kun plasser som er
 * seedet ved opprettelsen i kamper som ikke er spilt – plasser som fylles av avansement,
 * gruppespill eller lucky loser kan ikke flyttes, og gruppeinndelingen er låst.
 */
export const swapMatchRooms = mutation({
  args: {
    adminUserId: v.optional(v.id("users")),
    matchAId: v.id("cup_matches"),
    slotA: v.union(v.literal(1), v.literal(2)),
    matchBId: v.id("cup_matches"),
    slotB: v.union(v.literal(1), v.literal(2)),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminUserId);

    const matchA = await ctx.db.get("cup_matches", args.matchAId);
    const matchB = await ctx.db.get("cup_matches", args.matchBId);
    if (!matchA || !matchB) throw new Error("Kamp ikke funnet.");
    if (matchA.cupId !== matchB.cupId) throw new Error("Kampene tilhører ulike cuper.");

    const cup = await ctx.db.get("cups", matchA.cupId);
    if (!cup) throw new Error("Cup ikke funnet.");
    if (cup.groupStandings?.length) {
      throw new Error("Gruppeinndelingen kan ikke endres etter opprettelse. Slett og lag cupen på nytt.");
    }

    const all = await ctx.db
      .query("cup_matches")
      .withIndex("by_cupId", (q) => q.eq("cupId", cup._id))
      .take(500);
    const fedFrom = (m: Doc<"cup_matches">, slot: number) =>
      all.some(
        (o) =>
          (o.nextMatchId === m._id && o.nextMatchSlot === slot) ||
          (o.nextLoserMatchId === m._id && o.nextLoserMatchSlot === slot)
      );

    const check = (m: Doc<"cup_matches">, slot: 1 | 2) => {
      const room = slot === 1 ? m.room1Id : m.room2Id;
      const qual = slot === 1 ? m.qual1 : m.qual2;
      if (!room) throw new Error("Det er ikke noe rom på den plassen.");
      if (qual != null || fedFrom(m, slot)) {
        throw new Error("Plassen fylles av tidligere kamper og kan ikke flyttes.");
      }
      const played = m.status === "completed" && !m.isBye;
      if (played || m.room1Score !== undefined || m.room2Score !== undefined) {
        throw new Error("Kampen er allerede spilt og kan ikke endres.");
      }
      return room;
    };
    const roomA = check(matchA, args.slotA);
    const roomB = check(matchB, args.slotB);
    if (roomA === roomB) return { success: true };

    const now = Date.now();
    const put = (m: Doc<"cup_matches">, slot: 1 | 2, room: Id<"rooms">) => ({
      ...(slot === 1 ? { room1Id: room } : { room2Id: room }),
      // Walkover er avgjort på forhånd, så vinneren følger plassen.
      ...(m.isBye ? { winnerRoomId: room } : {}),
      updatedAt: now,
    });

    if (matchA._id === matchB._id) {
      // Bytte innad i samme kamp.
      await ctx.db.patch("cup_matches", matchA._id, {
        room1Id: matchA.room2Id,
        room2Id: matchA.room1Id,
        updatedAt: now,
      });
    } else {
      await ctx.db.patch("cup_matches", matchA._id, put(matchA, args.slotA, roomB));
      await ctx.db.patch("cup_matches", matchB._id, put(matchB, args.slotB, roomA));
    }
    return { success: true };
  },
});

/**
 * Beregner en hel Cup-runde: romsnittet av de to beste spillerne per rom i
 * rundens gameweek avgjør hver kamp. Vinnere (og tapere i dobbel knockout)
 * sendes videre, gruppetabeller oppdateres og utslagsfasen fylles når den er klar.
 */
export const calculateCupRoundScores = mutation({
  args: {
    adminUserId: v.optional(v.id("users")),
    cupId: v.id("cups"),
    roundNumber: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminUserId);
    const res = await calculateRound(ctx, args.cupId, args.roundNumber);
    return { success: true, ...res };
  },
});

/**
 * Kalles av den serverstyrte synken når en gameweek er ferdig synket:
 * beregner de rundene som spilles i den gameweeken for alle aktive cuper.
 */
export const autoCalculateForGameweek = internalMutation({
  args: { gw: v.number() },
  handler: async (ctx, args) => {
    return await calculateGameweekForActiveCups(ctx, args.gw);
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

    const match = await ctx.db.get("cup_matches", args.matchId);
    if (!match) throw new Error("Kamp ikke funnet.");
    if (args.winnerRoomId !== match.room1Id && args.winnerRoomId !== match.room2Id) {
      throw new Error("Vinneren må være et av de to rommene i kampen.");
    }
    const cup = await ctx.db.get("cups", match.cupId);
    if (!cup) throw new Error("Cup ikke funnet.");

    const loserId = match.room1Id === args.winnerRoomId ? match.room2Id : match.room1Id;

    await ctx.db.patch("cup_matches", match._id, {
      winnerRoomId: args.winnerRoomId,
      loserRoomId: loserId,
      status: "completed",
      updatedAt: Date.now(),
    });
    await advanceFromMatch(ctx, cup, match, args.winnerRoomId, loserId);
    await refreshCupState(ctx, cup._id);

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
      .take(500);

    for (const m of matches) {
      await ctx.db.delete("cup_matches", m._id);
    }

    await ctx.db.delete("cups", args.cupId);
    return { success: true };
  },
});
