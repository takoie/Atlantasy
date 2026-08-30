/**
 * Rene turneringsgeneratorer – ingen database, kun matte.
 *
 * Alle formatene tar et vilkårlig antall lag (9, 10, 12, oddetall …) og
 * produserer en normalisert kampplan. Persisteringen (`convex/cups.ts`) gjør
 * planen om til `cup_matches`-rader og kobler `nextMatchId` etterpå.
 *
 * Byes løses ved generering: et lag med bye får ingen kamp i runde 1, men
 * plasseres rett inn i runde 2 (som i en ekte seedet bracket).
 */

export type PlanMatch = {
  key: string; // stabil id i planen, f.eks. "WB-R1-M1"
  bracketType: "winners" | "losers" | "grand_final" | "knockout" | "group";
  stage: "group" | "knockout" | "bracket";
  group?: string;
  roundNumber: number; // global rekkefølge (for gameweek-mapping)
  roundTitle: string;
  matchIndex: number;
  seed1: number | null; // indeks i seededRooms, eller null (fylles av avansement)
  seed2: number | null;
  isLuckyLoser?: boolean;
  nextWinnerKey?: string | null;
  nextWinnerSlot?: 1 | 2 | null;
  nextLoserKey?: string | null;
  nextLoserSlot?: 1 | 2 | null;
};

export type CupPlan = {
  format: string;
  matches: PlanMatch[];
  totalRounds: number;
  /** Antall lag per gruppe (kun gruppespill) – brukes til å seede tabellene. */
  groupSizes?: number[];
};

const nextPow2 = (n: number) => {
  let p = 1;
  while (p < n) p *= 2;
  return p;
};
const log2 = (n: number) => Math.round(Math.log2(n));

/** Standard bracket-seedplassering: seedSlots(8) => [1,8,5,4,3,6,7,2] (1-basert). */
export function seedSlots(size: number): number[] {
  let slots = [1, 2];
  while (slots.length < size) {
    const n = slots.length * 2;
    const next: number[] = [];
    for (const s of slots) {
      next.push(s);
      next.push(n + 1 - s);
    }
    slots = next;
  }
  return slots;
}

function roundTitleFor(matchesInRound: number): string {
  if (matchesInRound === 1) return "Final";
  if (matchesInRound === 2) return "Semi-final";
  if (matchesInRound === 4) return "Quarter-final";
  if (matchesInRound === 8) return "Round of 16";
  return `Round ${Math.ceil(Math.log2(matchesInRound * 2))}`;
}

/* ------------------------------------------------------------------ */
/* Single elimination (med byes + valgfri bronsefinale)               */
/* ------------------------------------------------------------------ */

type SEOptions = { bronze?: boolean; keyPrefix?: string; startRound?: number };

