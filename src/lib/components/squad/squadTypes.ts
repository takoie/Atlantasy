import type { PlayerRow } from "../../../../convex/playerMath";

export type SquadStat = { identifier: string; value: number; points: number };

export type SquadFixture = {
  opponent: string;
  opponentName: string;
  isHome: boolean;
  difficulty: number;
  started: boolean;
  finished: boolean;
  kickoff: string | null;
  scoreFor: number | null;
  scoreAgainst: number | null;
  stats: SquadStat[];
};

export type SquadPlayer = {
  id: number;
  name: string;
  club: string;
  clubName?: string;
  crest?: string;
  pos: "GKP" | "DEF" | "MID" | "FWD";
  /** Råpoeng fra FPL før multiplikator. */
  rawPoints: number;
  /** Det spilleren bidrar med i laget (råpoeng × multiplikator). */
  points: number;
  counts: boolean;
  isCaptain: boolean;
  isVice: boolean;
  multiplier: number;
  viceActivated: boolean;
  captainOut: boolean;
  autoSub: "in" | "out" | null;
  minutes: number;
  opponent?: string;
  fixtures: SquadFixture[];
  detail: PlayerRow | null;
  isSub?: boolean;
  subOrder?: number;
};

export type SquadLoadState = "loading" | "ready" | "error";

export const CHIP_LABELS: Record<string, string> = {
  "3xc": "Triple Captain",
  bboost: "Bench Boost",
  freehit: "Free Hit",
  wildcard: "Wildcard",
  manager: "Assistant Manager",
};

export const STAT_LABELS: Record<string, string> = {
  minutes: "Spilletid",
  goals_scored: "Mål",
  assists: "Målgivende",
  clean_sheets: "Clean sheet",
  goals_conceded: "Baklengsmål",
  own_goals: "Selvmål",
  penalties_saved: "Straffe reddet",
  penalties_missed: "Straffe bommet",
  yellow_cards: "Gult kort",
  red_cards: "Rødt kort",
  saves: "Redninger",
  bonus: "Bonuspoeng",
  defensive_contribution: "Defensive aksjoner",
};

export const POSITION_NAMES: Record<SquadPlayer["pos"], string> = {
  GKP: "Keeper",
  DEF: "Forsvar",
  MID: "Midtbane",
  FWD: "Angrep",
};

/** Kapteinsmarkering for en spiller, eller null. Overtatt armbind vises som C. */
export function armband(p: SquadPlayer): { label: string; kind: "captain" | "triple" | "vice" | "out" } | null {
  if (p.captainOut) return { label: "C", kind: "out" };
  if (p.isCaptain || p.viceActivated) {
    return p.multiplier >= 3 ? { label: "TC", kind: "triple" } : { label: "C", kind: "captain" };
  }
  if (p.isVice) return { label: "V", kind: "vice" };
  return null;
}

/** Forklaring av hvordan multiplikatoren oppsto, eller null for vanlige spillere. */
export function multiplierReason(p: SquadPlayer): string | null {
  if (!p.counts || p.multiplier <= 1) return null;
  if (p.viceActivated) return `Visekaptein overtok armbindet · ${p.multiplier}×`;
  return p.multiplier >= 3 ? "Triple Captain · 3×" : "Kaptein · 2×";
}
