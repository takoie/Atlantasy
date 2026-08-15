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
    currentGw = 1,
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

<div class="flex-1 flex flex-col h-full overflow-hidden text-[#E2E8F0] font-sans">
  <!-- Ledertavle topplinje: Header og 3-veis visningstoggle -->
  <div class="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-[#384252] shrink-0">
    <div class="flex items-center gap-3">
      <div class="flex items-center gap-2.5">
        <div class="p-2 rounded-xl bg-[#9FE88D]/15 text-[#9FE88D] border border-[#9FE88D]/30">
          <Trophy class="w-5 h-5" />
        </div>
        <div>
          <h1 class="text-base sm:text-lg font-bold text-white tracking-wide flex items-center gap-2">
            <span>Rom-tabell</span>
            <span class="text-xs px-2.5 py-0.5 rounded-full bg-[#191E24] text-[#9FE88D] border border-[#384252] font-mono font-bold">
              GW {currentGw}
            </span>
          </h1>
          <p class="text-xs text-[#94A3B8]">
            {sortBy === "season" ? "Rangert etter sesongtotal (Topp 2 snitt per runde)" : sortBy === "month" ? "Rangert etter månedssnitt" : "Rangert etter live runderesultat (Topp 2 snitt)"}
          </p>
        </div>
      </div>

      {#if deductHits}
        <span class="hidden lg:inline-block text-xs text-[#F4C152] bg-[#F4C152]/10 px-2.5 py-1 rounded-lg border border-[#F4C152]/30 font-semibold">
          Transfer hits fratrukket (-4p)
        </span>
      {/if}
    </div>

    <!-- 3-veis toggle: Live runde | Måned | Sesong totalt (DaisyUI Dim Style) -->
    <div class="flex items-center gap-1 p-1 rounded-xl bg-[#191E24] border border-[#384252] text-xs font-bold">
      <button
        onclick={() => onSelectSort("live")}
        class={`px-3.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
          sortBy === "live"
            ? "bg-[#9FE88D] text-[#16380c] font-bold shadow-sm"
            : "text-[#94A3B8] hover:text-white"
        }`}
      >
        <Zap class="w-3.5 h-3.5" />
        <span>Live</span>
      </button>

      <button
        onclick={() => onSelectSort("month")}
        class={`px-3.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
          sortBy === "month"
            ? "bg-[#F4C152] text-black font-bold shadow-sm"
            : "text-[#94A3B8] hover:text-white"
        }`}
      >
        <Calendar class="w-3.5 h-3.5" />
        <span>Måned</span>
      </button>

      <button
        onclick={() => onSelectSort("season")}
        class={`px-3.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
          sortBy === "season"
            ? "bg-[#70E1F8] text-black font-bold shadow-sm"
            : "text-[#94A3B8] hover:text-white"
        }`}
      >
        <TrendingUp class="w-3.5 h-3.5" />
        <span>Total</span>
      </button>
    </div>
  </div>

  <!-- Rom-kortliste -->
  <div class="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1 custom-scrollbar">
    {#if displayedRooms.length === 0}
      <div class="p-8 text-center bg-[#2A303C] rounded-xl border border-[#384252] space-y-2">
        <AlertCircle class="w-8 h-8 text-[#94A3B8] mx-auto" />
        <p class="text-base font-bold text-white">Ingen rom funnet</p>
        <p class="text-xs text-[#94A3B8]">
          Gå til "Admin" i menyen til venstre for å hente eller fordele lag inn i rommene.
        </p>
      </div>
    {/if}

    {#each displayedRooms as room, index (room._id)}
      <!-- Naturlig skillelinje etter Topp 3 -->
      {#if index === 3 && displayedRooms.length > 3}
        <div class="flex items-center gap-3 py-2 px-1 text-[#94A3B8] text-xs font-semibold select-none">
          <div class="h-px bg-[#384252] flex-1"></div>
          <span class="text-[11px] uppercase tracking-wider text-[#94A3B8]/90 font-mono font-bold flex items-center gap-1.5 bg-[#191E24] px-3 py-0.5 rounded-full border border-[#384252]">
            <span>Øvrige rom (4–{displayedRooms.length})</span>
          </span>
          <div class="h-px bg-[#384252] flex-1"></div>
        </div>
      {/if}

      <div
        role="button"
        tabindex="0"
        onclick={() => onOpenRoomModal(room)}
        onkeydown={(e) => (e.key === "Enter" || e.key === " ") && onOpenRoomModal(room)}
        class={`relative rounded-xl border transition-all duration-150 cursor-pointer overflow-hidden ${
          index === 0
            ? "bg-[#2A303C] border-[#F4C152]/60 shadow-sm hover:border-[#F4C152] ring-1 ring-[#F4C152]/20"
            : index === 1
            ? "bg-[#2A303C] border-[#CBD5E1]/40 shadow-sm hover:border-[#CBD5E1] ring-1 ring-[#CBD5E1]/10"
            : index === 2
            ? "bg-[#2A303C] border-[#D97706]/40 shadow-sm hover:border-[#D97706] ring-1 ring-[#D97706]/10"
            : "bg-[#2A303C] border-[#384252] hover:border-[#4B5563]"
        }`}
      >
        <!-- Hovedrad: 3 distinkte, stabile kolonner -->
        <div class="px-4 py-3.5 flex items-center justify-between gap-3 sm:gap-4">
          <!-- Kolonne 1 (Venstre): Fast bredde for Rank + Romnavn -->
          <div class="w-[200px] sm:w-[240px] shrink-0 flex items-center gap-3 min-w-0">
            <div class="w-7 text-center shrink-0">
              {#if index === 0}
                <span class="text-xl inline-block drop-shadow-sm">🥇</span>
              {:else if index === 1}
                <span class="text-xl inline-block drop-shadow-sm">🥈</span>
              {:else if index === 2}
                <span class="text-xl inline-block drop-shadow-sm">🥉</span>
              {:else}
                <span class="text-[#94A3B8] font-mono text-sm font-bold">#{index + 1}</span>
              {/if}
            </div>

            <!-- Fargeprikk -->
            <span
              class="w-3 h-3 rounded-full shrink-0"
              style={`background-color: ${room.accentColor || "#9FE88D"}`}
            ></span>

            <span class="font-bold text-sm sm:text-base text-white truncate hover:text-[#9FE88D] transition-colors">
              {room.name.replace(/^Rom\s*/i, "")}
            </span>
          </div>

          <!-- Kolonne 2 (Midten): Sentrert, fast container for lederne -->
          <div class="hidden md:flex flex-1 items-center justify-center min-w-0 px-2">
            {#if room.top1 || room.top2}
              <div class="flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-[#191E24] border border-[#384252] text-xs">
                {#if room.top1}
                  <button
                    type="button"
                    onclick={(e) => {
                      e.stopPropagation();
                      onOpenProfile(room.top1.entryId);
                    }}
                    class="flex items-center gap-1.5 truncate hover:text-[#9FE88D] transition-colors text-left"
                    title={`Se profilen til ${room.top1.managerName}`}
                  >
                    <span class="text-[#F4C152] font-bold text-xs">🥇</span>
                    <span class="font-medium text-[#E2E8F0] hover:text-white truncate max-w-[120px]">
                      {room.top1.managerName}:
                    </span>
                    <span class="font-mono font-bold text-[#9FE88D] shrink-0 text-sm">
                      {room.top1.effectivePoints}p
                    </span>
                    {#if room.top1.currentGwTransfersCost > 0 && deductHits}
                      <span class="text-xs text-[#FB6F84] font-mono shrink-0">(-{room.top1.currentGwTransfersCost})</span>
                    {/if}
                  </button>
                {/if}

                {#if room.top1 && room.top2}
                  <span class="text-[#384252] font-bold">|</span>
                {/if}

                {#if room.top2}
                  <button
                    type="button"
                    onclick={(e) => {
                      e.stopPropagation();
                      onOpenProfile(room.top2.entryId);
                    }}
                    class="flex items-center gap-1.5 truncate hover:text-[#9FE88D] transition-colors text-left"
                    title={`Se profilen til ${room.top2.managerName}`}
                  >
                    <span class="text-[#94A3B8] font-bold text-xs">🥈</span>
                    <span class="font-medium text-[#E2E8F0] hover:text-white truncate max-w-[120px]">
                      {room.top2.managerName}:
                    </span>
                    <span class="font-mono font-bold text-[#9FE88D] shrink-0 text-sm">
                      {room.top2.effectivePoints}p
                    </span>
                    {#if room.top2.currentGwTransfersCost > 0 && deductHits}
                      <span class="text-xs text-[#FB6F84] font-mono shrink-0">(-{room.top2.currentGwTransfersCost})</span>
                    {/if}
                  </button>
                {/if}
              </div>
            {:else}
              <span class="text-xs text-[#94A3B8] italic">Ingen spillere tildelt rommet</span>
            {/if}
          </div>

          <!-- Kolonne 3 (Høyre): Fast bredde for Score og Snitt -->
          <div class="w-[140px] sm:w-[170px] shrink-0 flex items-center justify-end gap-3 text-right">
            <div>
              <div class="font-mono font-black text-base sm:text-lg text-[#9FE88D] leading-tight">
                {sortBy === "season" ? room.seasonTotal : room.liveAverage}
                <span class="text-xs font-normal text-[#94A3B8]">snitt</span>
              </div>
              <div class="text-xs font-mono text-[#94A3B8] leading-tight">
                {room.teamCount} {room.teamCount === 1 ? "spiller" : "spillere"}
              </div>
            </div>

            <!-- Ekspander-knapp for lagliste -->
            <button
              type="button"
              onclick={(e) => toggleExpand(room._id, e)}
              class="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#242B35] transition-colors"
              title={expandedRooms[room._id] ? "Skjul spillere" : "Vis alle spillere"}
            >
              {#if expandedRooms[room._id]}
                <ChevronUp class="w-4 h-4" />
              {:else}
                <ChevronDown class="w-4 h-4" />
              {/if}
            </button>
          </div>
        </div>

        <!-- Ekspandert visning for alle spillere i dette rommet -->
        {#if expandedRooms[room._id]}
          <div class="px-4 pb-3.5 pt-2 border-t border-[#384252] bg-[#191E24] space-y-1.5 animate-in fade-in duration-150">
            <div class="flex items-center justify-between text-xs text-[#94A3B8] font-semibold px-2 pb-1">
              <span>Manager & Lag</span>
              <span>Poeng (Hits)</span>
            </div>

            {#if !room.teams || room.teams.length === 0}
              <div class="p-3 text-center text-xs text-[#94A3B8]">
                Ingen spillere registrert i dette rommet enda.
              </div>
            {/if}

            {#each room.teams || [] as team, tIdx}
              <div
                role="button"
                tabindex="0"
                onclick={(e) => {
                  e.stopPropagation();
                  onOpenProfile(team.entryId);
                }}
                onkeydown={(e) => (e.key === "Enter" || e.key === " ") && onOpenProfile(team.entryId)}
                class="flex items-center justify-between px-3 py-2 rounded-lg bg-[#242B35] hover:bg-[#2A303C] border border-[#384252] transition-colors text-xs cursor-pointer group"
              >
                <div class="flex items-center gap-2.5 min-w-0">
                  <span class="font-mono text-xs font-bold text-[#94A3B8] w-4">
                    #{tIdx + 1}
                  </span>
                  <div class="min-w-0">
                    <span class="font-bold text-white group-hover:text-[#9FE88D] transition-colors truncate block">
                      {team.managerName}
                    </span>
                    <span class="text-xs text-[#94A3B8] truncate block">
                      {team.teamName}
                    </span>
                  </div>
                </div>

                <div class="text-right shrink-0">
                  <span class="font-mono font-bold text-sm text-[#9FE88D]">
                    {team.effectivePoints}p
                  </span>
                  {#if team.transfersCost > 0 && deductHits}
                    <span class="text-xs text-[#FB6F84] font-mono block">
                      (-{team.transfersCost})
                    </span>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>