export function singleElimination(
  teamCount: number,
  opts: SEOptions = {}
): CupPlan {
  const prefix = opts.keyPrefix ?? "M";
  const startRound = opts.startRound ?? 1;
  const size = Math.max(2, nextPow2(teamCount));
  const rounds = log2(size);
  const slots = seedSlots(size); // 1-basert seed per posisjon

  const matches: PlanMatch[] = [];
  const key = (r: number, m: number) => `${prefix}-R${r}-M${m}`;

  const r1Count = size / 2;
  // Lag som vinner en bye i R1 -> hvilken R2-kamp/slot de havner i.
  const preAdvance: Array<{ seedIdx: number; r2Match: number; r2Slot: 1 | 2 }> =
    [];

  for (let m = 0; m < r1Count; m++) {
    const a = slots[m * 2] - 1; // seed-idx (0-basert)
    const b = slots[m * 2 + 1] - 1;
    const aReal = a < teamCount;
    const bReal = b < teamCount;
    const r2Match = Math.floor(m / 2);
    const r2Slot: 1 | 2 = m % 2 === 0 ? 1 : 2;

    if (aReal && bReal) {
      matches.push({
        key: key(1, m + 1),
        bracketType: "knockout",
        stage: "knockout",
        roundNumber: startRound,
        roundTitle: roundTitleFor(r1Count),
        matchIndex: m + 1,
        seed1: a,
        seed2: b,
        nextWinnerKey: rounds > 1 ? key(2, r2Match + 1) : null,
        nextWinnerSlot: rounds > 1 ? r2Slot : null,
      });
    } else if (aReal || bReal) {
      preAdvance.push({ seedIdx: aReal ? a : b, r2Match, r2Slot });
    }
  }

  for (let r = 2; r <= rounds; r++) {
    const count = size / 2 ** r;
    for (let m = 0; m < count; m++) {
      const pre = preAdvance.filter((p) => r === 2 && p.r2Match === m);
      const seed1 = pre.find((p) => p.r2Slot === 1)?.seedIdx ?? null;
      const seed2 = pre.find((p) => p.r2Slot === 2)?.seedIdx ?? null;
      matches.push({
        key: key(r, m + 1),
        bracketType: "knockout",
        stage: "knockout",
        roundNumber: startRound + r - 1,
        roundTitle: roundTitleFor(count),
        matchIndex: m + 1,
        seed1,
        seed2,
        nextWinnerKey: r < rounds ? key(r + 1, Math.floor(m / 2) + 1) : null,
        nextWinnerSlot: r < rounds ? (m % 2 === 0 ? 1 : 2) : null,
      });
    }
  }

  if (opts.bronze && rounds >= 2) {
    const bronzeKey = `${prefix}-BRONZE`;
    const semis = matches.filter(
      (mm) => mm.roundNumber === startRound + rounds - 2
    );
    matches.push({
      key: bronzeKey,
      bracketType: "knockout",
      stage: "knockout",
      roundNumber: startRound + rounds - 1,
      roundTitle: "3rd place final",
      matchIndex: 2,
      seed1: null,
      seed2: null,
    });
    let slot: 1 | 2 = 1;
    for (const s of semis) {
      s.nextLoserKey = bronzeKey;
      s.nextLoserSlot = slot;
      slot = slot === 1 ? 2 : 1;
    }
  }

  return { format: "single_elimination", matches, totalRounds: rounds };
}

/* ------------------------------------------------------------------ */
/* Lucky loser – single elim der beste taper i runde 1 får ny sjanse   */
/* ------------------------------------------------------------------ */

export function luckyLoser(teamCount: number): CupPlan {
  const base = singleElimination(teamCount, { bronze: true, keyPrefix: "LL" });
  const size = nextPow2(teamCount);
  if (size > teamCount) {
    const r1 = base.matches.filter((m) => m.roundNumber === 1);
    if (r1.length > 0) r1[r1.length - 1].isLuckyLoser = true;
  }
  return { ...base, format: "lucky_loser" };
}

/* ------------------------------------------------------------------ */
/* Round robin / gruppespill (konfigurerbart antall grupper)          */
/* ------------------------------------------------------------------ */

/** Sirkel-metoden: fixtures for én gruppe med `ids` (indekser). */
function circleFixtures(ids: number[]): Array<[number, number]>[] {
  const arr = [...ids];
  if (arr.length % 2 === 1) arr.push(-1); // -1 = bye
  const n = arr.length;
  const rounds: Array<[number, number]>[] = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs: Array<[number, number]> = [];
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      if (a !== -1 && b !== -1) pairs.push([a, b]);
    }
    rounds.push(pairs);
    arr.splice(1, 0, arr.pop() as number); // roter (fast første)
  }
  return rounds;
}

