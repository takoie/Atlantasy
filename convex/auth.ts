import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Henter en bruker basert på ID
 */
export const getUser = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

/**
 * Henter alle registrerte brukere (sortert med admin først)
 */
export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.sort((a, b) => (b.role === "admin" ? 1 : 0) - (a.role === "admin" ? 1 : 0));
  },
});

/**
 * Logg inn eller registrer ny bruker med brukernavn og passord
 */
export const loginOrRegister = mutation({
  args: {
    username: v.string(),
    password: v.string(),
    inviteCode: v.optional(v.string()),
    fplEntryId: v.optional(v.number()),
    fplTeamName: v.optional(v.string()),
    fplManagerName: v.optional(v.string()),
    preferredRoomId: v.optional(v.id("rooms")),
    customRoomNickname: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const cleanUsername = args.username.trim();
    const cleanPassword = args.password.trim();

    if (!cleanUsername || !cleanPassword) {
      throw new Error("Vennligst oppgi både brukernavn og passord.");
    }

    // 1. Sjekk om admin logger inn med standard PIN/passord (1234)
    if (cleanUsername.toLowerCase() === "admin" && (cleanPassword === "1234" || cleanPassword === "admin")) {
      const existingAdmin = await ctx.db
        .query("users")
        .withIndex("by_username", (q) => q.eq("username", "Admin"))
        .first();

      if (existingAdmin) {
        if (existingAdmin.role !== "admin") {
          await ctx.db.patch(existingAdmin._id, { role: "admin", password: cleanPassword });
        }
        return {
          userId: existingAdmin._id,
          role: "admin",
          isNew: false,
        };
      }

      const newAdminId = await ctx.db.insert("users", {
        username: "Admin",
        password: cleanPassword,
        role: "admin",
        avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Admin",
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
      });

      return {
        userId: newAdminId,
        role: "admin",
        isNew: true,
      };
    }

    // 2. Sjekk om bruker allerede eksisterer (Innlogging)
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", cleanUsername))
      .first();

    if (existingUser) {
      if (existingUser.password && existingUser.password !== cleanPassword) {
        throw new Error("Feil passord for denne brukeren.");
      }

      // Hvis passord ikke var satt fra før, oppdater det
      if (!existingUser.password) {
        await ctx.db.patch(existingUser._id, { password: cleanPassword });
      }

      return {
        userId: existingUser._id,
        role: existingUser.role,
        isNew: false,
      };
    }

    // 2. Ny bruker-registrering
    const codeStr = (args.inviteCode || "ATLANTIS-2025").trim().toUpperCase();

    let userRole = "user";
    let assignedRoomId = args.preferredRoomId;

    const codeRecord = await ctx.db
      .query("invite_codes")
      .withIndex("by_code", (q) => q.eq("code", codeStr))
      .first();

    if (codeRecord) {
      if (codeRecord.role) userRole = codeRecord.role;
      if (codeRecord.targetRoomId) assignedRoomId = codeRecord.targetRoomId;

      await ctx.db.patch(codeRecord._id, {
        usedCount: codeRecord.usedCount + 1,
      });
    }

    // Opprett ny bruker
    const userId = await ctx.db.insert("users", {
      username: cleanUsername,
      password: cleanPassword,
      fplEntryId: args.fplEntryId,
      fplTeamName: args.fplTeamName?.trim(),
      fplManagerName: args.fplManagerName?.trim() || cleanUsername,
      roomId: assignedRoomId,
      role: userRole,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanUsername)}`,
      createdAt: Date.now(),
    });

    // Hvis brukeren oppga et FPL-lag og et rom, knytt laget til rommet
    if (args.fplEntryId && assignedRoomId) {
      const existingTeam = await ctx.db
        .query("fpl_teams")
        .withIndex("by_entryId", (q) => q.eq("entryId", args.fplEntryId!))
        .first();

      if (existingTeam) {
        await ctx.db.patch(existingTeam._id, {
          userId,
          roomId: assignedRoomId,
          teamName: args.fplTeamName || existingTeam.teamName,
          managerName: args.fplManagerName || existingTeam.managerName,
          lastUpdated: Date.now(),
        });
      } else {
        await ctx.db.insert("fpl_teams", {
          entryId: args.fplEntryId,
          teamName: args.fplTeamName || `${cleanUsername}'s XI`,
          managerName: args.fplManagerName || cleanUsername,
          roomId: assignedRoomId,
          userId,
          active: true,
          totalPoints: 0,
          currentGwPoints: 0,
          currentGwTransfersCost: 0,
          lastUpdated: Date.now(),
        });
      }
    }

    // Hvis brukeren oppga et kallenavn for rommet (første person inn), sett romnavnet
    if (assignedRoomId && args.customRoomNickname?.trim()) {
      const room = await ctx.db.get(assignedRoomId);
      if (room) {
        const cleanNick = args.customRoomNickname.trim();
        const formattedName = `A${room.roomNumber} - ${cleanNick}`;
        await ctx.db.patch(assignedRoomId, {
          name: formattedName,
        });
      }
    }

    return {
      userId,
      role: userRole,
      isNew: true,
    };
  },
});

/**
 * Tildeler eller endrer rolle til en bruker (Admin)
 */
export const setUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.string(), // "admin" | "user"
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      role: args.role,
    });
  },
});

/**
 * Bakoverkompatibel registrering med invitasjonskode
 */
export const registerWithInvite = mutation({
  args: {
    username: v.string(),
    email: v.optional(v.string()),
    inviteCode: v.string(),
    fplEntryId: v.optional(v.number()),
    fplTeamName: v.optional(v.string()),
    fplManagerName: v.optional(v.string()),
    preferredRoomId: v.optional(v.id("rooms")),
  },
  handler: async (ctx, args) => {
    const codeStr = args.inviteCode.trim().toUpperCase();

    const codeRecord = await ctx.db
      .query("invite_codes")
      .withIndex("by_code", (q) => q.eq("code", codeStr))
      .first();

    const role = codeRecord?.role || "user";
    const assignedRoomId = codeRecord?.targetRoomId || args.preferredRoomId;

    const userId = await ctx.db.insert("users", {
      username: args.username.trim(),
      email: args.email?.toLowerCase().trim(),
      fplEntryId: args.fplEntryId,
      fplTeamName: args.fplTeamName?.trim(),
      fplManagerName: args.fplManagerName?.trim(),
      roomId: assignedRoomId,
      role,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(args.username)}`,
      createdAt: Date.now(),
    });

    if (codeRecord) {
      await ctx.db.patch(codeRecord._id, {
        usedCount: codeRecord.usedCount + 1,
      });
    }

    return { userId, role };
  },
});
