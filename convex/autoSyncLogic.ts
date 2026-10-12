/**
 * Ren beslutningslogikk for den serverstyrte FPL-synken (se autoSync.ts).
 *
 * Synken kjøres etter siste kamp i hver gameweek, i to steg:
 *   1. "provisional" – alle kamper er ferdigspilt (fixture.finished_provisional)
 *   2. "final"       – FPL har bekreftet poengene inkl. bonus (fixture.finished)
 *
 * Ingen I/O her – alt tar rådata inn og returnerer en beslutning, så det er lett å teste.
 */

export type AutoSyncStage = "provisional" | "final";

/** Minimal fixture-form fra `fixtures/?event=<GW>` i FPL-APIet. */
export type FixtureLite = {
  kickoff_time: string | null;
  finished: boolean;
  finished_provisional: boolean;
};

/** Ventetid etter siste avspark før vi i det hele tatt sjekker om kampene er ferdige. */
export const POST_KICKOFF_BUFFER_MS = 105 * 60 * 1000;

const STAGE_RANK: Record<AutoSyncStage, number> = { provisional: 1, final: 2 };

export type AutoSyncDecision =
  /** Kjør synk nå og lagre `stage` som utført. */
  | { kind: "sync"; stage: AutoSyncStage }
  /** Ikke på tide ennå. `wakeAt` (ms) = tidligste tidspunkt det er vits i å sjekke igjen. */
  | { kind: "wait"; wakeAt?: number }
  /** Begge steg er allerede utført for denne runden. */
  | { kind: "done" };

/** Siste avspark (ms) blant kampene i runden, eller null hvis ingen har satt tid. */
export function lastKickoffMs(fixtures: FixtureLite[]): number | null {
  let last: number | null = null;
  for (const f of fixtures) {
    if (!f.kickoff_time) continue;
    const t = Date.parse(f.kickoff_time);
    if (Number.isNaN(t)) continue;
    if (last === null || t > last) last = t;
  }
  return last;
}

export function decideAutoSync(input: {
  fixtures: FixtureLite[];
  now: number;
  gw: number;
  /** Runden og steget som sist ble synket automatisk. */
  doneGw: number | null;
  doneStage: AutoSyncStage | null;
}): AutoSyncDecision {
  const { fixtures, now, gw, doneGw, doneStage } = input;

  const doneRank = doneGw === gw && doneStage ? STAGE_RANK[doneStage] : 0;
  if (doneRank >= STAGE_RANK.final) return { kind: "done" };

  const lastKickoff = lastKickoffMs(fixtures);
  if (fixtures.length === 0 || lastKickoff === null) return { kind: "wait" };

  const earliestCheck = lastKickoff + POST_KICKOFF_BUFFER_MS;
  if (now < earliestCheck) return { kind: "wait", wakeAt: earliestCheck };

  const allFinal = fixtures.every((f) => f.finished);
  const allProvisional = fixtures.every((f) => f.finished || f.finished_provisional);

  const target: AutoSyncStage | null = allFinal
    ? "final"
    : allProvisional
      ? "provisional"
      : null;

  if (target && STAGE_RANK[target] > doneRank) return { kind: "sync", stage: target };
  return { kind: "wait" };
}
