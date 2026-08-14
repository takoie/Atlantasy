import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Action for å hente live data direkte fra FPLs offisielle API
 */
export const fetchFplLeagueStandings = action({
  args: {
    leagueId: v.number(),
  },
  handler: async (ctx, args) => {
    try {
      const response = await fetch(
        `https://fantasy.premierleague.com/api/leagues-classic/${args.leagueId}/standings/`
      );

      if (!response.ok) {
        throw new Error(`FPL API feilet med status ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        leagueName: data.league?.name,
        standings: data.standings?.results || [],
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Kunne ikke hente data fra FPL API",
      };
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
      leagueId: 442981,
      leagueName: "Atlantis Bedriftsliga 2024/25",
      currentGameweek: 26,
      deductTransferHits: true, // Standard: trekk fra transfer hits
      autoSyncEnabled: true,
      syncIntervalMinutes: 10,
      lastSyncedAt: Date.now(),
      adminPin: "1234",
    });

    // 2. Farger for Rom 1–12
    const roomPalettes = [
      { num: 1, name: "Rom 1 - The Devs", color: "#00ff87", desc: "Systemutvikling & Arkitektur" },
      { num: 2, name: "Rom 2 - Wall Street", color: "#6366f1", desc: "Økonomi & Finans" },
      { num: 3, name: "Rom 3 - The Closers", color: "#e90052", desc: "Salg & Nøkkelkunder" },
      { num: 4, name: "Rom 4 - Creative Hub", color: "#a855f7", desc: "Design & Merkevare" },
      { num: 5, name: "Rom 5 - Support Kings", color: "#06b6d4", desc: "Kundesenter & Drift" },
      { num: 6, name: "Rom 6 - Data Wizards", color: "#3b82f6", desc: "BI, Analytics & AI" },
      { num: 7, name: "Rom 7 - HR & Culture", color: "#ec4899", desc: "Folk & Trivsel" },
      { num: 8, name: "Rom 8 - The Board", color: "#fbbf24", desc: "Ledelsen & Styret" },
      { num: 9, name: "Rom 9 - Cloud Ops", color: "#10b981", desc: "DevOps & Infrastruktur" },
      { num: 10, name: "Rom 10 - Product Pioneers", color: "#f97316", desc: "Produkt & UX" },
      { num: 11, name: "Rom 11 - Legal Eagles", color: "#64748b", desc: "Jus & Samsvar" },
      { num: 12, name: "Rom 12 - Growth Lab", color: "#14b8a6", desc: "Markedsføring & Vekst" },
    ];

    const createdRooms = [];
    for (const r of roomPalettes) {
      const id = await ctx.db.insert("rooms", {
        roomNumber: r.num,
        name: r.name,
        description: r.desc,
        accentColor: r.color,
        createdAt: Date.now(),
      });
      createdRooms.push({ id, ...r });
    }

    // 3. Opprett Admin-bruker og vanlige testbrukere
    const adminUserId = await ctx.db.insert("users", {
      username: "Stian (Admin)",
      email: "stian@atlantis.no",
      role: "admin",
      fplEntryId: 98124,
      fplTeamName: "Tactical Masterclass",
      fplManagerName: "Stian Taknes",
      roomId: createdRooms[0].id,
      avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=StianAdmin",
      createdAt: Date.now(),
    });

    const user2Id = await ctx.db.insert("users", {
      username: "MagnusC",
      email: "magnus@atlantis.no",
      role: "user",
      fplEntryId: 10234,
      fplTeamName: "Checkmate FC",
      fplManagerName: "Magnus Carlsen",
      roomId: createdRooms[0].id,
      avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=MagnusC",
      createdAt: Date.now(),
    });

    const user3Id = await ctx.db.insert("users", {
      username: "ErlingH",
      email: "erling@atlantis.no",
      role: "user",
      fplEntryId: 44102,
      fplTeamName: "Braut Machine",
      fplManagerName: "Erling Haaland",
      roomId: createdRooms[1].id,
      avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=ErlingH",
      createdAt: Date.now(),
    });

    // 4. Opprett FPL-lag for rommene (4–5 spillere per rom med realistiske runderesultater)
    const sampleTeams = [
      // Rom 1
      { entryId: 98124, teamName: "Tactical Masterclass", managerName: "Stian Taknes", roomIdx: 0, pts: 78, hits: 0, total: 1540, userId: adminUserId },
      { entryId: 10234, teamName: "Checkmate FC", managerName: "Magnus Carlsen", roomIdx: 0, pts: 74, hits: 4, total: 1520, userId: user2Id },
      { entryId: 55410, teamName: "Klopps Heavy Metal", managerName: "Henrik Lie", roomIdx: 0, pts: 62, hits: 0, total: 1410 },
      { entryId: 77123, teamName: "Null Pointer XI", managerName: "Sander Berg", roomIdx: 0, pts: 58, hits: 8, total: 1380 },
      
      // Rom 2
      { entryId: 44102, teamName: "Braut Machine", managerName: "Erling Haaland", roomIdx: 1, pts: 84, hits: 0, total: 1590, userId: user3Id },
      { entryId: 66103, teamName: "Compound Interest FC", managerName: "Kari Nordmann", roomIdx: 1, pts: 68, hits: 0, total: 1460 },
      { entryId: 88192, teamName: "Bull Market Boys", managerName: "Jonas Gahr", roomIdx: 1, pts: 60, hits: 4, total: 1390 },
      { entryId: 99120, teamName: "Excel Wizards", managerName: "Line Pettersen", roomIdx: 1, pts: 55, hits: 0, total: 1340 },

      // Rom 3
      { entryId: 31021, teamName: "Cold Call Kings", managerName: "Andreas Vik", roomIdx: 2, pts: 71, hits: 0, total: 1475 },
      { entryId: 31022, teamName: "Quota Crushers", managerName: "Julie Moe", roomIdx: 2, pts: 67, hits: 0, total: 1440 },
      { entryId: 31023, teamName: "Pipeline Dream", managerName: "Torstein Dale", roomIdx: 2, pts: 59, hits: 4, total: 1370 },
      { entryId: 31024, teamName: "Always Be Closing", managerName: "Mari Hansen", roomIdx: 2, pts: 52, hits: 0, total: 1310 },

      // Rom 4
      { entryId: 41001, teamName: "Figma United", managerName: "Oda Sørli", roomIdx: 3, pts: 76, hits: 0, total: 1490 },
      { entryId: 41002, teamName: "Pixel Perfect", managerName: "Fredrik Bø", roomIdx: 3, pts: 65, hits: 4, total: 1415 },
      { entryId: 41003, teamName: "Kerning Chaos", managerName: "Emilie Strand", roomIdx: 3, pts: 54, hits: 0, total: 1350 },
      { entryId: 41004, teamName: "Dark Mode Only", managerName: "Mikkel Foss", roomIdx: 3, pts: 49, hits: 0, total: 1290 },

      // Rom 5
      { entryId: 51001, teamName: "Ticket Solvers", managerName: "Håkon Vang", roomIdx: 4, pts: 66, hits: 0, total: 1420 },
      { entryId: 51002, teamName: "SLA Guaranteed", managerName: "Nora Kristiansen", roomIdx: 4, pts: 63, hits: 0, total: 1395 },
      { entryId: 51003, teamName: "Escalation Matrix", managerName: "Lars Erik", roomIdx: 4, pts: 58, hits: 4, total: 1340 },

      // Rom 6
      { entryId: 61001, teamName: "Deep Learning XI", managerName: "Dr. Thomas Holm", roomIdx: 5, pts: 81, hits: 0, total: 1535 },
      { entryId: 61002, teamName: "Big Query Ballers", managerName: "Kjetil Røed", roomIdx: 5, pts: 70, hits: 0, total: 1480 },
      { entryId: 61003, teamName: "Overfitted FC", managerName: "Silje Aas", roomIdx: 5, pts: 61, hits: 4, total: 1385 },

      // Rom 7
      { entryId: 71001, teamName: "Waffle Friday FC", managerName: "Camilla Lind", roomIdx: 6, pts: 64, hits: 0, total: 1380 },
      { entryId: 71002, teamName: "Teambuilding United", managerName: "Eivind Dahl", roomIdx: 6, pts: 60, hits: 0, total: 1350 },

      // Rom 8
      { entryId: 81001, teamName: "Golden Parachute", managerName: "Bjarne Betjent", roomIdx: 7, pts: 79, hits: 4, total: 1510 },
      { entryId: 81002, teamName: "Q4 Deliverables", managerName: "Cecilie Grønn", roomIdx: 7, pts: 72, hits: 0, total: 1470 },

      // Rom 9
      { entryId: 91001, teamName: "Kubernetes Kickerz", managerName: "Robin Løke", roomIdx: 8, pts: 75, hits: 0, total: 1465 },
      { entryId: 91002, teamName: "Zero Downtime", managerName: "Petter North", roomIdx: 8, pts: 68, hits: 0, total: 1425 },

      // Rom 10
      { entryId: 10101, teamName: "Roadmap Rovers", managerName: "Synne Bakke", roomIdx: 9, pts: 69, hits: 0, total: 1410 },
      { entryId: 10102, teamName: "Sprint Backlog", managerName: "Tobias Moe", roomIdx: 9, pts: 61, hits: 0, total: 1360 },

      // Rom 11
      { entryId: 11101, teamName: "GDPR Compliance", managerName: "Adv. Kristin Dale", roomIdx: 10, pts: 65, hits: 0, total: 1390 },
      { entryId: 11102, teamName: "Terms of Service", managerName: "Hans Christian", roomIdx: 10, pts: 58, hits: 0, total: 1330 },

      // Rom 12
      { entryId: 12101, teamName: "Funnel Hackers", managerName: "Mathias Ruud", roomIdx: 11, pts: 73, hits: 0, total: 1445 },
      { entryId: 12102, teamName: "CTR Optimizers", managerName: "Ida Johnsen", roomIdx: 11, pts: 67, hits: 0, total: 1400 },
    ];

    for (const t of sampleTeams) {
      const room = createdRooms[t.roomIdx];
      await ctx.db.insert("fpl_teams", {
        entryId: t.entryId,
        teamName: t.teamName,
        managerName: t.managerName,
        roomId: room.id,
        userId: t.userId,
        active: true,
        totalPoints: t.total,
        currentGwPoints: t.pts,
        currentGwTransfersCost: t.hits,
        lastUpdated: Date.now(),
      });
    }

    // 5. Opprett standard invitasjonskoder
    await ctx.db.insert("invite_codes", {
      code: "ATLANTIS-2025",
      role: "user",
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      maxUses: 100,
      usedCount: 3,
      createdAt: Date.now(),
    });

    await ctx.db.insert("invite_codes", {
      code: "ADMIN-ATL-99",
      role: "admin",
      expiresAt: Date.now() + 60 * 24 * 60 * 60 * 1000,
      maxUses: 5,
      usedCount: 1,
      createdAt: Date.now(),
    });

    // 6. Opprett vinnerhyllest og kunngjøringer ("Skrytevegg")
    await ctx.db.insert("announcements", {
      title: "🏆 Månedens Vinner: Rom 1 - The Devs (Januar)",
      content: "Gratulerer til Rom 1 (The Devs) som stakk av med månedens heder og ære for januar med et spektakulært snitt på 76.0 poeng! Stian Taknes og Magnus Carlsen dro lasset. Pokalen er overlevert! 🥇🎉",
      type: "winner_celebration",
      winningRoomId: createdRooms[0].id,
      monthName: "Januar",
      authorName: "Stian (Admin)",
      isPinned: true,
      createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
    });

    // 7. Legg inn noen chat-meldinger i Banter for god stemning
    await ctx.db.insert("messages", {
      senderId: adminUserId,
      senderName: "Stian (Admin)",
      senderRole: "admin",
      senderAvatar: "https://api.dicebear.com/7.x/bottts/svg?seed=StianAdmin",
      channel: "banter",
      content: "Velkommen til Atlantasy Desktop! Husk at runden låses fredag kl 19:30. Rom 1 har allerede planlagt trippelkaptein på Haaland 🚀",
      type: "announcement",
      createdAt: Date.now() - 3600 * 1000,
    });

    await ctx.db.insert("messages", {
      senderId: user3Id,
      senderName: "Erling Haaland",
      senderRole: "user",
      senderAvatar: "https://api.dicebear.com/7.x/bottts/svg?seed=ErlingH",
      channel: "banter",
      content: "Rom 2 (Wall Street) tar ledelsen denne runden! Snittet vårt er skyhøyt 💪",
      type: "chat",
      createdAt: Date.now() - 1800 * 1000,
    });

    await ctx.db.insert("messages", {
      senderId: user2Id,
      senderName: "Magnus Carlsen",
      senderRole: "user",
      senderAvatar: "https://api.dicebear.com/7.x/bottts/svg?seed=MagnusC",
      channel: "banter",
      content: "Posisjonelt mesterverk fra Rom 1 som vanlig. Bare vent til søndagskampene 😉",
      type: "chat",
      createdAt: Date.now() - 600 * 1000,
    });

    return {
      success: true,
      message: "Databasen er initialisert med 12 rom, spillere, innstillinger og vinnerhyllest!",
    };
  },
});
