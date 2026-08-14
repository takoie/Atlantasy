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
        const currentGw = settings?.currentGameweek ?? 1;
        // Hent alle lag
        const allTeams = await ctx.db.query("fpl_teams").collect();
        // Berik rom med lag og kalkulert topp 2 snitt
        const enrichedRooms = await Promise.all(sortedRooms.map(async (room) => {
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
            }
            else if (top1) {
                liveAverage = top1.effectivePoints;
            }
            // Beregn totalt sesongsnitt / akkumulert romscore
            const totalSeasonScore = roomScores.reduce((sum, gw) => sum + gw.averageTop2, 0);
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
        }));
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
            const liveAvg = top1 && top2
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
        }
        else {
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
        if (!room)
            return null;
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
    },
    handler: async (ctx, args) => {
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
