<script lang="ts">
  import { onMount } from "svelte";
  import { RefreshCw } from "lucide-svelte";
  import LeagueStatsPanel from "./LeagueStatsPanel.svelte";
  import PlayerAnalysis from "./analysis/PlayerAnalysis.svelte";
  import PriceTracker from "./analysis/PriceTracker.svelte";
  import { useQuery, useAction } from "$lib/convex.svelte";
  import { api } from "../../../convex/_generated/api";

  let {
    tab = "league",
    funStats = null,
    timeframe = "round",
    onChangeTimeframe = (_t: "round" | "month" | "season") => {},
    onOpenProfile = (_entryId: number) => {},
  }: {
    tab?: "league" | "players" | "prices";
    funStats?: any;
    timeframe?: "round" | "month" | "season";
    onChangeTimeframe?: (t: "round" | "month" | "season") => void;
    onOpenProfile?: (entryId: number) => void;
  } = $props();

  // Valgt fane styres av sidemenyen (Analyse → Ligainnsikt / Spilleranalyse / Priser).
  let activeTab = $derived(tab);

  // Spillerdata hentes først når en av spillerfanene åpnes (ikke ved hver visning av Analyse).
  let needsPlayers = $derived(activeTab !== "league");
  const playersQuery = useQuery(api.players.listPlayers, () => (needsPlayers ? {} : undefined));
  const moversQuery = useQuery(api.players.listPriceMovers, () =>
    activeTab === "prices" ? {} : undefined
  );
  const changesQuery = useQuery(api.players.recentPriceChanges, () =>
    activeTab === "prices" ? { limit: 80 } : undefined
  );
  const syncStatusQuery = useQuery(api.players.syncStatus, () => (needsPlayers ? {} : undefined));
  const refreshAction = useAction(api.players.refresh);

  let players = $derived(playersQuery.data?.players ?? []);
  let clubs = $derived(playersQuery.data?.clubs ?? []);
  let syncedAt = $derived(syncStatusQuery.data?.syncedAt ?? null);
  let lastError = $derived(syncStatusQuery.data?.lastError ?? null);

  // Første gang katalogen er tom: be serveren synke nå i stedet for å vente på cron.
  let triedInitialRefresh = false;
  $effect(() => {
    if (playersQuery.data && players.length === 0 && !triedInitialRefresh) {
      triedInitialRefresh = true;
      refreshAction.execute({}).catch(() => {});
    }
  });

  let now = $state(Date.now());
  onMount(() => {
    const t = setInterval(() => (now = Date.now()), 30_000);
    return () => clearInterval(t);
  });

  let updatedLabel = $derived.by(() => {
    if (!syncedAt) return "Ikke synket ennå";
    const mins = Math.max(0, Math.round((now - syncedAt) / 60_000));
    if (mins < 1) return "Oppdatert nå";
    if (mins < 60) return `Oppdatert for ${mins} min siden`;
    return `Oppdatert ${new Date(syncedAt).toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" })}`;
  });
</script>

<div class="h-full min-h-0 flex flex-col gap-3">
  {#if activeTab !== "league"}
    <div class="flex flex-wrap items-center justify-between gap-2 shrink-0">
      <h2 class="text-sm font-bold text-white">
        {activeTab === "players" ? "Spilleranalyse" : "Priser"}
      </h2>
      <div class="flex items-center gap-2 text-[11px] text-[#AEB9CC]">
        {#if lastError}
          <span class="text-[#F4C152]" title={lastError}>Siste synk feilet – viser eldre data</span>
        {/if}
        <span>{updatedLabel}</span>
        <button
          type="button"
          onclick={() => refreshAction.execute({}).catch(() => {})}
          disabled={refreshAction.isPending}
          class="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/10 text-[#E2E8F0] transition-colors disabled:opacity-50"
          title="Hent ferske data fra FPL"
          aria-label="Oppdater spillerdata"
        >
          <RefreshCw class={`w-3.5 h-3.5 ${refreshAction.isPending ? "animate-spin" : ""}`} />
        </button>
      </div>
    </div>
  {/if}

  <div class="flex-1 min-h-0">
    {#if activeTab === "league"}
      <LeagueStatsPanel isFullPage={true} {funStats} {timeframe} {onChangeTimeframe} {onOpenProfile} />
    {:else if activeTab === "players"}
      <PlayerAnalysis {players} {clubs} />
    {:else}
      <PriceTracker {players} {clubs} movers={moversQuery.data?.players ?? []} changes={changesQuery.data ?? []} />
    {/if}
  </div>
</div>
