import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin, requireUser } from "./security";
import { roomAccentColor } from "./roomColors";
import type { QueryCtx } from "./_generated/server";

/**
 * Finn inneværende "måned" (kalendermåned utledet fra GW-frister, lagret av
 * FPL-synken i monthly_standings). Returnerer null hvis synken ikke har kjørt enda.
 */
async function resolveCurrentMonth(ctx: QueryCtx, currentGw: number) {
  const months = await ctx.db.query("monthly_standings").collect();
  if (months.length === 0) return null;
  const sorted = [...months].sort((a, b) => a.gameweekStart - b.gameweekStart);
  const exact = sorted.find(
    (m) => currentGw >= m.gameweekStart && currentGw <= m.gameweekEnd
  );
  const chosen =
    exact ??
    [...sorted].reverse().find((m) => currentGw >= m.gameweekStart) ??
    sorted[0];
  return {
    monthKey: chosen.monthKey,
    monthName: chosen.monthName,
    gwList: chosen.customGwList ?? [],
  };
}

/**
 * Løs opp hvilken måned en spørring gjelder: eksplisitt valgt monthKey hvis den
 * finnes (og har startet), ellers inneværende måned.
 */
async function resolveMonth(
  ctx: QueryCtx,
  currentGw: number,
  explicitKey?: string | null
) {
  if (explicitKey) {
    const picked = await ctx.db
      .query("monthly_standings")
      .withIndex("by_monthKey", (q) => q.eq("monthKey", explicitKey))
      .first();
    if (picked && picked.gameweekStart <= currentGw) {
      return {
        monthKey: picked.monthKey,
        monthName: picked.monthName,
        gwList: picked.customGwList ?? [],
      };
    }
  }
  return resolveCurrentMonth(ctx, currentGw);
}

/** True hvis en gameweek_scores-rad hører til den gitte måneden. */
function rowInMonth(
  row: { monthKey?: string; gameweek: number },
  month: { monthKey: string; gwList: number[] } | null
) {
  if (!month) return false;
  if (row.monthKey) return row.monthKey === month.monthKey;
  return month.gwList.includes(row.gameweek);
}

/**
 * Liga-plassering per gameweek for alle entries, basert på AKKUMULERT netto-poeng
 * t.o.m. hver runde – kun blant ligaens egne lag (ikke verdensrank).
 */
function computeLeagueRankHistory(
  gwScores: Array<{ entryId: number; gameweek: number; netPoints?: number }>,
  entryIds: number[]
): Map<number, Array<{ gw: number; leagueRank: number; cumNet: number }>> {
  const gws = Array.from(new Set(gwScores.map((s) => s.gameweek))).sort(
    (a, b) => a - b
  );
  const byEntryGw = new Map<string, number>();
  for (const s of gwScores) {
    byEntryGw.set(`${s.entryId}:${s.gameweek}`, s.netPoints ?? 0);
  }
  const out = new Map<
    number,
    Array<{ gw: number; leagueRank: number; cumNet: number }>
  >();
  const cum = new Map<number, number>();
  for (const e of entryIds) {
    out.set(e, []);
    cum.set(e, 0);
  }
  for (const gw of gws) {
    for (const e of entryIds) {
      cum.set(e, (cum.get(e) ?? 0) + (byEntryGw.get(`${e}:${gw}`) ?? 0));
    }
    const ranked = [...entryIds].sort(
      (a, b) => (cum.get(b) ?? 0) - (cum.get(a) ?? 0)
    );
    ranked.forEach((e, idx) => {
      out.get(e)!.push({ gw, leagueRank: idx + 1, cumNet: cum.get(e) ?? 0 });
    });
  }
  return out;
}

/**
 * Månedene som er tilgjengelige i måneds-dropdownen (kun de som har startet).
 * Utledet fra FPL-kalenderen (monthly_standings), nyeste sist.
 */
