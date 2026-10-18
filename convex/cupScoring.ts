/**
 * Beregning av cupomganger: avgjør kamper, sender vinnere/tapere videre og
 * håndterer faseoverganger (gruppespill -> utslag, runde 1 -> lucky losers).
 *
 * Alt er skrevet så det kan kjøres på nytt for samme runde uten å dobbelttelle:
 * gruppetabellen bygges alltid fra bunnen av ut fra ferdige gruppekamper.
 */
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { groupQualifierOrder, type CupPlan } from "./cupEngine";

type Cup = Doc<"cups">;
type Match = Doc<"cup_matches">;
type RoomId = Id<"rooms">;
type MatchRole = "final" | "third_place" | "lb_final";

type PlayerScore = {
  entryId: number;
  name: string;
  points: number;
  hits: number;
};

type RoomStats = {
  avg: number;
  topPlayers: PlayerScore[];
  totalPoints: number;
};

/**
 * Gjør en generert plan om til cup_matches-rader og kobler nextMatchId i to steg.
 */
export async function persistCupPlan(
  ctx: MutationCtx,
  cupId: Id<"cups">,
  plan: CupPlan,
  seededRooms: Doc<"rooms">[],
  startGw: number
) {
  const now = Date.now();
  const keyToId = new Map<string, Id<"cup_matches">>();

  for (const m of plan.matches) {
    const room1Id = m.seed1 != null ? seededRooms[m.seed1]?._id : undefined;
    const room2Id = m.seed2 != null ? seededRooms[m.seed2]?._id : undefined;
    const id = await ctx.db.insert("cup_matches", {
      cupId,
      bracketType: m.bracketType,
      stage: m.stage,
      group: m.group,
      roundNumber: m.roundNumber,
      roundTitle: m.roundTitle,
      matchIndex: m.matchIndex,
      gameweek: startGw + (m.roundNumber - 1),
      room1Id,
      room2Id,
      qual1: m.qual1 ?? undefined,
      qual2: m.qual2 ?? undefined,
      role: m.role,
      isBye: m.isBye || undefined,
      // Walkover er avgjort fra start.
      winnerRoomId: m.isBye ? room1Id : undefined,
      status: m.isBye ? "completed" : "scheduled",
      updatedAt: now,
    });
    keyToId.set(m.key, id);
  }

  for (const m of plan.matches) {
    const patch: Partial<Doc<"cup_matches">> = {};
    const winnerTarget = m.nextWinnerKey ? keyToId.get(m.nextWinnerKey) : undefined;
    if (winnerTarget) {
      patch.nextMatchId = winnerTarget;
      patch.nextMatchSlot = m.nextWinnerSlot ?? 1;
    }
    const loserTarget = m.nextLoserKey ? keyToId.get(m.nextLoserKey) : undefined;
    if (loserTarget) {
      patch.nextLoserMatchId = loserTarget;
      patch.nextLoserMatchSlot = m.nextLoserSlot ?? 1;
    }
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch("cup_matches", keyToId.get(m.key)!, patch);
    }
  }
}

/** Rollen til en kamp. Eldre cuper mangler `role`, så vi faller tilbake på tittel. */
export function matchRole(m: Match, cup: Cup): MatchRole | undefined {
  if (m.role) return m.role as MatchRole;
  if (m.bracketType === "group") return undefined;
  const t = (m.roundTitle ?? "").toLowerCase();
  if (m.bracketType === "grand_final" || t.includes("grand final")) return "final";
  if (t.includes("3rd place") || t.includes("bronse")) return "third_place";
  if (m.bracketType === "losers") {
    return t.includes("final") && !t.includes("round") ? "lb_final" : undefined;
  }
  if (m.bracketType === "knockout" && m.roundNumber === cup.totalRounds) return "final";
  return undefined;
}

/* ------------------------------------------------------------------ */
/* Poengberegning                                                      */
/* ------------------------------------------------------------------ */

