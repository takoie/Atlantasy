/**
 * Felter i `next` som avviker fra `existing`. Brukes til å hoppe over `db.patch` når
 * ingenting er endret: hver skriving koster båndbredde og får alle klienter som
 * abonnerer på tabellen (ledertavler, statistikk) til å lese hele resultatet på nytt.
 *
 * Et felt som er `undefined` i `next` og satt i `existing` regnes som endret, slik at
 * `patch` fjerner det (samme oppførsel som før).
 */
export function changedFields<T extends Record<string, unknown>>(
  existing: Record<string, unknown>,
  next: T
): Partial<T> {
  const out: Partial<T> = {};
  for (const key of Object.keys(next) as Array<keyof T & string>) {
    if (existing[key] !== next[key]) out[key] = next[key];
  }
  return out;
}

export function hasChanges(changes: object): boolean {
  return Object.keys(changes).length > 0;
}
