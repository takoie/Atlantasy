import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  hashPassword,
  verifyPassword,
  sanitizeUser,
  requireAdmin,
  requireUser,
} from "./security";

/**
 * Henter en bruker basert på ID (uten sensitive passord-felter)
 */
export const getUser = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    return sanitizeUser(user);
  },
});

/**
 * Henter alle registrerte brukere (sortert med admin først, uten passord/hash)
 */
export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const sorted = users.sort(
      (a, b) => (b.role === "admin" ? 1 : 0) - (a.role === "admin" ? 1 : 0)
    );
    return sorted.map((u) => sanitizeUser(u)!);
  },
});

/**
 * Validerer Steg 1 av registrering (Brukernavn, Passord og Invitasjonskode)
 */
export const validateRegistrationStep1 = mutation({
  args: {
    username: v.string(),
    password: v.string(),
    inviteCode: v.string(),
  },
  handler: async (ctx, args) => {
    const cleanUsername = args.username.trim();
    const cleanPassword = args.password.trim();
    const cleanCode = args.inviteCode.trim().toUpperCase();

    if (!cleanUsername || cleanUsername.length < 2) {
      throw new Error("Brukernavn må være minst 2 tegn.");
    }
    if (!cleanPassword || cleanPassword.length < 4) {
      throw new Error("Passord må være minst 4 tegn.");
    }
    if (!cleanCode) {
      throw new Error("Invitasjonskode er påkrevd for å registrere ny bruker.");
    }

    // 1. Sjekk om brukernavn er opptatt
    const existing = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", cleanUsername))
      .first();

    if (existing) {
      throw new Error(`Brukernavnet "${cleanUsername}" er allerede registrert. Velg et annet eller logg inn.`);
    }

    // 2. Sjekk om invitasjonskode er gyldig
    const codeRecord = await ctx.db
      .query("invite_codes")
      .withIndex("by_code", (q) => q.eq("code", cleanCode))
      .first();

    if (!codeRecord) {
      throw new Error("Ugyldig invitasjonskode. Vennligst oppgi en gyldig kode fra administrator.");
    }

    if (codeRecord.expiresAt && codeRecord.expiresAt < Date.now()) {
      throw new Error("Denne invitasjonskoden har utløpt. Kontakt administrator for ny kode.");
    }

    if (codeRecord.maxUses && codeRecord.usedCount >= codeRecord.maxUses) {
      throw new Error("Denne invitasjonskoden har nådd maksimalt antall registreringer.");
    }

    return {
      valid: true,
      role: codeRecord.role || "user",
      targetRoomId: codeRecord.targetRoomId || null,
    };
  },
});

/**
 * Logg inn eller registrer ny bruker med brukernavn og passord (PBKDF2-beskyttet)
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

    // 1. Sjekk om bruker allerede eksisterer (Innlogging)
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", cleanUsername))
      .first();

    if (existingUser) {
      let isPasswordValid = false;

      if (existingUser.passwordHash && existingUser.passwordSalt) {
        // Sikker PBKDF2 hash-verifisering
        isPasswordValid = await verifyPassword(
          cleanPassword,
          existingUser.passwordHash,
          existingUser.passwordSalt
        );
      } else if (existingUser.password) {
        // Bakoverkompatibilitet: Migrer fra eldre klartekstpassord til PBKDF2-hash
        if (existingUser.password === cleanPassword) {
          isPasswordValid = true;
          const { hash, salt } = await hashPassword(cleanPassword);
          await ctx.db.patch(existingUser._id, {
            passwordHash: hash,
            passwordSalt: salt,
            password: undefined, // Slett klartekst
          });
        }
      }

      if (!isPasswordValid) {
        throw new Error("Feil passord for denne brukeren.");
      }

      await ctx.db.patch(existingUser._id, {
        lastActiveAt: Date.now(),
      });

      return {
        userId: existingUser._id,
        role: existingUser.role,
        isNew: false,
      };
    }

    // 2. Ny bruker-registrering (KREVER gyldig invitasjonskode)
    if (!args.inviteCode || !args.inviteCode.trim()) {
      throw new Error("Invitasjonskode er påkrevd for å registrere ny bruker.");
    }

    const codeStr = args.inviteCode.trim().toUpperCase();

    const codeRecord = await ctx.db
      .query("invite_codes")
      .withIndex("by_code", (q) => q.eq("code", codeStr))
      .first();

    if (!codeRecord) {
      throw new Error("Ugyldig invitasjonskode. Vennligst oppgi en gyldig kode fra administrator.");
    }

    if (codeRecord.expiresAt && codeRecord.expiresAt < Date.now()) {
      throw new Error("Denne invitasjonskoden har utløpt. Kontakt administrator for ny kode.");
    }

    if (codeRecord.maxUses && codeRecord.usedCount >= codeRecord.maxUses) {
      throw new Error("Denne invitasjonskoden har nådd maksimalt antall registreringer.");
    }

    let userRole = codeRecord.role || "user";
    let assignedRoomId = codeRecord.targetRoomId || args.preferredRoomId;

    // Sjekk at FPL-laget ikke allerede er stjålet/registrert av en annen bruker
    if (args.fplEntryId) {
      const teamTaken = await ctx.db
        .query("users")
        .withIndex("by_fplEntryId", (q) => q.eq("fplEntryId", args.fplEntryId!))
        .first();

      if (teamTaken) {
        throw new Error(`FPL-laget "${args.fplTeamName || args.fplEntryId}" er allerede registrert av brukeren "${teamTaken.username}".`);
      }
    }

    // Oppdater forbruk av invitasjonskode
    await ctx.db.patch(codeRecord._id, {
      usedCount: codeRecord.usedCount + 1,
    });

    // Hash passordet før lagring
    const { hash, salt } = await hashPassword(cleanPassword);

    // Opprett ny bruker
    const userId = await ctx.db.insert("users", {
      username: cleanUsername,
      passwordHash: hash,
      passwordSalt: salt,
      fplEntryId: args.fplEntryId,
      fplTeamName: args.fplTeamName?.trim(),
      fplManagerName: args.fplManagerName?.trim() || cleanUsername,
      roomId: assignedRoomId,
      role: userRole,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanUsername)}`,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
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
 * Tildeler eller endrer rolle til en bruker (KUN for Administrator)
 */
