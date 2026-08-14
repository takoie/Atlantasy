import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Henter alle nyhetsartikler og runderapporter
 */
export const listArticles = query({
  args: {},
  handler: async (ctx) => {
    const articles = await ctx.db.query("articles").collect();
    return articles.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Oppretter en ny artikkel eller runderapport
 */
export const createArticle = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    imageUrl: v.optional(v.string()), // URL eller Base64 fra clipboard / filopplasting
    authorName: v.string(),
    authorAvatar: v.optional(v.string()),
    tag: v.optional(v.string()),      // "Runderapport" | "Taktikk" | "Banter" | "Nyhet"
  },
  handler: async (ctx, args) => {
    const articleId = await ctx.db.insert("articles", {
      title: args.title.trim(),
      content: args.content.trim(),
      imageUrl: args.imageUrl,
      authorName: args.authorName.trim(),
      authorAvatar: args.authorAvatar,
      tag: args.tag || "Nyhet",
      likes: 0,
      createdAt: Date.now(),
    });

    return articleId;
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
 * Sletter en artikkel
 */
export const deleteArticle = mutation({
  args: {
    articleId: v.id("articles"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.articleId);
  },
});
