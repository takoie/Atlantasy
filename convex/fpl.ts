import {
  action,
  mutation,
  internalMutation,
  internalQuery,
  type ActionCtx,
} from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import {
  buildGwCalendar,
  monthsFromCalendar,
  gwMonthMap,
  type GwCalendarEntry,
} from "./fplCalendar";
import { toPlayerRow } from "./playerMath";
import { changedFields, hasChanges } from "./changedFields";
import { displayedPoints, resolveSquad } from "./squadMath";

export const FPL_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Atlantasy Desktop FPL Client",
  Accept: "application/json",
};

/**
 * Kjører async-arbeid i sekvensielle batcher slik at vi ikke bombarderer FPL-APIet
 * med hundrevis av samtidige forespørsler (som gir 429-svar og delvis data).
 */
async function mapInBatches<T, R>(
  items: T[],
  batchSize: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    out.push(...(await Promise.all(batch.map(worker))));
  }
  return out;
}

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

        await ctx.runMutation(internal.fpl.saveLiveFplSyncResult, {
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

export type LiveSyncResult =
  | { success: true; gameweek: number; syncedCount: number; leagueName?: string }
  | { success: false; error: string };

/**
 * Synkroniserer all live data fra FPL API:
 * 1. Finner gjeldende Gameweek fra bootstrap-static
 * 2. Henter stillingen i den konfigurerte FPL-ligaen (både standings og new_entries)
 * 3. Henter transfer hits (-4p per ekstra bytte) per lag
 * 4. Oppdaterer databasen og beregner romsnitt
 *
 * Delt av admin-handlingen (syncLiveFplData) og den serverstyrte synken (autoSync.ts).
 */
export async function runLiveFplSync(
  ctx: ActionCtx,
  customLeagueId?: number
): Promise<LiveSyncResult> {
  try {
    // 1. Hent ligainnstillinger fra Convex (liga-ID + fallback-gameweek)
    const settings = await ctx.runQuery(api.admin.getSettings);
    const targetLeagueId = customLeagueId || settings?.leagueId || 464734;

    // 2. Hent bootstrap-static ÉN gang – gir både aktiv gameweek og spillerkatalogen.
    //    Alle feltnavn nedenfor leses fra dette live-svaret, ikke fra hardkodede antakelser.
    //    Faller tilbake til lagret currentGameweek (ikke hardkodet 1) hvis kallet feiler.
    let activeGw: number = settings?.currentGameweek || 1;
    const elementsMap = new Map<number, any>();
    let gwCalendar: GwCalendarEntry[] = [];
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
        for (const el of bootData.elements || []) {
          elementsMap.set(el.id, el);
        }
        // Utled måned-tilhørighet per gameweek fra de offisielle fristene.
        gwCalendar = buildGwCalendar(bootData.events || []);
      }
      if (elementsMap.size === 0) {
        console.warn(
          "bootstrap-static ga ingen elements – kaptein/benk-berikelse hoppes over i denne synkroniseringen"
        );
      }
    } catch (e) {
      console.warn("Kunne ikke hente bootstrap-static, bruker fallback GW:", e);
    }

    const gwMonth = gwMonthMap(gwCalendar);
    const monthRanges = monthsFromCalendar(gwCalendar).map((m) => ({
      monthKey: m.monthKey,
      monthName: m.monthName,
      gameweekStart: m.gameweekStart,
      gameweekEnd: m.gameweekEnd,
      customGwList: m.gwList,
      isCompleted: m.isCompleted,
    }));

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

    // 4. Berik hvert lag med transfer hits, kaptein, benkpoeng og sesonghistorikk
    //    (picks- + history-endepunktene). Kjøres i batcher for å unngå FPL rate-limiting
    //    – hele ligaen på én gang ville vært titalls samtidige forespørsler.
    const enrichedTeams = await mapInBatches(allCombinedResults, 5, async (r: any) => {
        let hits = 0;
        let captainName: string | undefined;
        let captainPoints = 0;
        let benchPoints = 0;
        let benchedPlayer: string | undefined;
        let totalHitsCost = 0;
        let activeChip: string | undefined;
        let perGwHistory: Array<{
          gw: number;
          points: number;
          transfersCost: number;
          benchPoints: number;
          activeChip?: string;
        }> = [];

        try {
          const [picksRes, historyRes] = await Promise.all([
            fetch(
              `https://fantasy.premierleague.com/api/entry/${r.entry}/event/${activeGw}/picks/`,
              { headers: FPL_HEADERS }
            ),
            fetch(
              `https://fantasy.premierleague.com/api/entry/${r.entry}/history/`,
              { headers: FPL_HEADERS }
            ),
          ]);

          if (picksRes.ok) {
            const picksData = await picksRes.json();
            // picks kommer sortert på "position" 1–15 (1–11 = banen, 12–15 = benk),
            // men vi sorterer defensivt i tilfelle FPL endrer rekkefølgen.
            const picks = [...(picksData.picks || [])].sort(
              (a: any, b: any) => (a.position || 0) - (b.position || 0)
            );
            const captainPick =
              picks.find((p: any) => p.is_captain) ||
              picks.find((p: any) => p.is_vice_captain);
            const captainElement = captainPick
              ? elementsMap.get(captainPick.element)
              : undefined;
            captainName = captainElement?.web_name || undefined;
            captainPoints = captainElement?.event_points || 0;
            benchPoints = picksData.entry_history?.points_on_bench || 0;

            // "Benkevarmeren": den benkede spilleren som faktisk scoret mest denne runden.
            const worstBenchMiss = picks
              .slice(11)
              .map((p: any) => elementsMap.get(p.element))
              .filter(Boolean)
              .sort((a: any, b: any) => (b.event_points || 0) - (a.event_points || 0))[0];
            benchedPlayer = worstBenchMiss?.web_name || undefined;

            hits = picksData.entry_history?.event_transfers_cost || 0;
            activeChip = picksData.active_chip || undefined;
          }

          if (historyRes.ok) {
            const historyData = await historyRes.json();
            const seasonHistory = Array.isArray(historyData.current) ? historyData.current : [];
            totalHitsCost = seasonHistory.reduce((sum: number, item: any) => sum + (item.event_transfers_cost || 0), 0);
            // Chip-bruk per runde ligger i history.chips ([{ name, event, time }]),
            // IKKE i history.current – dette er eneste kilde til historiske chips.
            const chipByGw = new Map<number, string>();
            for (const c of Array.isArray(historyData.chips) ? historyData.chips : []) {
              if (typeof c?.event === "number" && c?.name) {
                chipByGw.set(c.event, String(c.name));
              }
            }
            // Full per-runde-historikk for backfill av gameweek_scores.
            perGwHistory = seasonHistory
              .filter((h: any) => typeof h.event === "number")
              .map((h: any) => ({
                gw: h.event,
                points: h.points || 0,
                transfersCost: h.event_transfers_cost || 0,
                benchPoints: h.points_on_bench || 0,
                activeChip: chipByGw.get(h.event) || undefined,
              }));
          }
        } catch {
          // Ignorer enkelte picks-/history-feil og fortsett med 0
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
          captainPoints,
          benchPoints,
          benchedPlayer,
          totalHitsCost,
          activeChip,
          perGwHistory,
        };
    });

    // 5. Lagre synkroniserte data i Convex databasen
    await ctx.runMutation(internal.fpl.saveLiveFplSyncResult, {
      currentGameweek: activeGw,
      gwMonth,
      monthRanges,
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
}

/** Minste tid mellom to synker utløst av en vanlig (ikke-admin) bruker. */
const NON_ADMIN_SYNC_COOLDOWN_MS = 30 * 60 * 1000;

/** Hvem som ber om synk, og når det sist ble synket. */
export const getSyncAccess = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    const settings = await ctx.db.query("league_settings").first();
    return {
      exists: user !== null,
      isAdmin: user?.role === "admin",
      lastSyncedAt: settings?.lastSyncedAt ?? 0,
    };
  },
});

