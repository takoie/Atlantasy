/**
 * Sesongnavn ("2026/2027") utledet fra en dato. FPL-sesongen starter i august,
 * så fra og med juli regnes datoen til sesongen som begynner det året.
 */
export function seasonFor(timestamp: number = Date.now()): string {
  const d = new Date(timestamp);
  const startYear = d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1;
  return `${startYear}/${startYear + 1}`;
}

/**
 * Cuper opprettet før sesongen ble utledet fikk den hardkodede standarden "2025/2026"
 * lagret (både som sesong og i standardnavnet). Slike verdier regnes som feil hvis cupen
 * er opprettet i en annen sesong, og byttes ut ved visning. Verdier admin har skrevet
 * selv (alt annet enn denne standarden) respekteres alltid.
 */
const LEGACY_DEFAULT_SEASON = "2025/2026";

type CupLike = { season?: string; name: string; createdAt: number };

export function effectiveSeason(cup: Pick<CupLike, "season" | "createdAt">): string {
  const derived = seasonFor(cup.createdAt);
  if (!cup.season) return derived;
  if (cup.season === LEGACY_DEFAULT_SEASON && derived !== LEGACY_DEFAULT_SEASON) return derived;
  return cup.season;
}

export function effectiveCupName(cup: CupLike): string {
  const season = effectiveSeason(cup);
  if (cup.name.includes(LEGACY_DEFAULT_SEASON) && season !== LEGACY_DEFAULT_SEASON) {
    return cup.name.split(LEGACY_DEFAULT_SEASON).join(season);
  }
  return cup.name;
}
