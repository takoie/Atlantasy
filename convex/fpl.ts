import { action, mutation } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

const FPL_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Atlantasy Desktop FPL Client",
  Accept: "application/json",
};

/**
 * Action for å hente ligatabell og managere direkte fra FPLs offisielle API
 * Støtter både aktive sesongtabeller (standings) og før-sesong påmeldte lag (new_entries)
 */
export const fetchFplLeagueStandings = action({
  args: {
    leagueId: v.number(),
    page: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      const pageNum = args.page || 1;
      const response = await fetch(
        `https://fantasy.premierleague.com/api/leagues-classic/${args.leagueId}/standings/?page_standings=${pageNum}&page_new_entries=${pageNum}`,
        { headers: FPL_HEADERS }
      );

      if (!response.ok) {
        throw new Error(`FPL API feilet med HTTP status ${response.status}`);
      }

      const data = await response.json();
      const standingsResults = data.standings?.results || [];
      const newEntriesResults = data.new_entries?.results || [];

      // Kombiner standings og new_entries (uten duplikater på entryId)
      const entryMap = new Map<number, any>();

      for (const item of standingsResults) {
        if (!item.entry) continue;
        const managerName =
          item.player_name ||
          `${item.player_first_name || ""} ${item.player_last_name || ""}`.trim() ||
          "FPL Manager";
        entryMap.set(item.entry, {
          entryId: item.entry,
          teamName: item.entry_name || "FPL Lag",
          managerName,
          total: item.total || 0,
          pts: item.event_total || 0,
          hits: 0,
          rank: item.rank || 1,
          lastRank: item.last_rank || item.rank || 1,
        });
      }

      for (const item of newEntriesResults) {
        if (!item.entry || entryMap.has(item.entry)) continue;
        const managerName =
          item.player_name ||
          `${item.player_first_name || ""} ${item.player_last_name || ""}`.trim() ||
          "FPL Manager";
        entryMap.set(item.entry, {
          entryId: item.entry,
          teamName: item.entry_name || "FPL Lag",
          managerName,
          total: item.total || 0,
          pts: item.event_total || 0,
          hits: 0,
          rank: item.rank || entryMap.size + 1,
          lastRank: item.last_rank || entryMap.size + 1,
        });
      }

      // Hent eventuelle ekstra sider med new_entries dersom det er flere enn 50 påmeldte lag
      if (data.new_entries?.has_next && pageNum === 1) {
        let nextPage = 2;
        let hasMore = true;
        while (hasMore && nextPage <= 10) {
          try {
            const nextRes = await fetch(
              `https://fantasy.premierleague.com/api/leagues-classic/${args.leagueId}/standings/?page_new_entries=${nextPage}`,
              { headers: FPL_HEADERS }
            );
            if (nextRes.ok) {
              const nextData = await nextRes.json();
              const nextEntries = nextData.new_entries?.results || [];
              for (const item of nextEntries) {
                if (!item.entry || entryMap.has(item.entry)) continue;
                const managerName =
                  item.player_name ||
                  `${item.player_first_name || ""} ${item.player_last_name || ""}`.trim() ||
                  "FPL Manager";
                entryMap.set(item.entry, {
                  entryId: item.entry,
                  teamName: item.entry_name || "FPL Lag",
                  managerName,
                  total: item.total || 0,
                  pts: item.event_total || 0,
                  hits: 0,
                  rank: item.rank || entryMap.size + 1,
                  lastRank: item.last_rank || entryMap.size + 1,
                });
              }
              hasMore = nextData.new_entries?.has_next || false;
              nextPage++;
            } else {
              hasMore = false;
            }
          } catch {
            hasMore = false;
          }
        }
      }

      const formattedStandings = Array.from(entryMap.values());

      // Finn gjeldende gameweek fra bootstrap-static
      let activeGw = 1;
      try {
        const bootRes = await fetch(
          "https://fantasy.premierleague.com/api/bootstrap-static/",
          { headers: FPL_HEADERS }
        );
        if (bootRes.ok) {
          const bootData = await bootRes.json();
          const currentEvent =
            bootData.events?.find((e: any) => e.is_current) ||
            bootData.events?.find((e: any) => e.is_next) ||
            bootData.events?.[0];
          if (currentEvent?.id) {
            activeGw = currentEvent.id;
          }
        }
      } catch {
        const settings = await ctx.runQuery(api.admin.getSettings);
        activeGw = settings?.currentGameweek || 1;
      }

      // 3. Lagre lagene automatisk i Convex fpl_teams databasen
      if (formattedStandings.length > 0) {
        const teamsData = formattedStandings.map((s) => ({
          entryId: s.entryId,
          teamName: s.teamName,
          managerName: s.managerName,
          totalPoints: s.total || 0,
          currentGwPoints: s.pts || 0,
          currentGwTransfersCost: s.hits || 0,
        }));

        await ctx.runMutation(api.fpl.saveLiveFplSyncResult, {
          currentGameweek: activeGw,
          teamsData,
        });
      }

      return {
        success: true,
        leagueName: data.league?.name || "FPL Classic League",
        standings: formattedStandings,
        hasNext: Boolean(data.standings?.has_next || data.new_entries?.has_next),
        totalResults: formattedStandings.length,
        teamCount: formattedStandings.length,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Kunne ikke hente data fra FPL API",
        standings: [],
      };
    }
  },
});

