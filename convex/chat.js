import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
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
        }
        else {
            messagesQuery = ctx.db
                .query("messages")
                .withIndex("by_channel_and_createdAt", (q) => q.eq("channel", "banter"))
                .order("desc")
                .take(limit);
        }
        const messages = await messagesQuery;
        // Returner i kronologisk rekkefølge for chat-visning (eldste øverst, nyeste nederst)
        return messages.reverse();
    },
});
/**
 * Sender en ny chat-melding
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
        if (!args.content.trim()) {
            throw new Error("Meldingen kan ikke være tom.");
        }
        const messageId = await ctx.db.insert("messages", {
            senderId: args.senderId,
            senderName: args.senderName.trim(),
            senderRole: args.senderRole || "user",
            senderAvatar: args.senderAvatar,
            channel: args.channel,
            roomId: args.roomId,
            content: args.content.trim(),
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
        if (!message)
            return;
        const user = await ctx.db.get(args.userId);
        if (!user)
            throw new Error("Bruker ikke funnet.");
        if (user.role !== "admin" && message.senderId !== user._id) {
            throw new Error("Du har ikke tillatelse til å slette denne meldingen.");
        }
        await ctx.db.delete(args.messageId);
    },
});
