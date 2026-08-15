<script lang="ts">
  import {
    Trophy,
    TrendingUp,
    Zap,
    Calendar,
    ChevronDown,
    ChevronUp,
    AlertCircle,
    Users,
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

<div class="flex-1 flex flex-col h-full overflow-hidden bg-[#2A303C] rounded-2xl border border-[#384252] p-4 shadow-sm text-[#E2E8F0] font-sans">
  <!-- Header & 3-veis sortering -->
  <div class="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-[#384252] shrink-0">
    <div class="flex items-center gap-2.5">
      <div class="p-2 rounded-xl bg-[#9FE88D]/15 text-[#9FE88D] border border-[#9FE88D]/30">
        <Trophy class="w-4 h-4" />
      </div>
      <div>
        <h2 class="text-sm font-bold text-white flex items-center gap-2">
          <span>Arbeidsrom</span>
          <span class="text-[10px] px-2 py-0.5 rounded-full bg-[#191E24] text-[#9FE88D] font-mono font-bold border border-[#384252]">
            {displayedRooms.length} rom
          </span>
          <span class="text-[10px] px-2 py-0.5 rounded-full bg-[#191E24] text-[#94A3B8] font-mono border border-[#384252]">
            GW {currentGw}
          </span>
        </h2>
        <p class="text-[11px] text-[#94A3B8]">
          {sortBy === "season" ? "Rangert etter sesongtotal (Topp 2 snitt per runde)" : sortBy === "month" ? "Rangert etter månedssnitt" : "Rangert etter live runde (Topp 2 snitt)"}
        </p>
      </div>
    </div>

    <!-- Handlinger: Transfer hits info og 3-veis sortering -->
    <div class="flex flex-wrap items-center gap-2">
      {#if deductHits}
        <span class="hidden md:inline-flex items-center text-[10px] text-[#F4C152] bg-[#F4C152]/10 px-2 py-0.5 rounded-full border border-[#F4C152]/30 font-semibold font-mono">
          -4p hits fratrukket
        </span>
      {/if}

      <!-- 3-veis sorterings-knapper (Live | Måned | Total) -->
      <div class="flex items-center gap-0.5 p-0.5 rounded-lg bg-[#191E24] border border-[#384252] text-[11px]">
        <button
          onclick={() => onSelectSort("live")}
          class={`px-2.5 py-1 rounded-md font-bold transition-colors flex items-center gap-1 ${
            sortBy === "live"
              ? "bg-[#9FE88D] text-[#16380c] font-bold shadow-sm"
              : "text-[#94A3B8] hover:text-white"
          }`}
        >
          <Zap class="w-3 h-3" />
          <span>Live</span>
        </button>

        <button
          onclick={() => onSelectSort("month")}
          class={`px-2.5 py-1 rounded-md font-bold transition-colors flex items-center gap-1 ${
            sortBy === "month"
              ? "bg-[#F4C152] text-black font-bold shadow-sm"
              : "text-[#94A3B8] hover:text-white"
          }`}
        >
          <Calendar class="w-3 h-3" />
          <span>Måned</span>
        </button>

        <button
          onclick={() => onSelectSort("season")}
          class={`px-2.5 py-1 rounded-md font-bold transition-colors flex items-center gap-1 ${
            sortBy === "season"
              ? "bg-[#70E1F8] text-black font-bold shadow-sm"
              : "text-[#94A3B8] hover:text-white"
          }`}
        >
          <TrendingUp class="w-3 h-3" />
          <span>Total</span>
        </button>
      </div>
    </div>
  </div>

  <!-- Rom-kortliste -->
  <div class="flex-1 overflow-y-auto pt-3 pb-1 space-y-2.5 pr-1 custom-scrollbar">
    {#if displayedRooms.length === 0}
      <div class="p-8 text-center bg-[#242B35] rounded-xl border border-[#384252] space-y-2">
        <AlertCircle class="w-8 h-8 text-[#94A3B8] mx-auto" />
        <p class="text-sm font-bold text-white">Ingen rom funnet</p>
        <p class="text-xs text-[#94A3B8]">
          Gå til "Admin" i menyen til venstre for å hente eller fordele lag inn i rommene.
        </p>
      </div>
    {/if}

    {#each displayedRooms as room, index (room._id)}
      <!-- Naturlig skillelinje etter Topp 3 -->
      {#if index === 3 && displayedRooms.length > 3}
        <div class="flex items-center gap-3 py-1 px-1 text-[#94A3B8] text-xs font-semibold select-none">
          <div class="h-px bg-[#384252] flex-1"></div>
          <span class="text-[10px] uppercase tracking-wider text-[#94A3B8]/80 font-mono font-bold flex items-center gap-1.5 bg-[#191E24] px-2.5 py-0.5 rounded-full border border-[#384252]">
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
        class={`p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer shadow-sm ${
          index === 0
            ? "bg-[#242B35] border-[#F4C152]/60 hover:border-[#F4C152] ring-1 ring-[#F4C152]/20"
            : index === 1
            ? "bg-[#242B35] border-[#CBD5E1]/40 hover:border-[#CBD5E1] ring-1 ring-[#CBD5E1]/10"
            : index === 2
            ? "bg-[#242B35] border-[#D97706]/40 hover:border-[#D97706] ring-1 ring-[#D97706]/10"
            : "bg-[#242B35] border-[#384252] hover:border-[#4B5563]"
        }`}
      >
        <!-- Hovedrad -->
        <div class="flex items-center justify-between gap-3">
          <!-- Venstre: Rank + Rom-tag + Romnavn -->
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-7 text-center font-mono font-bold text-xs shrink-0">
              {#if index === 0}
                <span class="text-xl inline-block drop-shadow-sm">🥇</span>
              {:else if index === 1}
                <span class="text-xl inline-block drop-shadow-sm">🥈</span>
              {:else if index === 2}
                <span class="text-xl inline-block drop-shadow-sm">🥉</span>
              {:else}
                <span class="text-[#94A3B8]">#{index + 1}</span>
              {/if}
            </div>

            <div class="min-w-0 flex items-center gap-2">
              <span
                class="text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider border shrink-0 font-mono shadow-sm"
                style={`border-color: ${room.accentColor || "#9FE88D"}40; color: ${room.accentColor || "#9FE88D"}; background-color: ${room.accentColor || "#9FE88D"}15;`}
              >
                {room.name.includes(" - ") ? room.name.split(" - ")[0] : `Rom ${room.roomNumber ?? index + 1}`}
              </span>

              <span class="font-bold text-white text-xs sm:text-sm truncate hover:text-[#9FE88D] transition-colors">
                {room.name.includes(" - ") ? room.name.split(" - ")[1] : room.name.replace(/^Rom\s*\d*\s*-?\s*/i, "") || room.name}
              </span>
            </div>
          </div>

          <!-- Midten: Topp 2 spillere som danner snittet -->
          <div class="hidden lg:flex items-center justify-center min-w-0 px-2">
            {#if room.top1 || room.top2}
              <div class="flex items-center gap-2.5 px-3 py-1 rounded-lg bg-[#191E24] border border-[#384252] text-xs">
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
                    <span class="text-xs">🥇</span>
                    <span class="font-semibold text-white hover:underline truncate max-w-[110px]">
                      {room.top1.managerName}
                    </span>
                    <span class="font-mono font-bold text-[#9FE88D] shrink-0">
                      {room.top1.effectivePoints}p
                    </span>
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
                    <span class="text-xs">🥈</span>
                    <span class="font-semibold text-white hover:underline truncate max-w-[110px]">
                      {room.top2.managerName}
                    </span>
                    <span class="font-mono font-bold text-[#9FE88D] shrink-0">
                      {room.top2.effectivePoints}p
                    </span>
                  </button>
                {/if}
              </div>
            {:else}
              <span class="text-xs text-[#94A3B8] italic">Ingen spillere i rommet</span>
            {/if}
          </div>

          <!-- Høyre: Snittpoeng + Antall spillere + Ekspander -->
          <div class="flex items-center justify-end gap-3 text-right shrink-0">
            <div>
              <div class="font-mono font-bold text-sm sm:text-base text-[#9FE88D]">
                {sortBy === "season" ? room.seasonTotal : room.liveAverage}
                <span class="text-[10px] text-[#94A3B8] font-normal">snitt</span>
              </div>
              <div class="text-[10px] font-mono text-[#94A3B8]">
                {room.teamCount} {room.teamCount === 1 ? "spiller" : "spillere"}
              </div>
            </div>

            <!-- Ekspander-knapp -->
            <button
              type="button"
              onclick={(e) => toggleExpand(room._id, e)}
              class="p-1 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#191E24] transition-colors"
              title={expandedRooms[room._id] ? "Skjul spillere" : "Vis alle spillere"}
            >
              {#if expandedRooms[room._id]}
                <ChevronUp class="w-3.5 h-3.5" />
              {:else}
                <ChevronDown class="w-3.5 h-3.5" />
              {/if}
            </button>
          </div>
        </div>

        <!-- Ekspandert visning for alle spillere i dette rommet -->
        {#if expandedRooms[room._id]}
          <div class="mt-2.5 pt-2.5 border-t border-[#384252] bg-[#191E24] rounded-lg p-2 space-y-1.5 animate-in fade-in duration-150">
            <div class="flex items-center justify-between text-[11px] text-[#94A3B8] font-semibold px-2 pb-1">
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
                class="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#242B35] hover:bg-[#2A303C] border border-[#384252] transition-colors text-xs cursor-pointer group"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <span class="font-mono text-[11px] font-bold text-[#94A3B8] w-4">
                    #{tIdx + 1}
                  </span>
                  <div class="min-w-0">
                    <span class="font-bold text-white group-hover:text-[#9FE88D] transition-colors truncate block">
                      {team.managerName}
                    </span>
                    <span class="text-[11px] text-[#94A3B8] truncate block">
                      {team.teamName}
                    </span>
                  </div>
                </div>

                <div class="text-right shrink-0">
                  <span class="font-mono font-bold text-xs text-[#9FE88D]">
                    {team.effectivePoints}p
                  </span>
                  {#if team.transfersCost > 0 && deductHits}
                    <span class="text-[10px] text-[#FB6F84] font-mono block">
                      -{team.transfersCost}
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
