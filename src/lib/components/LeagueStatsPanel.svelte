<script lang="ts">
  import {
    TrendingUp,
    Armchair,
    Percent,
    ArrowUpRight,
    Sparkles,
  } from "lucide-svelte";

  let {
    funStats = null,
  }: {
    funStats?: any;
  } = $props();

  let activeTab = $state<"bench" | "ownership" | "climbers">("bench");
</script>

<div class="rounded-2xl bg-slate-900/70 border border-slate-800 p-4 md:p-5 backdrop-blur-md flex flex-col shrink-0 space-y-3.5 shadow-xl">
  <!-- Topplinje med Faner for Innsiktsmoduler -->
  <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
    <div class="flex items-center gap-2.5">
      <div class="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
        <Sparkles class="w-4 h-4" />
      </div>
      <div>
        <span class="text-sm font-bold text-white tracking-wide block">
          Liga-innsikt & Moro
        </span>
        <span class="text-xs text-slate-400">Statistikk, taktikk og høydepunkter</span>
      </div>
    </div>

    <!-- Faner med tydelig tekst og ikoner -->
    <div class="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold">
      <button
        onclick={() => (activeTab = "bench")}
        class={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
          activeTab === "bench"
            ? "bg-amber-500 text-slate-950 font-bold shadow-md"
            : "text-slate-400 hover:text-white"
        }`}
      >
        <Armchair class="w-3.5 h-3.5" />
        <span>Mest Poeng på Benken</span>
      </button>

      <button
        onclick={() => (activeTab = "ownership")}
        class={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
          activeTab === "ownership"
            ? "bg-fpl-cyan text-slate-950 font-bold shadow-glow-cyan"
            : "text-slate-400 hover:text-white"
        }`}
      >
        <Percent class="w-3.5 h-3.5" />
        <span>Topp 10 Eierskap</span>
      </button>

      <button
        onclick={() => (activeTab = "climbers")}
        class={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
          activeTab === "climbers"
            ? "bg-emerald-400 text-slate-950 font-bold shadow-md"
            : "text-slate-400 hover:text-white"
        }`}
      >
        <TrendingUp class="w-3.5 h-3.5" />
        <span>Rundens Klatrere</span>
      </button>
    </div>
  </div>

  <!-- Innhold 1: Mest poeng på benken -->
  {#if activeTab === "bench"}
    <div class="space-y-2.5 animate-in fade-in duration-150">
      <div class="flex items-center justify-between text-xs text-slate-400">
        <span class="font-bold text-amber-300 flex items-center gap-1.5 text-xs">
          <Armchair class="w-4 h-4 text-amber-400" />
          <span>Benkevarmer-skammen (Mest poeng brent på benken denne runden)</span>
        </span>
        <span class="text-xs text-slate-500 font-mono">Live Gameweek</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {#each (funStats?.benchNightmares || []) as item, idx (item.entryId + '-' + idx)}
          <div class="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 flex flex-col justify-between space-y-2 transition-colors shadow-sm">
            <div class="flex items-center justify-between gap-1">
              <span class="font-bold text-white text-sm truncate">{item.managerName}</span>
              <span class="text-xs font-black font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-800/60 shrink-0">
                {item.benchPoints} pts
              </span>
            </div>

            <div class="text-xs text-slate-300 truncate bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <span class="text-rose-400 font-bold">Benket: </span>
              <span class="text-slate-200">{item.benchedPlayer}</span>
            </div>

            <div class="flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span class="text-amber-400/90 font-semibold">{item.roomName}</span>
              <span class="text-slate-500 truncate max-w-[100px]">{item.teamName}</span>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Innhold 2: Topp 10 Eierskap -->
  {#if activeTab === "ownership"}
    <div class="space-y-2.5 animate-in fade-in duration-150">
      <div class="flex items-center justify-between text-xs text-slate-400">
        <span class="font-bold text-fpl-cyan flex items-center gap-1.5 text-xs">
          <Percent class="w-4 h-4" />
          <span>De 10 Mest Valgte Spillerne i Ligaen</span>
        </span>
        <span class="text-xs text-slate-500 font-mono">% eierskap blant våre managere</span>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {#each (funStats?.topOwnedFootballers || []) as player (player.name)}
          <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 hover:border-slate-700 transition-colors">
            <div class="flex items-center justify-between text-xs">
              <span class="font-bold text-white text-xs truncate">{player.name}</span>
              <span class="text-[11px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800">
                {player.club}
              </span>
            </div>

            <!-- Eierskap bar og tall -->
            <div class="space-y-1">
              <div class="flex items-center justify-between text-xs font-mono">
                <span class="text-slate-400 font-semibold">{player.pos}</span>
                <span class="font-black text-fpl-cyan text-sm">{player.percent}%</span>
              </div>
              <div class="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  class="h-full bg-gradient-to-r from-fpl-cyan to-emerald-400 rounded-full"
                  style={`width: ${player.percent}%`}
                ></div>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Innhold 3: Rundens Klatrere -->
  {#if activeTab === "climbers"}
    <div class="space-y-2.5 animate-in fade-in duration-150">
      <div class="flex items-center justify-between text-xs text-slate-400">
        <span class="font-bold text-emerald-400 flex items-center gap-1.5 text-xs">
          <TrendingUp class="w-4 h-4" />
          <span>Rundens Klatrere (Størst klatring på sammenlagttabellen)</span>
        </span>
        <span class="text-xs text-slate-500 font-mono">Siste runde</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {#each (funStats?.topClimbers || []) as climber, idx (climber.managerName + '-' + idx)}
          <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 space-y-1.5 transition-colors shadow-sm">
            <div class="flex items-center justify-between">
              <span class="font-bold text-white text-xs truncate">{climber.managerName}</span>
              <span class="text-xs font-black font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/60 flex items-center gap-0.5">
                <ArrowUpRight class="w-3.5 h-3.5" />
                <span>+{climber.spotsClimbed}</span>
              </span>
            </div>

            <p class="text-xs text-slate-300 truncate font-medium">{climber.teamName}</p>

            <div class="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800 font-mono">
              <span class="text-slate-400">#{climber.previousRank} ➔ <strong class="text-white">#{climber.currentRank}</strong></span>
              <span class="text-fpl-cyan font-bold">{climber.gwPoints}p</span>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
