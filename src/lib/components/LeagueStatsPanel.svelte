<script lang="ts">
  import {
    TrendingUp,
    TrendingDown,
    Armchair,
    ArrowUpRight,
    ArrowDownRight,
    Sparkles,
    Zap,
    Crown,
    Flame,
    Trophy,
    LineChart,
  } from "lucide-svelte";

  let {
    funStats = null,
    isFullPage = false,
    timeframe = "round",
    onChangeTimeframe = (_t: "round" | "month" | "season") => {},
    onOpenProfile = (_entryId: number) => {},
  }: {
    funStats?: any;
    isFullPage?: boolean;
    timeframe?: "round" | "month" | "season";
    onChangeTimeframe?: (t: "round" | "month" | "season") => void;
    onOpenProfile?: (entryId: number) => void;
  } = $props();

  let activeTab = $state<
    | "captains"
    | "hits"
    | "f1"
    | "bench"
    | "climbers"
    | "rankgraph"
    | "chips"
  >("captains");

  let timeframeLabel = $derived(
    timeframe === "season"
      ? "sesongen så langt"
      : timeframe === "month"
      ? "denne måneden"
      : "denne gameweeken"
  );

  // Rank-graf: modus (spillere/rom), hover-tilstand for prikk-tooltip og
  // fokus fra tegnforklaringen (nøkkel = serie-indeks siden rom deler entryId).
  let graphMode = $state<"players" | "rooms">("players");
  let hover = $state<{
    seriesIdx: number;
    managerName: string;
    teamName: string;
    gw: number;
    rank: number;
    cumNet: number;
    color: string;
    cx: number;
    cy: number;
  } | null>(null);
  let focusIdx = $state<number | null>(null);

  function resetGraphHover() {
    hover = null;
    focusIdx = null;
  }

  function rankTicks(size: number): number[] {
    const ticks = new Set<number>([1, size]);
    const step = Math.max(1, Math.round(size / 6));
    for (let r = 1; r <= size; r += step) ticks.add(r);
    return Array.from(ticks).sort((a, b) => a - b);
  }
</script>

