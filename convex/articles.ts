import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthorOrAdmin, requireAdmin, requireUser } from "./security";

/**
 * Henter alle nyhetsartikler og runderapporter (sortert etter pinned og dato)
 */
export const listArticles = query({
  args: {},
  handler: async (ctx) => {
    const articles = await ctx.db.query("articles").collect();
    return articles.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.createdAt - a.createdAt;
    });
  },
});

/**
 * Genererer en sikker URL for å laste opp bilde til Convex Storage
 */
export const generateArticleUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Konverterer en opplastet fil i Convex storage til en permanent offentlig URL
 */
export const saveArticleUploadedImage = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) throw new Error("Kunne ikke hente URL for opplastet bilde.");
    return url;
  },
});

/**
 * Oppretter en ny artikkel eller runderapport
 */
export const createArticle = mutation({
  args: {
    userId: v.optional(v.id("users")),
    title: v.string(),
    lead: v.optional(v.string()),     // Ingress / Sammendrag
    content: v.string(),              // Hovedtekst med markdown og inline bilder
    imageUrl: v.optional(v.string()), // Coverbilde
    imagePosition: v.optional(v.number()), // 0-100% vertikal posisjon (default 50)
    imageFit: v.optional(v.string()),      // "cover" | "contain" | "natural"
    imageHeight: v.optional(v.string()),   // "banner" | "standard" | "large" | "natural"
    authorId: v.optional(v.id("users")),
    authorName: v.string(),
    authorAvatar: v.optional(v.string()),
    tag: v.optional(v.string()),      // "Runderapport" | "Taktikk" | "Banter" | "Nyhet"
  },
  handler: async (ctx, args) => {
    const cleanTitle = args.title.trim();
    const cleanContent = args.content.trim();

    if (!cleanTitle) {
      throw new Error("Artikkeltittel kan ikke være tom.");
    }
    if (!cleanContent) {
      throw new Error("Artikkelinnhold kan ikke være tomt.");
    }

    let resolvedAuthorId = args.authorId;
    let resolvedAuthorName = args.authorName.trim();
    let resolvedAuthorAvatar = args.authorAvatar;

    if (args.userId) {
      const user = await requireUser(ctx, args.userId);
      resolvedAuthorId = user._id;
      resolvedAuthorName = user.username;
      resolvedAuthorAvatar = user.avatar || resolvedAuthorAvatar;
    }

    const articleId = await ctx.db.insert("articles", {
      title: cleanTitle,
      lead: args.lead?.trim(),
      content: cleanContent,
      imageUrl: args.imageUrl,
      imagePosition: args.imagePosition ?? 50,
      imageFit: args.imageFit || "cover",
      imageHeight: args.imageHeight || "standard",
      authorId: resolvedAuthorId,
      authorName: resolvedAuthorName,
      authorAvatar: resolvedAuthorAvatar,
      tag: args.tag || "Nyhet",
      isArchived: false,
      isPinned: false,
      likes: 0,
      likedBy: [],
      createdAt: Date.now(),
    });

    return articleId;
  },
});

/**
 * Redigerer en eksisterende artikkel (Kun forfatter eller Admin)
 */
export const updateArticle = mutation({
  args: {
    articleId: v.id("articles"),
    userId: v.optional(v.id("users")),
    title: v.string(),
    lead: v.optional(v.string()),
    content: v.string(),
    imageUrl: v.optional(v.string()),
    imagePosition: v.optional(v.number()),
    imageFit: v.optional(v.string()),
    imageHeight: v.optional(v.string()),
    tag: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.articleId);
    if (!existing) {
      throw new Error("Artikkelen ble ikke funnet.");
    }

    await requireAuthorOrAdmin(ctx, args.userId, existing.authorId, existing.authorName);

    await ctx.db.patch(args.articleId, {
      title: args.title.trim(),
      lead: args.lead?.trim(),
      content: args.content.trim(),
      imageUrl: args.imageUrl,
      imagePosition: args.imagePosition ?? existing.imagePosition ?? 50,
      imageFit: args.imageFit || existing.imageFit || "cover",
      imageHeight: args.imageHeight || existing.imageHeight || "standard",
      tag: args.tag || existing.tag,
    });

    return { success: true };
  },
});

/**
 * Arkiverer eller gjenoppretter en artikkel (Forfatter eller Admin)
 */
export const toggleArchiveArticle = mutation({
  args: {
    articleId: v.id("articles"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const article = await ctx.db.get(args.articleId);
    if (!article) throw new Error("Artikkelen finnes ikke.");

    await requireAuthorOrAdmin(ctx, args.userId, article.authorId, article.authorName);

    const newStatus = !article.isArchived;
    await ctx.db.patch(args.articleId, {
      isArchived: newStatus,
    });

    return { isArchived: newStatus };
  },
});

/**
 * Fester eller avfester en artikkel til toppen (Kun Administrator)
 */
export const togglePinArticle = mutation({
  args: {
    articleId: v.id("articles"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const article = await ctx.db.get(args.articleId);
    if (!article) throw new Error("Artikkelen finnes ikke.");

    await requireAdmin(ctx, args.userId);

    const newStatus = !article.isPinned;
    await ctx.db.patch(args.articleId, {
      isPinned: newStatus,
    });

    return { isPinned: newStatus };
  },
});

/**
 * Liker / fjerner likerklikk for en artikkel (Maks 1 like per bruker)
 */
export const likeArticle = mutation({
  args: {
    articleId: v.id("articles"),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const article = await ctx.db.get(args.articleId);
    if (!article) return;

    const userKey = args.userId || "anonymous";
    const likedBy: string[] = article.likedBy || [];
    const hasLiked = likedBy.includes(userKey);

    let newLikedBy: string[];
    let newLikes: number;

    if (hasLiked) {
      newLikedBy = likedBy.filter((id) => id !== userKey);
      newLikes = Math.max(0, (article.likes || 1) - 1);
    } else {
      newLikedBy = [...likedBy, userKey];
      newLikes = (article.likes || 0) + 1;
    }

    await ctx.db.patch(args.articleId, {
      likedBy: newLikedBy,
      likes: newLikes,
    });

    return { hasLiked: !hasLiked, likes: newLikes };
  },
});

/**
 * Sletter en artikkel permanent (Kun Forfatter eller Admin)
 */
export const deleteArticle = mutation({
  args: {
    articleId: v.id("articles"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const article = await ctx.db.get(args.articleId);
    if (!article) return;

    await requireAuthorOrAdmin(ctx, args.userId, article.authorId, article.authorName);

    await ctx.db.delete(args.articleId);
    return { success: true };
  },
});