export function roomStatsFor(
  roomId: RoomId,
  teams: Doc<"fpl_teams">[],
  scoreByEntry: Map<number, Doc<"gameweek_scores">>,
  deductHits: boolean
): RoomStats {
  const players: PlayerScore[] = teams
    .filter((t) => t.roomId === roomId)
    .map((t) => {
      const rec = scoreByEntry.get(t.entryId);
      const raw = rec ? rec.points : t.currentGwPoints || 0;
      const hits = rec ? rec.transfersCost : t.currentGwTransfersCost || 0;
      return {
        entryId: t.entryId,
        name: t.managerName || t.teamName || `Lag ${t.entryId}`,
        points: deductHits ? raw - hits : raw,
        hits,
      };
    })
    .sort((a, b) => b.points - a.points);

  const top = players.slice(0, 2);
  const avg = top.length > 0 ? top.reduce((s, p) => s + p.points, 0) / top.length : 0;
  return {
    avg: Math.round(avg * 10) / 10,
    topPlayers: top,
    totalPoints: players.reduce((s, p) => s + p.points, 0),
  };
}

/** Romsnitt først, deretter beste enkeltspiller, deretter samlet romscore. */
export function decide(a: RoomStats, b: RoomStats): 1 | 2 | 0 {
  if (a.avg !== b.avg) return a.avg > b.avg ? 1 : 2;
  const a1 = a.topPlayers[0]?.points ?? 0;
  const b1 = b.topPlayers[0]?.points ?? 0;
  if (a1 !== b1) return a1 > b1 ? 1 : 2;
  if (a.totalPoints !== b.totalPoints) return a.totalPoints > b.totalPoints ? 1 : 2;
  return 0;
}

/* ------------------------------------------------------------------ */
/* Avansement                                                          */
/* ------------------------------------------------------------------ */

async function putInSlot(
  ctx: MutationCtx,
  matchId: Id<"cup_matches"> | undefined,
  slot: number | undefined,
  roomId: RoomId
) {
  if (!matchId || !slot) return;
  const target = await ctx.db.get("cup_matches", matchId);
  if (!target) return;
  await ctx.db.patch("cup_matches", matchId, {
    ...(slot === 1 ? { room1Id: roomId } : { room2Id: roomId }),
    updatedAt: Date.now(),
  });
}

/** Sender vinneren (og taperen) videre og kårer plasseringer ved finalekamper. */
export async function advanceFromMatch(
  ctx: MutationCtx,
  cup: Cup,
  match: Match,
  winnerId: RoomId | undefined,
  loserId: RoomId | undefined
) {
  if (winnerId) await putInSlot(ctx, match.nextMatchId, match.nextMatchSlot, winnerId);
  if (loserId) await putInSlot(ctx, match.nextLoserMatchId, match.nextLoserMatchSlot, loserId);

  const role = matchRole(match, cup);
  if (!role || !winnerId) return;
  if (role === "final") {
    await ctx.db.patch("cups", cup._id, {
      winnerRoomId: winnerId,
      runnerUpRoomId: loserId,
      status: "completed",
      updatedAt: Date.now(),
    });
  } else if (role === "third_place") {
    await ctx.db.patch("cups", cup._id, { thirdPlaceRoomId: winnerId, updatedAt: Date.now() });
  } else if (role === "lb_final" && loserId) {
    await ctx.db.patch("cups", cup._id, { thirdPlaceRoomId: loserId, updatedAt: Date.now() });
  }
}

/** En kamp er låst hvis kampen den mater allerede er spilt ferdig. */
async function isLocked(ctx: MutationCtx, match: Match): Promise<boolean> {
  for (const id of [match.nextMatchId, match.nextLoserMatchId]) {
    if (!id) continue;
    const next = await ctx.db.get("cup_matches", id);
    if (next?.status === "completed") return true;
  }
  return false;
}

