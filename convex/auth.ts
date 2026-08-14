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
 * Henter alle registrerte brukere
 */
export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

/**
 * Registrerer en ny bruker med invitasjonskode
 */
export const registerWithInvite = mutation({
  args: {
    username: v.string(),
    email: v.string(),
    inviteCode: v.string(),
    fplEntryId: v.optional(v.number()),
    fplTeamName: v.optional(v.string()),
    fplManagerName: v.optional(v.string()),
    preferredRoomId: v.optional(v.id("rooms")),
  },
  handler: async (ctx, args) => {
    const codeStr = args.inviteCode.trim().toUpperCase();

    // Valider invitasjonskode
    const codeRecord = await ctx.db
      .query("invite_codes")
      .withIndex("by_code", (q) => q.eq("code", codeStr))
      .first();

    if (!codeRecord) {
      throw new Error("Ugyldig invitasjonskode. Vennligst sjekk koden og prøv igjen.");
    }

    if (codeRecord.expiresAt < Date.now()) {
      throw new Error("Denne invitasjonskoden er utløpt.");
    }

    if (codeRecord.usedCount >= codeRecord.maxUses) {
      throw new Error("Denne invitasjonskoden har nådd maksimalt antall registreringer.");
    }

    // Sjekk om e-post eller brukernavn allerede eksisterer
    const existingEmail = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (existingEmail) {
      throw new Error("En bruker med denne e-postadressen er allerede registrert.");
    }

    const assignedRoomId = codeRecord.targetRoomId || args.preferredRoomId;

    // Opprett bruker
    const userId = await ctx.db.insert("users", {
      username: args.username.trim(),
      email: args.email.toLowerCase().trim(),
      fplEntryId: args.fplEntryId,
      fplTeamName: args.fplTeamName?.trim(),
      fplManagerName: args.fplManagerName?.trim(),
      roomId: assignedRoomId,
      role: codeRecord.role || "user",
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(args.username)}`,
      createdAt: Date.now(),
    });

    // Hvis brukeren oppga et FPL lag og rom, registrer eller knytt teamet
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
          teamName: args.fplTeamName || `${args.username}'s XI`,
          managerName: args.fplManagerName || args.username,
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

    // Oppdater bruksantall for koden
    await ctx.db.patch(codeRecord._id, {
      usedCount: codeRecord.usedCount + 1,
    });

    return { userId, role: codeRecord.role || "user" };
  },
});
