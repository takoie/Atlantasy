/**
 * Rene hjelpefunksjoner for spilleranalyse. Ingen Convex-avhengigheter, slik at
 * både serveren (synk) og klienten (tabell/sortering) bruker samme regnestykke
 * og funksjonene kan testes isolert.
 */

export type PriceProjection = { offset: number; percent: number; likelihood: number };

export type PlayerRow = {
  elementId: number;
  webName: string;
  fullName: string;
  clubId: number;
  position: number;
  cost: number;
  costChangeStart: number;
  costChangeEvent: number;
  selectedBy: number;
  transfersInEvent: number;
  transfersOutEvent: number;
  totalPoints: number;
  eventPoints: number;
  form: number;
  pointsPerGame: number;
  epNext: number;
  minutes: number;
  starts: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  bonus: number;
  xg: number;
  xa: number;
  xgi: number;
  xgc: number;
  xgPer90: number;
  xaPer90: number;
  xgiPer90: number;
  xgcPer90: number;
  ict: number;
  defCon: number;
  defConPer90: number;
  status: string;
  news: string;
  chanceNextRound?: number;
  priceChangePercent: number;
  priceProjections: PriceProjection[];
};

/** FPL leverer mange tall som strenger ("5.67"), andre som null. */
export function num(x: unknown): number {
  if (typeof x === "number") return Number.isFinite(x) ? x : 0;
  if (typeof x === "string") {
    const n = parseFloat(x);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/** Bootstrap-static `elements[]`-oppføring -> rad vi lagrer. */
export function toPlayerRow(el: any): PlayerRow {
  const chance = el.chance_of_playing_next_round;
  return {
    elementId: num(el.id),
    webName: String(el.web_name ?? ""),
    fullName: `${el.first_name ?? ""} ${el.second_name ?? ""}`.trim(),
    clubId: num(el.team),
    position: num(el.element_type),
    cost: num(el.now_cost),
    costChangeStart: num(el.cost_change_start),
    costChangeEvent: num(el.cost_change_event),
    selectedBy: num(el.selected_by_percent),
    transfersInEvent: num(el.transfers_in_event),
    transfersOutEvent: num(el.transfers_out_event),
    totalPoints: num(el.total_points),
    eventPoints: num(el.event_points),
    form: num(el.form),
    pointsPerGame: num(el.points_per_game),
    epNext: num(el.ep_next),
    minutes: num(el.minutes),
    starts: num(el.starts),
    goals: num(el.goals_scored),
    assists: num(el.assists),
    cleanSheets: num(el.clean_sheets),
    bonus: num(el.bonus),
    xg: num(el.expected_goals),
    xa: num(el.expected_assists),
    xgi: num(el.expected_goal_involvements),
    xgc: num(el.expected_goals_conceded),
    xgPer90: num(el.expected_goals_per_90),
    xaPer90: num(el.expected_assists_per_90),
    xgiPer90: num(el.expected_goal_involvements_per_90),
    xgcPer90: num(el.expected_goals_conceded_per_90),
    ict: num(el.ict_index),
    defCon: num(el.defensive_contribution),
    defConPer90: num(el.defensive_contribution_per_90),
    status: String(el.status ?? "a"),
    news: String(el.news ?? ""),
    ...(typeof chance === "number" ? { chanceNextRound: chance } : {}),
    priceChangePercent: num(el.price_change_percent),
    priceProjections: Array.isArray(el.price_change_projections)
      ? el.price_change_projections.map((p: any) => ({
          offset: num(p.offset),
          percent: num(p.projected_percent),
          likelihood: num(p.likelihood),
        }))
      : [],
  };
}

/** Sant hvis lagret rad må oppdateres – unngår unødvendige skriv (og klient-reruns). */
export function rowChanged(stored: PlayerRow, next: PlayerRow): boolean {
  const keys = new Set([...Object.keys(stored), ...Object.keys(next)]) as Set<keyof PlayerRow>;
  for (const key of keys) {
    const a = stored[key];
    const b = next[key];
    if (key === "priceProjections") {
      if (JSON.stringify(a ?? []) !== JSON.stringify(b ?? [])) return true;
    } else if (a !== b) {
      return true;
    }
  }
  return false;
}

/** Prisendring mellom to synker, eller null. Verdiene er i tidels millioner. */
export function detectPriceChange(
  oldCost: number,
  newCost: number
): { oldCost: number; newCost: number; delta: number } | null {
  if (oldCost === newCost) return null;
  return { oldCost, newCost, delta: newCost - oldCost };
}

/**
 * Over-/underprestasjon: faktiske mål + assist minus forventede (xGI).
 * Positiv = scorer mer enn sjansene tilsier (kan regressere), negativ = uflaks (kan ta seg opp).
 */
export function overUnder(p: { goals: number; assists: number; xgi: number }): number {
  return Math.round((p.goals + p.assists - p.xgi) * 100) / 100;
}

/** Poeng per million (cost er i tidels millioner). */
export function pointsPerMillion(totalPoints: number, cost: number): number {
  return cost > 0 ? Math.round((totalPoints / (cost / 10)) * 10) / 10 : 0;
}

/** Hvor mange prisendringer (±) som er prognosert, ut fra FPLs likelihood-skala. */
export function priceDirection(p: { priceChangePercent: number; priceProjections: PriceProjection[] }): "rise" | "fall" | null {
  const tonight = p.priceProjections.find((x) => x.offset === 0);
  const likelihood = tonight?.likelihood ?? 0;
  if (likelihood >= 3) return "rise";
  if (likelihood <= -3) return "fall";
  return null;
}

export const POSITION_LABELS: Record<number, string> = { 1: "GKP", 2: "DEF", 3: "MID", 4: "FWD" };

/** Formatterer tidels millioner som "£15.7m". */
export function formatPrice(cost: number): string {
  return `£${(cost / 10).toFixed(1)}m`;
}
