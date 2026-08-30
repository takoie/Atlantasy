/**
 * Rene hjelpefunksjoner for å utlede måned-tilhørighet for FPL-gameweeks.
 *
 * En "måned" = kalendermåneden som gameweekens offisielle frist (`deadline_time`
 * fra bootstrap-static) faller i, regnet i norsk tid (Europe/Oslo). Måneden
 * ruller automatisk over når første frist i en ny kalendermåned passerer.
 *
 * Ingen I/O her – alt tar rådata inn og returnerer verdier, så det er lett å teste.
 */

const NB_MONTHS = [
  "Januar", "Februar", "Mars", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Desember",
];

/** ISO-frist (f.eks. "2026-08-28T17:30:00Z") -> "YYYY-MM" i norsk tid. */
export function monthKeyFromDeadline(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "unknown";
  try {
    // en-CA gir "YYYY-MM-DD"; vi tar år + måned.
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Oslo",
      year: "numeric",
      month: "2-digit",
    }).format(d);
    return parts.slice(0, 7);
  } catch {
    // Fallback dersom runtime mangler timeZone-støtte: bruk UTC.
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  }
}

/** "2026-08" -> "August 2026". */
export function monthNameFromKey(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const idx = Number(month) - 1;
  const name = NB_MONTHS[idx] ?? monthKey;
  return year ? `${name} ${year}` : name;
}

export type GwCalendarEntry = {
  gw: number;
  monthKey: string;
  monthName: string;
  deadline: string;
  finished: boolean;
};

/** bootstrap-static `events[]` -> sortert liste med måned-tilhørighet per GW. */
export function buildGwCalendar(events: any[]): GwCalendarEntry[] {
  return (events || [])
    .filter((e) => e && typeof e.id === "number" && e.deadline_time)
    .map((e) => {
      const monthKey = monthKeyFromDeadline(e.deadline_time);
      return {
        gw: e.id,
        monthKey,
        monthName: monthNameFromKey(monthKey),
        deadline: e.deadline_time,
        finished: Boolean(e.finished),
      };
    })
    .sort((a, b) => a.gw - b.gw);
}

export type MonthRange = {
  monthKey: string;
  monthName: string;
  gameweekStart: number;
  gameweekEnd: number;
  gwList: number[];
  isCompleted: boolean;
};

/** Grupper GW-kalenderen til én rad per måned (sammenhengende GW-intervall). */
export function monthsFromCalendar(cal: GwCalendarEntry[]): MonthRange[] {
  const byKey = new Map<string, GwCalendarEntry[]>();
  for (const entry of cal) {
    const list = byKey.get(entry.monthKey) ?? [];
    list.push(entry);
    byKey.set(entry.monthKey, list);
  }

  return Array.from(byKey.entries())
    .map(([monthKey, entries]) => {
      const gws = entries.map((e) => e.gw).sort((a, b) => a - b);
      return {
        monthKey,
        monthName: entries[0].monthName,
        gameweekStart: gws[0],
        gameweekEnd: gws[gws.length - 1],
        gwList: gws,
        isCompleted: entries.every((e) => e.finished),
      };
    })
    .sort((a, b) => a.gameweekStart - b.gameweekStart);
}

/** monthKey for gjeldende gameweek (eksakt treff, ellers nærmeste tidligere/første). */
export function currentMonthKey(
  cal: GwCalendarEntry[],
  currentGw: number
): string | null {
  if (cal.length === 0) return null;
  const exact = cal.find((e) => e.gw === currentGw);
  if (exact) return exact.monthKey;
  const before = [...cal].reverse().find((e) => e.gw <= currentGw);
  return (before ?? cal[0]).monthKey;
}

/** Slå opp monthKey per GW som et vanlig objekt (praktisk å sende mellom funksjoner). */
export function gwMonthMap(cal: GwCalendarEntry[]): Record<number, string> {
  const out: Record<number, string> = {};
  for (const e of cal) out[e.gw] = e.monthKey;
  return out;
}
