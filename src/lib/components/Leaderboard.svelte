<script lang="ts">
  import {
    Trophy,
    TrendingUp,
    Calendar,
    ChevronDown,
    ChevronUp,
    Zap,
    AlertCircle,
  } from "lucide-svelte";

  let {
    leaderboard = [],
    selectedRoomId = null,
    currentGw = 26,
    deductHits = true,
    sortBy = "live", // "live" | "month" | "season"
    onSelectSort = (_sort: string) => {},
    onOpenRoomModal = (_room: any) => {},
  }: {
    leaderboard?: any[];
    selectedRoomId?: string | null;
    currentGw?: number;
    deductHits?: boolean;
    sortBy?: string;
    onSelectSort?: (sort: string) => void;
    onOpenRoomModal?: (room: any) => void;
  } = $props();

  let expandedRooms = $state<Record<string, boolean>>({});

  function toggleExpand(roomId: string, event: MouseEvent) {
    event.stopPropagation();
    expandedRooms[roomId] = !expandedRooms[roomId];
  }

  let displayedRooms = $derived(
    selectedRoomId
      ? leaderboard.filter((r) => r._id === selectedRoomId)
      : leaderboard
  );
</script>

<div class="flex-1 flex flex-col h-full overflow-hidden">
  <!-- Ledertavle Topplinje: Header & 3-veis Visningstoggle -->
  <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80 shrink-0">
    <div class="flex items-center gap-3">
      <div class="flex items-center gap-2">
        <h1 class="text-base font-bold text-white tracking-wide flex items-center gap-2">
          <Trophy class="w-4 h-4 text-fpl-cyan" />
          <span>Rom-ledertavle</span>
        </h1>
        <span class="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
          GW {currentGw}
        </span>
      </div>

      {#if deductHits}
        <span class="hidden sm:inline-block text-[11px] text-amber-300/80 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
          Hits fratrukket
        </span>
      {/if}
    </div>

    <!-- 3-veis Toggle: Live Runde | Måned | Sesong Totalt -->
    <div class="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
      <!-- Live Runde -->
      <button
        onclick={() => onSelectSort("live")}
        class={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
          sortBy === "live"
            ? "bg-fpl-cyan text-slate-950 font-bold shadow-glow-cyan"
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        <Zap class="w-3.5 h-3.5" />
        <span>Live Runde</span>
      </button>

      <!-- Måned -->
      <button
        onclick={() => onSelectSort("month")}
        class={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
          sortBy === "month"
            ? "bg-fpl-cyan text-slate-950 font-bold shadow-glow-cyan"
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        <Calendar class="w-3.5 h-3.5" />
        <span>Måned</span>
      </button>

      <!-- Sesong Totalt -->
      <button
        onclick={() => onSelectSort("season")}
        class={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
          sortBy === "season"
            ? "bg-fpl-cyan text-slate-950 font-bold shadow-glow-cyan"
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        <TrendingUp class="w-3.5 h-3.5" />
        <span>Sesong Totalt</span>
      </button>
    </div>
  </div>

  <!-- Rom-kortliste -->
  <div class="flex-1 overflow-y-auto py-3 space-y-2 pr-1">
    {#if displayedRooms.length === 0}
      <div class="p-8 text-center bg-slate-900/40 rounded-xl border border-slate-800 space-y-2">
        <AlertCircle class="w-8 h-8 text-slate-500 mx-auto" />
        <p class="text-sm font-semibold text-slate-300">Ingen rom funnet</p>
        <p class="text-xs text-slate-500">
          Trykk på "Admin" i toppen for å hente eller seede data.
        </p>
      </div>
    {/if}

    {#each displayedRooms as room, index (room._id)}
      <div
        role="button"
        tabindex="0"
        onclick={() => onOpenRoomModal(room)}
        onkeydown={(e) => (e.key === "Enter" || e.key === " ") && onOpenRoomModal(room)}
        class={`relative rounded-xl border transition-all duration-150 cursor-pointer overflow-hidden backdrop-blur-md ${
          index === 0
            ? "bg-gradient-to-r from-amber-950/25 via-slate-900/90 to-slate-900/90 border-amber-500/40 shadow-lg shadow-amber-500/5 hover:border-amber-400"
            : index === 1
            ? "bg-slate-900/80 border-slate-700/80 hover:border-slate-600"
            : index === 2
            ? "bg-slate-900/80 border-amber-800/40 hover:border-amber-700/60"
            : "bg-slate-900/60 border-slate-800/80 hover:border-slate-700"
        }`}
      >
        <!-- Hovedrad -->
        <div class="px-4 py-3 flex items-center justify-between gap-4">
          <!-- Venstre: Plassering + "<Rom X> - <Kallenavn>" (Rent format uten undertitler) -->
          <div class="flex items-center gap-3 shrink-0 min-w-0">
            <!-- Rank Plakett -->
            <div class="flex items-center justify-center w-7 h-7 rounded-lg font-black text-sm shrink-0">
              {#if index === 0}
                <span class="text-base" title="1. Plass">🥇</span>
              {:else if index === 1}
                <span class="text-base" title="2. Plass">🥈</span>
              {:else if index === 2}
                <span class="text-base" title="3. Plass">🥉</span>
              {:else}
                <span class="text-slate-400 font-mono text-xs font-bold">#{index + 1}</span>
              {/if}
            </div>

            <!-- Rom Farge og Tittel: A1 - <Kallenavn> (Uten spillertall-boks) -->
            <div class="flex items-center gap-2 truncate">
              <span
                class="w-2.5 h-2.5 rounded-full shrink-0"
                style={`background-color: ${room.accentColor || "#00ff87"}`}
              ></span>
              <span class="font-bold text-sm text-white truncate hover:text-fpl-cyan transition-colors">
                {room.name.startsWith("Rom ") ? room.name.replace(/^Rom\s*(\d+)/, "A$1") : room.name}
              </span>
            </div>
          </div>

          <!-- Midten: INLINE spillere og poeng -->
          <div class="hidden md:flex items-center justify-center gap-3 flex-1 min-w-0 px-2">
            {#if room.top1 || room.top2}
              <div class="flex items-center gap-3 px-3 py-1 rounded-lg bg-slate-950/70 border border-slate-800/80 text-xs">
                {#if room.top1}
                  <div class="flex items-center gap-1.5 truncate">
                    <span class="text-amber-400 font-bold text-[11px]">🥇</span>
                    <span class="font-medium text-slate-200 truncate">{room.top1.managerName}:</span>
                    <span class="font-mono font-bold text-fpl-cyan">
                      {room.top1.effectivePoints}p
                    </span>
                    {#if room.top1.currentGwTransfersCost > 0 && deductHits}
                      <span class="text-[10px] text-rose-400 font-mono">(-{room.top1.currentGwTransfersCost})</span>
                    {/if}
                  </div>
                {/if}

                {#if room.top1 && room.top2}
                  <span class="text-slate-600 font-bold">•</span>
                {/if}

                {#if room.top2}
                  <div class="flex items-center gap-1.5 truncate">
                    <span class="text-slate-300 font-bold text-[11px]">🥈</span>
                    <span class="font-medium text-slate-200 truncate">{room.top2.managerName}:</span>
                    <span class="font-mono font-bold text-emerald-400">
                      {room.top2.effectivePoints}p
                    </span>
                    {#if room.top2.currentGwTransfersCost > 0 && deductHits}
                      <span class="text-[10px] text-rose-400 font-mono">(-{room.top2.currentGwTransfersCost})</span>
                    {/if}
                  </div>
                {/if}
              </div>
            {/if}
          </div>

          <!-- Høyre: Snitt og Accordion Toggle -->
          <div class="flex items-center gap-3 shrink-0">
            <div class="text-right">
              <div class="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">
                {sortBy === "season" ? "Sesongsnitt" : sortBy === "month" ? "Månedssnitt" : "Rom-snitt"}
              </div>
              <div class="text-lg font-black text-fpl-cyan font-mono leading-none">
                {sortBy === "season" ? room.seasonTotal : room.liveAverage}
                <span class="text-xs font-normal text-slate-400">pts</span>
              </div>
            </div>

            <!-- Accordion knapp -->
            <button
              type="button"
              onclick={(e) => toggleExpand(room._id, e)}
              title="Vis alle spillere i dette rommet"
              class="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              {#if expandedRooms[room._id]}
                <ChevronUp class="w-4 h-4" />
              {:else}
                <ChevronDown class="w-4 h-4" />
              {/if}
            </button>
          </div>
        </div>

        <!-- Ekspandert Spillerliste -->
        {#if expandedRooms[room._id]}
          <div class="px-4 pb-3 pt-1 border-t border-slate-800/60 bg-slate-950/40">
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 pt-2">
              {#each room.teams as team (team.entryId)}
                <div class="p-2 rounded-lg bg-slate-900/90 border border-slate-800 text-xs flex items-center justify-between">
                  <div class="min-w-0">
                    <p class="font-semibold text-white truncate text-[11px]">{team.teamName}</p>
                    <p class="text-[10px] text-slate-400 truncate">{team.managerName}</p>
                  </div>
                  <div class="text-right shrink-0">
                    <span class="font-mono font-bold text-fpl-cyan text-xs">
                      {team.effectivePoints} pts
                    </span>
                    {#if team.currentGwTransfersCost > 0}
                      <span class="block text-[9px] text-rose-400">
                        -{team.currentGwTransfersCost} hits
                      </span>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>
