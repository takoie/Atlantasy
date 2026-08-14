<script lang="ts">
  import {
    Trophy,
    TrendingUp,
    Zap,
    Calendar,
    ChevronDown,
    ChevronUp,
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
    onOpenProfile = (_entryId: number) => {},
  }: {
    leaderboard?: any[];
    selectedRoomId?: string | null;
    currentGw?: number;
    deductHits?: boolean;
    sortBy?: string;
    onSelectSort?: (sort: string) => void;
    onOpenRoomModal?: (room: any) => void;
    onOpenProfile?: (entryId: number) => void;
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
  <!-- Ledertavle topplinje: Header og 3-veis visningstoggle -->
  <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800 shrink-0">
    <div class="flex items-center gap-3">
      <div class="flex items-center gap-2">
        <h1 class="text-base font-bold text-white tracking-wide flex items-center gap-2">
          <Trophy class="w-4 h-4 text-emerald-400" />
          <span>Leaderboard - Rom</span>
        </h1>
        <span class="text-xs px-2 py-0.5 rounded-full bg-slate-900 text-slate-300 border border-slate-800 font-mono">
          GW {currentGw}
        </span>
      </div>

      {#if deductHits}
        <span class="hidden sm:inline-block text-[11px] text-amber-300/90 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
          Hits fratrukket
        </span>
      {/if}
    </div>

    <!-- 3-veis toggle: Live runde | Måned | Sesong totalt -->
    <div class="flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
      <!-- Live runde -->
      <button
        onclick={() => onSelectSort("live")}
        class={`px-3 py-1 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
          sortBy === "live"
            ? "bg-emerald-500 text-slate-950 font-bold shadow-sm"
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        <Zap class="w-3.5 h-3.5" />
        <span>Live</span>
      </button>

      <!-- Måned -->
      <button
        onclick={() => onSelectSort("month")}
        class={`px-3 py-1 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
          sortBy === "month"
            ? "bg-emerald-500 text-slate-950 font-bold shadow-sm"
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        <Calendar class="w-3.5 h-3.5" />
        <span>Måned</span>
      </button>

      <!-- Sesong totalt -->
      <button
        onclick={() => onSelectSort("season")}
        class={`px-3 py-1 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
          sortBy === "season"
            ? "bg-emerald-500 text-slate-950 font-bold shadow-sm"
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        <TrendingUp class="w-3.5 h-3.5" />
        <span>Total</span>
      </button>
    </div>
  </div>

  <!-- Rom-kortliste -->
  <div class="flex-1 overflow-y-auto py-3 space-y-2 pr-1">
    {#if displayedRooms.length === 0}
      <div class="p-8 text-center bg-slate-900/60 rounded-xl border border-slate-800 space-y-2">
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
        class={`relative rounded-xl border transition-all duration-150 cursor-pointer overflow-hidden ${
          index === 0
            ? "bg-gradient-to-r from-amber-950/20 via-slate-900 to-slate-900 border-amber-500/40 shadow-sm hover:border-amber-400"
            : index === 1
            ? "bg-slate-900/90 border-slate-750 hover:border-slate-600"
            : index === 2
            ? "bg-slate-900/90 border-amber-800/30 hover:border-amber-700/60"
            : "bg-slate-900/70 border-slate-800 hover:border-slate-700"
        }`}
      >
        <!-- Hovedrad: 3 distinkte, stabile kolonner -->
        <div class="px-3.5 py-3 flex items-center justify-between gap-2 sm:gap-4">
          
          <!-- Kolonne 1 (Venstre): Fast bredde for Rank + Romnavn -->
          <div class="w-[170px] sm:w-[210px] shrink-0 flex items-center gap-2.5 min-w-0">
            <!-- Rank Plakett (fast bredde) -->
            <div class="w-6 text-center shrink-0">
              {#if index === 0}
                <span class="text-base">🥇</span>
              {:else if index === 1}
                <span class="text-base">🥈</span>
              {:else if index === 2}
                <span class="text-base">🥉</span>
              {:else}
                <span class="text-slate-400 font-mono text-xs font-bold">#{index + 1}</span>
              {/if}
            </div>

            <!-- Fargeprikk -->
            <span
              class="w-2.5 h-2.5 rounded-full shrink-0"
              style={`background-color: ${room.accentColor || "#10b981"}`}
            ></span>

            <!-- Rom tittel (truncate pent hvis langt) -->
            <span class="font-bold text-xs sm:text-sm text-white truncate hover:text-emerald-400 transition-colors">
              {room.name.startsWith("Rom ") ? room.name.replace(/^Rom\s*(\d+)/, "A$1") : room.name}
            </span>
          </div>

          <!-- Kolonne 2 (Midten): Sentrert, fast container for lederne -->
          <div class="hidden md:flex flex-1 items-center justify-center min-w-0 px-1">
            {#if room.top1 || room.top2}
              <div class="flex items-center gap-2.5 px-3 py-1 rounded-xl bg-slate-950/90 border border-slate-800 text-xs shadow-inner">
                {#if room.top1}
                  <button
                    type="button"
                    onclick={(e) => {
                      e.stopPropagation();
                      onOpenProfile(room.top1.entryId);
                    }}
                    class="flex items-center gap-1.5 truncate hover:text-emerald-400 transition-colors text-left"
                    title={`Se profilen til ${room.top1.managerName}`}
                  >
                    <span class="text-amber-400 font-bold text-[11px]">🥇</span>
                    <span class="font-medium text-slate-200 hover:text-white underline decoration-dotted truncate max-w-[110px]">
                      {room.top1.managerName}:
                    </span>
                    <span class="font-mono font-bold text-emerald-400 shrink-0">
                      {room.top1.effectivePoints}p
                    </span>
                    {#if room.top1.currentGwTransfersCost > 0 && deductHits}
                      <span class="text-[10px] text-rose-400 font-mono shrink-0">(-{room.top1.currentGwTransfersCost})</span>
                    {/if}
                  </button>
                {/if}

                {#if room.top1 && room.top2}
                  <span class="text-slate-600 font-bold shrink-0">•</span>
                {/if}

                {#if room.top2}
                  <button
                    type="button"
                    onclick={(e) => {
                      e.stopPropagation();
                      onOpenProfile(room.top2.entryId);
                    }}
                    class="flex items-center gap-1.5 truncate hover:text-emerald-400 transition-colors text-left"
                    title={`Se profilen til ${room.top2.managerName}`}
                  >
                    <span class="text-slate-300 font-bold text-[11px]">🥈</span>
                    <span class="font-medium text-slate-200 hover:text-white underline decoration-dotted truncate max-w-[110px]">
                      {room.top2.managerName}:
                    </span>
                    <span class="font-mono font-bold text-emerald-400 shrink-0">
                      {room.top2.effectivePoints}p
                    </span>
                    {#if room.top2.currentGwTransfersCost > 0 && deductHits}
                      <span class="text-[10px] text-rose-400 font-mono shrink-0">(-{room.top2.currentGwTransfersCost})</span>
                    {/if}
                  </button>
                {/if}
              </div>
            {/if}
          </div>

          <!-- Kolonne 3 (Høyre): Ren poengsum (uten ROM-SNITT tekst) + Utvid/Chevron -->
          <div class="w-[85px] sm:w-[95px] shrink-0 flex items-center justify-end gap-2 text-right">
            <div class="font-mono font-black text-base sm:text-lg text-emerald-400 leading-none">
              {sortBy === "season" ? room.seasonTotal : room.liveAverage}
              <span class="text-[10px] font-normal text-slate-400">pts</span>
            </div>

            <!-- Utvid-knapp -->
            <button
              onclick={(e) => toggleExpand(room._id, e)}
              class="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title={expandedRooms[room._id] ? "Skjul detaljer" : "Vis alle spillere"}
            >
              {#if expandedRooms[room._id]}
                <ChevronUp class="w-4 h-4" />
              {:else}
                <ChevronDown class="w-4 h-4" />
              {/if}
            </button>
          </div>

        </div>

        <!-- Utvidet visning: Alle spillere i rommet -->
        {#if expandedRooms[room._id]}
          <div class="px-4 pb-3 pt-1 border-t border-slate-800/80 bg-slate-950/60">
            <div class="space-y-1.5 pt-2">
              {#if !room.teams || room.teams.length === 0}
                <div class="text-xs text-slate-500 py-1">Ingen spillere tildelt dette rommet enda.</div>
              {:else}
                {#each room.teams as team, tIdx}
                  <div
                    role="button"
                    tabindex="0"
                    onclick={(e) => {
                      e.stopPropagation();
                      onOpenProfile(team.entryId);
                    }}
                    onkeydown={(e) => (e.key === "Enter" || e.key === " ") && onOpenProfile(team.entryId)}
                    class="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-slate-700 cursor-pointer"
                  >
                    <div class="flex items-center gap-2">
                      <span class="font-mono text-[10px] text-slate-500 w-4">#{tIdx + 1}</span>
                      <span class="font-semibold text-slate-200">{team.managerName}</span>
                      <span class="text-[10px] text-slate-400 font-normal">({team.teamName})</span>
                    </div>

                    <div class="flex items-center gap-2 font-mono">
                      {#if team.transfersCost > 0 && deductHits}
                        <span class="text-[10px] text-rose-400">-{team.transfersCost}</span>
                      {/if}
                      <span class="font-bold text-white">{team.effectivePoints} pts</span>
                    </div>
                  </div>
                {/each}
              {/if}
            </div>
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>