/**
 * Action for å synkronisere all live data fra FPL API:
 * 1. Finner gjeldende Gameweek fra bootstrap-static
 * 2. Henter stillingen i den konfigurerte FPL-ligaen (både standings og new_entries)
 * 3. Henter transfer hits (-4p per ekstra bytte) per lag
 * 4. Oppdaterer databasen og beregner romsnitt
 */
export const syncLiveFplData = action({
  args: {
    customLeagueId: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      // 1. Hent bootstrap-static for å finne aktiv gameweek
      let activeGw = 1;
      try {
        const bootRes = await fetch(
          "https://fantasy.premierleague.com/api/bootstrap-static/",
          { headers: FPL_HEADERS }
        );
        if (bootRes.ok) {
          const bootData = await bootRes.json();
          const currentEvent =
            bootData.events?.find((e: any) => e.is_current) ||
            bootData.events?.find((e: any) => e.is_next) ||
            bootData.events?.[0];
          if (currentEvent?.id) {
            activeGw = currentEvent.id;
          }
        }
      } catch (e) {
        console.warn("Kunne ikke hente bootstrap-static, bruker fallback GW:", e);
      }

      // 2. Hent ligainnstillinger fra Convex for å finne liga-ID
      const settings = await ctx.runQuery(api.admin.getSettings);
      const targetLeagueId = args.customLeagueId || settings?.leagueId || 464734;

      // 3. Hent ligastilling og påmeldte fra FPL
      const standingsRes = await fetch(
        `https://fantasy.premierleague.com/api/leagues-classic/${targetLeagueId}/standings/`,
        { headers: FPL_HEADERS }
      );

      if (!standingsRes.ok) {
        throw new Error(`FPL League API returnerte status ${standingsRes.status}`);
      }

      const standingsData = await standingsRes.json();
      const standingsResults = standingsData.standings?.results || [];
      const newEntriesResults = standingsData.new_entries?.results || [];

      // Kombiner både standings og new_entries
      const entryMap = new Map<number, any>();
      for (const item of standingsResults) {
        if (!item.entry) continue;
        const managerName =
          item.player_name ||
          `${item.player_first_name || ""} ${item.player_last_name || ""}`.trim() ||
          "FPL Manager";
        entryMap.set(item.entry, {
          entry: item.entry,
          entry_name: item.entry_name || "FPL Lag",
          player_name: managerName,
          total: item.total || 0,
          event_total: item.event_total || 0,
        });
      }
      for (const item of newEntriesResults) {
        if (!item.entry || entryMap.has(item.entry)) continue;
        const managerName =
          item.player_name ||
          `${item.player_first_name || ""} ${item.player_last_name || ""}`.trim() ||
          "FPL Manager";
        entryMap.set(item.entry, {
          entry: item.entry,
          entry_name: item.entry_name || "FPL Lag",
          player_name: managerName,
          total: item.total || 0,
          event_total: item.event_total || 0,
        });
      }

      // Hent ekstra sider med new_entries dersom det er flere enn 50 lag
      if (standingsData.new_entries?.has_next) {
        let nextPage = 2;
        let hasMore = true;
        while (hasMore && nextPage <= 10) {
          try {
            const nextRes = await fetch(
              `https://fantasy.premierleague.com/api/leagues-classic/${targetLeagueId}/standings/?page_new_entries=${nextPage}`,
              { headers: FPL_HEADERS }
            );
            if (nextRes.ok) {
              const nextData = await nextRes.json();
              const nextEntries = nextData.new_entries?.results || [];
              for (const item of nextEntries) {
                if (!item.entry || entryMap.has(item.entry)) continue;
                const managerName =
                  item.player_name ||
                  `${item.player_first_name || ""} ${item.player_last_name || ""}`.trim() ||
                  "FPL Manager";
                entryMap.set(item.entry, {
                  entry: item.entry,
                  entry_name: item.entry_name || "FPL Lag",
                  player_name: managerName,
                  total: item.total || 0,
                  event_total: item.event_total || 0,
                });
              }
              hasMore = nextData.new_entries?.has_next || false;
              nextPage++;
            } else {
              hasMore = false;
            }
          } catch {
            hasMore = false;
          }
        }
      }

      const allCombinedResults = Array.from(entryMap.values());

      // 4. Hent transfer hits for hvert lag (picks endpoint)
      const enrichedTeams = await Promise.all(
        allCombinedResults.map(async (r: any) => {
          let hits = 0;
          let captainName = undefined;

          try {
            const picksRes = await fetch(
              `https://fantasy.premierleague.com/api/entry/${r.entry}/event/${activeGw}/picks/`,
              { headers: FPL_HEADERS }
            );
            if (picksRes.ok) {
              const picksData = await picksRes.json();
              hits = picksData.entry_history?.event_transfers_cost || 0;
            }
          } catch {
            // Ignorer enkelte picks-feil og fortsett med 0 hits
          }

          const managerName =
            r.player_name ||
            `${r.player_first_name || ""} ${r.player_last_name || ""}`.trim() ||
            "FPL Manager";

          return {
            entryId: r.entry,
            teamName: r.entry_name || "FPL Lag",
            managerName,
            totalPoints: r.total || 0,
            currentGwPoints: r.event_total || 0,
            currentGwTransfersCost: hits,
            captainName,
          };
        })
      );

      // 5. Lagre synkroniserte data i Convex databasen
      await ctx.runMutation(api.fpl.saveLiveFplSyncResult, {
        currentGameweek: activeGw,
        teamsData: enrichedTeams,
      });

      return {
        success: true,
        gameweek: activeGw,
        syncedCount: enrichedTeams.length,
        leagueName: standingsData.league?.name,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Feil under synkronisering mot FPL API",
      };
    }
  },
});

