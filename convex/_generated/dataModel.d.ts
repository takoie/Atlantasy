/* eslint-disable */
/**
 * Generated data model types for Convex.
 * Denne filen oppdateres automatisk når du kjører `npx convex dev`.
 */
import type { GenericId } from "convex/values";

export type Id<TableName extends string> = GenericId<TableName>;

export interface Doc<TableName extends string> {
  _id: Id<TableName>;
  _creationTime: number;
}
