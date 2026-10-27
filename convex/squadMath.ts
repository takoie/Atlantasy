/**
 * Ren regnelogikk for lagoppstillingen i lagprofilen: hvem som står på banen etter
 * automatiske bytter, og hvilken poengmultiplikator (kaptein, Triple Captain, benk)
 * hver spiller faktisk får. Ingen I/O, slik at det kan testes isolert.
 *
 * FPLs picks-endepunkt leverer plukkene slik laget ble satt opp (kaptein 2×/3×, benk 0×,
 * eller 1× med Bench Boost). Automatiske bytter og visekaptein-overtakelse er ikke
 * regnet inn der, så det gjør vi her.
 */

export type RawPick = {
  element: number;
  position: number;
  multiplier: number;
  is_captain: boolean;
  is_vice_captain: boolean;
};

export type AutoSub = { element_in: number; element_out: number };

export type ResolvedPick = {
  element: number;
  /** 1–15 etter at automatiske bytter er regnet inn. 1–11 = bane, 12–15 = benk. */
  position: number;
  onPitch: boolean;
  isCaptain: boolean;
  isVice: boolean;
  /** Reell multiplikator: 0 = teller ikke, 1 = vanlig, 2 = kaptein, 3 = Triple Captain. */
  multiplier: number;
  autoSub?: "in" | "out";
  /** Kapteinen spilte ikke, så visekapteinen har overtatt (denne er visekapteinen). */
  viceActivated?: boolean;
  /** Kapteinen spilte ikke og har mistet kapteinsrollen (denne er kapteinen). */
  captainOut?: boolean;
};

export type SquadContext = {
  picks: RawPick[];
  automaticSubs: AutoSub[];
  /** Antall minutter spilleren har fått denne runden. */
  minutesOf: (element: number) => number;
  /** Er alle rundens kamper for spillerens lag ferdige (eller har laget ingen kamp)? */
  fixturesDone: (element: number) => boolean;
};

export function resolveSquad(ctx: SquadContext): ResolvedPick[] {
  const sorted = [...ctx.picks].sort((a, b) => (a.position || 0) - (b.position || 0));
  const subIn = new Set(ctx.automaticSubs.map((s) => s.element_in));
  const subOut = new Set(ctx.automaticSubs.map((s) => s.element_out));
  // Byttet spiller overtar plassen til den han erstattet (benkrekkefølgen bevares).
  const slotOf = new Map<number, number>();
  for (const p of sorted) slotOf.set(p.element, p.position);
  for (const s of ctx.automaticSubs) {
    const inSlot = slotOf.get(s.element_in);
    const outSlot = slotOf.get(s.element_out);
    // Etter ferdigstilling har FPL ofte allerede byttet plassene i picks; da skal vi bare merke.
    if (inSlot !== undefined && outSlot !== undefined && inSlot > 11 && outSlot <= 11) {
      slotOf.set(s.element_in, outSlot);
      slotOf.set(s.element_out, inSlot);
    }
  }

  const resolved: ResolvedPick[] = sorted.map((p) => {
    const autoSub = subIn.has(p.element) ? "in" : subOut.has(p.element) ? "out" : undefined;
    const position = slotOf.get(p.element) ?? p.position;
    const onPitch = position <= 11;
    const multiplier =
      autoSub === "in" ? Math.max(1, p.multiplier) : autoSub === "out" ? 0 : p.multiplier;
    return {
      element: p.element,
      position,
      onPitch,
      isCaptain: p.is_captain,
      isVice: p.is_vice_captain,
      multiplier,
      ...(autoSub ? { autoSub } : {}),
    };
  });

  // Visekapteinen får kapteinens multiplikator når kapteinen ikke har spilt og ikke kan spille mer.
  // Når FPL har ferdigstilt runden har de ofte allerede flyttet armbindet i picks (kapteinen 1×,
  // visekapteinen 2×/3×); da skal vi ikke gjøre det en gang til.
  const captain = resolved.find((p) => p.isCaptain);
  const vice = resolved.find((p) => p.isVice);
  const rawCaptain = ctx.picks.find((p) => p.is_captain);
  const rawVice = ctx.picks.find((p) => p.is_vice_captain);
  if (captain && vice && rawCaptain && rawVice) {
    if (rawCaptain.multiplier <= 1 && rawVice.multiplier > 1) {
      vice.viceActivated = true;
      captain.captainOut = true;
    } else if (
      ctx.minutesOf(captain.element) === 0 &&
      ctx.fixturesDone(captain.element) &&
      vice.multiplier > 0
    ) {
      vice.multiplier = rawCaptain.multiplier || 2;
      vice.viceActivated = true;
      captain.multiplier = captain.multiplier > 0 ? 1 : 0;
      captain.captainOut = true;
    }
  }

  return resolved.sort((a, b) => a.position - b.position);
}

/** Poengene en spiller bidrar med: råpoeng × multiplikator, eller råpoeng hvis han ikke teller. */
export function displayedPoints(rawPoints: number, multiplier: number): number {
  return multiplier > 0 ? rawPoints * multiplier : rawPoints;
}
