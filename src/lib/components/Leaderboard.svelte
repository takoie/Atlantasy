<script lang="ts">
  import {
    Trophy,
    TrendingUp,
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
    sortBy = "live", // "live" | "season"
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

  // Filter rom hvis ett er valgt fra sidebaren, ellers vis alle
  let displayedRooms = $derived(
    selectedRoomId
      ? leaderboard.filter((r) => r._id === selectedRoomId)
      : leaderboard
  );
</script>

<div class="flex-1 flex flex-col h-full overflow-hidden">
  <!-- Ledertavle Header med Faner & Info -->
  <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80 shrink-0">
    <div>
      <div class="flex items-center gap-2">
        <h1 class="text-base font-bold text-white tracking-wide flex items-center gap-2">
          <Trophy class="w-4 h-4 text-fpl-cyan" />
          {selectedRoomId ? "Romvisning" : "Offisiell Rom-ledertavle"}
        </h1>
        <span class="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
          GW {currentGw}
        </span>
      </div>
      <p class="text-xs text-slate-400 mt-0.5">
        Romscore beregnes automatisk som snittet av de <strong class="text-fpl-cyan">TO beste spillerne</strong> per rom.
        {#if deductHits}
          <span class="text-amber-300 font-medium">(Minuspoeng ved bytter trekkes fra)</span>
        {:else}
          <span class="text-slate-400">(Uten fratrekk av minuspoeng)</span>
        {/if}
      </p>
    </div>

    <!-- Sorteringsfaner -->
    <div class="flex items-center gap-1 p-1 rounded-lg bg-slate-900 border border-slate-800 text-xs">
      <button
        onclick={() => onSelectSort("live")}
        class={`px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
          sortBy === "live"
            ? "bg-fpl-cyan text-slate-950 font-bold shadow-glow-cyan"
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        <Zap class="w-3.5 h-3.5" />
        <span>Live Runde</span>
      </button>

      <button
        onclick={() => onSelectSort("season")}
        class={`px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
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
  <div class="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1">
    {#if displayedRooms.length === 0}
      <div class="p-8 text-center bg-slate-900/40 rounded-xl border border-slate-800 space-y-2">
        <AlertCircle class="w-8 h-8 text-slate-500 mx-auto" />
        <p class="text-sm font-semibold text-slate-300">Ingen rom funnet</p>
        <p class="text-xs text-slate-500">
          Trykk på "Admin" i toppen for å seede standardrom og hente FPL-data.
        </p>
      </div>
    {/if}

    {#each displayedRooms as room, index (room._id)}
      <div
        onclick={() => onOpenRoomModal(room)}
        class={`relative rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden backdrop-blur-md ${
          index === 0
            ? "bg-gradient-to-r from-amber-950/20 via-slate-900/80 to-slate-900/80 border-amber-500/40 shadow-lg shadow-amber-500/5 hover:border-amber-400"
            : index === 1
            ? "bg-slate-900/70 border-slate-700/80 hover:border-slate-600"
            : index === 2
            ? "bg-slate-900/70 border-amber-800/40 hover:border-amber-700/60"
            : "bg-slate-900/50 border-slate-800/80 hover:border-slate-700"
        }`}
      >
        <!-- Rom Rad Hovedinnhold -->
        <div class="p-3.5 flex items-center justify-between gap-4">
          <!-- Venstre: Plassering & Rominfo -->
          <div class="flex items-center gap-3.5 min-w-0">
            <!-- Rank Plakett -->
            <div class="flex items-center justify-center w-8 h-8 rounded-lg font-black text-sm shrink-0">
              {#if index === 0}
                <span class="text-lg" title="1. Plass">🥇</span>
              {:else if index === 1}
                <span class="text-lg" title="2. Plass">🥈</span>
              {:else if index === 2}
                <span class="text-lg" title="3. Plass">🥉</span>
              {:else}
                <span class="text-slate-400 font-mono text-xs">#{index + 1}</span>
              {/if}
            </div>

            <!-- Romfarge & Navn -->
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <span
                  class="w-2.5 h-2.5 rounded-full shrink-0"
                  style={`background-color: ${room.accentColor || "#00ff87"}`}
                ></span>
                <span class="font-bold text-sm text-white truncate hover:text-fpl-cyan transition-colors">
                  {room.name}
                </span>
                <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  {room.teamCount} spillere
                </span>
              </div>
              <p class="text-[11px] text-slate-400 truncate mt-0.5">
                {room.description || "Atlantis bedriftsrom"}
              </p>
            </div>
          </div>

          <!-- Midten: Topp 2 Bidragsytere for runden -->
          <div class="hidden md:flex items-center gap-3 shrink-0">
            {#if room.top1}
              <div class="bg-slate-950/70 border border-slate-800/80 px-2.5 py-1 rounded-lg text-right">
                <div class="text-[10px] text-slate-400 font-medium">
                  🥇 {room.top1.managerName}
                </div>
                <div class="text-xs font-bold text-fpl-cyan font-mono">
                  {room.top1.effectivePoints} pts
                  {#if room.top1.currentGwTransfersCost > 0 && deductHits}
                    <span class="text-[9px] text-rose-400">(-{room.top1.currentGwTransfersCost})</span>
                  {/if}
                </div>
              </div>
            {/if}

            {#if room.top2}
              <div class="bg-slate-950/70 border border-slate-800/80 px-2.5 py-1 rounded-lg text-right">
                <div class="text-[10px] text-slate-400 font-medium">
                  🥈 {room.top2.managerName}
                </div>
                <div class="text-xs font-bold text-emerald-400 font-mono">
                  {room.top2.effectivePoints} pts
                  {#if room.top2.currentGwTransfersCost > 0 && deductHits}
                    <span class="text-[9px] text-rose-400">(-{room.top2.currentGwTransfersCost})</span>
                  {/if}
                </div>
              </div>
            {/if}
          </div>

          <!-- Høyre: Beregnet Romsnitt & Ekspandér -->
          <div class="flex items-center gap-3 shrink-0">
            <div class="text-right">
              <div class="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                {sortBy === "season" ? "Sesongsnitt" : "Rom-snitt"}
              </div>
              <div class="text-xl font-black text-fpl-cyan font-mono leading-none">
                {sortBy === "season" ? room.seasonTotal : room.liveAverage}
                <span class="text-xs font-normal text-slate-400">pts</span>
              </div>
            </div>

            <!-- Accordion knapp -->
            <button
              onclick={(e) => toggleExpand(room._id, e)}
              title="Vis spillere på dette rommet"
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

        <!-- Ekspandert Spillerliste (Accordion) -->
        {#if expandedRooms[room._id]}
          <div class="px-4 pb-3 pt-1 border-t border-slate-800/60 bg-slate-950/40">
            <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Spilleroversikt for {room.name}
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
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
