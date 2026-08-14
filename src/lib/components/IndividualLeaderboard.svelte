<script lang="ts">
  import {
    Users,
    TrendingUp,
    Zap,
    Calendar,
  } from "lucide-svelte";

  let {
    players = [],
    currentGw: _currentGw = 26,
    deductHits = true,
    sortBy = "live",
    onSelectSort = (_sort: string) => {},
    onOpenProfile = (_entryId: number) => {},
  }: {
    players?: any[];
    currentGw?: number;
    deductHits?: boolean;
    sortBy?: string;
    onSelectSort?: (sort: string) => void;
    onOpenProfile?: (entryId: number) => void;
  } = $props();
</script>

<div class="flex-1 flex flex-col h-full overflow-hidden bg-slate-900/40 rounded-2xl border border-slate-800/80 p-3.5 backdrop-blur-md">
  <!-- Header -->
  <div class="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800 shrink-0">
    <div class="flex items-center gap-2">
      <div class="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
        <Users class="w-4 h-4" />
      </div>
      <div>
        <h2 class="text-sm font-bold text-white flex items-center gap-1.5">
          <span>Individuell Ledertavle</span>
          <span class="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
            {players.length} spillere
          </span>
        </h2>
        <p class="text-[11px] text-slate-400">
          {sortBy === "season" ? "Sesong totalt" : sortBy === "month" ? "Måned totalt" : "Live runde"}
        </p>
      </div>
    </div>

    <!-- 3-veis Sorterings-knapper (Live | Måned | Total) -->
    <div class="flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px]">
      <button
        onclick={() => onSelectSort("live")}
        class={`px-2 py-1 rounded font-semibold transition-colors flex items-center gap-1 ${
          sortBy === "live"
            ? "bg-fpl-cyan text-slate-950 font-bold shadow-glow-cyan"
            : "text-slate-400 hover:text-white"
        }`}
      >
        <Zap class="w-3 h-3" />
        <span>Live</span>
      </button>

      <button
        onclick={() => onSelectSort("month")}
        class={`px-2 py-1 rounded font-semibold transition-colors flex items-center gap-1 ${
          sortBy === "month"
            ? "bg-fpl-cyan text-slate-950 font-bold shadow-glow-cyan"
            : "text-slate-400 hover:text-white"
        }`}
      >
        <Calendar class="w-3 h-3" />
        <span>Måned</span>
      </button>

      <button
        onclick={() => onSelectSort("season")}
        class={`px-2 py-1 rounded font-semibold transition-colors flex items-center gap-1 ${
          sortBy === "season"
            ? "bg-fpl-cyan text-slate-950 font-bold shadow-glow-cyan"
            : "text-slate-400 hover:text-white"
        }`}
      >
        <TrendingUp class="w-3 h-3" />
        <span>Total</span>
      </button>
    </div>
  </div>

  <!-- Spillerliste -->
  <div class="flex-1 overflow-y-auto py-2 space-y-1.5 pr-1">
    {#if players.length === 0}
      <div class="h-48 flex flex-col items-center justify-center text-center p-4 text-slate-500 text-xs">
        <Users class="w-6 h-6 opacity-40 mb-1" />
        <p>Ingen spillere funnet</p>
      </div>
    {/if}

    {#each players as player, index (player.entryId)}
      <div
        role="button"
        tabindex="0"
        onclick={() => onOpenProfile(player.entryId)}
        onkeydown={(e) => (e.key === "Enter" || e.key === " ") && onOpenProfile(player.entryId)}
        class={`p-2.5 rounded-xl border transition-all duration-150 flex items-center justify-between gap-3 cursor-pointer hover:scale-[1.01] ${
          index === 0
            ? "bg-gradient-to-r from-amber-950/30 via-slate-900/90 to-slate-900 border-amber-500/40 shadow-sm hover:border-amber-400"
            : index === 1
            ? "bg-slate-900/80 border-slate-700/80 hover:border-slate-500"
            : index === 2
            ? "bg-slate-900/80 border-amber-800/30 hover:border-amber-600"
            : "bg-slate-900/60 border-slate-800/80 hover:border-slate-600"
        }`}
      >
        <!-- Venstre: Rank + Spillerinfo -->
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-6 text-center font-black text-xs shrink-0 font-mono">
            {#if index === 0}
              <span>🥇</span>
            {:else if index === 1}
              <span>🥈</span>
            {:else if index === 2}
              <span>🥉</span>
            {:else}
              <span class="text-slate-400 text-[11px]">#{index + 1}</span>
            {/if}
          </div>

          <div class="min-w-0">
            <div class="flex items-center gap-1.5">
              <span class="font-bold text-xs text-white truncate">{player.managerName}</span>
              <!-- Rom-badge -->
              <span
                class="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider shrink-0 border"
                style={`border-color: ${player.roomColor || "#00ff87"}40; color: ${player.roomColor || "#00ff87"}; background-color: ${player.roomColor || "#00ff87"}15;`}
              >
                A{player.roomNumber}
              </span>
            </div>
            <p class="text-[10px] text-slate-400 truncate">{player.teamName}</p>
          </div>
        </div>

        <!-- Høyre: Poeng -->
        <div class="text-right shrink-0">
          <div class="font-mono font-black text-sm text-fpl-cyan">
            {sortBy === "season" ? player.totalPoints : sortBy === "month" ? player.monthPoints : player.effectivePoints}
            <span class="text-[10px] font-normal text-slate-400">pts</span>
          </div>

          {#if sortBy === "live" && player.currentGwTransfersCost > 0 && deductHits}
            <span class="text-[9px] text-rose-400 font-mono block">
              -{player.currentGwTransfersCost} hits
            </span>
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>
