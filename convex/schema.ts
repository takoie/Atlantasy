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
    name: v.string(),       // f.eks. "A1 - The Devs" eller "A1"
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
    roomId: v.id("rooms"),         // Romtilhørighet
    userId: v.optional(v.id("users")),
    active: v.boolean(),
    totalPoints: v.number(),
    currentGwPoints: v.number(),
    currentGwTransfersCost: v.number(), // Transfer hits (-4 per ekstra bytte)
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
    points: v.number(),
    transfersCost: v.number(),     // Hits
    netPoints: v.number(),         // Points - transfersCost
    captainName: v.optional(v.string()),
    rank: v.optional(v.number()),
    lastCalculated: v.number(),
  })
    .index("by_entryId_and_gw", ["entryId", "gameweek"])
    .index("by_gameweek", ["gameweek"]),

  // Romsnitt per gameweek (snitt av de to beste spillerne)
  room_gameweek_scores: defineTable({
    roomId: v.id("rooms"),
    gameweek: v.number(),
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
    code: v.string(),              // F.eks. "ATLANTIS-2025"
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
    type: v.string(),              // "chat" | "announcement" | "fpl_bot" | "banter"
    isPinned: v.optional(v.boolean()),
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
  }),

  // Turneringer / Sluttspill (Double Elimination Cup)
  cups: defineTable({
    name: v.string(),                  // f.eks. "Atlantasy Vintercup 2025/2026"
    season: v.optional(v.string()),    // "2025/2026"
    status: v.string(),                // "draft" | "active" | "completed"
    startGameweek: v.number(),         // F.eks. GW 20
    currentRound: v.number(),          // Nåværende aktiv runde
    totalRounds: v.number(),
    format: v.string(),                // "double_elimination"
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
    customNote: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_cupId", ["cupId"])
    .index("by_cupId_and_round", ["cupId", "roundNumber"])
    .index("by_cupId_and_bracket", ["cupId", "bracketType"]),
});