/**
 * Action for å hente live lagoppstilling (pitch & bench), picks og chips direkte fra FPL API for en manager
 */
export const fetchLiveTeamSquad = action({
  args: {
    entryId: v.number(),
    gameweek: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      // 1. Hent bootstrap-static for fotballspillere og klubber
      const bootRes = await fetch(
        "https://fantasy.premierleague.com/api/bootstrap-static/",
        { headers: FPL_HEADERS }
      );

      if (!bootRes.ok) {
        throw new Error(`Bootstrap static feilet med status ${bootRes.status}`);
      }

      const bootData = await bootRes.json();
      const elementsMap = new Map<number, any>();
      for (const el of bootData.elements || []) {
        elementsMap.set(el.id, el);
      }

      const teamsMap = new Map<number, any>();
      for (const t of bootData.teams || []) {
        teamsMap.set(t.id, t);
      }

      // Finn aktiv GW
      let gw = args.gameweek;
      if (!gw) {
        const currentEvent =
          bootData.events?.find((e: any) => e.is_current) ||
          bootData.events?.find((e: any) => e.is_next) ||
          bootData.events?.[0];
        gw = currentEvent?.id || 1;
      }

      // 2. Hent managerens picks for gameweek
      const picksRes = await fetch(
        `https://fantasy.premierleague.com/api/entry/${args.entryId}/event/${gw}/picks/`,
        { headers: FPL_HEADERS }
      );

      if (!picksRes.ok) {
        throw new Error(`Picks feilet med status ${picksRes.status}`);
      }

      const picksData = await picksRes.json();
      const rawPicks = picksData.picks || [];

      const posLabels: Record<number, string> = {
        1: "GKP",
        2: "DEF",
        3: "MID",
        4: "FWD",
      };

      const pitch: any[] = [];
      const bench: any[] = [];

      rawPicks.forEach((p: any, idx: number) => {
        const el = elementsMap.get(p.element) || {};
        const teamObj = teamsMap.get(el.team) || {};
        const posType = posLabels[el.element_type] || "MID";

        const playerCard = {
          id: p.element,
          name: el.web_name || "Spiller",
          club: teamObj.short_name || "PL",
          pos: posType,
          points: el.event_points || 0,
          isCaptain: p.is_captain,
          isVice: p.is_vice_captain,
          multiplier: p.multiplier,
          fixture: teamObj.name || "",
        };

        if (idx < 11) {
          pitch.push(playerCard);
        } else {
          bench.push({
            ...playerCard,
            isSub: true,
            subOrder: idx - 10,
          });
        }
      });

      // 3. Hent entry history
      let historyList: any[] = [];
      let chipsList: any[] = [];
      try {
        const histRes = await fetch(
          `https://fantasy.premierleague.com/api/entry/${args.entryId}/history/`,
          { headers: FPL_HEADERS }
        );
        if (histRes.ok) {
          const histData = await histRes.json();
          historyList = (histData.current || []).map((h: any) => ({
            gw: h.event,
            points: h.points,
            rank: h.overall_rank,
            average: 60,
          }));

          chipsList = (histData.chips || []).map((c: any) => ({
            name: c.name,
            status: "Brukt",
            gw: `GW ${c.event}`,
          }));
        }
      } catch {
        // Ignorer history-feil
      }

      return {
        success: true,
        pitch,
        bench,
        history: historyList,
        chips: chipsList,
        activeChip: picksData.active_chip,
        eventTransfersCost: picksData.entry_history?.event_transfers_cost || 0,
        pointsOnBench: picksData.entry_history?.points_on_bench || 0,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Kunne ikke hente live lagoppstilling fra FPL",
      };
    }
  },
});