export function roundRobin(teamCount: number, groupCount = 1): CupPlan {
  const g = Math.max(1, Math.min(groupCount, Math.floor(teamCount / 2)));
  const groups: number[][] = Array.from({ length: g }, () => []);
  let dir = 1;
  let gi = 0;
  for (let seed = 0; seed < teamCount; seed++) {
    groups[gi].push(seed);
    if (g === 1) continue;
    if (dir === 1 && gi === g - 1) dir = -1;
    else if (dir === -1 && gi === 0) dir = 1;
    else gi += dir;
  }

  const matches: PlanMatch[] = [];
  const letters = "ABCDEFGH";
  let maxGroupRounds = 0;
  groups.forEach((ids, idx) => {
    const label = letters[idx] ?? String(idx + 1);
    const fixtures = circleFixtures(ids);
    maxGroupRounds = Math.max(maxGroupRounds, fixtures.length);
    fixtures.forEach((pairs, r) => {
      pairs.forEach(([a, b], m) => {
        matches.push({
          key: `RR-G${label}-R${r + 1}-M${m + 1}`,
          bracketType: "group",
          stage: "group",
          group: label,
          roundNumber: r + 1,
          roundTitle: `Group ${label} – Round ${r + 1}`,
          matchIndex: m + 1,
          seed1: a,
          seed2: b,
        });
      });
    });
  });

  let totalRounds = maxGroupRounds;
  if (g >= 2) {
    const ko = singleElimination(g, { bronze: g >= 4, keyPrefix: "KO" });
    const koFirstRound = ko.matches[0]?.roundNumber ?? 1;
    for (const km of ko.matches) {
      matches.push({
        ...km,
        roundNumber: maxGroupRounds + (km.roundNumber - koFirstRound) + 1,
        stage: "knockout",
        seed1: null,
        seed2: null,
      });
    }
    totalRounds = maxGroupRounds + ko.totalRounds;
  }

  return {
    format: "round_robin",
    matches,
    totalRounds,
    groupSizes: groups.map((x) => x.length),
  };
}

/* ------------------------------------------------------------------ */
/* Double elimination (vinner- + taperbrakett + storfinale), med byes  */
/* ------------------------------------------------------------------ */