/**
 * Manuell synk fra appen. Administratorer kan alltid synke; vanlige brukere
 * (f.eks. nye brukere som skal koble FPL-laget sitt) bare hvis forrige synk er
 * eldre enn 30 minutter. Den ordinære oppdateringen kjøres av autoSync.ts.
 */
export const syncLiveFplData = action({
  args: {
    userId: v.optional(v.id("users")),
    customLeagueId: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<LiveSyncResult | { success: true; skipped: true }> => {
    if (!args.userId) {
      return { success: false, error: "Uautorisert: Bruker-ID må oppgis." };
    }
    const access = await ctx.runQuery(internal.fpl.getSyncAccess, { userId: args.userId });
    if (!access.exists) {
      return { success: false, error: "Uautorisert: Bruker ble ikke funnet." };
    }
    if (!access.isAdmin && Date.now() - access.lastSyncedAt < NON_ADMIN_SYNC_COOLDOWN_MS) {
      return { success: true, skipped: true };
    }
    // Kun administratorer kan peke synken mot en annen liga.
    return await runLiveFplSync(ctx, access.isAdmin ? args.customLeagueId : undefined);
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
  handler: async (_ctx, args) => {
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

      // Reelt rundesnitt per gameweek fra bootstrap (ikke hardkodet 60)
      const gwAverageMap = new Map<number, number>();
      for (const ev of bootData.events || []) {
        gwAverageMap.set(ev.id, ev.average_entry_score || 0);
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

      // 2. Hent managerens picks, rundens kamper og live-poeng (poeng + poengfordeling per spiller)
      const [picksRes, fixturesRes, liveRes] = await Promise.all([
        fetch(
          `https://fantasy.premierleague.com/api/entry/${args.entryId}/event/${gw}/picks/`,
          { headers: FPL_HEADERS }
        ),
        fetch(`https://fantasy.premierleague.com/api/fixtures/?event=${gw}`, {
          headers: FPL_HEADERS,
        }),
        fetch(`https://fantasy.premierleague.com/api/event/${gw}/live/`, {
          headers: FPL_HEADERS,
        }),
      ]);

      if (!picksRes.ok) {
        throw new Error(`Picks feilet med status ${picksRes.status}`);
      }

      // Kamper per klubb-id, med motstander, status og resultat.
      type TeamFixture = {
        id: number;
        opponent: string;
        opponentName: string;
        isHome: boolean;
        difficulty: number;
        started: boolean;
        finished: boolean;
        kickoff: string | null;
        scoreFor: number | null;
        scoreAgainst: number | null;
      };
      const fixturesByTeam = new Map<number, TeamFixture[]>();
      const fixturesOk = fixturesRes.ok;
      if (fixturesOk) {
        const fixtures = await fixturesRes.json();
        for (const f of Array.isArray(fixtures) ? fixtures : []) {
          const home = teamsMap.get(f.team_h);
          const away = teamsMap.get(f.team_a);
          if (!home || !away) continue;
          const base = {
            id: f.id,
            started: !!f.started,
            finished: !!(f.finished || f.finished_provisional),
            kickoff: f.kickoff_time ?? null,
          };
          const hList = fixturesByTeam.get(f.team_h) ?? [];
          hList.push({
            ...base,
            opponent: away.short_name,
            opponentName: away.name,
            isHome: true,
            difficulty: f.team_h_difficulty ?? 3,
            scoreFor: f.team_h_score ?? null,
            scoreAgainst: f.team_a_score ?? null,
          });
          fixturesByTeam.set(f.team_h, hList);
          const aList = fixturesByTeam.get(f.team_a) ?? [];
          aList.push({
            ...base,
            opponent: home.short_name,
            opponentName: home.name,
            isHome: false,
            difficulty: f.team_a_difficulty ?? 3,
            scoreFor: f.team_a_score ?? null,
            scoreAgainst: f.team_h_score ?? null,
          });
          fixturesByTeam.set(f.team_a, aList);
        }
      }
      const opponentLabel = (teamId: number): string => {
        const list = fixturesByTeam.get(teamId);
        if (!list || list.length === 0) return "–";
        return list.map((o) => `${o.opponent} (${o.isHome ? "H" : "A"})`).join(" · ");
      };

      // Live-poeng per spiller for AKKURAT denne runden (bootstrap `event_points` gjelder
      // bare inneværende runde).
      const liveByElement = new Map<number, any>();
      const liveOk = liveRes.ok;
      if (liveOk) {
        const liveData = await liveRes.json();
        for (const e of liveData.elements || []) liveByElement.set(e.id, e);
      }

      const picksData = await picksRes.json();
      // Sorter defensivt på "position" (1–15) slik at idx < 11 alltid er banen.
      const rawPicks = [...(picksData.picks || [])].sort(
        (a: any, b: any) => (a.position || 0) - (b.position || 0)
      );

      // Uten live-data vet vi ikke hvem som har spilt – da skal ikke visekapteinen overta.
      const minutesOf = (id: number) =>
        liveOk ? (liveByElement.get(id)?.stats?.minutes ?? 0) : 90;
      const fixturesDone = (id: number) => {
        if (!fixturesOk) return false;
        const list = fixturesByTeam.get(elementsMap.get(id)?.team) ?? [];
        return list.every((f) => f.finished);
      };
      const squad = resolveSquad({
        picks: rawPicks,
        automaticSubs: picksData.automatic_subs ?? [],
        minutesOf,
        fixturesDone,
      });

      const posLabels: Record<number, string> = {
        1: "GKP",
        2: "DEF",
        3: "MID",
        4: "FWD",
      };

      const cards = squad.map((r) => {
        const el = elementsMap.get(r.element) || {};
        const teamObj = teamsMap.get(el.team) || {};
        const live = liveByElement.get(r.element);
        const rawPoints: number = live?.stats?.total_points ?? el.event_points ?? 0;

        // Poengfordeling per kamp (live `explain`), koblet mot rundens kamper for klubben.
        const explainByFixture = new Map<number, any[]>();
        for (const x of live?.explain || []) explainByFixture.set(x.fixture, x.stats || []);
        const fixtures = (fixturesByTeam.get(el.team) ?? []).map((f) => ({
          opponent: f.opponent,
          opponentName: f.opponentName,
          isHome: f.isHome,
          difficulty: f.difficulty,
          started: f.started,
          finished: f.finished,
          kickoff: f.kickoff,
          scoreFor: f.scoreFor,
          scoreAgainst: f.scoreAgainst,
          stats: (explainByFixture.get(f.id) ?? []).map((s: any) => ({
            identifier: String(s.identifier),
            value: Number(s.value) || 0,
            points: Number(s.points) || 0,
          })),
        }));

        return {
          id: r.element,
          name: el.web_name || "Spiller",
          club: teamObj.short_name || "PL",
          clubName: teamObj.name || "",
          crest: teamObj.code
            ? `https://resources.premierleague.com/premierleague/badges/70/t${teamObj.code}.png`
            : "",
          pos: posLabels[el.element_type] || "MID",
          rawPoints,
          // Det spilleren faktisk bidrar med i laget: råpoeng × (kaptein 2×/3×, benk 0×).
          points: displayedPoints(rawPoints, r.multiplier),
          counts: r.multiplier > 0,
          isCaptain: r.isCaptain,
          isVice: r.isVice,
          multiplier: r.multiplier,
          viceActivated: r.viceActivated ?? false,
          captainOut: r.captainOut ?? false,
          autoSub: r.autoSub ?? null,
          minutes: live?.stats?.minutes ?? 0,
          opponent: el.team ? opponentLabel(el.team) : "–",
          fixture: teamObj.name || "",
          fixtures,
          detail: el.id ? toPlayerRow(el) : null,
        };
      });

      const pitch = cards.filter((_, i) => squad[i].onPitch);
      const bench = cards
        .map((c, i) => ({ ...c, isSub: true, subOrder: squad[i].position - 11 }))
        .filter((_, i) => !squad[i].onPitch);
      const squadPoints = cards.reduce((sum, c) => (c.counts ? sum + c.points : sum), 0);
      const clubShorts: Record<string, string> = {};
      for (const [id, t] of teamsMap) clubShorts[String(id)] = t.short_name;

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
            average: gwAverageMap.get(h.event) || 0,
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
        gameweek: gw,
        pitch,
        bench,
        squadPoints,
        clubShorts,
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
export const saveLiveFplSyncResult = internalMutation({
  args: {
    currentGameweek: v.number(),
    // gw (som streng) -> "YYYY-MM". Valgfri: eldre kallere sender den ikke.
    gwMonth: v.optional(v.record(v.string(), v.string())),
    monthRanges: v.optional(
      v.array(
        v.object({
          monthKey: v.string(),
          monthName: v.string(),
          gameweekStart: v.number(),
          gameweekEnd: v.number(),
          customGwList: v.array(v.number()),
          isCompleted: v.boolean(),
        })
      )
    ),
    teamsData: v.array(
      v.object({
        entryId: v.number(),
        teamName: v.string(),
        managerName: v.string(),
        totalPoints: v.number(),
        currentGwPoints: v.number(),
        currentGwTransfersCost: v.number(),
        captainName: v.optional(v.string()),
        captainPoints: v.optional(v.number()),
        benchPoints: v.optional(v.number()),
        benchedPlayer: v.optional(v.string()),
        totalHitsCost: v.optional(v.number()),
        activeChip: v.optional(v.string()),
        perGwHistory: v.optional(
          v.array(
            v.object({
              gw: v.number(),
              points: v.number(),
              transfersCost: v.number(),
              benchPoints: v.number(),
              activeChip: v.optional(v.string()),
            })
          )
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    const gwMonth = args.gwMonth ?? {};
    const monthKeyFor = (gw: number): string | undefined => gwMonth[String(gw)];

    // 1. Oppdater league_settings
    const settings = await ctx.db.query("league_settings").first();
    if (settings) {
      await ctx.db.patch(settings._id, {
        currentGameweek: args.currentGameweek,
        lastSyncedAt: Date.now(),
      });
    }

    const deductHits = settings?.deductTransferHits ?? true;
    const netOf = (points: number, cost: number) =>
      deductHits ? points - cost : points;

    // 1b. Vedlikehold månedsinndelingen (monthly_standings) fra FPL-kalenderen.
    for (const m of args.monthRanges ?? []) {
      const existingMonth = await ctx.db
        .query("monthly_standings")
        .withIndex("by_monthKey", (q) => q.eq("monthKey", m.monthKey))
        .first();
      if (existingMonth) {
        await ctx.db.patch(existingMonth._id, {
          monthName: m.monthName,
          gameweekStart: m.gameweekStart,
          gameweekEnd: m.gameweekEnd,
          customGwList: m.customGwList,
          isCompleted: m.isCompleted,
        });
      } else {
        await ctx.db.insert("monthly_standings", {
          monthKey: m.monthKey,
          monthName: m.monthName,
          gameweekStart: m.gameweekStart,
          gameweekEnd: m.gameweekEnd,
          customGwList: m.customGwList,
          isCompleted: m.isCompleted,
        });
      }
    }

    // GW-er som trenger ny rom-snitt-beregning (inneværende + evt. backfilte).
    const touchedGws = new Set<number>([args.currentGameweek]);

    // 2. Oppdater / opprett fpl_teams. Skriver bare det som faktisk er endret: hver skriving
    //    koster båndbredde og får alle klienter som leser tabellene (ledertavler, statistikk)
    //    til å lese dem på nytt.
    for (const item of args.teamsData) {
      const existing = await ctx.db
        .query("fpl_teams")
        .withIndex("by_entryId", (q) => q.eq("entryId", item.entryId))
        .first();

      const teamFields = {
        teamName: item.teamName,
        managerName: item.managerName,
        totalPoints: item.totalPoints,
        currentGwPoints: item.currentGwPoints,
        currentGwTransfersCost: item.currentGwTransfersCost,
        captainName: item.captainName,
        captainPoints: item.captainPoints,
        benchPoints: item.benchPoints,
        benchedPlayer: item.benchedPlayer,
        totalHitsCost: item.totalHitsCost,
      };

      // Historikk-backfill (én oppslag per tidligere runde per lag) kjøres bare én gang per
      // lag per runde. Mangler FPL-historikken i denne synken prøver vi igjen neste gang.
      const backfill =
        existing?.historySyncedGw !== args.currentGameweek && (item.perGwHistory?.length ?? 0) > 0;
      const historyMark = backfill ? { historySyncedGw: args.currentGameweek } : {};

      if (existing) {
        const changes = { ...changedFields(existing, teamFields), ...historyMark };
        if (hasChanges(changes)) {
          await ctx.db.patch(existing._id, { ...changes, lastUpdated: Date.now() });
        }
      } else {
        await ctx.db.insert("fpl_teams", {
          entryId: item.entryId,
          ...teamFields,
          ...historyMark,
          active: true,
          lastUpdated: Date.now(),
        });
      }

      // Lagre gameweek_scores for INNEVÆRENDE runde (full live-rad).
      const existingGw = await ctx.db
        .query("gameweek_scores")
        .withIndex("by_entryId_and_gw", (q) =>
          q.eq("entryId", item.entryId).eq("gameweek", args.currentGameweek)
        )
        .first();

      const liveNet = netOf(item.currentGwPoints, item.currentGwTransfersCost);
      const liveRow = {
        monthKey: monthKeyFor(args.currentGameweek),
        points: item.currentGwPoints,
        transfersCost: item.currentGwTransfersCost,
        netPoints: liveNet,
        benchPoints: item.benchPoints,
        captainName: item.captainName,
        captainPoints: item.captainPoints,
        activeChip: item.activeChip,
        source: "live",
      };

      if (existingGw) {
        const changes = changedFields(existingGw, liveRow);
        if (hasChanges(changes)) {
          await ctx.db.patch(existingGw._id, { ...changes, lastCalculated: Date.now() });
        }
      } else {
        await ctx.db.insert("gameweek_scores", {
          entryId: item.entryId,
          gameweek: args.currentGameweek,
          ...liveRow,
          lastCalculated: Date.now(),
        });
      }

      // Backfill: tidligere spilte runder som mangler en rad (poeng/hits/benk +
      // chip-bruk fra history-endepunktet – kaptein finnes ikke der).
      for (const h of backfill ? (item.perGwHistory ?? []) : []) {
        if (h.gw >= args.currentGameweek) continue;
        const existingHist = await ctx.db
          .query("gameweek_scores")
          .withIndex("by_entryId_and_gw", (q) =>
            q.eq("entryId", item.entryId).eq("gameweek", h.gw)
          )
          .first();
        if (existingHist) {
          // Fyll inn manglende felt på gamle rader (monthKey + benkepoeng +
          // chip), slik at sesong-/måneds-aggregering blir korrekt fra
          // sesongstart.
          const patch: Record<string, any> = {};
          if (!existingHist.monthKey && monthKeyFor(h.gw)) {
            patch.monthKey = monthKeyFor(h.gw);
          }
          if (
            (existingHist.benchPoints ?? null) === null &&
            h.benchPoints != null
          ) {
            patch.benchPoints = h.benchPoints;
          }
          if (!existingHist.activeChip && h.activeChip) {
            patch.activeChip = h.activeChip;
          }
          if (Object.keys(patch).length > 0) {
            await ctx.db.patch(existingHist._id, patch);
          }
          continue;
        }
        await ctx.db.insert("gameweek_scores", {
          entryId: item.entryId,
          gameweek: h.gw,
          monthKey: monthKeyFor(h.gw),
          points: h.points,
          transfersCost: h.transfersCost,
          netPoints: netOf(h.points, h.transfersCost),
          benchPoints: h.benchPoints,
          activeChip: h.activeChip,
          source: "backfill",
          lastCalculated: Date.now(),
        });
        touchedGws.add(h.gw);
      }
    }

    // 3. Beregn romsnitt (Top 2 spillere) for hver berørt gameweek, basert på
    //    gameweek_scores (dekker både inneværende runde og backfilte runder).
    const allRooms = await ctx.db.query("rooms").collect();
    const allTeams = await ctx.db.query("fpl_teams").collect();
    const roomByEntry = new Map<number, string>();
    for (const t of allTeams) {
      if (t.roomId) roomByEntry.set(t.entryId, t.roomId);
    }

    const F1_SCALE = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

    for (const gw of touchedGws) {
      const gwScores = await ctx.db
        .query("gameweek_scores")
        .withIndex("by_gameweek", (q) => q.eq("gameweek", gw))
        .collect();

      // F1-poeng for runden – deles ut etter netto-rangering og lagres på
      // hver rad, men kun for ferdigspilte runder (inneværende runde er "live"
      // og rangeringen kan fortsatt endre seg). Ligainnsikt summerer disse.
      if (gw < args.currentGameweek) {
        const rankedF1 = [...gwScores].sort(
          (a, b) => (b.netPoints ?? 0) - (a.netPoints ?? 0)
        );
        for (let i = 0; i < rankedF1.length; i++) {
          const pts = i < F1_SCALE.length ? F1_SCALE[i] : 0;
          if (rankedF1[i].f1Points !== pts) {
            await ctx.db.patch(rankedF1[i]._id, { f1Points: pts });
          }
        }
      }

      // Grupper netto-poeng per rom.
      const netByRoom = new Map<string, Array<{ entryId: number; net: number }>>();
      for (const s of gwScores) {
        const roomId = roomByEntry.get(s.entryId);
        if (!roomId) continue;
        const list = netByRoom.get(roomId) ?? [];
        list.push({ entryId: s.entryId, net: s.netPoints ?? 0 });
        netByRoom.set(roomId, list);
      }

      const monthKey = monthKeyFor(gw);

      for (const room of allRooms) {
        const scored = (netByRoom.get(room._id) ?? []).sort(
          (a, b) => b.net - a.net
        );
        if (scored.length === 0) continue;
        const top1 = scored[0];
        const top2 = scored[1];
        const avg = top1 && top2 ? (top1.net + top2.net) / 2 : top1.net;

        const row = {
          monthKey,
          averageTop2: Math.round(avg * 10) / 10,
          top1EntryId: top1?.entryId || 0,
          top1Points: top1?.net || 0,
          top2EntryId: top2?.entryId || 0,
          top2Points: top2?.net || 0,
          deductedHits: deductHits,
        };

        const existingRoomScore = await ctx.db
          .query("room_gameweek_scores")
          .withIndex("by_roomId_and_gw", (q) =>
            q.eq("roomId", room._id).eq("gameweek", gw)
          )
          .first();

        if (existingRoomScore) {
          const changes = changedFields(existingRoomScore, row);
          if (hasChanges(changes)) {
            await ctx.db.patch(existingRoomScore._id, { ...changes, lastCalculated: Date.now() });
          }
        } else {
          await ctx.db.insert("room_gameweek_scores", {
            roomId: room._id,
            gameweek: gw,
            ...row,
            lastCalculated: Date.now(),
          });
        }
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
      code: `ATLANTIS-${new Date().getFullYear()}`,
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
