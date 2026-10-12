/**
 * Hjelpere for cupvisningen: formatgruppering, rundekolonner og "hvem venter kampen på".
 */

export type CupLayout = "knockout" | "double" | "groups";

export function layoutFor(format: string | undefined): CupLayout {
  switch (format) {
    case "double_elimination":
    case "double_elimination_12":
      return "double";
    case "round_robin":
    case "group_stage":
    case "group_stage_12":
      return "groups";
    default:
      return "knockout";
  }
}

export function formatLabel(format: string | undefined): string {
  switch (format) {
    case "single_elimination":
    case "top8_single":
      return "Enkel knockout";
    case "double_elimination":
    case "double_elimination_12":
      return "Dobbel knockout";
    case "round_robin":
      return "Serie / gruppespill";
    case "group_stage":
    case "group_stage_12":
      return "Gruppespill + playoffs";
    case "lucky_loser":
    case "lucky_loser_12":
      return "Lucky loser";
    default:
      return "Knockout";
  }
}

/** "Vinnerbrakett – Semifinale" -> "Semifinale", og fjerner parenteser fra eldre titler. */
export function shortTitle(title: string | undefined): string {
  if (!title) return "";
  const noParens = title.replace(/\s*\([^)]*\)/g, "").trim();
  const afterDash = noParens.split(/\s[–-]\s/).pop() ?? noParens;
  return afterDash.trim();
}

export type RoundColumn = {
  roundNumber: number;
  gameweek: number;
  matches: any[];
};

/** Grupperer kamper i kolonner per spilleomgang, sortert på omgang og kampnummer. */
export function groupByRound(matches: any[]): RoundColumn[] {
  const map = new Map<number, any[]>();
  for (const m of matches) {
    const list = map.get(m.roundNumber) ?? [];
    list.push(m);
    map.set(m.roundNumber, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a - b)
    .map(([roundNumber, list]) => ({
      roundNumber,
      gameweek: list[0]?.gameweek ?? 0,
      matches: list.sort((a, b) => a.matchIndex - b.matchIndex),
    }));
}

/** Kort kampnavn: "Semifinale 2" – nummer bare når flere kamper deler tittel. */
export function matchLabel(match: any, all: any[]): string {
  if (match.isBye) return "Walkover";
  if (match.bracketType === "group") {
    // Gruppespill har "Gruppe A – Runde 1"; en ren serie har bare "Runde 1".
    return match.roundTitle?.startsWith("Gruppe")
      ? `Gruppe ${match.group}`
      : `Kamp ${match.matchIndex}`;
  }
  const title = shortTitle(match.roundTitle) || `Kamp ${match.matchIndex}`;
  // Nummerer bare innen samme brakett og runde ("Kvartfinale #2"), ikke på tvers av brakettene.
  const sameTitle = all.filter(
    (m) => m.roundTitle === match.roundTitle && m.bracketType === match.bracketType
  ).length;
  return sameTitle > 1 ? `${title} #${match.matchIndex}` : title;
}

/**
 * Forteller hva en tom plass i en kamp venter på, f.eks. "Vinner av Semifinale 1".
 * Bygges fra nextMatchId/nextLoserMatchId så det følger bracketstrukturen uansett format.
 */
export function buildSlotHints(matches: any[], cup: any): (match: any, slot: 1 | 2) => string {
  const feeders = new Map<string, string>();
  const label = (m: any) => matchLabel(m, matches);
  for (const m of matches) {
    if (m.nextMatchId && m.nextMatchSlot) {
      feeders.set(`${m.nextMatchId}:${m.nextMatchSlot}`, `Vinner av ${label(m)}`);
    }
    if (m.nextLoserMatchId && m.nextLoserMatchSlot) {
      feeders.set(`${m.nextLoserMatchId}:${m.nextLoserMatchSlot}`, `Taper av ${label(m)}`);
    }
  }
  const hasGroups = (cup?.groupStandings?.length ?? 0) > 0;
  return (match, slot) => {
    const qual = slot === 1 ? match.qual1 : match.qual2;
    if (qual != null) return hasGroups ? "Avventer gruppespillet" : "Avventer runde 1";
    return feeders.get(`${match._id}:${slot}`) ?? "Avventer kamp";
  };
}