/**
 * Mutation for å lagre live FPL-synkroniseringsresultater i Convex databasen
 */
export const saveLiveFplSyncResult = mutation({
  args: {
    currentGameweek: v.number(),
    teamsData: v.array(
      v.object({
        entryId: v.number(),
        teamName: v.string(),
        managerName: v.string(),
        totalPoints: v.number(),
        currentGwPoints: v.number(),
        currentGwTransfersCost: v.number(),
        captainName: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    // 1. Oppdater league_settings
    const settings = await ctx.db.query("league_settings").first();
    if (settings) {
      await ctx.db.patch(settings._id, {
        currentGameweek: args.currentGameweek,
        lastSyncedAt: Date.now(),
      });
    }

    const deductHits = settings?.deductTransferHits ?? true;

    // 2. Oppdater / opprett fpl_teams
    for (const item of args.teamsData) {
      const existing = await ctx.db
        .query("fpl_teams")
        .withIndex("by_entryId", (q) => q.eq("entryId", item.entryId))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          teamName: item.teamName,
          managerName: item.managerName,
          totalPoints: item.totalPoints,
          currentGwPoints: item.currentGwPoints,
          currentGwTransfersCost: item.currentGwTransfersCost,
          lastUpdated: Date.now(),
        });
      } else {
        await ctx.db.insert("fpl_teams", {
          entryId: item.entryId,
          teamName: item.teamName,
          managerName: item.managerName,
          totalPoints: item.totalPoints,
          currentGwPoints: item.currentGwPoints,
          currentGwTransfersCost: item.currentGwTransfersCost,
          active: true,
          lastUpdated: Date.now(),
        });
      }

      // Lagre gameweek_scores historikk
      const existingGw = await ctx.db
        .query("gameweek_scores")
        .withIndex("by_entryId_and_gw", (q) =>
          q.eq("entryId", item.entryId).eq("gameweek", args.currentGameweek)
        )
        .first();

      const netPts = deductHits
        ? item.currentGwPoints - item.currentGwTransfersCost
        : item.currentGwPoints;

      if (existingGw) {
        await ctx.db.patch(existingGw._id, {
          points: item.currentGwPoints,
          transfersCost: item.currentGwTransfersCost,
          netPoints: netPts,
          captainName: item.captainName,
          lastCalculated: Date.now(),
        });
      } else {
        await ctx.db.insert("gameweek_scores", {
          entryId: item.entryId,
          gameweek: args.currentGameweek,
          points: item.currentGwPoints,
          transfersCost: item.currentGwTransfersCost,
          netPoints: netPts,
          captainName: item.captainName,
          lastCalculated: Date.now(),
        });
      }
    }

    // 3. Beregn og oppdater romsnitt per gameweek (Top 2 spillere per rom)
    const allRooms = await ctx.db.query("rooms").collect();
    const allTeams = await ctx.db.query("fpl_teams").collect();

    for (const room of allRooms) {
      const roomTeams = allTeams.filter((t) => t.roomId === room._id);
      if (roomTeams.length === 0) continue;

      const scored = roomTeams.map((t) => {
        const net = deductHits
          ? t.currentGwPoints - t.currentGwTransfersCost
          : t.currentGwPoints;
        return {
          entryId: t.entryId,
          net,
        };
      });

      scored.sort((a, b) => b.net - a.net);
      const top1 = scored[0];
      const top2 = scored[1];

      let avg = 0;
      if (top1 && top2) {
        avg = (top1.net + top2.net) / 2;
      } else if (top1) {
        avg = top1.net;
      }

      const existingRoomScore = await ctx.db
        .query("room_gameweek_scores")
        .withIndex("by_roomId_and_gw", (q) =>
          q.eq("roomId", room._id).eq("gameweek", args.currentGameweek)
        )
        .first();

      if (existingRoomScore) {
        await ctx.db.patch(existingRoomScore._id, {
          averageTop2: Math.round(avg * 10) / 10,
          top1EntryId: top1?.entryId || 0,
          top1Points: top1?.net || 0,
          top2EntryId: top2?.entryId || 0,
          top2Points: top2?.net || 0,
          deductedHits: deductHits,
          lastCalculated: Date.now(),
        });
      } else {
        await ctx.db.insert("room_gameweek_scores", {
          roomId: room._id,
          gameweek: args.currentGameweek,
          averageTop2: Math.round(avg * 10) / 10,
          top1EntryId: top1?.entryId || 0,
          top1Points: top1?.net || 0,
          top2EntryId: top2?.entryId || 0,
          top2Points: top2?.net || 0,
          deductedHits: deductHits,
          lastCalculated: Date.now(),
        });
      }
    }
  },
});

