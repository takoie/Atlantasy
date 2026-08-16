import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./security";

/**
 * Henter meldinger for enten felleskanalen 'banter' eller et spesifikt rom
 */
export const getMessages = query({
  args: {
    channel: v.string(), // "banter" | "room"
    roomId: v.optional(v.id("rooms")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;

    let messagesQuery;
    if (args.channel === "room" && args.roomId) {
      messagesQuery = ctx.db
        .query("messages")
        .withIndex("by_roomId_and_createdAt", (q) => q.eq("roomId", args.roomId))
        .order("desc")
        .take(limit);
    } else {
      messagesQuery = ctx.db
        .query("messages")
        .withIndex("by_channel_and_createdAt", (q) => q.eq("channel", "banter"))
        .order("desc")
        .take(limit);
    }

    const messages = await messagesQuery;
    return messages.reverse();
  },
});

/**
 * Sender en ny chat-melding (Server-verifisert avsenderidentitet)
 */
export const sendMessage = mutation({
  args: {
    senderId: v.id("users"),
    senderName: v.string(),
    senderRole: v.string(),
    senderAvatar: v.optional(v.string()),
    channel: v.string(), // "banter" | "room"
    roomId: v.optional(v.id("rooms")),
    content: v.string(),
    type: v.optional(v.string()), // "chat" | "announcement" | "fpl_bot" | "banter"
  },
  handler: async (ctx, args) => {
    const cleanContent = args.content.trim();
    if (!cleanContent) {
      throw new Error("Meldingen kan ikke være tom.");
    }

    // Slå opp den faktiske brukeren for å forhindre rolle- eller navneforfalskning
    const user = await ctx.db.get(args.senderId);
    const resolvedName = user ? user.username : args.senderName.trim();
    const resolvedRole = user ? user.role : (args.senderRole === "admin" ? "user" : args.senderRole);
    const resolvedAvatar = user?.avatar || args.senderAvatar;

    const messageId = await ctx.db.insert("messages", {
      senderId: args.senderId,
      senderName: resolvedName,
      senderRole: resolvedRole,
      senderAvatar: resolvedAvatar,
      channel: args.channel,
      roomId: args.roomId,
      content: cleanContent,
      type: args.type ?? "chat",
      createdAt: Date.now(),
    });

    return messageId;
  },
});

/**
 * Sletter en melding (kun admin eller avsender)
 */
export const deleteMessage = mutation({
  args: {
    messageId: v.id("messages"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) return;

    const user = await requireUser(ctx, args.userId);

    const isAuthor = message.senderId === user._id;
    const isAdmin = user.role === "admin";

    if (!isAuthor && !isAdmin) {
      throw new Error("Du har ikke tillatelse til å slette denne meldingen.");
    }

    await ctx.db.delete(args.messageId);
    return { success: true };
  },
});

/**
 * Redigerer en melding (kun admin eller avsender)
 */
export const editMessage = mutation({
  args: {
    messageId: v.id("messages"),
    userId: v.id("users"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const cleanContent = args.content.trim();
    if (!cleanContent) {
      throw new Error("Meldingen kan ikke være tom.");
    }

    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Meldingen ble ikke funnet.");
    }

    const user = await requireUser(ctx, args.userId);

    const isAuthor = message.senderId === user._id;
    const isAdmin = user.role === "admin";

    if (!isAuthor && !isAdmin) {
      throw new Error("Du har ikke tillatelse til å redigere denne meldingen.");
    }

    await ctx.db.patch(args.messageId, {
      content: cleanContent,
      editedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Henter antall uleste meldinger siden et gitt tidsstempel
 */
export const getUnreadCount = query({
  args: {
    since: v.number(),
    roomId: v.optional(v.id("rooms")),
  },
  handler: async (ctx, args) => {
    if (!args.since || args.since <= 0) return 0;

    const banterMessages = await ctx.db
      .query("messages")
      .withIndex("by_channel_and_createdAt", (q) =>
        q.eq("channel", "banter").gt("createdAt", args.since)
      )
      .collect();

    let roomMessagesCount = 0;
    if (args.roomId) {
      const roomMessages = await ctx.db
        .query("messages")
        .withIndex("by_roomId_and_createdAt", (q) =>
          q.eq("roomId", args.roomId).gt("createdAt", args.since)
        )
        .collect();
      roomMessagesCount = roomMessages.length;
    }

    return banterMessages.length + roomMessagesCount;
  },
});
