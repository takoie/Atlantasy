/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as articles from "../articles.js";
import type * as auth from "../auth.js";
import type * as chat from "../chat.js";
import type * as cupEngine from "../cupEngine.js";
import type * as cups from "../cups.js";
import type * as fpl from "../fpl.js";
import type * as fplCalendar from "../fplCalendar.js";
import type * as roomColors from "../roomColors.js";
import type * as rooms from "../rooms.js";
import type * as security from "../security.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  articles: typeof articles;
  auth: typeof auth;
  chat: typeof chat;
  cupEngine: typeof cupEngine;
  cups: typeof cups;
  fpl: typeof fpl;
  fplCalendar: typeof fplCalendar;
  roomColors: typeof roomColors;
  rooms: typeof rooms;
  security: typeof security;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
