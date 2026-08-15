import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Henter alle nyhetsartikler og runderapporter (sortert etter pinned og dato)
 */
export const listArticles = query({
  args: {},
  handler: async (ctx) => {
    const articles = await ctx.db.query("articles").collect();
    return articles.sort((a, b) => {
      // Pinned først
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.createdAt - a.createdAt;
    });
  },
});

/**
 * Oppretter en ny artikkel eller runderapport
 */
export const createArticle = mutation({
  args: {
    title: v.string(),
    lead: v.optional(v.string()),     // Ingress / Sammendrag
    content: v.string(),              // Hovedtekst med markdown og inline bilder
    imageUrl: v.optional(v.string()), // Coverbilde
    authorName: v.string(),
    authorAvatar: v.optional(v.string()),
    tag: v.optional(v.string()),      // "Runderapport" | "Taktikk" | "Banter" | "Nyhet"
  },
  handler: async (ctx, args) => {
    const articleId = await ctx.db.insert("articles", {
      title: args.title.trim(),
      lead: args.lead?.trim(),
      content: args.content.trim(),
      imageUrl: args.imageUrl,
      authorName: args.authorName.trim(),
      authorAvatar: args.authorAvatar,
      tag: args.tag || "Nyhet",
      isArchived: false,
      isPinned: false,
      likes: 0,
      createdAt: Date.now(),
    });

    return articleId;
  },
});

/**
 * Redigerer en eksisterende artikkel (Admin)
 */
export const updateArticle = mutation({
  args: {
    articleId: v.id("articles"),
    title: v.string(),
    lead: v.optional(v.string()),
    content: v.string(),
    imageUrl: v.optional(v.string()),
    tag: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.articleId);
    if (!existing) {
      throw new Error("Artikkelen ble ikke funnet.");
    }

    await ctx.db.patch(args.articleId, {
      title: args.title.trim(),
      lead: args.lead?.trim(),
      content: args.content.trim(),
      imageUrl: args.imageUrl,
      tag: args.tag || existing.tag,
    });

    return { success: true };
  },
});

/**
 * Arkiverer eller gjenoppretter en artikkel (Admin)
 */
export const toggleArchiveArticle = mutation({
  args: {
    articleId: v.id("articles"),
  },
  handler: async (ctx, args) => {
    const article = await ctx.db.get(args.articleId);
    if (!article) throw new Error("Artikkelen finnes ikke.");

    const newStatus = !article.isArchived;
    await ctx.db.patch(args.articleId, {
      isArchived: newStatus,
    });

    return { isArchived: newStatus };
  },
});

/**
 * Fester eller avfester en artikkel til toppen (Pin) (Admin)
 */
export const togglePinArticle = mutation({
  args: {
    articleId: v.id("articles"),
  },
  handler: async (ctx, args) => {
    const article = await ctx.db.get(args.articleId);
    if (!article) throw new Error("Artikkelen finnes ikke.");

    const newStatus = !article.isPinned;
    await ctx.db.patch(args.articleId, {
      isPinned: newStatus,
    });

    return { isPinned: newStatus };
  },
});

/**
 * Liker en artikkel
 */
export const likeArticle = mutation({
  args: {
    articleId: v.id("articles"),
  },
  handler: async (ctx, args) => {
    const article = await ctx.db.get(args.articleId);
    if (article) {
      await ctx.db.patch(args.articleId, {
        likes: article.likes + 1,
      });
    }
  },
});

/**
 * Sletter en artikkel permanent (Admin)
 */
export const deleteArticle = mutation({
  args: {
    articleId: v.id("articles"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.articleId);
  },
});
