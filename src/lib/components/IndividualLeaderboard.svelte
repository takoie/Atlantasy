<script lang="ts">
  import {
    Users,
    TrendingUp,
    Zap,
    Calendar,
    Search,
    X,
  } from "lucide-svelte";

  let {
    players = [],
    currentGw: _currentGw = 1,
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

  let searchQuery = $state("");

  let filteredPlayers = $derived(
    searchQuery.trim()
      ? players.filter(
          (p) =>
            p.managerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.teamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.roomName && p.roomName.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      : players
  );
</script>

<div class="flex-1 flex flex-col h-full overflow-hidden bg-[#2A303C] rounded-2xl border border-[#384252] p-4 shadow-sm text-[#E2E8F0] font-sans">
  <!-- Header -->
  <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#384252] shrink-0">
    <div class="flex items-center gap-2.5">
      <div class="p-2 rounded-xl bg-[#70E1F8]/15 text-[#70E1F8] border border-[#70E1F8]/30">
        <Users class="w-4 h-4" />
      </div>
      <div>
        <h2 class="text-sm font-bold text-white flex items-center gap-2">
          <span>Individuell Tabell</span>
          <span class="text-[10px] px-2 py-0.5 rounded-full bg-[#191E24] text-[#70E1F8] font-mono font-bold border border-[#384252]">
            {filteredPlayers.length} spillere
          </span>
        </h2>
        <p class="text-[11px] text-[#94A3B8]">
          Rangert etter {sortBy === "season" ? "sesongscore totalt" : sortBy === "month" ? "månedscore" : "live runde"}
        </p>
      </div>
    </div>

    <!-- Handlinger: Søk og 3-veis sortering -->
    <div class="flex flex-wrap items-center gap-2">
      <!-- Søkefelt -->
      <div class="relative w-44 sm:w-56">
        <Search class="w-3.5 h-3.5 text-[#94A3B8] absolute left-2.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Søk lag eller manager..."
          class="w-full pl-8 pr-7 py-1 rounded-lg bg-[#191E24] border border-[#384252] text-xs text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#9FE88D]"
        />
        {#if searchQuery}
          <button
            onclick={() => (searchQuery = "")}
            class="absolute right-2 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-white"
          >
            <X class="w-3 h-3" />
          </button>
        {/if}
      </div>

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

  <!-- Tabelliste over individuelle spillere -->
  <div class="flex-1 overflow-y-auto space-y-1.5 pt-3 pr-1 custom-scrollbar">
    {#if filteredPlayers.length === 0}
      <div class="p-8 text-center text-[#94A3B8] text-xs">
        Ingen spillere matcher søket ditt.
      </div>
    {/if}

    {#each filteredPlayers as player, index (player.entryId)}
      <!-- Naturlig skillelinje etter Topp 3 -->
      {#if index === 3 && filteredPlayers.length > 3}
        <div class="flex items-center gap-3 py-2 px-1 text-[#94A3B8] text-xs font-semibold select-none">
          <div class="h-px bg-[#384252] flex-1"></div>
          <span class="text-[11px] uppercase tracking-wider text-[#94A3B8]/90 font-mono font-bold flex items-center gap-1.5 bg-[#191E24] px-3 py-0.5 rounded-full border border-[#384252]">
            <span>Øvrige spillere (4–{filteredPlayers.length})</span>
          </span>
          <div class="h-px bg-[#384252] flex-1"></div>
        </div>
      {/if}

      <div
        role="button"
        tabindex="0"
        onclick={() => onOpenProfile(player.entryId)}
        onkeydown={(e) => (e.key === "Enter" || e.key === " ") && onOpenProfile(player.entryId)}
        class={`p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
          index === 0
            ? "bg-[#242B35] border-[#F4C152]/60 hover:border-[#F4C152] ring-1 ring-[#F4C152]/20"
            : index === 1
            ? "bg-[#242B35] border-[#CBD5E1]/40 hover:border-[#CBD5E1] ring-1 ring-[#CBD5E1]/10"
            : index === 2
            ? "bg-[#242B35] border-[#D97706]/40 hover:border-[#D97706] ring-1 ring-[#D97706]/10"
            : "bg-[#242B35] border-[#384252] hover:border-[#4B5563]"
        }`}
      >
        <!-- Venstre: Rank + Spillernavn + Rom -->
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-7 text-center font-mono font-bold text-xs shrink-0">
            {#if index === 0}
              <span class="text-xl inline-block drop-shadow-sm">🥇</span>
            {:else if index === 1}
              <span class="text-xl inline-block drop-shadow-sm">🥈</span>
            {:else if index === 2}
              <span class="text-xl inline-block drop-shadow-sm">🥉</span>
            {:else}
              <span class="text-[#94A3B8]">#{player.rank || index + 1}</span>
            {/if}
          </div>

          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-bold text-white text-xs sm:text-sm truncate hover:text-[#9FE88D] transition-colors">
                {player.managerName}
              </span>
              {#if player.roomName}
                <span
                  class="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border shrink-0 font-mono"
                  style={`border-color: ${player.roomColor || "#9FE88D"}40; color: ${player.roomColor || "#9FE88D"}; background-color: ${player.roomColor || "#9FE88D"}15;`}
                >
                  {player.roomName}
                </span>
              {/if}
            </div>
            <p class="text-xs text-[#94A3B8] truncate mt-0.5">
              {player.teamName}
            </p>
          </div>
        </div>

        <!-- Høyre: Poeng & Hits -->
        <div class="text-right shrink-0">
          <div class="font-mono font-bold text-sm sm:text-base text-[#9FE88D]">
            {player.effectivePoints}
            <span class="text-[10px] text-[#94A3B8] font-normal">pts</span>
          </div>

          {#if player.transfersCost > 0 && deductHits}
            <span class="text-[10px] text-[#FB6F84] font-mono block">
              -{player.transfersCost} hits
            </span>
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>