/* ------------------------------------------------------------------ */
/* Gruppespill                                                         */
/* ------------------------------------------------------------------ */

type Standing = NonNullable<Cup["groupStandings"]>[number];

export function sortStandings(rows: Standing[]): Standing[] {
  return [...rows].sort(
    (a, b) => b.points - a.points || b.totalRoomScore - a.totalRoomScore || b.won - a.won
  );
}

function rebuildStandings(cup: Cup, groupMatches: Match[]): Standing[] {
  const rows = new Map<string, Standing>();
  for (const s of cup.groupStandings ?? []) {
    rows.set(s.roomId, { ...s, played: 0, won: 0, drawn: 0, lost: 0, points: 0, totalRoomScore: 0 });
  }
  for (const m of groupMatches) {
    if (m.status !== "completed" || !m.room1Id || !m.room2Id) continue;
    const r1 = rows.get(m.room1Id);
    const r2 = rows.get(m.room2Id);
    if (!r1 || !r2) continue;
    r1.played++;
    r2.played++;
    r1.totalRoomScore += m.room1Score ?? 0;
    r2.totalRoomScore += m.room2Score ?? 0;
    if (!m.winnerRoomId) {
      r1.drawn++;
      r2.drawn++;
      r1.points += 1;
      r2.points += 1;
    } else if (m.winnerRoomId === m.room1Id) {
      r1.won++;
      r2.lost++;
      r1.points += 3;
    } else {
      r2.won++;
      r1.lost++;
      r2.points += 3;
    }
  }
  for (const r of rows.values()) r.totalRoomScore = Math.round(r.totalRoomScore * 10) / 10;
  return [...rows.values()];
}

/** Fyller rom inn i kamper som venter på en plass i kvalifiseringslisten. */
async function fillQualifiers(ctx: MutationCtx, cupId: Id<"cups">, qualifiers: RoomId[]) {
  const matches = await ctx.db
    .query("cup_matches")
    .withIndex("by_cupId", (q) => q.eq("cupId", cupId))
    .take(500);
  for (const m of matches) {
    if (m.qual1 == null && m.qual2 == null) continue;
    if (m.status === "completed") continue;
    await ctx.db.patch("cup_matches", m._id, {
      ...(m.qual1 != null && qualifiers[m.qual1] && { room1Id: qualifiers[m.qual1] }),
      ...(m.qual2 != null && qualifiers[m.qual2] && { room2Id: qualifiers[m.qual2] }),
      updatedAt: Date.now(),
    });
  }
}

async function refreshGroupPhase(ctx: MutationCtx, cupId: Id<"cups">) {
  const cup = await ctx.db.get("cups", cupId);
  if (!cup?.groupStandings?.length) return;

  const matches = await ctx.db
    .query("cup_matches")
    .withIndex("by_cupId", (q) => q.eq("cupId", cupId))
    .take(500);
  const groupMatches = matches.filter((m) => m.bracketType === "group");

  const standings = rebuildStandings(cup, groupMatches);
  await ctx.db.patch("cups", cupId, { groupStandings: standings, updatedAt: Date.now() });

  const done = groupMatches.length > 0 && groupMatches.every((m) => m.status === "completed");
  if (!done) return;

  const letters = [...new Set(standings.map((s) => s.group))].sort();
  const tables = letters.map((l) => sortStandings(standings.filter((s) => s.group === l)));

  if (tables.length === 1) {
    // Ren serie: tabelltoppen vinner cupen.
    const [first, second, third] = tables[0];
    await ctx.db.patch("cups", cupId, {
      winnerRoomId: first?.roomId,
      runnerUpRoomId: second?.roomId,
      thirdPlaceRoomId: third?.roomId,
      status: "completed",
      updatedAt: Date.now(),
    });
    return;
  }

  const order = groupQualifierOrder(tables.length);
  const qualifiers = order
    .map((o) => tables[o.group]?.[o.place - 1]?.roomId)
    .filter((id): id is RoomId => id !== undefined);
  await fillQualifiers(ctx, cupId, qualifiers);
}

