<script lang="ts">
  import { X, Loader2, AlertTriangle } from "lucide-svelte";
  import { useAction } from "$lib/convex.svelte";
  import { api } from "../../../../convex/_generated/api";
  import { POSITION_LABELS, formatPrice, overUnder, pointsPerMillion } from "../../../../convex/playerMath";

  type HistoryRow = {
    round: number;
    opponentId: number;
    wasHome: boolean;
    minutes: number;
    points: number;
    goals: number;
    assists: number;
    xgi: number;
    xg: number;
    xa: number;
  };

  let {
    player,
    clubName = "",
    clubShort = (_id: number) => "",
    onClose = () => {},
    embedded = false,
  }: {
    player: any;
    clubName?: string;
    clubShort?: (id: number) => string;
    onClose?: () => void;
    /** Inni et annet panel: ingen egen ramme eller topptekst (navn og klubb vises utenfor). */
    embedded?: boolean;
  } = $props();

  const historyAction = useAction(api.players.playerHistory);
  let history = $state<HistoryRow[] | null>(null);
  let failed = $state(false);

  // Hent kamp-for-kamp-data ved behov (ikke synket for alle ~670 spillere).
  $effect(() => {
    const id = player.elementId as number;
    let cancelled = false;
    history = null;
    failed = false;
    historyAction
      .execute({ elementId: id })
      .then((rows) => {
        if (!cancelled) history = rows as HistoryRow[];
      })
      .catch(() => {
        if (!cancelled) failed = true;
      });
    return () => {
      cancelled = true;
    };
  });

  let recent = $derived((history ?? []).filter((h) => h.minutes > 0).slice(-10));
  let chartMax = $derived(Math.max(1, ...recent.map((h) => Math.max(h.xgi, h.goals + h.assists))));
  let diff = $derived(overUnder(player));

  const statusLabel: Record<string, string> = {
    a: "Tilgjengelig",
    d: "Tvilsom",
    i: "Skadet",
    s: "Suspendert",
    u: "Utilgjengelig",
    n: "Ikke i troppen",
  };
</script>

<aside class={embedded ? "space-y-4 min-w-0" : "rounded-2xl bg-white/[0.05] border border-white/10 p-4 space-y-4 min-w-0"}>
  {#if !embedded}
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0">
        <h3 class="text-base font-bold text-white truncate">{player.fullName}</h3>
        <p class="text-xs text-[#AEB9CC]">
          {clubName} · {POSITION_LABELS[player.position]} · {formatPrice(player.cost)}
        </p>
      </div>
      <button
        type="button"
        onclick={onClose}
        class="p-1 rounded-lg text-[#AEB9CC] hover:text-white hover:bg-white/10 transition-colors shrink-0"
        aria-label="Lukk spillerdetaljer"
      >
        <X class="w-4 h-4" />
      </button>
    </div>
  {/if}

  {#if player.news && !embedded}
    <div class="flex items-start gap-2 text-xs p-2 rounded-lg bg-[#F4C152]/10 border border-[#F4C152]/30 text-[#F4C152]">
      <AlertTriangle class="w-3.5 h-3.5 mt-0.5 shrink-0" />
      <span>{player.news}</span>
    </div>
  {:else if !player.news}
    <p class="text-xs text-[#AEB9CC]">{statusLabel[player.status] ?? player.status}</p>
  {/if}

  <dl class="grid grid-cols-3 gap-2 text-center">
    {#each [
      { l: "Poeng", v: player.totalPoints },
      { l: "Form", v: player.form.toFixed(1) },
      { l: "Eid av", v: `${player.selectedBy.toFixed(1)}%` },
      { l: "xG", v: player.xg.toFixed(2) },
      { l: "xA", v: player.xa.toFixed(2) },
      { l: "xGI", v: player.xgi.toFixed(2) },
      { l: "Mål + assist", v: player.goals + player.assists },
      { l: "Over/under", v: (diff > 0 ? "+" : "") + diff.toFixed(2) },
      { l: "Poeng/£m", v: pointsPerMillion(player.totalPoints, player.cost).toFixed(1) },
    ] as stat}
      <div class="rounded-lg bg-black/20 border border-white/10 py-1.5">
        <dt class="text-[10px] uppercase tracking-wider text-[#AEB9CC]">{stat.l}</dt>
        <dd class="text-sm font-mono font-bold text-white">{stat.v}</dd>
      </div>
    {/each}
  </dl>

  <div class="space-y-2">
    <h4 class="text-[11px] font-bold uppercase tracking-wider text-[#70E1F8]">
      Siste kamper: xGI mot faktiske mål + assist
    </h4>

    {#if failed}
      <p class="text-xs text-[#FB6F84]">Kunne ikke hente kampdata fra FPL akkurat nå.</p>
    {:else if history === null}
      <p class="text-xs text-[#AEB9CC] flex items-center gap-2">
        <Loader2 class="w-3.5 h-3.5 animate-spin" /> Henter kampdata…
      </p>
    {:else if recent.length === 0}
      <p class="text-xs text-[#AEB9CC]">Ingen spilte kamper ennå denne sesongen.</p>
    {:else}
      <div class="flex items-end gap-1.5 h-24" role="img" aria-label="xGI og faktiske mål og assist per kamp">
        {#each recent as h (h.round)}
          <div class="flex-1 min-w-0 flex flex-col items-center gap-1" title={`GW ${h.round} mot ${clubShort(h.opponentId)}: xGI ${h.xgi.toFixed(2)}, mål+assist ${h.goals + h.assists}, ${h.points} p`}>
            <div class="flex items-end gap-0.5 h-20 w-full justify-center">
              <div class="w-2 rounded-t bg-[#70E1F8]" style={`height: ${Math.max(2, (h.xgi / chartMax) * 100)}%`}></div>
              <div class="w-2 rounded-t bg-[#9FE88D]" style={`height: ${Math.max(2, ((h.goals + h.assists) / chartMax) * 100)}%`}></div>
            </div>
            <span class="text-[9px] font-mono text-[#AEB9CC]">{h.round}</span>
          </div>
        {/each}
      </div>
      <div class="flex items-center gap-3 text-[10px] text-[#AEB9CC]">
        <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-sm bg-[#70E1F8]"></span>xGI</span>
        <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-sm bg-[#9FE88D]"></span>Mål + assist</span>
        <span class="ml-auto">x-akse: GW</span>
      </div>
    {/if}
  </div>
</aside>
