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
          <span>Rom-ledertavle</span>
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
        <!-- Hovedrad -->
        <div class="px-4 py-3 flex items-center justify-between gap-4">
          <!-- Venstre: Plassering + A1–A12 format -->
          <div class="flex items-center gap-3 shrink-0 min-w-0">
            <!-- Rank plakett -->
            <div class="flex items-center justify-center w-7 h-7 rounded-lg font-black text-sm shrink-0">
              {#if index === 0}
                <span class="text-base" title="1. plass">🥇</span>
              {:else if index === 1}
                <span class="text-base" title="2. plass">🥈</span>
              {:else if index === 2}
                <span class="text-base" title="3. plass">🥉</span>
              {:else}
                <span class="text-slate-400 font-mono text-xs font-bold">#{index + 1}</span>
              {/if}
            </div>

            <!-- Rom farge og tittel: A1 - Kallenavn (uten spillertall-boks) -->
            <div class="flex items-center gap-2 truncate">
              <span
                class="w-2.5 h-2.5 rounded-full shrink-0"
                style={`background-color: ${room.accentColor || "#10b981"}`}
              ></span>
              <span class="font-bold text-sm text-white truncate hover:text-emerald-400 transition-colors">
                {room.name.startsWith("Rom ") ? room.name.replace(/^Rom\s*(\d+)/, "A$1") : room.name}
              </span>
            </div>
          </div>

          <!-- Midten: Inline spillere og poeng -->
          <div class="hidden md:flex items-center justify-center gap-3 flex-1 min-w-0 px-2">
            {#if room.top1 || room.top2}
              <div class="flex items-center gap-3 px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs">
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
                    <span class="font-medium text-slate-200 hover:text-white underline decoration-dotted truncate">
                      {room.top1.managerName}:
                    </span>
                    <span class="font-mono font-bold text-emerald-400">
                      {room.top1.effectivePoints}p
                    </span>
                    {#if room.top1.currentGwTransfersCost > 0 && deductHits}
                      <span class="text-[10px] text-rose-400 font-mono">(-{room.top1.currentGwTransfersCost})</span>
                    {/if}
                  </button>
                {/if}

                {#if room.top1 && room.top2}
                  <span class="text-slate-600 font-bold">•</span>
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
                    <span class="font-medium text-slate-200 hover:text-white underline decoration-dotted truncate">
                      {room.top2.managerName}:
                    </span>
                    <span class="font-mono font-bold text-emerald-400">
                      {room.top2.effectivePoints}p
                    </span>
                    {#if room.top2.currentGwTransfersCost > 0 && deductHits}
                      <span class="text-[10px] text-rose-400 font-mono">(-{room.top2.currentGwTransfersCost})</span>
                    {/if}
                  </button>
                {/if}
              </div>
            {/if}
          </div>

          <!-- Høyre: Snitt og accordion toggle -->
          <div class="flex items-center gap-3 shrink-0">
            <div class="text-right">
              <div class="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">
                {sortBy === "season" ? "Sesongsnitt" : sortBy === "month" ? "Månedssnitt" : "Rom-snitt"}
              </div>
              <div class="text-lg font-black text-emerald-400 font-mono leading-none">
                {sortBy === "season" ? room.seasonTotal : room.liveAverage}
                <span class="text-xs font-normal text-slate-400">pts</span>
              </div>
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