/* ------------------------------------------------------------------ */
/* Lucky loser                                                         */
/* ------------------------------------------------------------------ */

async function refreshLuckyLosers(ctx: MutationCtx, cupId: Id<"cups">) {
  const matches = await ctx.db
    .query("cup_matches")
    .withIndex("by_cupId", (q) => q.eq("cupId", cupId))
    .take(500);
  const slotsNeeded = Math.max(
    -1,
    ...matches.flatMap((m) => [m.qual1 ?? -1, m.qual2 ?? -1])
  ) + 1;
  if (slotsNeeded === 0) return;

  const r1 = matches.filter((m) => m.roundNumber === 1);
  const played = r1.filter((m) => !m.isBye);
  if (played.length === 0 || played.some((m) => m.status !== "completed")) return;

  const byes = r1.filter((m) => m.isBye && m.room1Id).map((m) => m.room1Id as RoomId);
  const winners = [...played]
    .sort((a, b) => a.matchIndex - b.matchIndex)
    .map((m) => m.winnerRoomId)
    .filter((id): id is RoomId => id !== undefined);

  const losers = played
    .filter((m) => m.winnerRoomId && m.loserRoomId)
    .map((m) => {
      const isRoom1 = m.loserRoomId === m.room1Id;
      const top = isRoom1 ? m.room1TopPlayers : m.room2TopPlayers;
      return {
        roomId: m.loserRoomId as RoomId,
        score: (isRoom1 ? m.room1Score : m.room2Score) ?? 0,
        best: top?.[0]?.points ?? 0,
        sum: (top ?? []).reduce((s, p) => s + p.points, 0),
      };
    })
    .sort((a, b) => b.score - a.score || b.best - a.best || b.sum - a.sum);

  const directly = [...byes, ...winners];
  const luckyLosers = losers.slice(0, Math.max(0, slotsNeeded - directly.length)).map((l) => l.roomId);

  await ctx.db.patch("cups", cupId, { luckyLoserRoomIds: luckyLosers, updatedAt: Date.now() });
  await fillQualifiers(ctx, cupId, [...directly, ...luckyLosers]);
}

/* ------------------------------------------------------------------ */
/* Hele runden                                                         */
/* ------------------------------------------------------------------ */

export type RoundResult = {
  roundNumber: number;
  updatedMatchesCount: number;
  lockedMatchesCount: number;
  waitingMatchesCount: number;
};

