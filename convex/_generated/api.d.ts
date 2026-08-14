/* eslint-disable */
/**
 * Generated API definitions for Convex.
 * Denne filen oppdateres automatisk når du kjører `npx convex dev`.
 */
import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as meldinger from "../meldinger.js";

export declare const api: {
  meldinger: {
    hentSisteMeldinger: FunctionReference<
      "query",
      "public",
      { grense?: number },
      Array<{
        _id: string;
        _creationTime: number;
        tittel?: string;
        innhold: string;
        type: string;
        opprettetDato: number;
        erAdminMelding: boolean;
      }>
    >;
    sendMelding: FunctionReference<
      "mutation",
      "public",
      { tittel?: string; innhold: string; type: string; erAdminMelding: boolean },
      string
    >;
    slettMelding: FunctionReference<
      "mutation",
      "public",
      { id: any },
      null
    >;
  };
};

export declare const internal: any;
