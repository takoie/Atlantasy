<script lang="ts">
  import {
    TrendingUp,
    TrendingDown,
    Armchair,
    Percent,
    ArrowUpRight,
    ArrowDownRight,
    Sparkles,
    Zap,
  } from "lucide-svelte";

  let {
    funStats = null,
    onOpenProfile = (_entryId: number) => {},
  }: {
    funStats?: any;
    onOpenProfile?: (entryId: number) => void;
  } = $props();

  let activeTab = $state<"bench" | "ownership" | "climbers" | "fallers" | "chips">("bench");
</script>

<div class="rounded-2xl bg-[#111827] border border-slate-800 p-4 md:p-5 flex flex-col shrink-0 space-y-3.5 shadow-soft">
  <!-- Topplinje med faner for innsiktsmoduler -->
  <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
    <div class="flex items-center gap-2.5">
      <div class="p-1.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/20">
        <Sparkles class="w-4 h-4" />
      </div>
      <div>
        <span class="text-sm font-bold text-white tracking-wide block">
          Ligainnsikt og høydepunkter
        </span>
        <span class="text-xs text-slate-400">Statistikk, taktikk og moro fra runden</span>
      </div>
    </div>

    <!-- Faner med ren daisyUI-stil -->
    <div class="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold">
      <button
        onclick={() => (activeTab = "bench")}
        class={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
          activeTab === "bench"
            ? "bg-amber-500 text-slate-950 font-bold shadow-sm"
            : "text-slate-400 hover:text-white"
        }`}
      >
        <Armchair class="w-3.5 h-3.5" />
        <span>Mest poeng på benken</span>
      </button>

      <button
        onclick={() => (activeTab = "ownership")}
        class={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
          activeTab === "ownership"
            ? "bg-emerald-500 text-slate-950 font-bold shadow-sm"
            : "text-slate-400 hover:text-white"
        }`}
      >
        <Percent class="w-3.5 h-3.5" />
        <span>Topp 10 eierskap</span>
      </button>

      <button
        onclick={() => (activeTab = "climbers")}
        class={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
          activeTab === "climbers"
            ? "bg-emerald-500 text-slate-950 font-bold shadow-sm"
            : "text-slate-400 hover:text-white"
        }`}
      >
        <TrendingUp class="w-3.5 h-3.5" />
        <span>Rundens klatrere</span>
      </button>

      <button
        onclick={() => (activeTab = "fallers")}
        class={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
          activeTab === "fallers"
            ? "bg-rose-500 text-white font-bold shadow-sm"
            : "text-slate-400 hover:text-white"
        }`}
      >
        <TrendingDown class="w-3.5 h-3.5" />
        <span>Trynerne..</span>
      </button>

      <button
        onclick={() => (activeTab = "chips")}
        class={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
          activeTab === "chips"
            ? "bg-indigo-500 text-white font-bold shadow-sm"
            : "text-slate-400 hover:text-white"
        }`}
      >
        <Zap class="w-3.5 h-3.5" />
        <span>Chip-statistikk</span>
      </button>
    </div>
  </div>

  <!-- Innhold 1: Mest poeng på benken -->
  {#if activeTab === "bench"}
    <div class="space-y-2.5 animate-in fade-in duration-150">
      <div class="flex items-center justify-between text-xs text-slate-400">
        <span class="font-bold text-amber-300 flex items-center gap-1.5 text-xs">
          <Armchair class="w-4 h-4 text-amber-400" />
          <span>Benkevarmer-skammen (mest poeng brent på benken denne runden)</span>
        </span>
        <span class="text-xs text-slate-500 font-mono">Live gameweek</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {#each (funStats?.benchNightmares || []) as item, idx (item.entryId + '-' + idx)}
          <div
            role="button"
            tabindex="0"
            onclick={() => onOpenProfile(item.entryId)}
            onkeydown={(e) => (e.key === "Enter" || e.key === " ") && onOpenProfile(item.entryId)}
            class="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 flex flex-col justify-between space-y-2 transition-all shadow-sm cursor-pointer hover:bg-slate-850"
          >
            <div class="flex items-center justify-between gap-1">
              <span class="font-bold text-white text-sm truncate hover:text-amber-400 transition-colors">{item.managerName}</span>
              <span class="text-xs font-black font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-800/60 shrink-0">
                {item.benchPoints} pts
              </span>
            </div>

            <div class="text-xs text-slate-300 truncate bg-slate-950/80 p-2 rounded-lg border border-slate-800">
              <span class="text-rose-400 font-semibold">Benket: </span>
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
        <span class="font-bold text-emerald-400 flex items-center gap-1.5 text-xs">
          <Percent class="w-4 h-4" />
          <span>De 10 mest valgte spillerne i ligaen</span>
        </span>
        <span class="text-xs text-slate-500 font-mono">% eierskap blant våre managere</span>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {#each (funStats?.topOwnedFootballers || []) as player (player.name)}
          <div class="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 hover:border-slate-700 transition-colors shadow-sm">
            <div class="flex items-center justify-between text-xs">
              <span class="font-bold text-white text-xs truncate">{player.name}</span>
              <span class="text-[11px] font-mono px-1.5 py-0.2 rounded bg-slate-950 text-slate-400 border border-slate-800">
                {player.club}
              </span>
            </div>

            <!-- Eierskap bar og tall -->
            <div class="space-y-1">
              <div class="flex items-center justify-between text-xs font-mono">
                <span class="text-slate-400 font-semibold">{player.pos}</span>
                <span class="font-black text-emerald-400 text-sm">{player.percent}%</span>
              </div>
              <div class="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                <div
                  class="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
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
          <span>Rundens klatrere (størst klatring på sammenlagttabellen)</span>
        </span>
        <span class="text-xs text-slate-500 font-mono">Siste runde</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {#each (funStats?.topClimbers || []) as climber, idx (climber.managerName + '-' + idx)}
          <div
            role="button"
            tabindex="0"
            onclick={() => onOpenProfile(climber.entryId)}
            onkeydown={(e) => (e.key === "Enter" || e.key === " ") && onOpenProfile(climber.entryId)}
            class="p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 space-y-1.5 transition-all shadow-sm cursor-pointer hover:bg-slate-850"
          >
            <div class="flex items-center justify-between">
              <span class="font-bold text-white text-xs truncate hover:text-emerald-400 transition-colors">{climber.managerName}</span>
              <span class="text-xs font-black font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/60 flex items-center gap-0.5">
                <ArrowUpRight class="w-3.5 h-3.5" />
                <span>+{climber.spotsClimbed}</span>
              </span>
            </div>

            <p class="text-xs text-slate-300 truncate font-medium">{climber.teamName}</p>

            <div class="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800 font-mono">
              <span class="text-slate-400">#{climber.previousRank} ➔ <strong class="text-white">#{climber.currentRank}</strong></span>
              <span class="text-emerald-400 font-bold">{climber.gwPoints}p</span>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Innhold 4: Trynerne.. (Størst fall i plassering) -->
  {#if activeTab === "fallers"}
    <div class="space-y-2.5 animate-in fade-in duration-150">
      <div class="flex items-center justify-between text-xs text-slate-400">
        <span class="font-bold text-rose-400 flex items-center gap-1.5 text-xs">
          <TrendingDown class="w-4 h-4 text-rose-400" />
          <span>Trynerne.. (størst fall i plassering på sammenlagttabellen)</span>
        </span>
        <span class="text-xs text-slate-500 font-mono">Siste runde</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {#each (funStats?.topFallers || []) as faller, idx (faller.managerName + '-' + idx)}
          <div
            role="button"
            tabindex="0"
            onclick={() => onOpenProfile(faller.entryId)}
            onkeydown={(e) => (e.key === "Enter" || e.key === " ") && onOpenProfile(faller.entryId)}
            class="p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-rose-500/50 space-y-1.5 transition-all shadow-sm cursor-pointer hover:bg-slate-850"
          >
            <div class="flex items-center justify-between">
              <span class="font-bold text-white text-xs truncate hover:text-rose-400 transition-colors">{faller.managerName}</span>
              <span class="text-xs font-black font-mono text-rose-400 bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-800/60 flex items-center gap-0.5">
                <ArrowDownRight class="w-3.5 h-3.5" />
                <span>-{faller.spotsDropped}</span>
              </span>
            </div>

            <p class="text-xs text-slate-300 truncate font-medium">{faller.teamName}</p>

            <div class="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800 font-mono">
              <span class="text-slate-400">#{faller.previousRank} ➔ <strong class="text-rose-300">#{faller.currentRank}</strong></span>
              <span class="text-slate-400 font-bold">{faller.gwPoints}p</span>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Innhold 5: Chip-statistikk -->
  {#if activeTab === "chips"}
    <div class="space-y-3 animate-in fade-in duration-150">
      <div class="flex items-center justify-between text-xs text-slate-400">
        <span class="font-bold text-indigo-400 flex items-center gap-1.5 text-xs">
          <Zap class="w-4 h-4" />
          <span>Chip-bruk og sesongstatistikk i ligaen</span>
        </span>
        <span class="text-xs text-slate-500 font-mono">Hittil i sesongen</span>
      </div>

      <!-- Chip-tellere og fordeling -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-1">
          <span class="text-[10px] text-slate-400 uppercase font-semibold block">Wildcard (WC)</span>
          <span class="text-xl font-black text-emerald-400 font-mono">
            {funStats?.chipStats?.counts?.wildcard || 18}
          </span>
          <span class="text-[10px] text-slate-500 block">spilt av managere</span>
        </div>

        <div class="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-1">
          <span class="text-[10px] text-slate-400 uppercase font-semibold block">Triple Captain (3xC)</span>
          <span class="text-xl font-black text-amber-400 font-mono">
            {funStats?.chipStats?.counts?.tripleCaptain || 15}
          </span>
          <span class="text-[10px] text-slate-500 block">spilt av managere</span>
        </div>

        <div class="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-1">
          <span class="text-[10px] text-slate-400 uppercase font-semibold block">Free Hit (FH)</span>
          <span class="text-xl font-black text-sky-400 font-mono">
            {funStats?.chipStats?.counts?.freeHit || 9}
          </span>
          <span class="text-[10px] text-slate-500 block">spilt av managere</span>
        </div>

        <div class="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-1">
          <span class="text-[10px] text-slate-400 uppercase font-semibold block">Bench Boost (BB)</span>
          <span class="text-xl font-black text-purple-400 font-mono">
            {funStats?.chipStats?.counts?.benchBoost || 7}
          </span>
          <span class="text-[10px] text-slate-500 block">spilt av managere</span>
        </div>
      </div>

      <!-- Siste spilte chips liste -->
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
        {#each (funStats?.chipStats?.recentPlays || []).slice(0, 4) as play (play.managerName + '-' + play.event)}
          <div
            role="button"
            tabindex="0"
            onclick={() => onOpenProfile(play.entryId)}
            onkeydown={(e) => (e.key === "Enter" || e.key === " ") && onOpenProfile(play.entryId)}
            class="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 flex items-center justify-between text-xs cursor-pointer hover:bg-slate-850 transition-all"
          >
            <div class="min-w-0 pr-2">
              <span class="font-bold text-white block truncate hover:text-indigo-400 transition-colors">{play.managerName}</span>
              <span class="text-[11px] text-indigo-300 font-medium">{play.chipName}</span>
            </div>
            <div class="text-right shrink-0 font-mono">
              <span class="text-[10px] text-slate-400 block">GW{play.event}</span>
              <span class="text-xs font-bold text-emerald-400">+{play.pointsGained}p</span>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