export const setUserRole = mutation({
  args: {
    adminUserId: v.optional(v.id("users")),
    userId: v.id("users"),
    role: v.string(), // "admin" | "user"
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminUserId);

    if (args.role !== "admin" && args.role !== "user") {
      throw new Error("Ugyldig rolle spesifisert.");
    }

    await ctx.db.patch(args.userId, {
      role: args.role,
    });

    return { success: true };
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

    if (!codeRecord) {
      throw new Error("Ugyldig invitasjonskode.");
    }

    if (codeRecord.expiresAt && codeRecord.expiresAt < Date.now()) {
      throw new Error("Invitasjonskoden har utløpt.");
    }

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

    await ctx.db.patch(codeRecord._id, {
      usedCount: codeRecord.usedCount + 1,
    });

    return { userId, role };
  },
});

/**
 * Genererer sikker opplastings-URL for brukerbilde i Convex Storage
 */
export const generateAvatarUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

/**
 * Lagrer et opplastet bilde fra Convex Storage som brukerens avatar
 */
export const saveUploadedAvatar = mutation({
  args: {
    userId: v.id("users"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.userId);

    const url = await ctx.storage.getUrl(args.storageId);
    if (url) {
      await ctx.db.patch(args.userId, {
        avatar: url,
        lastActiveAt: Date.now(),
      });
      return url;
    }
    return null;
  },
});

/**
 * Oppdaterer brukerens profil (visningsnavn og/eller forhåndsdefinert avatar)
 */
export const updateUserProfile = mutation({
  args: {
    userId: v.id("users"),
    username: v.optional(v.string()),
    avatar: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.userId);

    const patch: any = {
      lastActiveAt: Date.now(),
    };

    if (args.username && args.username.trim()) {
      const cleanName = args.username.trim();
      if (cleanName.length < 2) {
        throw new Error("Visningsnavn må bestå av minst 2 tegn.");
      }

      // Sjekk om brukernavnet er tatt av noen andre
      const existing = await ctx.db
        .query("users")
        .withIndex("by_username", (q) => q.eq("username", cleanName))
        .first();

      if (existing && existing._id !== args.userId) {
        throw new Error(`Brukernavnet "${cleanName}" er allerede i bruk av en annen spiller.`);
      }

      patch.username = cleanName;

      // Oppdater tilknyttet lag dersom brukeren eier et lag
      if (user.fplEntryId) {
        const team = await ctx.db
          .query("fpl_teams")
          .withIndex("by_entryId", (q) => q.eq("entryId", user.fplEntryId!))
          .first();

        if (team) {
          await ctx.db.patch(team._id, {
            managerName: cleanName,
            lastUpdated: Date.now(),
          });
        }
      }
    }

    if (args.avatar) {
      patch.avatar = args.avatar;
    }

    await ctx.db.patch(args.userId, patch);
    const updated = await ctx.db.get(args.userId);
    return sanitizeUser(updated);
  },
});

/**
 * Lar en bruker velge og koble sitt FPL-lag én gang etter registrering.
 * Låses etter første valg (krever administrator for endring deretter).
 */
export const claimMyFplTeam = mutation({
  args: {
    userId: v.id("users"),
    fplEntryId: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.userId);

    // Hvis brukeren allerede har et lag tilknyttet, avvis
    if (user.fplEntryId) {
      throw new Error("Du har allerede låst et FPL-lag til denne kontoen. Kontakt en administrator for å endre lag.");
    }

    // Sjekk om laget allerede er tatt av en annen bruker
    const teamTaken = await ctx.db
      .query("users")
      .withIndex("by_fplEntryId", (q) => q.eq("fplEntryId", args.fplEntryId))
      .first();

    if (teamTaken && teamTaken._id !== args.userId) {
      throw new Error(`Dette FPL-laget er allerede tilknyttet brukeren "${teamTaken.username}".`);
    }

    // Hent laginfo fra fpl_teams
    const team = await ctx.db
      .query("fpl_teams")
      .withIndex("by_entryId", (q) => q.eq("entryId", args.fplEntryId))
      .first();

    const fplTeamName = team?.teamName || "FPL-lag";
    const fplManagerName = team?.managerName || user.username;

    // Oppdater brukeren
    await ctx.db.patch(args.userId, {
      fplEntryId: args.fplEntryId,
      fplTeamName,
      fplManagerName,
      lastActiveAt: Date.now(),
    });

    // Knytt fpl_teams posten til brukeren
    if (team) {
      await ctx.db.patch(team._id, {
        userId: user._id,
        roomId: user.roomId || team.roomId,
        lastUpdated: Date.now(),
      });
    }

    return {
      success: true,
      fplEntryId: args.fplEntryId,
      fplTeamName,
      fplManagerName,
    };
  },
});
