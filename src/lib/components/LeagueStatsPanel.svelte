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

<div class="rounded-2xl bg-slate-900/40 border border-slate-800/80 p-3.5 backdrop-blur-md flex flex-col shrink-0 space-y-3">
  <!-- Topplinje med Faner for Innsiktsmoduler -->
  <div class="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
    <div class="flex items-center gap-2">
      <div class="p-1 rounded-lg bg-amber-500/20 text-amber-300">
        <Sparkles class="w-3.5 h-3.5" />
      </div>
      <span class="text-xs font-bold text-white uppercase tracking-wider">Liga-innsikt & Moro</span>
    </div>

    <!-- Faner -->
    <div class="flex items-center gap-1 p-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-semibold">
      <button
        onclick={() => (activeTab = "bench")}
        class={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
          activeTab === "bench"
            ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold"
            : "text-slate-400 hover:text-white"
        }`}
      >
        <Armchair class="w-3 h-3" />
        <span>Benkepoeng</span>
      </button>

      <button
        onclick={() => (activeTab = "ownership")}
        class={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
          activeTab === "ownership"
            ? "bg-fpl-cyan/20 text-fpl-cyan border border-fpl-cyan/40 font-bold"
            : "text-slate-400 hover:text-white"
        }`}
      >
        <Percent class="w-3 h-3" />
        <span>Topp 10 Eierskap</span>
      </button>

      <button
        onclick={() => (activeTab = "climbers")}
        class={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
          activeTab === "climbers"
            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold"
            : "text-slate-400 hover:text-white"
        }`}
      >
        <TrendingUp class="w-3 h-3" />
        <span>Rundens Klatrere</span>
      </button>
    </div>
  </div>

  <!-- Innhold 1: Mest poeng på benken -->
  {#if activeTab === "bench"}
    <div class="space-y-2 animate-in fade-in duration-150">
      <div class="flex items-center justify-between text-[11px] text-slate-400 pb-1">
        <span class="font-bold text-amber-300/90 flex items-center gap-1">
          <Armchair class="w-3.5 h-3.5 text-amber-400" />
          <span>Benkevarmer-skammen (Mest poeng på benken)</span>
        </span>
        <span class="text-[10px] text-slate-500">Gameweek Live</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
        {#each (funStats?.benchNightmares || []) as item, idx (item.entryId + '-' + idx)}
          <div class="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-col justify-between space-y-1.5 hover:border-amber-500/40 transition-colors">
            <div class="flex items-center justify-between">
              <span class="font-bold text-white text-xs truncate">{item.managerName}</span>
              <span class="text-xs font-black font-mono text-amber-400 bg-amber-950/40 px-1.5 py-0.2 rounded border border-amber-800/40">
                {item.benchPoints}p
              </span>
            </div>

            <div class="text-[10px] text-slate-400 truncate">
              <span class="text-rose-400 font-semibold">Benket: </span>
              <span>{item.benchedPlayer}</span>
            </div>

            <span class="text-[9px] text-slate-500 font-mono truncate">{item.roomName}</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Innhold 2: Topp 10 Eierskap -->
  {#if activeTab === "ownership"}
    <div class="space-y-2 animate-in fade-in duration-150">
      <div class="flex items-center justify-between text-[11px] text-slate-400 pb-1">
        <span class="font-bold text-fpl-cyan flex items-center gap-1">
          <Percent class="w-3.5 h-3.5" />
          <span>Topp 10 Mest Valgte Spillere i Ligaen</span>
        </span>
        <span class="text-[10px] text-slate-500">% av ligaens managere</span>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {#each (funStats?.topOwnedFootballers || []) as player (player.name)}
          <div class="p-2 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1.5">
            <div class="flex items-center justify-between text-xs">
              <span class="font-bold text-white truncate text-[11px]">{player.name}</span>
              <span class="text-[9px] font-mono text-slate-400">{player.club}</span>
            </div>

            <!-- Eierskap bar -->
            <div class="space-y-0.5">
              <div class="flex items-center justify-between text-[10px] font-mono">
                <span class="text-slate-400">{player.pos}</span>
                <span class="font-bold text-fpl-cyan">{player.percent}%</span>
              </div>
              <div class="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
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
    <div class="space-y-2 animate-in fade-in duration-150">
      <div class="flex items-center justify-between text-[11px] text-slate-400 pb-1">
        <span class="font-bold text-emerald-400 flex items-center gap-1">
          <TrendingUp class="w-3.5 h-3.5" />
          <span>Rundens Klatrere (Størst framgang i plassering)</span>
        </span>
        <span class="text-[10px] text-slate-500">Siste runde</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {#each (funStats?.topClimbers || []) as climber, idx (climber.managerName + '-' + idx)}
          <div class="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1 hover:border-emerald-500/40 transition-colors">
            <div class="flex items-center justify-between">
              <span class="font-bold text-white text-xs truncate">{climber.managerName}</span>
              <span class="text-xs font-black font-mono text-emerald-400 flex items-center gap-0.5">
                <ArrowUpRight class="w-3.5 h-3.5" />
                <span>+{climber.spotsClimbed}</span>
              </span>
            </div>

            <p class="text-[10px] text-slate-400 truncate">{climber.teamName}</p>

            <div class="text-[9px] text-slate-500 flex items-center justify-between pt-0.5 border-t border-slate-800/60 font-mono">
              <span>#{climber.previousRank} ➔ #{climber.currentRank}</span>
              <span class="text-fpl-cyan font-bold">{climber.gwPoints} pts</span>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