<div class={`${isFullPage ? "h-full flex-1 min-h-0" : "h-[320px] shrink-0"} rounded-2xl bg-white/[0.055] backdrop-blur-sm border border-white/10 p-4 md:p-5 flex flex-col space-y-3.5 shadow-sm overflow-hidden text-[#E2E8F0] font-sans`}>
  <!-- Topplinje med tittel, tidsrom-velger og faner for innsiktsmoduler -->
  <div class="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3 shrink-0">
    <div class="flex items-center gap-3">
      <div class="p-2 rounded-xl bg-[#F4C152]/15 text-[#F4C152] border border-[#F4C152]/30">
        <Sparkles class="w-4 h-4" />
      </div>
      <div>
        <span class="text-sm md:text-base font-bold text-white tracking-wide block leading-tight">
          Ligainnsikt og høydepunkter
        </span>
        <span class="text-xs text-[#AEB9CC]">Moro, taktikk og dyp statistikk for {timeframeLabel}</span>
      </div>
    </div>

    <!-- Tidsrom toggle: Runde / Måned / Sesong -->
    <div class="flex items-center gap-1 p-1 rounded-xl bg-black/20 border border-white/10 text-xs font-semibold">
      <button
        onclick={() => onChangeTimeframe("round")}
        class={`px-3 py-1 rounded-lg transition-colors text-xs ${
          timeframe === "round"
            ? "bg-[#9FE88D] text-[#16380c] font-bold shadow-sm"
            : "text-[#AEB9CC] hover:text-white"
        }`}
      >
        Runde
      </button>

      <button
        onclick={() => onChangeTimeframe("month")}
        class={`px-3 py-1 rounded-lg transition-colors text-xs ${
          timeframe === "month"
            ? "bg-[#9FE88D] text-[#16380c] font-bold shadow-sm"
            : "text-[#AEB9CC] hover:text-white"
        }`}
      >
        Måned
      </button>

      <button
        onclick={() => onChangeTimeframe("season")}
        class={`px-3 py-1 rounded-lg transition-colors text-xs ${
          timeframe === "season"
            ? "bg-[#9FE88D] text-[#16380c] font-bold shadow-sm"
            : "text-[#AEB9CC] hover:text-white"
        }`}
      >
        Sesongen
      </button>
    </div>

    <!-- Faner med DaisyUI Dim stil -->
    <div class="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-black/20 border border-white/10 text-xs font-semibold overflow-x-auto max-w-full custom-scrollbar">
      <button
        onclick={() => (activeTab = "captains")}
        class={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shrink-0 ${
          activeTab === "captains"
            ? "bg-[#F4C152] text-black font-bold shadow-sm"
            : "text-[#AEB9CC] hover:text-white"
        }`}
      >
        <Crown class="w-3.5 h-3.5" />
        <span>Kapteiner</span>
      </button>

      <button
        onclick={() => (activeTab = "hits")}
        class={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shrink-0 ${
          activeTab === "hits"
            ? "bg-[#FB6F84] text-white font-bold shadow-sm"
            : "text-[#AEB9CC] hover:text-white"
        }`}
      >
        <Flame class="w-3.5 h-3.5" />
        <span>Hit hunter</span>
      </button>

      <button
        onclick={() => (activeTab = "f1")}
        class={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shrink-0 ${
          activeTab === "f1"
            ? "bg-[#9FE88D] text-[#16380c] font-bold shadow-sm"
            : "text-[#AEB9CC] hover:text-white"
        }`}
      >
        <Trophy class="w-3.5 h-3.5" />
        <span>Formel 1-tabell</span>
      </button>

      <button
        onclick={() => (activeTab = "bench")}
        class={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shrink-0 ${
          activeTab === "bench"
            ? "bg-[#F4C152] text-black font-bold shadow-sm"
            : "text-[#AEB9CC] hover:text-white"
        }`}
      >
        <Armchair class="w-3.5 h-3.5" />
        <span>Benk-tabber</span>
      </button>

      <button
        onclick={() => (activeTab = "climbers")}
        class={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shrink-0 ${
          activeTab === "climbers"
            ? "bg-[#9FE88D] text-[#16380c] font-bold shadow-sm"
            : "text-[#AEB9CC] hover:text-white"
        }`}
      >
        <TrendingUp class="w-3.5 h-3.5" />
        <span>Klatrere</span>
      </button>

      <button
        onclick={() => (activeTab = "rankgraph")}
        class={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shrink-0 ${
          activeTab === "rankgraph"
            ? "bg-[#70E1F8] text-[#06323d] font-bold shadow-sm"
            : "text-[#AEB9CC] hover:text-white"
        }`}
      >
        <LineChart class="w-3.5 h-3.5" />
        <span>Rank-graf</span>
      </button>

      <button
        onclick={() => (activeTab = "chips")}
        class={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shrink-0 ${
          activeTab === "chips"
            ? "bg-[#F4C152] text-black font-bold shadow-sm"
            : "text-[#AEB9CC] hover:text-white"
        }`}
      >
        <Zap class="w-3.5 h-3.5" />
        <span>Chips</span>
      </button>
    </div>
  </div>

  <!-- Hovedinnhold i innsiktsmodulen -->
  <div class="flex-1 min-h-0 overflow-y-auto pr-1 custom-scrollbar">
    <!-- 1. Captainslotteriet & Captainsblemmen -->
    {#if activeTab === "captains"}
      {@const cap = funStats?.captainStats}
      {#if !cap || ((cap.picks?.length ?? 0) === 0 && (cap.mostCaptained?.length ?? 0) === 0)}
        <div class="h-full flex flex-col items-center justify-center text-center p-6 bg-white/[0.04] rounded-xl border border-white/10 space-y-1.5">
          <Crown class="w-8 h-8 text-[#AEB9CC] mb-1" />
          <p class="text-sm font-bold text-white">Ingen kapteinsvalg registrert for {timeframeLabel}</p>
          <p class="text-xs text-[#AEB9CC]">Kapteinstatistikken oppdateres automatisk så snart runden starter og lineupene er klare.</p>
        </div>
      {:else}
        <div class="grid grid-cols-1 md:grid-cols-12 gap-3.5 h-full min-h-0">
          <!-- Rundens kapteiner -->
          <div class="md:col-span-6 rounded-xl bg-white/[0.04] border border-white/10 flex flex-col min-h-0">
            <div class="flex items-center justify-between px-3 py-2 border-b border-white/10 shrink-0">
              <h4 class="text-[11px] font-bold text-[#9FE88D] uppercase tracking-wider flex items-center gap-1.5">
                <Crown class="w-3.5 h-3.5" />
                <span>Rundens kapteiner{cap.pickGw ? ` · GW${cap.pickGw}` : ""}</span>
              </h4>
              <span class="text-[10px] text-[#AEB9CC] font-mono">{cap.picks?.length ?? 0} valg</span>
            </div>
            <div class="flex-1 min-h-0 overflow-y-auto custom-scrollbar divide-y divide-white/5">
              {#each cap.picks ?? [] as item}
                <div
                  role="button"
                  tabindex="0"
                  onclick={() => onOpenProfile(item.entryId)}
                  onkeydown={(e) => (e.key === "Enter" || e.key === " ") && onOpenProfile(item.entryId)}
                  class="px-3 py-1.5 flex items-center justify-between gap-2 text-xs cursor-pointer hover:bg-white/[0.03] group"
                >
                  <div class="min-w-0 flex items-baseline gap-1.5">
                    <span class="font-bold text-white group-hover:text-[#9FE88D] truncate">{item.managerName}</span>
                    <span class="text-[10px] text-[#AEB9CC] truncate">{item.captainName} (C)</span>
                  </div>
                  <span class="font-mono font-bold text-[#9FE88D] shrink-0">{item.points}p</span>
                </div>
              {/each}
            </div>
          </div>

          <!-- Mest cappa i ligaen (historisk) -->
          <div class="md:col-span-6 rounded-xl bg-white/[0.04] border border-white/10 flex flex-col min-h-0">
            <div class="flex items-center justify-between px-3 py-2 border-b border-white/10 shrink-0">
              <h4 class="text-[11px] font-bold text-[#F4C152] uppercase tracking-wider flex items-center gap-1.5">
                <Crown class="w-3.5 h-3.5" />
                <span>Mest cappa · {timeframeLabel}</span>
              </h4>
              <span class="text-[10px] text-[#AEB9CC] font-mono">{cap.uniqueCaptains ?? 0} ulike</span>
            </div>
            <div class="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-2.5 space-y-2">
              {#each cap.mostCaptained ?? [] as c, idx}
                <div class="text-xs">
                  <div class="flex items-baseline justify-between gap-2 mb-0.5">
                    <span class="truncate">
                      <span class="font-mono text-[10px] text-[#AEB9CC]">#{idx + 1}</span>
                      <span class="font-bold text-white">{c.name}</span>
                      <span class="text-[10px] text-[#AEB9CC]">· {c.avgPoints}p snitt</span>
                    </span>
                    <span class="shrink-0 font-mono font-bold text-[#F4C152]">{c.count}× <span class="text-[10px] text-[#AEB9CC]">({c.percent}%)</span></span>
                  </div>
                  <div class="w-full bg-black/20 h-1.5 rounded-full overflow-hidden border border-white/10">
                    <div class="bg-[#F4C152] h-full rounded-full" style={`width: ${c.percent}%`}></div>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        </div>
      {/if}
    {/if}

    <!-- 2. Hit-kongen & Transfer chaos -->
    {#if activeTab === "hits"}
      <div class="space-y-3.5">
        <div class="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 class="text-sm font-bold text-white flex items-center gap-2">
              <Flame class="w-4 h-4 text-[#FB6F84]" />
              <span>Overgangsspillere og minuspoeng</span>
            </h4>
            <p class="text-xs text-[#AEB9CC]">Totalt har ligaen ofret <strong class="text-[#FB6F84] font-mono">-{funStats?.transferHitStats?.totalLeagueHits || 0} poeng</strong> på ekstra overganger for {timeframeLabel}.</p>
          </div>
        </div>

        {#if !funStats?.transferHitStats?.topHitTakers || funStats.transferHitStats.topHitTakers.length === 0}
          <div class="p-8 text-center bg-white/[0.04] rounded-xl border border-white/10 text-[#AEB9CC] text-xs">
            Ingen i ligaen har tatt transfer hits for {timeframeLabel}. Alle holdt seg innenfor gratisbyttet!
          </div>
        {:else}
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {#each funStats.transferHitStats.topHitTakers as item, idx}
              <div
                role="button"
                tabindex="0"
                onclick={() => onOpenProfile(item.entryId)}
                onkeydown={(e) => (e.key === "Enter" || e.key === " ") && onOpenProfile(item.entryId)}
                class="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 hover:border-[#FB6F84] cursor-pointer group transition-all"
              >
                <div class="flex items-center justify-between mb-1.5 text-xs">
                  <span class="font-bold text-[#FB6F84]">#{idx + 1} Hit hunter</span>
                  <span class="font-mono font-bold text-sm text-[#FB6F84] bg-[#FB6F84]/15 px-2 py-0.5 rounded border border-[#FB6F84]/30">
                    -{item.gwHits}p ({item.hitsCount} {item.hitsCount === 1 ? "ekstrabytte" : "ekstrabyter"})
                  </span>
                </div>
                <h5 class="text-sm font-bold text-white group-hover:text-[#FB6F84] truncate">{item.managerName}</h5>
                <p class="text-xs text-[#AEB9CC] truncate">{item.teamName}</p>
                <div class="mt-2 pt-2 border-t border-white/10 text-[11px] text-[#AEB9CC] flex justify-between">
                  <span>{item.roomName}</span>
                  <span class="font-mono">Totale hits: -{item.totalHits}p</span>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    <!-- Formel 1-Poengtabell -->
    {#if activeTab === "f1"}
      <div class="space-y-3">
        <div class="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Trophy class="w-3.5 h-3.5 text-[#9FE88D]" />
              <span>Formel 1 runderanking</span>
            </h4>
            <p class="text-xs text-[#AEB9CC]">F1-poeng deles ut hver runde (25, 18, 15, 12, 10, 8, 6, 4, 2, 1) og summeres over valgt tidsrom.</p>
          </div>
          <span class="text-[11px] font-mono bg-black/20 px-2.5 py-1 rounded-lg border border-white/10 text-[#9FE88D]">
            F1 Grand Prix system
          </span>
        </div>

        {#if !funStats?.f1Standings || funStats.f1Standings.length === 0}
          <div class="p-8 text-center bg-white/[0.04] rounded-xl border border-white/10 text-[#AEB9CC] text-xs">
            Formel 1-tabellen oppdateres så snart de første poengene registreres i ligaen.
          </div>
        {:else}
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            {#each funStats.f1Standings as f1, idx}
              <div
                role="button"
                tabindex="0"
                onclick={() => onOpenProfile(f1.entryId)}
                onkeydown={(e) => (e.key === "Enter" || e.key === " ") && onOpenProfile(f1.entryId)}
                class={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs cursor-pointer group transition-colors ${
                  idx === 0
                    ? "bg-white/[0.04] border-[#F4C152]/50 hover:border-[#F4C152]"
                    : idx === 1
                    ? "bg-white/[0.04] border-[#CBD5E1]/40 hover:border-[#CBD5E1]"
                    : idx === 2
                    ? "bg-white/[0.04] border-[#D97706]/40 hover:border-[#D97706]"
                    : "bg-white/[0.04] border-white/10 hover:border-[#4B5563]"
                }`}
              >
                <div class="flex items-center gap-2.5 min-w-0">
                  <span class="font-mono font-bold text-xs w-6 text-center shrink-0">
                    {#if idx === 0}
                      🥇
                    {:else if idx === 1}
                      🥈
                    {:else if idx === 2}
                      🥉
                    {:else}
                      #{f1.f1Rank}
                    {/if}
                  </span>

                  <div class="min-w-0">
                    <h5 class="font-bold text-white group-hover:text-[#9FE88D] truncate text-xs">{f1.managerName}</h5>
                    <span class="text-[10px] text-[#AEB9CC] truncate block">{f1.teamName} • {f1.roomName}</span>
                  </div>
                </div>

                <div class="text-right shrink-0">
                  <span class="font-mono font-bold text-sm text-[#9FE88D] block leading-none">
                    {f1.f1Points} F1-poeng
                  </span>
                  <span class="text-[10px] text-[#AEB9CC] font-mono">({f1.fplGwPoints} FPL-poeng · {f1.roundsCounted} GW)</span>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    <!-- Bench warmer-skammen (Mest poeng på benken) -->
    {#if activeTab === "bench"}
      {#if !funStats?.benchNightmares || funStats.benchNightmares.length === 0}
        <div class="h-full flex flex-col items-center justify-center text-center p-6 bg-white/[0.04] rounded-xl border border-white/10 space-y-1.5">
          <Armchair class="w-8 h-8 text-[#AEB9CC] mb-1" />
          <p class="text-sm font-bold text-white">Ingen bench points registrert ennå</p>
          <p class="text-xs text-[#AEB9CC]">Benkestatistikken oppdateres automatisk så snart runder spilles.</p>
        </div>
      {:else}
        {@const benchTotal = funStats.benchNightmares.reduce((s: number, b: { benchPoints: number }) => s + (b.benchPoints ?? 0), 0)}
        <div class="h-full flex flex-col gap-2.5 min-h-0">
          <div class="shrink-0 flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10">
            <h4 class="text-[11px] font-bold text-[#F4C152] uppercase tracking-wider flex items-center gap-1.5">
              <Armchair class="w-3.5 h-3.5" />
              <span>{timeframe === "round" ? "Poeng på benken denne runden" : `Kumulativt tapt på benken · ${timeframeLabel}`}</span>
            </h4>
            <span class="font-mono font-bold text-xs text-[#F4C152]">{benchTotal}p totalt</span>
          </div>
          <div class="flex-1 min-h-0 overflow-y-auto custom-scrollbar rounded-xl bg-white/[0.04] border border-white/10 divide-y divide-white/5">
            {#each funStats.benchNightmares as item, idx}
              <div
                role="button"
                tabindex="0"
                onclick={() => onOpenProfile(item.entryId)}
                onkeydown={(e) => (e.key === "Enter" || e.key === " ") && onOpenProfile(item.entryId)}
                class="px-3 py-2 flex items-center gap-2.5 text-xs cursor-pointer hover:bg-white/[0.03] group"
              >
                <span class="font-mono text-[10px] text-[#AEB9CC] w-5 shrink-0 text-center">#{idx + 1}</span>
                <span class="font-bold text-white group-hover:text-[#F4C152] truncate min-w-0 flex-1">{item.managerName}</span>
                <span class="text-[10px] text-[#AEB9CC] truncate hidden sm:block max-w-[8rem]">{item.teamName}</span>
                <span class="text-[10px] font-mono text-[#AEB9CC] truncate max-w-[6rem] hidden md:block">{item.roomName}</span>
                <span class="font-mono font-bold text-sm text-[#F4C152] shrink-0 w-14 text-right">{item.benchPoints}p</span>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    {/if}

    <!-- Klatrere & Trynere (endring i liga-plassering) -->
    {#if activeTab === "climbers"}
      {#if (!funStats?.topClimbers || funStats.topClimbers.length === 0) && (!funStats?.topFallers || funStats.topFallers.length === 0)}
        <div class="h-full flex flex-col items-center justify-center text-center p-6 bg-white/[0.04] rounded-xl border border-white/10 space-y-1.5">
          <TrendingUp class="w-8 h-8 text-[#AEB9CC] mb-1" />
          <p class="text-sm font-bold text-white">Klatrere og trynerne klargjøres</p>
          <p class="text-xs text-[#AEB9CC]">Beregnes fra endring i liga-plassering når flere runder er ferdigspilt.</p>
        </div>
      {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
          <!-- Klatrere -->
          <div class="p-4 rounded-xl bg-white/[0.04] border border-white/10 space-y-2.5">
            <h4 class="text-xs font-bold text-[#9FE88D] uppercase tracking-wider flex items-center gap-1.5 border-b border-white/10 pb-2">
              <TrendingUp class="w-4 h-4 text-[#9FE88D]" />
              <span>Klatrerne (størst fremgang)</span>
            </h4>
            <div class="space-y-2">
              {#each funStats?.topClimbers || [] as item}
                <div
                  role="button"
                  tabindex="0"
                  onclick={() => onOpenProfile(item.entryId)}
                  onkeydown={(e) => (e.key === "Enter" || e.key === " ") && onOpenProfile(item.entryId)}
                  class="p-2.5 rounded-lg bg-black/20 border border-white/10 hover:border-[#9FE88D] flex items-center justify-between text-xs cursor-pointer group"
                >
                  <div class="min-w-0">
                    <div class="flex items-center gap-1.5">
                      <span class="font-bold text-[#9FE88D] flex items-center">
                        <ArrowUpRight class="w-3.5 h-3.5" /> +{item.delta}
                      </span>
                      <span class="font-bold text-white group-hover:text-[#9FE88D] truncate">{item.managerName}</span>
                    </div>
                    <p class="text-[11px] text-[#AEB9CC] truncate">{item.teamName}</p>
                  </div>
                  <div class="text-right shrink-0 font-mono">
                    <span class="text-white font-bold block">#{item.toRank}</span>
                    <span class="text-[10px] text-[#9FE88D]">fra #{item.fromRank}</span>
                  </div>
                </div>
              {/each}
            </div>
          </div>

          <!-- Trynerne -->
          <div class="p-4 rounded-xl bg-white/[0.04] border border-white/10 space-y-2.5">
            <h4 class="text-xs font-bold text-[#FB6F84] uppercase tracking-wider flex items-center gap-1.5 border-b border-white/10 pb-2">
              <TrendingDown class="w-4 h-4 text-[#FB6F84]" />
              <span>Trynerne (størst fall)</span>
            </h4>
            <div class="space-y-2">
              {#each funStats?.topFallers || [] as item}
                <div
                  role="button"
                  tabindex="0"
                  onclick={() => onOpenProfile(item.entryId)}
                  onkeydown={(e) => (e.key === "Enter" || e.key === " ") && onOpenProfile(item.entryId)}
                  class="p-2.5 rounded-lg bg-black/20 border border-white/10 hover:border-[#FB6F84] flex items-center justify-between text-xs cursor-pointer group"
                >
                  <div class="min-w-0">
                    <div class="flex items-center gap-1.5">
                      <span class="font-bold text-[#FB6F84] flex items-center">
                        <ArrowDownRight class="w-3.5 h-3.5" /> {item.delta}
                      </span>
                      <span class="font-bold text-white group-hover:text-[#FB6F84] truncate">{item.managerName}</span>
                    </div>
                    <p class="text-[11px] text-[#AEB9CC] truncate">{item.teamName}</p>
                  </div>
                  <div class="text-right shrink-0 font-mono">
                    <span class="text-white font-bold block">#{item.toRank}</span>
                    <span class="text-[10px] text-[#FB6F84]">fra #{item.fromRank}</span>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        </div>
      {/if}
    {/if}

    <!-- Rank-graf: liga-plassering per gameweek, én linje per spiller -->
    {#if activeTab === "rankgraph"}
      {@const activeGraph = (graphMode === "rooms" ? funStats?.roomRankGraph : funStats?.rankGraph) ?? []}
      {#if activeGraph.length === 0}
        <div class="h-full flex flex-col gap-3">
          <div class="shrink-0 flex items-center gap-1 p-0.5 rounded-lg bg-black/20 border border-white/10 text-[11px] font-semibold w-fit">
            <button onclick={() => { graphMode = "players"; resetGraphHover(); }} class={`px-2.5 py-1 rounded-md transition-colors ${graphMode === "players" ? "bg-[#70E1F8] text-[#06323d] font-bold" : "text-[#AEB9CC] hover:text-white"}`}>Spillere</button>
            <button onclick={() => { graphMode = "rooms"; resetGraphHover(); }} class={`px-2.5 py-1 rounded-md transition-colors ${graphMode === "rooms" ? "bg-[#70E1F8] text-[#06323d] font-bold" : "text-[#AEB9CC] hover:text-white"}`}>Rom</button>
          </div>
          <div class="flex-1 flex flex-col items-center justify-center text-center p-6 bg-white/[0.04] rounded-xl border border-white/10 space-y-1.5">
            <LineChart class="w-8 h-8 text-[#AEB9CC] mb-1" />
            <p class="text-sm font-bold text-white">Rank-grafen klargjøres</p>
            <p class="text-xs text-[#AEB9CC]">Tegnes så snart minst én gameweek er ferdigspilt og {graphMode === "rooms" ? "rom-snittene" : "poeng"} er registrert i ligaen.</p>
          </div>
        </div>
      {:else}
        {@const gws = (graphMode === "rooms" ? funStats.roomRankGraphGws : funStats.rankGraphGws) ?? []}
        {@const size = Math.max((graphMode === "rooms" ? funStats.roomRankGraphSize : funStats.rankGraphSize) ?? activeGraph.length, 2)}
        {@const VBW = 960}
        {@const VBH = 460}
        {@const padL = 46}
        {@const padR = 18}
        {@const padT = 18}
        {@const padB = 34}
        {@const gwMin = gws[0] ?? 1}
        {@const gwMax = gws[gws.length - 1] ?? gwMin}
        {@const xFor = (gw: number) =>
          gws.length <= 1
            ? padL + (VBW - padL - padR) / 2
            : padL + ((gw - gwMin) / (gwMax - gwMin)) * (VBW - padL - padR)}
        {@const yFor = (rank: number) =>
          padT + ((rank - 1) / (size - 1)) * (VBH - padT - padB)}
        <div class="h-full flex flex-col gap-3">
          <div class="flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div class="flex items-center gap-2.5">
              <h4 class="text-xs font-bold text-[#70E1F8] uppercase tracking-wider flex items-center gap-1.5">
                <LineChart class="w-4 h-4" />
                <span>Rank-graf – {graphMode === "rooms" ? "rommenes" : "spillernes"} plassering per gameweek</span>
              </h4>
              <div class="flex items-center gap-1 p-0.5 rounded-lg bg-black/20 border border-white/10 text-[11px] font-semibold">
                <button onclick={() => { graphMode = "players"; resetGraphHover(); }} class={`px-2.5 py-1 rounded-md transition-colors ${graphMode === "players" ? "bg-[#70E1F8] text-[#06323d] font-bold" : "text-[#AEB9CC] hover:text-white"}`}>Spillere</button>
                <button onclick={() => { graphMode = "rooms"; resetGraphHover(); }} class={`px-2.5 py-1 rounded-md transition-colors ${graphMode === "rooms" ? "bg-[#70E1F8] text-[#06323d] font-bold" : "text-[#AEB9CC] hover:text-white"}`}>Rom</button>
              </div>
            </div>
            <span class="text-[11px] text-[#AEB9CC]">
              {timeframe === "month"
                ? `Viser ${funStats.monthName ?? "måneden"}`
                : "Viser hele sesongen"} · hold over en prikk for detaljer
            </span>
          </div>

          <div class="flex-1 min-h-0 rounded-xl bg-black/20 border border-white/10 p-2">
            <svg
              viewBox={`0 0 ${VBW} ${VBH}`}
              class="w-full h-full"
              preserveAspectRatio="xMidYMid meet"
              role="img"
              aria-label="Rank-graf over plassering per gameweek"
            >
              {#each rankTicks(size) as r}
                <line x1={padL} y1={yFor(r)} x2={VBW - padR} y2={yFor(r)} stroke="#2c3850" stroke-width="1" />
                <text x={padL - 8} y={yFor(r) + 3} text-anchor="end" font-size="11" fill="#AEB9CC" font-family="monospace">#{r}</text>
              {/each}

              {#each gws as gw}
                <line x1={xFor(gw)} y1={padT} x2={xFor(gw)} y2={VBH - padB} stroke="#212c3e" stroke-width="1" />
                <text x={xFor(gw)} y={VBH - padB + 16} text-anchor="middle" font-size="11" fill="#AEB9CC" font-family="monospace">GW{gw}</text>
              {/each}

              {#each activeGraph as g, gi}
                <polyline
                  points={g.points.map((p: { gw: number; rank: number }) => `${xFor(p.gw)},${yFor(p.rank)}`).join(" ")}
                  fill="none"
                  stroke={g.color}
                  stroke-width={focusIdx === gi ? 3.5 : 2}
                  stroke-linejoin="round"
                  stroke-linecap="round"
                  opacity={focusIdx !== null && focusIdx !== gi ? 0.12 : 0.95}
                />
                {#each g.points as p}
                  <circle
                    cx={xFor(p.gw)}
                    cy={yFor(p.rank)}
                    r={hover && hover.seriesIdx === gi && hover.gw === p.gw ? 5.5 : 3.5}
                    fill={g.color}
                    stroke="#141b27"
                    stroke-width="1.5"
                    opacity={focusIdx !== null && focusIdx !== gi ? 0.12 : 1}
                    class={g.entryId ? "cursor-pointer" : ""}
                    role="button"
                    tabindex="-1"
                    aria-label={`${g.managerName}, GW${p.gw}, plass ${p.rank}`}
                    onmouseenter={() =>
                      (hover = {
                        seriesIdx: gi,
                        managerName: g.managerName,
                        teamName: g.teamName,
                        gw: p.gw,
                        rank: p.rank,
                        cumNet: p.cumNet,
                        color: g.color,
                        cx: xFor(p.gw),
                        cy: yFor(p.rank),
                      })}
                    onmouseleave={() => (hover = null)}
                    onclick={() => g.entryId && onOpenProfile(g.entryId)}
                    onkeydown={(e) => (e.key === "Enter" || e.key === " ") && g.entryId && onOpenProfile(g.entryId)}
                  />
                {/each}
              {/each}

              {#if hover}
                {@const tw = 180}
                {@const th = 46}
                {@const tx = Math.min(Math.max(hover.cx - tw / 2, padL), VBW - padR - tw)}
                {@const ty = hover.cy - th - 10 < padT ? hover.cy + 12 : hover.cy - th - 10}
                <g pointer-events="none">
                  <rect x={tx} y={ty} width={tw} height={th} rx="6" fill="#0f1826" stroke={hover.color} stroke-width="1.5" />
                  <text x={tx + 10} y={ty + 18} font-size="12" font-weight="700" fill="#FFFFFF">{hover.managerName}</text>
                  <text x={tx + 10} y={ty + 34} font-size="11" fill="#AEB9CC" font-family="monospace">GW{hover.gw} · #{hover.rank} · {hover.cumNet}p</text>
                </g>
              {/if}
            </svg>
          </div>

          <div class="shrink-0 flex flex-wrap gap-1.5 max-h-[84px] overflow-y-auto pr-1 custom-scrollbar">
            {#each activeGraph as g, gi}
              <button
                type="button"
                onmouseenter={() => (focusIdx = gi)}
                onmouseleave={() => (focusIdx = null)}
                onfocus={() => (focusIdx = gi)}
                onblur={() => (focusIdx = null)}
                onclick={() => g.entryId && onOpenProfile(g.entryId)}
                class={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] transition-colors ${
                  focusIdx === gi
                    ? "bg-white/[0.04] border-[#4B5563] text-white"
                    : "bg-black/20 border-white/10 text-[#AEB9CC] hover:text-white"
                }`}
              >
                <span class="w-2.5 h-2.5 rounded-full shrink-0" style={`background:${g.color}`}></span>
                <span class="font-bold truncate max-w-[130px]">{g.managerName}</span>
              </button>
            {/each}
          </div>
        </div>
      {/if}
    {/if}

    <!-- 10. Chip-statistikk i ligaen -->
    {#if activeTab === "chips"}
      <div class="h-full flex flex-col gap-2.5 min-h-0">
        <!-- Chip-tellere som slanke pills -->
        <div class="shrink-0 flex flex-wrap gap-2">
          {#each [
            { label: "Wildcard", n: funStats?.chipStats?.counts?.wildcard ?? 0, c: "#9FE88D" },
            { label: "Triple Captain", n: funStats?.chipStats?.counts?.tripleCaptain ?? 0, c: "#F4C152" },
            { label: "Free Hit", n: funStats?.chipStats?.counts?.freeHit ?? 0, c: "#70E1F8" },
            { label: "Bench Boost", n: funStats?.chipStats?.counts?.benchBoost ?? 0, c: "#A78BFA" },
          ] as chip}
            <div class="flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10">
              <span class="w-1.5 h-1.5 rounded-full shrink-0" style={`background:${chip.c}`}></span>
              <span class="text-[11px] text-[#AEB9CC]">{chip.label}</span>
              <span class="font-mono font-bold text-xs" style={`color:${chip.c}`}>{chip.n}</span>
            </div>
          {/each}
        </div>

        <!-- Siste spilte chips som kompakt liste -->
        {#if !funStats?.chipStats?.recentPlays || funStats.chipStats.recentPlays.length === 0}
          <div class="flex-1 flex items-center justify-center p-5 bg-white/[0.04] rounded-xl border border-white/10 text-center text-xs text-[#AEB9CC]">
            Ingen chips aktivert i ligaen enda for {timeframeLabel}.
          </div>
        {:else}
          <div class="flex-1 min-h-0 overflow-y-auto custom-scrollbar rounded-xl bg-white/[0.04] border border-white/10 divide-y divide-white/5">
            {#each funStats.chipStats.recentPlays as play}
              <div
                role="button"
                tabindex="0"
                onclick={() => onOpenProfile(play.entryId)}
                onkeydown={(e) => (e.key === "Enter" || e.key === " ") && onOpenProfile(play.entryId)}
                class="px-3 py-2 flex items-center gap-2.5 text-xs cursor-pointer hover:bg-white/[0.03] group"
              >
                <span class="font-mono text-[10px] text-[#F4C152] w-10 shrink-0">GW{play.gameweek}</span>
                <span class="font-bold text-white group-hover:text-[#9FE88D] truncate min-w-0 flex-1">{play.managerName}</span>
                <span class="text-[10px] font-mono text-[#AEB9CC] truncate max-w-[6rem] hidden md:block">{play.roomName}</span>
                <span class="text-[11px] font-semibold text-[#A78BFA] shrink-0">{play.chipName}</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>
