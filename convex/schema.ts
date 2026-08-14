import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Brukere og tilknyttede profiler (Enkel pålogging med brukernavn + passord, epost er valgfri)
  users: defineTable({
    username: v.string(),
    password: v.optional(v.string()), // Enkelt passord for innlogging
    email: v.optional(v.string()),    // Valgfri epost
    fplEntryId: v.optional(v.number()),
    fplTeamName: v.optional(v.string()),
    fplManagerName: v.optional(v.string()),
    roomId: v.optional(v.id("rooms")),
    role: v.string(), // "admin" | "user"
    avatar: v.optional(v.string()),
    createdAt: v.number(),
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

  // Artikler, Runderapporter og Nyheter (med bildestøtte fra upload / clipboard paste)
  articles: defineTable({
    title: v.string(),
    content: v.string(),
    imageUrl: v.optional(v.string()), // URL eller Base64 Data URL fra clipboard/upload
    authorName: v.string(),
    authorAvatar: v.optional(v.string()),
    tag: v.optional(v.string()),      // "Runderapport" | "Taktikk" | "Banter" | "Nyhet"
    likes: v.number(),
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

  // Admin Announcements & Skrytevegg (Wall of Fame)
  announcements: defineTable({
    title: v.string(),
    content: v.string(),
    type: v.string(),              // "winner_celebration" | "league_update" | "admin_alert"
    winningRoomId: v.optional(v.id("rooms")),
    monthName: v.optional(v.string()),
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
});