/**
 * Initialiserer og seeder databasen med 12 rom, standardlag, eksempler og innstillinger
 */
export const seedDefaultData = mutation({
  args: {},
  handler: async (ctx) => {
    // Sjekk om rom allerede finnes
    const existingRooms = await ctx.db.query("rooms").collect();
    if (existingRooms.length > 0) {
      return { message: "Databasen inneholder allerede rom." };
    }

    // 1. Opprett standard ligainnstillinger
    await ctx.db.insert("league_settings", {
      leagueId: 464734,
      leagueName: "Atlantasy FPL Bedriftsliga",
      currentGameweek: 1,
      deductTransferHits: true,
      autoSyncEnabled: true,
      syncIntervalMinutes: 10,
      lastSyncedAt: Date.now(),
      adminPin: "1234",
    });

    // 2. Rene standardrom A1–A12
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

    // 3. Opprett standard invitasjonskoder
    await ctx.db.insert("invite_codes", {
      code: "ATLANTIS-2025",
      role: "user",
      expiresAt: Date.now() + 90 * 24 * 60 * 60 * 1000,
      maxUses: 100,
      usedCount: 0,
      createdAt: Date.now(),
    });

    await ctx.db.insert("invite_codes", {
      code: "ADMIN-ATL-99",
      role: "admin",
      expiresAt: Date.now() + 180 * 24 * 60 * 60 * 1000,
      maxUses: 10,
      usedCount: 0,
      createdAt: Date.now(),
    });

    return {
      success: true,
      message: "Opprettet 12 rene standardrom (Rom A1-A12) og standardinnstillinger.",
    };
  },
});

/**
 * Action for å hente offisiell neste FPL-frist fra Premier League API
 */
export const fetchNextDeadline = action({
  args: {},
  handler: async () => {
    try {
      const res = await fetch("https://fantasy.premierleague.com/api/bootstrap-static/", { headers: FPL_HEADERS });
      if (!res.ok) throw new Error("Kunne ikke hente bootstrap-static");
      const data = await res.json();
      const nextEvent =
        data.events?.find((e: any) => e.is_next) ||
        data.events?.find((e: any) => !e.finished && new Date(e.deadline_time).getTime() > Date.now()) ||
        data.events?.[0];

      if (!nextEvent) return null;

      return {
        gameweek: nextEvent.id,
        name: `GW ${nextEvent.id}`,
        deadlineTime: nextEvent.deadline_time,
        deadlineEpoch: new Date(nextEvent.deadline_time).getTime(),
      };
    } catch {
      // Fallback
      return {
        gameweek: 1,
        name: "GW 1",
        deadlineTime: new Date(Date.now() + 6 * 24 * 3600 * 1000).toISOString(),
        deadlineEpoch: Date.now() + 6 * 24 * 3600 * 1000,
      };
    }
  },
});