export function doubleElimination(teamCount: number): CupPlan {
  // For at taperbraketten skal bli ren uansett antall lag: spill en play-in-runde
  // som reduserer feltet til nærmeste lavere toerpotens. Play-in-tapere er ute.
  const base = Math.max(2, 2 ** Math.floor(Math.log2(teamCount)));
  const playIn = teamCount - base; // antall play-in-kamper
  const W = log2(base);
  const matches: PlanMatch[] = [];

  // --- Winners bracket (ren toerpotens på `base` slots) ---
  const wbSlots = seedSlots(base);
  const wbKey = (r: number, m: number) => `WB-R${r}-M${m}`;
  for (let r = 1; r <= W; r++) {
    const count = base / 2 ** r;
    for (let m = 0; m < count; m++) {
      matches.push({
        key: wbKey(r, m + 1),
        bracketType: "winners",
        stage: "bracket",
        roundNumber: 1 + (r - 1) + (playIn > 0 ? 1 : 0),
        roundTitle:
          r === 1
            ? `Winners bracket – ${roundTitleFor(count).toLowerCase()}`
            : `Winners bracket – ${roundTitleFor(count).toLowerCase()}`,
        matchIndex: m + 1,
        seed1: r === 1 ? wbSlots[m * 2] - 1 : null,
        seed2: r === 1 ? wbSlots[m * 2 + 1] - 1 : null,
        nextWinnerKey: r < W ? wbKey(r + 1, Math.floor(m / 2) + 1) : null,
        nextWinnerSlot: r < W ? (m % 2 === 0 ? 1 : 2) : null,
      });
    }
  }

  // --- Play-in: de laveste 2*playIn seedene spiller om plassene ---
  if (playIn > 0) {
    const posOfSeed = (s: number) => wbSlots.findIndex((x) => x - 1 === s);
    for (let k = 0; k < playIn; k++) {
      const hi = base - playIn + k; // seed som ellers ville stått i bracketen
      const lo = teamCount - 1 - k;
      const pos = posOfSeed(hi);
      const wbMatch = wbKey(1, Math.floor(pos / 2) + 1);
      const wbSlot: 1 | 2 = pos % 2 === 0 ? 1 : 2;
      const target = matches.find((mm) => mm.key === wbMatch)!;
      if (wbSlot === 1) target.seed1 = null;
      else target.seed2 = null;
      matches.push({
        key: `PI-M${k + 1}`,
        bracketType: "knockout",
        stage: "knockout",
        roundNumber: 1,
        roundTitle: "Play-in",
        matchIndex: k + 1,
        seed1: hi,
        seed2: lo,
        nextWinnerKey: wbMatch,
        nextWinnerSlot: wbSlot,
      });
    }
  }

  const wbByRound = (globalR: number) =>
    matches.filter(
      (m) => m.bracketType === "winners" && m.roundNumber === globalR
    );
  const wbGlobal = (r: number) => 1 + (r - 1) + (playIn > 0 ? 1 : 0);

  // --- Losers bracket: 2*(W-1) runder, vekselvis major/minor ---
  const lbKey = (r: number, m: number) => `LB-R${r}-M${m}`;
  const lbRounds = Math.max(0, 2 * (W - 1));
  const lbBase = wbGlobal(W); // global runde for WB-finalen
  let lbPrev: string[] = [];

  for (let lr = 1; lr <= lbRounds; lr++) {
    const isMajor = lr === 1 || lr % 2 === 0;
    let count: number;
    if (lr === 1) count = base / 4;
    else if (isMajor) count = lbPrev.length;
    else count = Math.ceil(lbPrev.length / 2);
    if (count < 1) continue;

    const created: string[] = [];
    for (let m = 0; m < count; m++) {
      created.push(lbKey(lr, m + 1));
      matches.push({
        key: lbKey(lr, m + 1),
        bracketType: "losers",
        stage: "bracket",
        roundNumber: lbBase + lr,
        roundTitle:
          lr === lbRounds
            ? "Losers bracket – Final"
            : `Losers bracket – Round ${lr}`,
        matchIndex: m + 1,
        seed1: null,
        seed2: null,
      });
    }

    // Forrige LB-nivå inn i dette.
    lbPrev.forEach((prevKey, i) => {
      const target = created[isMajor ? i : Math.floor(i / 2)];
      if (!target) return;
      const pm = matches.find((x) => x.key === prevKey)!;
      pm.nextWinnerKey = target;
      pm.nextWinnerSlot = isMajor ? 1 : ((i % 2 === 0 ? 1 : 2) as 1 | 2);
    });

    // Nedrykkere fra vinnerbraketten.
    if (lr === 1) {
      wbByRound(wbGlobal(1)).forEach((wm, i) => {
        const t = created[Math.floor(i / 2)];
        if (!t) return;
        wm.nextLoserKey = t;
        wm.nextLoserSlot = (i % 2 === 0 ? 1 : 2) as 1 | 2;
      });
    } else if (isMajor) {
      const feedR = lr / 2 + 1; // lr2<-WB2, lr4<-WB3, lr6<-WB4
      wbByRound(wbGlobal(feedR)).forEach((wm, i) => {
        if (created[i]) {
          wm.nextLoserKey = created[i];
          wm.nextLoserSlot = 2;
        }
      });
    }

    lbPrev = created;
  }

  // --- Grand Final ---
  const grandKey = "GF-1";
  const grandRound = lbBase + lbRounds + 1;
  matches.push({
    key: grandKey,
    bracketType: "grand_final",
    stage: "bracket",
    roundNumber: grandRound,
    roundTitle: "Grand Final",
    matchIndex: 1,
    seed1: null,
    seed2: null,
  });
  const wbFinal = matches.find((m) => m.key === wbKey(W, 1));
  if (wbFinal) {
    wbFinal.nextWinnerKey = grandKey;
    wbFinal.nextWinnerSlot = 1;
  }
  if (lbRounds === 0 && wbFinal) {
    wbFinal.nextLoserKey = grandKey;
    wbFinal.nextLoserSlot = 2;
  } else if (lbPrev.length === 1) {
    const lbFinal = matches.find((m) => m.key === lbPrev[0])!;
    lbFinal.nextWinnerKey = grandKey;
    lbFinal.nextWinnerSlot = 2;
  }

  return { format: "double_elimination", matches, totalRounds: grandRound };
}

/* ------------------------------------------------------------------ */

export function buildCupPlan(
  format: string,
  teamCount: number,
  groupCount?: number
): CupPlan {
  switch (format) {
    case "single_elimination":
      return singleElimination(teamCount, { bronze: true, keyPrefix: "M" });
    case "double_elimination":
      return doubleElimination(teamCount);
    case "round_robin":
    case "group_stage":
      return roundRobin(teamCount, groupCount ?? 2);
    case "lucky_loser":
    default:
      return luckyLoser(teamCount);
  }
}
