import { MutationCtx, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ============================================================================
// Kryptografisk Passord-hashing (PBKDF2-SHA256 via Web Crypto API)
// ============================================================================

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * Hasher et passord med PBKDF2, SHA-256 og 100 000 iterasjoner
 */
export async function hashPassword(
  password: string,
  saltHex?: string
): Promise<{ hash: string; salt: string }> {
  const encoder = new TextEncoder();
  const salt = saltHex
    ? hexToBytes(saltHex)
    : crypto.getRandomValues(new Uint8Array(16));

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt as unknown as BufferSource,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );

  return {
    hash: bytesToHex(new Uint8Array(derivedBits)),
    salt: bytesToHex(salt),
  };
}

/**
 * Verifiserer et passord mot lagret hash og salt
 */
export async function verifyPassword(
  password: string,
  storedHash: string,
  storedSalt: string
): Promise<boolean> {
  const { hash } = await hashPassword(password, storedSalt);
  return hash === storedHash;
}

// ============================================================================
// Datasanitering (Fjerner sensitive felter før retur til frontend)
// ============================================================================

/**
 * Fjerner passord, passord-hash og salt fra et brukerdokument
 */
export function sanitizeUser<T extends Record<string, any>>(user: T | null): T | null {
  if (!user) return null;
  const { password, passwordHash, passwordSalt, ...safeUser } = user;
  return safeUser as T;
}

/**
 * Fjerner sensitive felter (admin-PIN) fra ligainnstillinger
 */
export function sanitizeSettings<T extends Record<string, any>>(settings: T | null): T | null {
  if (!settings) return null;
  const { adminPin, ...safeSettings } = settings;
  return safeSettings as T;
}

// ============================================================================
// Autorisasjons-Guards (Server-Side Access Control)
// ============================================================================

/**
 * Krever at en handling utføres av en gyldig administrator
 */
export async function requireAdmin(
  ctx: MutationCtx | QueryCtx,
  adminUserId?: Id<"users"> | string | null
) {
  if (!adminUserId) {
    throw new Error("Uautorisert: Administrator-ID må oppgis.");
  }

  const user = await ctx.db.get(adminUserId as Id<"users">);
  if (!user) {
    throw new Error("Uautorisert: Bruker ble ikke funnet.");
  }

  if (user.role !== "admin") {
    throw new Error("Forbudt: Handlingen krever administratorrettigheter.");
  }

  return user;
}

/**
 * Krever at en handling utføres av en registrert bruker
 */
export async function requireUser(
  ctx: MutationCtx | QueryCtx,
  userId?: Id<"users"> | string | null
) {
  if (!userId) {
    throw new Error("Uautorisert: Bruker-ID må oppgis.");
  }

  const user = await ctx.db.get(userId as Id<"users">);
  if (!user) {
    throw new Error("Uautorisert: Bruker ikke funnet.");
  }

  return user;
}

/**
 * Krever at brukeren enten er forfatter av ressursen eller administrator
 */
export async function requireAuthorOrAdmin(
  ctx: MutationCtx | QueryCtx,
  userId?: Id<"users"> | string | null,
  authorId?: Id<"users"> | null,
  authorName?: string | null
) {
  const user = await requireUser(ctx, userId);

  const isAuthor =
    (authorId && user._id === authorId) ||
    (authorName && user.username.toLowerCase() === authorName.toLowerCase());

  const isAdmin = user.role === "admin";

  if (!isAuthor && !isAdmin) {
    throw new Error("Forbudt: Kun forfatter eller administrator har tilgang til denne handlingen.");
  }

  return user;
}
