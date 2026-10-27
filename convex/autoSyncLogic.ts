/**
 * Ren beslutningslogikk for den serverstyrte FPL-synken (se autoSync.ts).
 *
 * Synken kjøres etter siste kamp i hver gameweek, i tre steg:
 *   1. "provisional" – alle kamper er ferdigspilt (fixture.finished_provisional)
 *   2. "final"       – FPL har bekreftet poengene inkl. bonus (fixture.finished)
 *   3. "morning"     – FPL har gjort sluttoppdateringen av runden: benkespillerne er satt
 *                      inn (auto-subs) og poengene justert. FPL oppgir ikke tidspunktet,
 *                      men flagger det på runden i bootstrap-static (`finished` og
 *                      `data_checked`), så vi sjekker flaggene hver tick. Først nå
 *                      beregnes cuprundene og lagene flyttes videre. Kommer ikke flaggene,
 *                      synker vi likevel et døgn etter kl. 08:00 norsk tid morgenen etter
 *                      siste kamp, så runden aldri blir hengende.
 *
 * Ingen I/O her – alt tar rådata inn og returnerer en beslutning, så det er lett å teste.
 */

export type AutoSyncStage = "provisional" | "final" | "morning";

/** Minimal event-form fra `events` i `bootstrap-static/` i FPL-APIet. */
export type EventLite = {
  finished: boolean;
  data_checked: boolean;
};

/** FPL er ferdig med runden når poengene er kontrollert og runden er avsluttet. */
export function isRoundFinal(event: EventLite): boolean {
  return event.finished === true && event.data_checked === true;
}

/** Minimal fixture-form fra `fixtures/?event=<GW>` i FPL-APIet. */
export type FixtureLite = {
  kickoff_time: string | null;
  finished: boolean;
  finished_provisional: boolean;
};

/** Ventetid etter siste avspark før vi i det hele tatt sjekker om kampene er ferdige. */
export const POST_KICKOFF_BUFFER_MS = 105 * 60 * 1000;

/** Klokkeslettet (norsk tid) morgenen etter siste kamp som reservetiden regnes fra. */
export const MORNING_SYNC_HOUR = 8;
const MORNING_SYNC_TIMEZONE = "Europe/Oslo";
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Hvor lenge etter kl. 08:00-morgenen vi venter på FPL-flaggene før vi synker uansett. */
export const MORNING_FALLBACK_DELAY_MS = DAY_MS;

const STAGE_RANK: Record<AutoSyncStage, number> = { provisional: 1, final: 2, morning: 3 };

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

/** Forskjellen (ms) mellom norsk tid og UTC på et gitt tidspunkt – tar hensyn til sommertid. */
function osloOffsetMs(utcMs: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: MORNING_SYNC_TIMEZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(new Date(utcMs));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second")
  );
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

/**
 * Første kl. 08:00 norsk tid etter `afterMs` (tidspunktet siste kamp er ferdigspilt).
 * Spilles siste kamp om kvelden blir det neste morgen.
 */
export function morningSyncMs(afterMs: number): number {
  const offset = osloOffsetMs(afterMs);
  const localDayStart = Math.floor((afterMs + offset) / DAY_MS) * DAY_MS;
  let localTarget = localDayStart + MORNING_SYNC_HOUR * HOUR_MS;
  if (localTarget <= afterMs + offset) localTarget += DAY_MS;
  // Sommertid-skiftet skjer om natten, men regn ut offset på nytt for målet.
  return localTarget - osloOffsetMs(localTarget - offset);
}

export function decideAutoSync(input: {
  fixtures: FixtureLite[];
  now: number;
  gw: number;
  /** FPL har gjort sluttoppdateringen av runden (se `isRoundFinal`). */
  roundFinal: boolean;
  /** Runden og steget som sist ble synket automatisk. */
  doneGw: number | null;
  doneStage: AutoSyncStage | null;
}): AutoSyncDecision {
  const { fixtures, now, gw, roundFinal, doneGw, doneStage } = input;

  const doneRank = doneGw === gw && doneStage ? STAGE_RANK[doneStage] : 0;
  if (doneRank >= STAGE_RANK.morning) return { kind: "done" };

  const lastKickoff = lastKickoffMs(fixtures);
  if (fixtures.length === 0 || lastKickoff === null) return { kind: "wait" };

  const earliestCheck = lastKickoff + POST_KICKOFF_BUFFER_MS;
  if (now < earliestCheck) return { kind: "wait", wakeAt: earliestCheck };

  const allFinal = fixtures.every((f) => f.finished);
  const allProvisional = fixtures.every((f) => f.finished || f.finished_provisional);

  // Morgensynken er siste steg og kommer uansett hvilke av de to første som ble utført.
  const fallbackAt = morningSyncMs(earliestCheck) + MORNING_FALLBACK_DELAY_MS;
  if (allProvisional && (roundFinal || now >= fallbackAt)) {
    return { kind: "sync", stage: "morning" };
  }

  const target: AutoSyncStage | null = allFinal
    ? "final"
    : allProvisional
      ? "provisional"
      : null;

  if (target && STAGE_RANK[target] > doneRank) return { kind: "sync", stage: target };
  // Flaggene kan komme når som helst, så ingen wakeAt: hver tick sjekker på nytt.
  return { kind: "wait" };
}