export const listAvailableMonths = query({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db.query("league_settings").first();
    const currentGw = settings?.currentGameweek ?? 1;
    const months = await ctx.db.query("monthly_standings").collect();
    return months
      .filter((m) => m.gameweekStart <= currentGw)
      .sort((a, b) => a.gameweekStart - b.gameweekStart)
      .map((m) => ({
        monthKey: m.monthKey,
        monthName: m.monthName,
        gameweekStart: m.gameweekStart,
        gameweekEnd: m.gameweekEnd,
        isCompleted: m.isCompleted,
        isCurrent:
          currentGw >= m.gameweekStart && currentGw <= m.gameweekEnd,
      }));
  },
});

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
          accentColor: roomAccentColor(room.roomNumber),
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
    const currentGw = settings?.currentGameweek ?? 1;
    const month = await resolveMonth(ctx, currentGw, args.monthKey);
    const allTeams = await ctx.db.query("fpl_teams").collect();
    const allRoomGwScores = await ctx.db.query("room_gameweek_scores").collect();
    const nameByEntry = new Map<number, string>();
    for (const t of allTeams) nameByEntry.set(t.entryId, t.managerName);
    const contributor = (entryId: number, points: number) =>
      entryId > 0
        ? {
            entryId,
            managerName: nameByEntry.get(entryId) ?? "Manager",
            points: Math.round(points * 10) / 10,
          }
        : null;

    const ranked = rooms.map((room) => {
      const teams = allTeams.filter((t) => t.roomId === room._id);

      // Live: snitt av rommets 2 beste netto denne runden.
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

      const roomScores = allRoomGwScores.filter((s) => s.roomId === room._id);
      const hasStoredCurrentGw = roomScores.some(
        (s) => s.gameweek === currentGw
      );
      // Legg til inneværende live-snitt kun hvis runden ikke alt er lagret.
      const liveExtra = hasStoredCurrentGw ? 0 : liveAvg;

      // Sesong: sum av alle lagrede rom-snitt + evt. inneværende live.
      const seasonStored = roomScores.reduce((sum, s) => sum + s.averageTop2, 0);
      const seasonTotal = seasonStored + liveExtra;

      // Måned: SUM av rom-snittene (topp-2 per runde) over månedens spilte runder.
      // F.eks. GW1-snitt 40 + GW2-snitt 50 = 90 for måneden.
      // Oppdelingen per runde returneres så lista kan vise regnestykket.
      const monthRows = roomScores
        .filter((s) =>
          rowInMonth({ monthKey: s.monthKey, gameweek: s.gameweek }, month)
        )
        .sort((a, b) => a.gameweek - b.gameweek);
      const playedInMonth = new Set(monthRows.map((s) => s.gameweek));
      const monthBreakdown = monthRows.map((s) => ({
        gw: s.gameweek,
        average: Math.round(s.averageTop2 * 10) / 10,
        top1: contributor(s.top1EntryId, s.top1Points),
        top2: contributor(s.top2EntryId, s.top2Points),
      }));
      // Inneværende runde som ekstra post hvis den tilhører valgt måned og ikke
      // er lagret enda.
      if (
        month &&
        month.gwList.includes(currentGw) &&
        !playedInMonth.has(currentGw)
      ) {
        monthBreakdown.push({
          gw: currentGw,
          average: Math.round(liveAvg * 10) / 10,
          top1: top1
            ? contributor(top1.entryId, top1.effectivePoints)
            : null,
          top2: top2
            ? contributor(top2.entryId, top2.effectivePoints)
            : null,
        });
      }
      const monthTotal = monthBreakdown.reduce((sum, b) => sum + b.average, 0);

      return {
        _id: room._id,
        roomNumber: room.roomNumber,
        name: room.name,
        tag: room.tag && room.tag.trim() ? room.tag.trim() : `A${room.roomNumber}`,
        accentColor: roomAccentColor(room.roomNumber),
        description: room.description,
        teams: teamScores,
        teamCount: teams.length,
        top1,
        top2,
        liveAverage: Math.round(liveAvg * 10) / 10,
        monthTotal: Math.round(monthTotal * 10) / 10,
        monthBreakdown,
        monthGamesPlayed: monthBreakdown.length,
        seasonTotal: Math.round(seasonTotal * 10) / 10,
      };
    });

    if (args.sortBy === "season") {
      ranked.sort((a, b) => b.seasonTotal - a.seasonTotal);
    } else if (args.sortBy === "month") {
      ranked.sort((a, b) => b.monthTotal - a.monthTotal);
    } else {
      ranked.sort((a, b) => b.liveAverage - a.liveAverage);
    }

    return ranked.map((r, index) => ({
      ...r,
      rank: index + 1,
      monthKey: month?.monthKey ?? null,
      monthName: month?.monthName ?? null,
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
/**
 * Oppdaterer rominformasjon (navn, farge, beskrivelse)
 */
export const updateRoom = mutation({
  args: {
    adminUserId: v.optional(v.id("users")),
    userId: v.optional(v.id("users")),
    roomId: v.id("rooms"),
    name: v.string(),
    tag: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const callerId = args.adminUserId || args.userId;
    const user = await requireUser(ctx, callerId);

    if (user.role !== "admin") {
      // Bruker må være koblet til dette rommet OG ha et tilknyttet FPL-lag
      if (!user.roomId || user.roomId !== args.roomId || !user.fplEntryId) {
        throw new Error("Kun brukere som er koblet opp mot et rom med lag kan endre romnavnet sitt.");
      }

      // Verifiser at laget faktisk tilhører dette rommet i fpl_teams
      const userTeam = await ctx.db
        .query("fpl_teams")
        .withIndex("by_entryId", (q) => q.eq("entryId", user.fplEntryId!))
        .first();

      if (!userTeam || userTeam.roomId !== args.roomId) {
        throw new Error("Du har ikke et aktivt lag tilknyttet dette rommet.");
      }
    }

    await ctx.db.patch(args.roomId, {
      name: args.name.trim(),
      tag: args.tag?.trim() || undefined,
      description: args.description?.trim(),
    });
  },
});

/**
 * Oppretter et nytt rom (Kun for Administrator)
 */
export const createRoom = mutation({
  args: {
    adminUserId: v.optional(v.id("users")),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminUserId);

    const existingRooms = await ctx.db.query("rooms").collect();
    const maxNumber = existingRooms.reduce(
      (max, r) => Math.max(max, r.roomNumber || 0),
      0
    );

    const roomId = await ctx.db.insert("rooms", {
      roomNumber: maxNumber + 1,
      name: args.name.trim() || `A${maxNumber + 1}`,
      tag: `A${maxNumber + 1}`,
      description: args.description?.trim(),
      // Farge tildeles automatisk fra romnummer i spørringene (roomColors.ts).
      accentColor: roomAccentColor(maxNumber + 1),
      createdAt: Date.now(),
    });

    return roomId;
  },
});

/**
 * Sletter et rom og frigjør/sletter tilhørende lag og historikk (Kun for Administrator)
 */
export const deleteRoom = mutation({
  args: {
    adminUserId: v.optional(v.id("users")),
    roomId: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminUserId);

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

    return { success: true };
  },
});

/**
 * Endrer lagnavn for et FPL-lag i databasen
 */
export const updateTeamName = mutation({
  args: {
    userId: v.optional(v.id("users")),
    entryId: v.number(),
    newTeamName: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.userId) {
      await requireUser(ctx, args.userId);
    }

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
 * Tildeler et FPL-lag til et bestemt rom (Kun for Administrator)
 */
export const assignTeamToRoom = mutation({
  args: {
    adminUserId: v.optional(v.id("users")),
    teamId: v.id("fpl_teams"),
    targetRoomId: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminUserId);

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
 * Tømmer alle lag fra rommene (Kun for Administrator)
 */
export const clearAllRoomAssignments = mutation({
  args: {
    adminUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminUserId);

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
    return { success: true };
  },
});

/**
 * Batch-lagrer romtilhørighet for FPL-lag (Kun for Administrator)
 */
export const batchSaveRoomAssignments = mutation({
  args: {
    adminUserId: v.optional(v.id("users")),
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
    await requireAdmin(ctx, args.adminUserId);
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
    monthKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const sortBy = args.sortBy || "live";
    const allTeams = await ctx.db.query("fpl_teams").collect();
    const allRooms = await ctx.db.query("rooms").collect();
    const allUsers = await ctx.db.query("users").collect();
    const settings = await ctx.db.query("league_settings").first();
    const deductHits = settings?.deductTransferHits ?? true;
    const currentGw = settings?.currentGameweek ?? 1;
    const month = await resolveMonth(ctx, currentGw, args.monthKey);

    const roomMap = new Map<string, any>();
    for (const r of allRooms) {
      roomMap.set(r._id, r);
    }

    const userMap = new Map<number, any>();
    for (const u of allUsers) {
      if (u.fplEntryId) userMap.set(u.fplEntryId, u);
    }

    // Per-runde-historikk for måned-/sesong-aggregering.
    const allGwScores = await ctx.db.query("gameweek_scores").collect();
    const byEntry = new Map<number, typeof allGwScores>();
    for (const s of allGwScores) {
      const list = byEntry.get(s.entryId) ?? [];
      list.push(s);
      byEntry.set(s.entryId, list);
    }

    const players = allTeams.map((team, idx) => {
      const room = team.roomId ? roomMap.get(team.roomId) : undefined;
      const user = userMap.get(team.entryId);
      const effectiveLive = deductHits
        ? team.currentGwPoints - team.currentGwTransfersCost
        : team.currentGwPoints;

      const rows = byEntry.get(team.entryId) ?? [];
      const seasonHist = rows.reduce((sum, r) => sum + (r.netPoints ?? 0), 0);
      const seasonPoints = seasonHist || (team.totalPoints ?? 0);
      const monthPoints = rows
        .filter((r) => rowInMonth(r, month))
        .reduce((sum, r) => sum + (r.netPoints ?? 0), 0);
      const liveRow = rows.find((r) => r.gameweek === currentGw);
      const livePoints = liveRow ? liveRow.netPoints ?? 0 : effectiveLive;

      return {
        entryId: team.entryId,
        teamName: team.teamName,
        managerName: team.managerName || user?.username || "Manager",
        avatar: user?.avatar,
        roomId: team.roomId,
        roomNumber: room?.roomNumber ?? (idx + 1),
        roomName: room?.name ?? `Rom ${idx + 1}`,
        roomTag:
          room?.tag && room.tag.trim()
            ? room.tag.trim()
            : `A${room?.roomNumber ?? idx + 1}`,
        roomColor: room?.roomNumber ? roomAccentColor(room.roomNumber) : "#9FE88D",
        totalPoints: team.totalPoints ?? 0,
        currentGwPoints: team.currentGwPoints ?? 0,
        currentGwTransfersCost: team.currentGwTransfersCost ?? 0,
        // Tre perioder – alltid med, uansett valgt sortering.
        livePoints,
        monthPoints,
        seasonPoints,
        // Bakoverkompatibelt: eksisterende UI leser effectivePoints.
        effectivePoints:
          sortBy === "season"
            ? seasonPoints
            : sortBy === "month"
              ? monthPoints
              : livePoints,
        benchPoints: 0,
      };
    });

    if (sortBy === "season") {
      players.sort((a, b) => b.seasonPoints - a.seasonPoints);
    } else if (sortBy === "month") {
      players.sort((a, b) => b.monthPoints - a.monthPoints);
    } else {
      players.sort((a, b) => b.livePoints - a.livePoints);
    }

    return players.map((p, index) => ({
      ...p,
      rank: index + 1,
      monthKey: month?.monthKey ?? null,
      monthName: month?.monthName ?? null,
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
    const month = await resolveCurrentMonth(ctx, currentGw);

    const roomMap = new Map<string, any>();
    for (const r of allRooms) {
      roomMap.set(r._id, r);
    }
    const teamMap = new Map<number, any>();
    for (const t of allTeams) teamMap.set(t.entryId, t);
    const roomNameOf = (entryId: number) => {
      const t = teamMap.get(entryId);
      const room = t?.roomId ? roomMap.get(t.roomId) : undefined;
      return room?.name ?? "Rom";
    };
    const nameOf = (entryId: number) => teamMap.get(entryId)?.managerName ?? "Manager";
    const teamNameOf = (entryId: number) => teamMap.get(entryId)?.teamName ?? "FPL Lag";

    const totalManagers = allTeams.length;

    // Tidsvindu over gameweek_scores: runde = kun inneværende GW, måned = inneværende
    // kalendermåned, sesong = alt.
    const allGwScores = await ctx.db.query("gameweek_scores").collect();
    const windowScores = allGwScores.filter((s) => {
      if (timeframe === "season") return true;
      if (timeframe === "month") return rowInMonth(s, month);
      return s.gameweek === currentGw;
    });
    const gameweeksInWindow = Array.from(
      new Set(windowScores.map((s) => s.gameweek))
    ).sort((a, b) => a - b);

    // Aggreger per manager over vinduet.
    type Agg = {
      entryId: number;
      net: number;
      bench: number;
      hits: number;
    };
    const aggByEntry = new Map<number, Agg>();
    for (const s of windowScores) {
      const a =
        aggByEntry.get(s.entryId) ??
        { entryId: s.entryId, net: 0, bench: 0, hits: 0 };
      a.net += s.netPoints ?? 0;
      a.bench += s.benchPoints ?? 0;
      a.hits += s.transfersCost ?? 0;
      aggByEntry.set(s.entryId, a);
    }
    const aggs = Array.from(aggByEntry.values());

    // 1. Benkevarmer-skammen – Σ benkepoeng i vinduet.
    const benchNightmares = aggs
      .filter((a) => a.bench > 0)
      .sort((x, y) => y.bench - x.bench)
      .slice(0, 8)
      .map((a) => ({
        entryId: a.entryId,
        managerName: nameOf(a.entryId),
        teamName: teamNameOf(a.entryId),
        roomName: roomNameOf(a.entryId),
        benchPoints: a.bench,
        benchedPlayer:
          (teamMap.get(a.entryId) as any)?.benchedPlayer || "Benk",
      }));

    // 2. Kapteinsvalg i ligaen – per-runde-rader med kaptein (kun source "live").
    //    Vi viser (a) rundens kapteinsvalg per manager, og (b) historisk hvem
    //    som er blitt cappa mest i tidsvinduet – ikke bare "flest poeng", som
    //    ellers bare ville stått på rekordholderen resten av sesongen.
    const captainRows = windowScores.filter((s) => s.captainName);
    const captainDataFromGw =
      captainRows.length > 0
        ? Math.min(...captainRows.map((s) => s.gameweek))
        : null;

    // (a) Rundens kapteiner: siste runde i vinduet som har kapteinsdata.
    const captainPickGw =
      captainRows.length > 0
        ? Math.max(...captainRows.map((s) => s.gameweek))
        : null;
    const captainPicks = captainRows
      .filter((s) => s.gameweek === captainPickGw)
      .map((s) => {
        const raw = s.captainPoints ?? 0;
        return {
          entryId: s.entryId,
          managerName: nameOf(s.entryId),
          teamName: teamNameOf(s.entryId),
          roomName: roomNameOf(s.entryId),
          captainName: s.captainName as string,
          rawPoints: raw,
          points: raw * 2,
        };
      })
      .sort((a, b) => b.points - a.points);

    // (b) Mest cappa i vinduet – antall ganger hver spiller er valgt som kaptein.
    const capAgg = new Map<
      string,
      { count: number; totalRaw: number }
    >();
    for (const s of captainRows) {
      const name = s.captainName as string;
      const cur = capAgg.get(name) ?? { count: 0, totalRaw: 0 };
      cur.count += 1;
      cur.totalRaw += s.captainPoints ?? 0;
      capAgg.set(name, cur);
    }
    const totalCaptainPicks = captainRows.length;
    const mostCaptained = Array.from(capAgg.entries())
      .map(([name, v]) => ({
        name,
        count: v.count,
        percent:
          totalCaptainPicks > 0
            ? Math.round((v.count / totalCaptainPicks) * 100)
            : 0,
        totalPoints: v.totalRaw * 2,
        avgPoints:
          v.count > 0 ? Math.round((v.totalRaw / v.count) * 10) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count || b.totalPoints - a.totalPoints)
      .slice(0, 8);

    // 3. Hit-jegeren – Σ transfer-kostnad i vinduet.
    const topHitTakers = aggs
      .filter((a) => a.hits > 0)
      .sort((x, y) => y.hits - x.hits)
      .map((a) => ({
        entryId: a.entryId,
        managerName: nameOf(a.entryId),
        teamName: teamNameOf(a.entryId),
        roomName: roomNameOf(a.entryId),
        gwHits: a.hits,
        totalHits: a.hits,
        hitsCount: Math.round(a.hits / 4),
      }));

    const totalLeagueHits = topHitTakers.reduce((sum, t) => sum + t.gwHits, 0);

    // 5. Formel 1-Poengtabell – F1-poeng deles ut PER runde etter netto-rangering
    //    og summeres over tidsvinduet (runde = 1 GW, måned = månedens GW-er,
    //    sesong = alle spilte). Bruker lagret f1Points fra synken når det finnes,
    //    ellers regnes runden ut on-the-fly.
    const f1PointsScale = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
    const f1ByEntry = new Map<
      number,
      { total: number; net: number; rounds: number }
    >();
    for (const gw of gameweeksInWindow) {
      const gwRows = windowScores.filter((s) => s.gameweek === gw);
      const hasStored = gwRows.some((s) => typeof s.f1Points === "number");
      const ranked = hasStored
        ? gwRows.map((s) => ({
            entryId: s.entryId,
            f1: s.f1Points ?? 0,
            net: s.netPoints ?? 0,
          }))
        : [...gwRows]
            .sort((a, b) => (b.netPoints ?? 0) - (a.netPoints ?? 0))
            .map((s, idx) => ({
              entryId: s.entryId,
              f1: idx < f1PointsScale.length ? f1PointsScale[idx] : 0,
              net: s.netPoints ?? 0,
            }));
      for (const r of ranked) {
        const cur =
          f1ByEntry.get(r.entryId) ?? { total: 0, net: 0, rounds: 0 };
        cur.total += r.f1;
        cur.net += r.net;
        cur.rounds += 1;
        f1ByEntry.set(r.entryId, cur);
      }
    }
    const f1Standings = Array.from(f1ByEntry.entries())
      .map(([entryId, agg]) => ({ entryId, ...agg }))
      .filter((a) => a.rounds > 0)
      .sort((a, b) => b.total - a.total || b.net - a.net)
      .map((a, idx) => ({
        entryId: a.entryId,
        managerName: nameOf(a.entryId),
        teamName: teamNameOf(a.entryId),
        roomName: roomNameOf(a.entryId),
        f1Rank: idx + 1,
        f1Points: a.total,
        fplGwPoints: a.net,
        fplSeasonPoints: teamMap.get(a.entryId)?.totalPoints ?? 0,
        roundsCounted: a.rounds,
        podiums: idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : "",
      }));

    // 6. Klatrere & Trynere – endring i LIGA-plassering over tidsvinduet.
    const rankHist = computeLeagueRankHistory(
      allGwScores,
      allTeams.map((t) => t.entryId)
    );
    const wStart = gameweeksInWindow[0];
    const wEnd = gameweeksInWindow[gameweeksInWindow.length - 1];
    const movement = allTeams
      .map((t) => {
        const series = rankHist.get(t.entryId) ?? [];
        const endRow = [...series].reverse().find((r) => r.gw <= wEnd);
        const startRow =
          [...series].reverse().find((r) => r.gw < wStart) ??
          series.find((r) => r.gw >= wStart);
        if (!endRow || !startRow) return null;
        return {
          entryId: t.entryId,
          managerName: nameOf(t.entryId),
          teamName: teamNameOf(t.entryId),
          roomName: roomNameOf(t.entryId),
          fromRank: startRow.leagueRank,
          toRank: endRow.leagueRank,
          delta: startRow.leagueRank - endRow.leagueRank, // + = klatret
        };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);
    const topClimbers = [...movement]
      .filter((m) => m.delta > 0)
      .sort((a, b) => b.delta - a.delta)
      .slice(0, 5);
    const topFallers = [...movement]
      .filter((m) => m.delta < 0)
      .sort((a, b) => a.delta - b.delta)
      .slice(0, 5);

    // 7. Rank-graf – hver spillers liga-plassering per gameweek.
    //    Måned = kun månedens runder, runde/sesong = hele sesongen (en klatregraf
    //    trenger historikk for å gi mening).
    const allGraphGws = Array.from(
      new Set(allGwScores.map((s) => s.gameweek))
    ).sort((a, b) => a - b);
    const graphGws =
      timeframe === "month" && gameweeksInWindow.length > 0
        ? gameweeksInWindow
        : allGraphGws;
    const graphGwSet = new Set(graphGws);
    const rankPalette = [
      "#9FE88D", "#F4C152", "#70E1F8", "#A78BFA", "#FB6F84", "#60A5EB",
      "#F97316", "#34D399", "#E879F9", "#FBBF24", "#22D3EE", "#F472B6",
      "#4ADE80", "#FCA5A5", "#93C5FD", "#C4B5FD", "#FDBA74", "#6EE7B7",
    ];
    const rankGraph = allTeams
      .map((t, i) => {
        const series = (rankHist.get(t.entryId) ?? []).filter((r) =>
          graphGwSet.has(r.gw)
        );
        return {
          entryId: t.entryId,
          managerName: nameOf(t.entryId),
          teamName: teamNameOf(t.entryId),
          roomName: roomNameOf(t.entryId),
          color: rankPalette[i % rankPalette.length],
          points: series.map((r) => ({
            gw: r.gw,
            rank: r.leagueRank,
            cumNet: r.cumNet,
          })),
        };
      })
      .filter((g) => g.points.length > 0)
      .sort((a, b) => {
        const ar = a.points[a.points.length - 1]?.rank ?? 999;
        const br = b.points[b.points.length - 1]?.rank ?? 999;
        return ar - br;
      });

    // 7b. Rank-graf for ROM – rommenes plassering per gameweek, basert på
    //     AKKUMULERT topp-2-snitt (samme grunnlag som ledertavlas sesongtotal).
    const allRoomGwScores = await ctx.db.query("room_gameweek_scores").collect();
    const roomScoreByRoomGw = new Map<string, number>();
    for (const s of allRoomGwScores) {
      roomScoreByRoomGw.set(`${s.roomId}:${s.gameweek}`, s.averageTop2);
    }
    const roomFirstGw = new Map<string, number>();
    for (const s of allRoomGwScores) {
      const cur = roomFirstGw.get(s.roomId);
      if (cur === undefined || s.gameweek < cur) {
        roomFirstGw.set(s.roomId, s.gameweek);
      }
    }
    const roomGraphGws = graphGws.filter((gw) =>
      allRoomGwScores.some((s) => s.gameweek === gw)
    );
    const roomCum = new Map<string, number>();
    const roomSeries = new Map<
      string,
      Array<{ gw: number; rank: number; cumAvg: number }>
    >();
    for (const r of allRooms) {
      roomCum.set(r._id, 0);
      roomSeries.set(r._id, []);
    }
    for (const gw of roomGraphGws) {
      for (const r of allRooms) {
        roomCum.set(
          r._id,
          (roomCum.get(r._id) ?? 0) +
            (roomScoreByRoomGw.get(`${r._id}:${gw}`) ?? 0)
        );
      }
      const ranked = [...allRooms].sort(
        (a, b) => (roomCum.get(b._id) ?? 0) - (roomCum.get(a._id) ?? 0)
      );
      ranked.forEach((r, idx) => {
        roomSeries.get(r._id)!.push({
          gw,
          rank: idx + 1,
          cumAvg: Math.round((roomCum.get(r._id) ?? 0) * 10) / 10,
        });
      });
    }
    const roomRankGraph = allRooms
      .map((r, i) => {
        const first = roomFirstGw.get(r._id);
        const series = (roomSeries.get(r._id) ?? []).filter(
          (x) => first !== undefined && x.gw >= first
        );
        return {
          entryId: 0,
          managerName: r.name,
          teamName: `A${r.roomNumber}`,
          roomName: r.name,
          color: rankPalette[i % rankPalette.length],
          points: series.map((x) => ({
            gw: x.gw,
            rank: x.rank,
            cumNet: x.cumAvg,
          })),
        };
      })
      .filter((g) => g.points.length > 0)
      .sort((a, b) => {
        const ar = a.points[a.points.length - 1]?.rank ?? 999;
        const br = b.points[b.points.length - 1]?.rank ?? 999;
        return ar - br;
      });

    // 10. Chip-statistikk – talt fra activeChip på gameweek_scores i vinduet.
    const chipCounts = {
      wildcard: 0,
      tripleCaptain: 0,
      freeHit: 0,
      benchBoost: 0,
    };
    const recentChipPlays: any[] = [];
    const chipLabel = (chip: string) => {
      if (chip === "wildcard") return "Wildcard";
      if (chip === "3xc" || chip === "triplecaptain") return "Triple Captain";
      if (chip === "freehit") return "Free Hit";
      if (chip === "bboost" || chip === "benchboost") return "Bench Boost";
      return chip;
    };
    for (const s of windowScores) {
      const chip = (s.activeChip || "").toLowerCase();
      if (!chip) continue;
      if (chip === "wildcard") chipCounts.wildcard++;
      else if (chip === "3xc" || chip === "triplecaptain") chipCounts.tripleCaptain++;
      else if (chip === "freehit") chipCounts.freeHit++;
      else if (chip === "bboost" || chip === "benchboost") chipCounts.benchBoost++;
      recentChipPlays.push({
        entryId: s.entryId,
        managerName: nameOf(s.entryId),
        teamName: teamNameOf(s.entryId),
        roomName: roomNameOf(s.entryId),
        chip,
        chipName: chipLabel(chip),
        gameweek: s.gameweek,
        netPoints: s.netPoints ?? 0,
      });
    }
    recentChipPlays.sort((a, b) => b.gameweek - a.gameweek || b.netPoints - a.netPoints);

    return {
      timeframe,
      monthKey: month?.monthKey ?? null,
      monthName: month?.monthName ?? null,
      gameweeksInWindow,
      captainDataFromGw,
      totalManagers,
      benchNightmares,
      captainStats: {
        pickGw: captainPickGw,
        picks: captainPicks,
        mostCaptained,
        totalPicks: totalCaptainPicks,
        uniqueCaptains: capAgg.size,
      },
      transferHitStats: {
        topHitTakers,
        totalLeagueHits,
      },
      f1Standings,
      topClimbers,
      topFallers,
      rankGraph,
      rankGraphGws: graphGws,
      rankGraphSize: allTeams.length,
      roomRankGraph,
      roomRankGraphGws: roomGraphGws,
      roomRankGraphSize: allRooms.length,
      chipStats: {
        counts: chipCounts,
        recentPlays: recentChipPlays,
      },
    };
  },
});

/**
 * Faste ledere for chat-merker – uavhengig av hvilken sortering brukeren har valgt i UI.
 * - Sesongleder = #1 i akkumulert individuell sesongtotal.
 * - Rom-leder = #1 rom i INNEVÆRENDE kalendermåned.
 */
export const getStandingLeaders = query({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db.query("league_settings").first();
    const deductHits = settings?.deductTransferHits ?? true;
    const currentGw = settings?.currentGameweek ?? 1;
    const month = await resolveCurrentMonth(ctx, currentGw);

    const allTeams = await ctx.db.query("fpl_teams").collect();
    const teamMap = new Map<number, any>();
    for (const t of allTeams) teamMap.set(t.entryId, t);

    // --- Sesongleder (individuelt) ---
    const allGwScores = await ctx.db.query("gameweek_scores").collect();
    const seasonByEntry = new Map<number, number>();
    for (const s of allGwScores) {
      seasonByEntry.set(
        s.entryId,
        (seasonByEntry.get(s.entryId) ?? 0) + (s.netPoints ?? 0)
      );
    }
    let seasonLeader: { entryId: number; points: number } | null = null;
    for (const t of allTeams) {
      const pts = seasonByEntry.get(t.entryId) || t.totalPoints || 0;
      if (!seasonLeader || pts > seasonLeader.points) {
        seasonLeader = { entryId: t.entryId, points: pts };
      }
    }

    // --- Rom-leder (inneværende måned) ---
    const allRooms = await ctx.db.query("rooms").collect();
    const allRoomGwScores = await ctx.db.query("room_gameweek_scores").collect();
    let monthRoom: { roomId: string; total: number } | null = null;
    for (const room of allRooms) {
      const scores = allRoomGwScores.filter((s) => s.roomId === room._id);
      const hasStoredCurrent = scores.some((s) => s.gameweek === currentGw);
      const monthStored = scores
        .filter((s) =>
          rowInMonth({ monthKey: s.monthKey, gameweek: s.gameweek }, month)
        )
        .reduce((sum, s) => sum + s.averageTop2, 0);

      let liveExtra = 0;
      if (!hasStoredCurrent) {
        const roomTeams = allTeams.filter((t) => t.roomId === room._id);
        const nets = roomTeams
          .map((t) =>
            deductHits
              ? t.currentGwPoints - t.currentGwTransfersCost
              : t.currentGwPoints
          )
          .sort((a, b) => b - a);
        liveExtra =
          nets.length >= 2 ? (nets[0] + nets[1]) / 2 : nets[0] ?? 0;
      }
      const total = monthStored + liveExtra;
      if (!monthRoom || total > monthRoom.total) {
        monthRoom = { roomId: room._id, total };
      }
    }
    const leaderRoom = monthRoom
      ? allRooms.find((r) => r._id === monthRoom!.roomId)
      : null;
    const seasonTeam = seasonLeader ? teamMap.get(seasonLeader.entryId) : null;

    return {
      seasonLeaderEntryId: seasonLeader?.entryId ?? null,
      seasonLeaderName: seasonTeam?.managerName ?? null,
      seasonLeaderTeamName: seasonTeam?.teamName ?? null,
      currentMonthKey: month?.monthKey ?? null,
      currentMonthName: month?.monthName ?? null,
      currentMonthRoomId: leaderRoom?._id ?? null,
      currentMonthRoomName: leaderRoom?.name ?? null,
    };
  },
});

/**
 * Henter FPL-profil for et lag / manager med reelle lag- og lagoppstillingsdata, troféer og brukerdetaljer
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

    // Finn tilknyttet bruker
    let user = null;
    if (team?.userId) {
      user = await ctx.db.get(team.userId);
    } else {
      user = await ctx.db
        .query("users")
        .withIndex("by_fplEntryId", (q) => q.eq("fplEntryId", args.entryId))
        .first();
    }

    const settings = await ctx.db.query("league_settings").first();
    const currentGw = settings?.currentGameweek ?? 1;
    const managerName = team?.managerName || user?.username || "Ukjent Manager";
    const teamName = team?.teamName || "FPL Lag";

    // Poeng- og LIGA-plassering per gameweek (klatregraf, ikke verdensrank).
    const allGwScores = await ctx.db.query("gameweek_scores").collect();
    const rankHistory = computeLeagueRankHistory(
      allGwScores,
      allTeams.map((t) => t.entryId)
    );
    const myGwRows = allGwScores
      .filter((s) => s.entryId === args.entryId)
      .sort((a, b) => a.gameweek - b.gameweek);
    const myRankSeries = rankHistory.get(args.entryId) ?? [];
    const rankByGw = new Map(myRankSeries.map((r) => [r.gw, r.leagueRank]));
    const history = myGwRows.map((s) => ({
      gw: s.gameweek,
      points: s.points,
      netPoints: s.netPoints ?? s.points,
      leagueRank: rankByGw.get(s.gameweek) ?? null,
    }));
    const totalManagersInLeague = allTeams.length;

    // 1. Cup-trofeer (Topp 3 plasseringer i Cup / Sluttspill: Gull, Sølv og Bronse)
    const userRoomId = team?.roomId || user?.roomId;
    const cupTrophies: Array<{
      place: 1 | 2 | 3;
      title: string;
      cupName: string;
      season?: string;
      format?: string;
      date?: number;
      type: "cup";
    }> = [];

    if (userRoomId) {
      const allCups = await ctx.db.query("cups").collect();
      for (const cup of allCups) {
        // 1. Plass Gull 🥇
        if (cup.winnerRoomId && cup.winnerRoomId === userRoomId) {
          cupTrophies.push({
            place: 1,
            title: "Cupmester",
            cupName: cup.name,
            season: cup.season || "2025/2026",
            format: cup.format,
            date: cup.updatedAt || cup.createdAt,
            type: "cup",
          });
        }
        // 2. Plass Sølv 🥈
        else if (cup.runnerUpRoomId && cup.runnerUpRoomId === userRoomId) {
          cupTrophies.push({
            place: 2,
            title: "Finalist",
            cupName: cup.name,
            season: cup.season || "2025/2026",
            format: cup.format,
            date: cup.updatedAt || cup.createdAt,
            type: "cup",
          });
        }
        // 3. Plass Bronse 🥉
        else if (cup.thirdPlaceRoomId && cup.thirdPlaceRoomId === userRoomId) {
          cupTrophies.push({
            place: 3,
            title: "3. plass",
            cupName: cup.name,
            season: cup.season || "2025/2026",
            format: cup.format,
            date: cup.updatedAt || cup.createdAt,
            type: "cup",
          });
        }
        // Fallback ved eldre cuper hvor runnerUpRoomId / thirdPlaceRoomId ikke ble lagret direkte på cup-dokumentet
        else {
          const matches = await ctx.db
            .query("cup_matches")
            .withIndex("by_cupId", (q) => q.eq("cupId", cup._id))
            .collect();

          const finalMatch = matches.find(
            (m) =>
              m.bracketType === "grand_final" ||
              m.roundTitle?.toLowerCase().includes("storfinale") ||
              m.roundTitle?.toLowerCase().includes("finale")
          );

          if (finalMatch && finalMatch.status === "completed") {
            if (
              finalMatch.winnerRoomId &&
              (finalMatch.room1Id === userRoomId || finalMatch.room2Id === userRoomId) &&
              finalMatch.winnerRoomId !== userRoomId
            ) {
              cupTrophies.push({
                place: 2,
                title: "Finalist",
                cupName: cup.name,
                season: cup.season || "2025/2026",
                format: cup.format,
                date: finalMatch.updatedAt || cup.createdAt,
                type: "cup",
              });
            }
          }

          // Sjekk taperfinale (Double Elimination Losers Final / 3. plass)
          const lbFinalMatch = matches.find(
            (m) =>
              m.bracketType === "losers" &&
              (m.roundTitle?.toLowerCase().includes("taperfinale") || m.nextMatchSlot === 2)
          );
          if (lbFinalMatch && lbFinalMatch.status === "completed" && lbFinalMatch.loserRoomId === userRoomId) {
            cupTrophies.push({
              place: 3,
              title: "3. plass",
              cupName: cup.name,
              season: cup.season || "2025/2026",
              format: cup.format,
              date: lbFinalMatch.updatedAt || cup.createdAt,
              type: "cup",
            });
          }
        }
      }
    }

    // 2. Månedens Manager & Enere (Topp 3 Pokaler)
    const monthlyTrophies: Array<{
      place: 1 | 2 | 3;
      title: string;
      category: "individual" | "room";
      monthName: string;
      score: number;
      date?: number;
    }> = [];

    const allAnnouncements = await ctx.db.query("announcements").collect();
    const monthWinners = allAnnouncements.filter(
      (a) => a.type === "winner_celebration" || a.type === "individual_winner" || a.winnerType
    );

    for (const mw of monthWinners) {
      const isInd = mw.winnerType === "individual" || mw.type === "individual_winner";
      const isRoomWin = mw.winnerType === "room" || mw.type === "winner_celebration";

      if (
        isInd &&
        mw.winnerName &&
        (mw.winnerName.toLowerCase() === managerName.toLowerCase() ||
          (mw.winnerTeamName && mw.winnerTeamName.toLowerCase() === teamName.toLowerCase()) ||
          (user && mw.winnerName.toLowerCase() === user.username.toLowerCase()))
      ) {
        monthlyTrophies.push({
          place: 1,
          title: `Månedsvinner (${mw.monthName || "Måned"})`,
          category: "individual",
          monthName: mw.monthName || "Måned",
          score: mw.winningScore || 0,
          date: mw.createdAt,
        });
      }

      if (isRoomWin && team?.roomId && mw.winningRoomId === team.roomId) {
        monthlyTrophies.push({
          place: 1,
          title: `Beste rom (${mw.monthName || "Måned"})`,
          category: "room",
          monthName: mw.monthName || "Måned",
          score: mw.winningScore || 0,
          date: mw.createdAt,
        });
      }
    }

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
      history,
      leagueSize: totalManagersInLeague,
      chips,
      cupTrophies,
      monthlyTrophies,
      user: user
        ? {
            _id: user._id,
            username: user.username,
            avatar: user.avatar,
            role: user.role,
          }
        : null,
      fplUrl: `https://fantasy.premierleague.com/entry/${args.entryId}/event/${currentGw}`,
    };
  },
});