export async function calculateRound(
  ctx: MutationCtx,
  cupId: Id<"cups">,
  roundNumber: number
): Promise<RoundResult> {
  const cup = await ctx.db.get("cups", cupId);
  if (!cup) throw new Error("Cup ikke funnet.");

  const roundMatches = await ctx.db
    .query("cup_matches")
    .withIndex("by_cupId_and_round", (q) => q.eq("cupId", cupId).eq("roundNumber", roundNumber))
    .take(200);
  if (roundMatches.length === 0) {
    throw new Error(`Ingen kamper funnet for runde ${roundNumber}.`);
  }

  const settings = await ctx.db.query("league_settings").first();
  const deductHits = settings?.deductTransferHits ?? true;
  const gw = roundMatches[0].gameweek;
  if (settings && gw > settings.currentGameweek) {
    throw new Error(`Gameweek ${gw} har ikke startet ennå – kan ikke beregne runde ${roundNumber}.`);
  }

  const teams = await ctx.db.query("fpl_teams").collect();
  const gwScores = await ctx.db
    .query("gameweek_scores")
    .withIndex("by_gameweek", (q) => q.eq("gameweek", gw))
    .collect();
  const scoreByEntry = new Map(gwScores.map((s) => [s.entryId, s]));

  let updated = 0;
  let locked = 0;
  let waiting = 0;

  for (const match of roundMatches) {
    if (match.isBye) continue;
    if (!match.room1Id || !match.room2Id) {
      waiting++;
      continue;
    }
    if (await isLocked(ctx, match)) {
      locked++;
      continue;
    }

    const stats1 = roomStatsFor(match.room1Id, teams, scoreByEntry, deductHits);
    const stats2 = roomStatsFor(match.room2Id, teams, scoreByEntry, deductHits);
    const verdict = decide(stats1, stats2);

    // Uavgjort er bare lov i gruppespill. I utslag vinner rom 1 (høyest seedet).
    const side = verdict === 0 && match.bracketType !== "group" ? 1 : verdict;
    const winnerId = side === 1 ? match.room1Id : side === 2 ? match.room2Id : undefined;
    const loserId = side === 1 ? match.room2Id : side === 2 ? match.room1Id : undefined;

    await ctx.db.patch("cup_matches", match._id, {
      room1Score: stats1.avg,
      room2Score: stats2.avg,
      room1TopPlayers: stats1.topPlayers,
      room2TopPlayers: stats2.topPlayers,
      winnerRoomId: winnerId,
      loserRoomId: loserId,
      status: "completed",
      updatedAt: Date.now(),
    });
    await advanceFromMatch(ctx, cup, match, winnerId, loserId);
    updated++;
  }

  await refreshCupState(ctx, cupId);

  return {
    roundNumber,
    updatedMatchesCount: updated,
    lockedMatchesCount: locked,
    waitingMatchesCount: waiting,
  };
}

/** Kjøres etter at kamper er avgjort: tabeller, faseoverganger og aktiv runde. */
export async function refreshCupState(ctx: MutationCtx, cupId: Id<"cups">) {
  const cup = await ctx.db.get("cups", cupId);
  if (!cup) return;
  await refreshGroupPhase(ctx, cupId);
  if (cup.format === "lucky_loser") await refreshLuckyLosers(ctx, cupId);
  await syncCurrentRound(ctx, cupId);
}

/** Peker `currentRound` på første omgang som ikke er ferdigspilt. */
async function syncCurrentRound(ctx: MutationCtx, cupId: Id<"cups">) {
  const cup = await ctx.db.get("cups", cupId);
  if (!cup) return;
  const matches = await ctx.db
    .query("cup_matches")
    .withIndex("by_cupId", (q) => q.eq("cupId", cupId))
    .take(500);
  const open = matches.filter((m) => m.status !== "completed").map((m) => m.roundNumber);
  const current = open.length > 0 ? Math.min(...open) : cup.totalRounds;
  if (current !== cup.currentRound) {
    await ctx.db.patch("cups", cupId, { currentRound: current, updatedAt: Date.now() });
  }
}

/** Beregner alle omganger som hører til en gameweek, for alle aktive cuper med autoCalc. */
export async function calculateGameweekForActiveCups(ctx: MutationCtx, gw: number) {
  const cups = await ctx.db
    .query("cups")
    .withIndex("by_status", (q) => q.eq("status", "active"))
    .take(10);

  const results: Array<{ cupId: Id<"cups">; rounds: number[] }> = [];
  for (const cup of cups) {
    if (cup.autoCalc === false) continue;
    const matches = await ctx.db
      .query("cup_matches")
      .withIndex("by_cupId", (q) => q.eq("cupId", cup._id))
      .take(500);
    const rounds = [
      ...new Set(
        matches
          .filter((m) => m.gameweek === gw && !m.isBye && m.room1Id && m.room2Id)
          .map((m) => m.roundNumber)
      ),
    ].sort((a, b) => a - b);

    for (const r of rounds) {
      await calculateRound(ctx, cup._id, r);
    }
    if (rounds.length > 0) results.push({ cupId: cup._id, rounds });
  }
  return results;
}
