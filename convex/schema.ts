import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
// Brukere og tilknyttede profiler (Enkel pålogging med brukernavn + passord, epost er valgfri)
// Convex Schema v2.1 (inkludert Cup & Sluttspill)
  users: defineTable({
    username: v.string(),
    password: v.optional(v.string()), // Deprecated: erstattes av passwordHash og passwordSalt
    passwordHash: v.optional(v.string()), // Sikker PBKDF2-hash
    passwordSalt: v.optional(v.string()), // Unikt salt per bruker
    email: v.optional(v.string()),    // Valgfri epost
    fplEntryId: v.optional(v.number()),
    fplTeamName: v.optional(v.string()),
    fplManagerName: v.optional(v.string()),
    roomId: v.optional(v.id("rooms")),
    role: v.string(), // "admin" | "user"
    avatar: v.optional(v.string()),
    createdAt: v.number(),
    lastActiveAt: v.optional(v.number()),
  })
    .index("by_username", ["username"])
    .index("by_role", ["role"])
    .index("by_roomId", ["roomId"])
    .index("by_fplEntryId", ["fplEntryId"]),

  // Rom (Rom A1 - A12)
  rooms: defineTable({
    roomNumber: v.number(), // 1 - 12
    name: v.string(),       // fullt romnavn, f.eks. "The Devs"
    tag: v.optional(v.string()), // kort "nick"/etikett, f.eks. "A1" – redigerbar
    description: v.optional(v.string()),
    accentColor: v.optional(v.string()), // Hex eller Tailwind farge
    avatar: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_roomNumber", ["roomNumber"]),

  // FPL-lag knyttet til rom
  fpl_teams: defineTable({
    entryId: v.number(),           // FPL Entry ID
    teamName: v.string(),          // FPL Lagnavn
    managerName: v.string(),       // Managers fulle navn
    roomId: v.optional(v.id("rooms")), // Romtilhørighet (valgfritt før tildeling)
    userId: v.optional(v.id("users")),
    active: v.boolean(),
    totalPoints: v.number(),
    currentGwPoints: v.number(),
    currentGwTransfersCost: v.number(), // Transfer hits (-4 per ekstra bytte)
    captainName: v.optional(v.string()),
    captainPoints: v.optional(v.number()),
    benchPoints: v.optional(v.number()),
    benchedPlayer: v.optional(v.string()),
    totalHitsCost: v.optional(v.number()),
    // Siste runde der historikken (tidligere runder) ble backfylt for dette laget.
    historySyncedGw: v.optional(v.number()),
    lastUpdated: v.number(),
  })
    .index("by_entryId", ["entryId"])
    .index("by_roomId", ["roomId"])
    .index("by_totalPoints", ["totalPoints"]),

  // Artikler, Runderapporter og Nyheter (med ingress, inline bildestøtte, arkivering og pinning)
  articles: defineTable({
    title: v.string(),
    lead: v.optional(v.string()),     // Ingress / Sammendrag
    content: v.string(),              // Hovedtekst med markdown / inline bilder
    imageUrl: v.optional(v.string()), // Cover / Toppbilde
    imagePosition: v.optional(v.number()), // 0-100% vertikal posisjon (default 50)
    imageFit: v.optional(v.string()),      // "cover" | "contain" | "natural"
    imageHeight: v.optional(v.string()),   // "banner" | "standard" | "large" | "natural"
    authorId: v.optional(v.id("users")),
    authorName: v.string(),
    authorAvatar: v.optional(v.string()),
    tag: v.optional(v.string()),      // "Runderapport" | "Taktikk" | "Banter" | "Nyhet"
    isArchived: v.optional(v.boolean()), // Arkivert artikkel
    isPinned: v.optional(v.boolean()),   // Festet til toppen
    likes: v.number(),
    likedBy: v.optional(v.array(v.string())), // Bruker-IDer som har likt (maks 1 per bruker)
    createdAt: v.number(),
  }).index("by_createdAt", ["createdAt"]),

  // Gameweek-score historikk per manager/lag
  gameweek_scores: defineTable({
    entryId: v.number(),
    gameweek: v.number(),
    monthKey: v.optional(v.string()),      // "YYYY-MM" utledet fra GW-fristen
    points: v.number(),
    transfersCost: v.number(),     // Hits
    netPoints: v.number(),         // Points - transfersCost
    benchPoints: v.optional(v.number()),   // points_on_bench for runden
    captainName: v.optional(v.string()),
    captainPoints: v.optional(v.number()), // kapteinens rå event-poeng
    activeChip: v.optional(v.string()),    // wildcard | 3xc | bboost | freehit
    source: v.optional(v.string()),        // "live" (full picks-synk) | "backfill" (kun history)
    f1Points: v.optional(v.number()),      // F1-poeng for runden (25,18,15,... etter netto-rangering), lagres når GW er ferdig
    rank: v.optional(v.number()),
    lastCalculated: v.number(),
  })
    .index("by_entryId_and_gw", ["entryId", "gameweek"])
    .index("by_gameweek", ["gameweek"]),

  // Romsnitt per gameweek (snitt av de to beste spillerne)
  room_gameweek_scores: defineTable({
    roomId: v.id("rooms"),
    gameweek: v.number(),
    monthKey: v.optional(v.string()),      // "YYYY-MM" utledet fra GW-fristen
    averageTop2: v.number(),       // (Top1 + Top2) / 2
    top1EntryId: v.number(),
    top1Points: v.number(),
    top2EntryId: v.number(),
    top2Points: v.number(),
    deductedHits: v.boolean(),     // Om minuspoeng ble trukket fra
    lastCalculated: v.number(),
  })
    .index("by_roomId_and_gw", ["roomId", "gameweek"])
    .index("by_gameweek", ["gameweek"]),

  // Månedsinndeling og månedskåringer
  monthly_standings: defineTable({
    monthKey: v.string(),          // f.eks. "2024-08" eller "month_1"
    monthName: v.string(),         // f.eks. "August", "September"
    gameweekStart: v.number(),
    gameweekEnd: v.number(),
    customGwList: v.optional(v.array(v.number())),
    winningRoomId: v.optional(v.id("rooms")),
    winningScore: v.optional(v.number()),
    isCompleted: v.boolean(),
  }).index("by_monthKey", ["monthKey"]),

  // Tidsbegrensede invitasjonskoder
  invite_codes: defineTable({
    code: v.string(),              // F.eks. "ATLANTIS-2026"
    targetRoomId: v.optional(v.id("rooms")),
    role: v.string(),              // "user" | "admin"
    expiresAt: v.number(),         // Unix timestamp (ms)
    maxUses: v.number(),
    usedCount: v.number(),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
  }).index("by_code", ["code"]),

  // Sanntidsmeldinger (Banter felleskanal + Rom-chat)
  messages: defineTable({
    senderId: v.id("users"),
    senderName: v.string(),
    senderRole: v.string(),        // "admin" | "user"
    senderAvatar: v.optional(v.string()),
    channel: v.string(),           // "banter" | "room"
    roomId: v.optional(v.id("rooms")),
    content: v.string(),
    imageUrl: v.optional(v.string()),
    type: v.string(),              // "chat" | "announcement" | "fpl_bot" | "banter"
    isPinned: v.optional(v.boolean()),
    editedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_channel_and_createdAt", ["channel", "createdAt"])
    .index("by_roomId_and_createdAt", ["roomId", "createdAt"]),

  // Admin Announcements & Skrytevegg (Wall of Fame) - Støtter både rom- og individuelle vinnere
  announcements: defineTable({
    title: v.string(),
    content: v.string(),
    type: v.string(),              // "winner_celebration" | "individual_winner" | "league_update" | "admin_alert"
    winnerType: v.optional(v.string()), // "room" | "individual"
    winnerName: v.optional(v.string()), // f.eks. "Magnus Carlsen" eller "A1 - The Devs"
    winnerTeamName: v.optional(v.string()), // f.eks. "Checkmate FC"
    winningRoomId: v.optional(v.id("rooms")),
    monthName: v.optional(v.string()),
    winningScore: v.optional(v.number()),
    authorName: v.string(),
    isPinned: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_isPinned", ["isPinned"])
    .index("by_createdAt", ["createdAt"]),

  // Globale Ligainnstillinger
  league_settings: defineTable({
    leagueId: v.number(),          // FPL Classic League ID
    leagueName: v.string(),
    currentGameweek: v.number(),
    deductTransferHits: v.boolean(),
    autoSyncEnabled: v.boolean(),
    syncIntervalMinutes: v.number(),
    lastSyncedAt: v.number(),
    adminPin: v.string(),          // Sikret admin-pin
    // Tilstand for den serverstyrte synken etter siste kamp i runden (autoSync.ts):
    autoSyncGw: v.optional(v.number()),   // runden som sist ble auto-synket
    autoSyncStage: v.optional(
      v.union(v.literal("provisional"), v.literal("final"), v.literal("morning"))
    ),                                     // høyeste utførte steg for den runden
    autoSyncWakeAt: v.optional(v.number()), // cronen gjør ingenting før dette tidspunktet (ms)
    // Overstyringer av rundevinner og ledende rom:
    overrideRoundWinnerEntryId: v.optional(v.number()),
    overrideRoundWinnerName: v.optional(v.string()),
    overrideRoundWinnerTeamName: v.optional(v.string()),
    overrideRoundWinnerScore: v.optional(v.number()),
    overrideTopRoomId: v.optional(v.id("rooms")),
    overrideTopRoomScore: v.optional(v.number()),
  }),

  // Turneringer / Sluttspill (Double Elimination Cup)
  cups: defineTable({
    name: v.string(),                  // f.eks. "Atlantasy Vintercup 2026/2027"
    season: v.optional(v.string()),    // f.eks. "2026/2027"
    status: v.string(),                // "draft" | "active" | "completed"
    startGameweek: v.number(),         // F.eks. GW 20
    currentRound: v.number(),          // Nåværende aktiv runde
    totalRounds: v.number(),
    format: v.string(),                // "double_elimination"
    winnerRoomId: v.optional(v.id("rooms")),
    runnerUpRoomId: v.optional(v.id("rooms")),
    thirdPlaceRoomId: v.optional(v.id("rooms")),
    // Beregn runder automatisk når en gameweek er endelig synket (default på).
    autoCalc: v.optional(v.boolean()),
    // Rom som kom videre som lucky loser (vises med merke i bracketen).
    luckyLoserRoomIds: v.optional(v.array(v.id("rooms"))),
    roundGwMap: v.optional(
      v.array(
        v.object({
          roundNumber: v.number(),
          roundTitle: v.string(),
          gameweek: v.number(),
        })
      )
    ),
    groupStandings: v.optional(
      v.array(
        v.object({
          group: v.string(), // "A" | "B"
          roomId: v.id("rooms"),
          played: v.number(),
          won: v.number(),
          drawn: v.number(),
          lost: v.number(),
          points: v.number(), // 3 per seier, 1 uavgjort, 0 tap
          totalRoomScore: v.number(), // akkumulert romsnitt
        })
      )
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_status", ["status"]),

  // Kampoppsett i Cupen (Double Elimination Matches, Knockout & Gruppespill)
  cup_matches: defineTable({
    cupId: v.id("cups"),
    bracketType: v.string(),           // "winners" | "losers" | "grand_final" | "knockout" | "group"
    stage: v.optional(v.string()),     // "group" | "knockout" | "bracket"
    group: v.optional(v.string()),     // "A" | "B" (ved gruppespill)
    isLuckyLoser: v.optional(v.boolean()), // true dersom rommet gikk videre som Lucky Loser
    roundNumber: v.number(),           // Runde 1, 2, 3, etc.
    roundTitle: v.string(),            // f.eks. "Vinnerbrakett Runde 1", "Kvartfinale", "Gruppe A - Runde 1"
    matchIndex: v.number(),            // Kamp 1, 2, 3... innenfor runden
    gameweek: v.number(),              // Tilknyttet FPL Gameweek
    room1Id: v.optional(v.id("rooms")),
    room2Id: v.optional(v.id("rooms")),
    room1Score: v.optional(v.number()), // Romsnitt av de 2 beste spillerne
    room2Score: v.optional(v.number()), // Romsnitt av de 2 beste spillerne
    room1TopPlayers: v.optional(
      v.array(
        v.object({
          entryId: v.number(),
          name: v.string(),
          points: v.number(),
          hits: v.optional(v.number()),
        })
      )
    ),
    room2TopPlayers: v.optional(
      v.array(
        v.object({
          entryId: v.number(),
          name: v.string(),
          points: v.number(),
          hits: v.optional(v.number()),
        })
      )
    ),
    winnerRoomId: v.optional(v.id("rooms")),
    loserRoomId: v.optional(v.id("rooms")),
    status: v.string(),                // "scheduled" | "live" | "completed"
    nextMatchId: v.optional(v.id("cup_matches")),       // Vinnerens neste kamp
    nextMatchSlot: v.optional(v.number()),             // 1 eller 2 (posisjon i neste kamp)
    nextLoserMatchId: v.optional(v.id("cup_matches")),  // Taperens neste kamp (for Winners bracket)
    nextLoserMatchSlot: v.optional(v.number()),         // 1 eller 2
    isBye: v.optional(v.boolean()),                     // Om kampen er en automatisk videreføring
    role: v.optional(v.string()),                       // "final" | "third_place" | "lb_final"
    // Plass i kvalifiseringslisten (gruppespill / lucky loser) – rommet settes når fasen før er avgjort
    qual1: v.optional(v.number()),
    qual2: v.optional(v.number()),
    customNote: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_cupId", ["cupId"])
    .index("by_cupId_and_round", ["cupId", "roundNumber"])
    .index("by_cupId_and_bracket", ["cupId", "bracketType"]),

  // ---------------------------------------------------------------------------
  // Spilleranalyse: kopi av FPL-spillerkatalogen (bootstrap-static), synket av cron
  // ---------------------------------------------------------------------------
  fpl_clubs: defineTable({
    clubId: v.number(),
    name: v.string(),
    shortName: v.string(),
  }).index("by_clubId", ["clubId"]),

  fpl_players: defineTable({
    elementId: v.number(),
    webName: v.string(),
    fullName: v.string(),
    clubId: v.number(),
    position: v.number(),              // 1 GKP, 2 DEF, 3 MID, 4 FWD
    cost: v.number(),                  // tidels millioner (now_cost: 157 = £15.7m)
    costChangeStart: v.number(),
    costChangeEvent: v.number(),
    selectedBy: v.number(),            // prosent
    totalPoints: v.number(),
    eventPoints: v.number(),
    form: v.number(),
    pointsPerGame: v.number(),
    epNext: v.number(),
    minutes: v.number(),
    starts: v.number(),
    goals: v.number(),
    assists: v.number(),
    cleanSheets: v.number(),
    bonus: v.number(),
    xg: v.number(),
    xa: v.number(),
    xgi: v.number(),
    xgc: v.number(),
    xgPer90: v.number(),
    xaPer90: v.number(),
    xgiPer90: v.number(),
    xgcPer90: v.number(),
    ict: v.number(),
    defCon: v.number(),                // defensive contribution
    defConPer90: v.number(),
    status: v.string(),                // a | d | i | s | u | n
    news: v.string(),
    chanceNextRound: v.optional(v.number()),
    // Flyttet til fpl_price_movers (endres hele tiden). Valgfrie bare slik at rader skrevet før
    // flyttingen er gyldige til neste synk skriver dem om uten feltene.
    transfersInEvent: v.optional(v.number()),
    transfersOutEvent: v.optional(v.number()),
    priceChangePercent: v.optional(v.number()),
    priceProjections: v.optional(v.array(v.any())),
  }).index("by_elementId", ["elementId"]),

  // Logg over faktiske prisendringer, oppdaget ved at now_cost endrer seg mellom synker
  fpl_price_changes: defineTable({
    elementId: v.number(),
    webName: v.string(),
    clubId: v.number(),
    position: v.number(),
    oldCost: v.number(),
    newCost: v.number(),
    at: v.number(),
  }).index("by_at", ["at"]),

  // Ett dokument med spillerne Prisfanen viser (stigere, fallere, mest overført). Overførings-
  // tellere og prisprognoser endrer seg hele tiden, så de ligger her og ikke i fpl_players.
  fpl_price_movers: defineTable({
    at: v.number(),
    players: v.array(
      v.object({
        elementId: v.number(),
        webName: v.string(),
        clubId: v.number(),
        position: v.number(),
        cost: v.number(),
        transfersInEvent: v.number(),
        transfersOutEvent: v.number(),
        priceChangePercent: v.number(),
        priceProjections: v.array(
          v.object({ offset: v.number(), percent: v.number(), likelihood: v.number() })
        ),
      })
    ),
  }),

  // Enkelt statusdokument for spillersynken
  fpl_players_sync: defineTable({
    lastSyncedAt: v.number(),
    lastAttemptAt: v.number(),
    lastError: v.optional(v.string()),
    playerCount: v.number(),
  }),
});
