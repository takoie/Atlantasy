<script lang="ts">
  import {
    Trophy,
    TrendingUp,
    Zap,
    Calendar,
    ChevronDown,
    ChevronUp,
    AlertCircle,
    Info,
  } from "lucide-svelte";

  let {
    leaderboard = [],
    selectedRoomId = null,
    currentGw = 1,
    deductHits = true,
    sortBy = "live", // "live" | "month" | "season"
    months = [],
    selectedMonthKey = null,
    onSelectMonth = (_key: string | null) => {},
    onSelectSort = (_sort: string) => {},
    onOpenRoomModal = (_room: any) => {},
    onOpenProfile = (_entryId: number) => {},
  }: {
    leaderboard?: any[];
    selectedRoomId?: string | null;
    currentGw?: number;
    deductHits?: boolean;
    sortBy?: string;
    months?: any[];
    selectedMonthKey?: string | null;
    onSelectMonth?: (key: string | null) => void;
    onSelectSort?: (sort: string) => void;
    onOpenRoomModal?: (room: any) => void;
    onOpenProfile?: (entryId: number) => void;
  } = $props();

  let currentMonthKey = $derived(
    months.find((m: any) => m.isCurrent)?.monthKey ?? ""
  );
  let monthSelectValue = $derived(selectedMonthKey ?? currentMonthKey);

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

<div class="flex-1 flex flex-col h-full overflow-hidden bg-white/[0.055] backdrop-blur-sm rounded-2xl border border-white/10 p-4 shadow-sm text-[#E2E8F0] font-sans">
  <!-- Header & 3-veis sortering -->
  <div class="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-white/10 shrink-0">
    <div class="flex items-center gap-2.5">
      <div class="p-2 rounded-xl bg-[#9FE88D]/15 text-[#9FE88D] border border-[#9FE88D]/30">
        <Trophy class="w-4 h-4" />
      </div>
      <div>
        <h2 class="text-sm font-bold text-white flex items-center gap-2">
          <span>Arbeidsrom</span>
          <span class="text-[10px] px-2 py-0.5 rounded-full bg-black/20 text-[#9FE88D] font-mono font-bold border border-white/10">
            {displayedRooms.length} rom
          </span>
          <span class="text-[10px] px-2 py-0.5 rounded-full bg-black/20 text-[#AEB9CC] font-mono border border-white/10">
            GW {currentGw}
          </span>
        </h2>
        <p class="text-[11px] text-[#AEB9CC]">
          {sortBy === "season" ? "Rangert etter sesongtotal (topp 2-snitt per gameweek)" : sortBy === "month" ? "Rangert etter månedstotal (sum av topp 2-snitt per GW)" : "Rangert etter live gameweek (topp 2-snitt)"}
        </p>
      </div>
    </div>

    <!-- Handlinger: Transfer hits info og 3-veis sortering -->
    <div class="flex flex-wrap items-start gap-2">
      {#if deductHits}
        <span class="hidden md:inline-flex items-center text-[10px] text-[#F4C152] bg-[#F4C152]/10 px-2 py-0.5 rounded-full border border-[#F4C152]/30 font-semibold font-mono mt-1">
          -4p hits fratrukket
        </span>
      {/if}

      <!-- Sortering + månedsvelger i egen kolonne, så knappene ikke flytter seg -->
      <div class="flex flex-col items-end justify-start gap-1.5 h-[64px]">
        <!-- 3-veis sorterings-knapper (Live | Måned | Total) -->
        <div class="flex items-center gap-0.5 p-0.5 rounded-lg bg-black/20 border border-white/10 text-[11px]">
          <button
            onclick={() => onSelectSort("live")}
            class={`px-2.5 py-1 rounded-md font-bold transition-colors flex items-center gap-1 ${
              sortBy === "live"
                ? "bg-[#9FE88D] text-[#16380c] font-bold shadow-sm"
                : "text-[#AEB9CC] hover:text-white"
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
                : "text-[#AEB9CC] hover:text-white"
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
                : "text-[#AEB9CC] hover:text-white"
            }`}
          >
            <TrendingUp class="w-3 h-3" />
            <span>Total</span>
          </button>
        </div>

        {#if sortBy === "month" && months.length > 0}
          <select
            value={monthSelectValue}
            onchange={(e) => onSelectMonth((e.currentTarget as HTMLSelectElement).value || null)}
            class="px-2 py-1 rounded-lg bg-black/20 border border-white/10 text-[11px] font-bold text-white focus:outline-none focus:border-[#F4C152]"
          >
            {#each months as m (m.monthKey)}
              <option value={m.monthKey}>
                {m.monthName}{m.isCurrent ? " (nå)" : ""}
              </option>
            {/each}
          </select>
        {/if}
      </div>
    </div>
  </div>

  <!-- Rom-kortliste -->
  <div class="flex-1 overflow-y-auto pt-3 pb-1 space-y-2.5 pr-1 custom-scrollbar">
    {#if displayedRooms.length === 0}
      <div class="p-8 text-center bg-white/[0.04] rounded-xl border border-white/10 space-y-2">
        <AlertCircle class="w-8 h-8 text-[#AEB9CC] mx-auto" />
        <p class="text-sm font-bold text-white">Ingen rom funnet</p>
        <p class="text-xs text-[#AEB9CC]">
          Gå til "Admin" i menyen til venstre for å hente eller fordele lag inn i rommene.
        </p>
      </div>
    {/if}

    {#each displayedRooms as room, index (room._id)}
      <!-- Naturlig skillelinje etter Topp 3 -->
      {#if index === 3 && displayedRooms.length > 3}
        <div class="flex items-center gap-3 py-1 px-1 text-[#AEB9CC] text-xs font-semibold select-none">
          <div class="h-px bg-white/10 flex-1"></div>
          <span class="text-[10px] uppercase tracking-wider text-[#AEB9CC]/80 font-mono font-bold flex items-center gap-1.5 bg-black/20 px-2.5 py-0.5 rounded-full border border-white/10">
            <span>Øvrige rom (4–{displayedRooms.length})</span>
          </span>
          <div class="h-px bg-white/10 flex-1"></div>
        </div>
      {/if}

      <div
        role="button"
        tabindex="0"
        onclick={(e) => toggleExpand(room._id, e)}
        onkeydown={(e) => (e.key === "Enter" || e.key === " ") && toggleExpand(room._id, e as unknown as MouseEvent)}
        class={`p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer shadow-sm ${
          index === 0
            ? "bg-white/[0.04] border-[#F4C152]/60 hover:border-[#F4C152] ring-1 ring-[#F4C152]/20"
            : index === 1
            ? "bg-white/[0.04] border-[#CBD5E1]/40 hover:border-[#CBD5E1] ring-1 ring-[#CBD5E1]/10"
            : index === 2
            ? "bg-white/[0.04] border-[#D97706]/40 hover:border-[#D97706] ring-1 ring-[#D97706]/10"
            : "bg-white/[0.04] border-white/10 hover:border-[#4B5563]"
        }`}
      >
        <!-- Hovedrad -->
        <div class="grid items-center gap-3 grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[15rem_minmax(0,1fr)_auto]">
          <!-- Venstre: Rank + Rom-tag + Romnavn (fast bredde-kolonne) -->
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-6 text-center font-mono font-bold text-xs shrink-0">
              {#if index === 0}
                <span class="text-lg inline-block drop-shadow-sm">🥇</span>
              {:else if index === 1}
                <span class="text-lg inline-block drop-shadow-sm">🥈</span>
              {:else if index === 2}
                <span class="text-lg inline-block drop-shadow-sm">🥉</span>
              {:else}
                <span class="text-[#AEB9CC]">#{index + 1}</span>
              {/if}
            </div>

            <span
              class="text-[9px] w-[3.5rem] shrink-0 px-1 py-0.5 rounded font-bold uppercase tracking-wide border font-mono shadow-sm text-center truncate"
              style={`border-color: ${room.accentColor || "#9FE88D"}40; color: ${room.accentColor || "#9FE88D"}; background-color: ${room.accentColor || "#9FE88D"}15;`}
            >
              {room.tag ?? `A${room.roomNumber ?? index + 1}`}
            </span>

            <span class="font-bold text-white text-xs sm:text-sm truncate hover:text-[#9FE88D] transition-colors min-w-0">
              {room.name}
            </span>
          </div>

          <!-- Midten: Topp 2 spillere som danner snittet (venstrejustert, faste kolonner) -->
          <div class="hidden lg:flex items-center min-w-0">
            {#if room.top1 || room.top2}
              <div class="grid grid-cols-2 gap-2 w-full max-w-[24rem] text-xs">
                {#each [room.top1, room.top2] as t, ti}
                  {#if t}
                    <button
                      type="button"
                      onclick={(e) => { e.stopPropagation(); onOpenProfile(t.entryId); }}
                      class="flex items-center gap-1.5 min-w-0 px-2 py-1 rounded-lg bg-black/20 border border-white/10 hover:border-[#9FE88D]/50 hover:text-[#9FE88D] transition-colors text-left"
                      title={`Se profilen til ${t.managerName}`}
                    >
                      <span class="shrink-0">{ti === 0 ? "🥇" : "🥈"}</span>
                      <span class="font-semibold text-white truncate flex-1 min-w-0">{t.managerName}</span>
                      <span class="font-mono font-bold text-[#9FE88D] shrink-0">{t.effectivePoints}p</span>
                    </button>
                  {:else}
                    <span></span>
                  {/if}
                {/each}
              </div>
            {:else}
              <span class="text-xs text-[#AEB9CC] italic">Ingen spillere i rommet</span>
            {/if}
          </div>

          <!-- Høyre: Snittpoeng + Antall spillere + Ekspander -->
          <div class="flex items-center justify-self-end gap-2.5 text-right shrink-0">
            <div>
              <div class="font-mono font-bold text-sm sm:text-base text-[#9FE88D]">
                {sortBy === "season"
                  ? room.seasonTotal
                  : sortBy === "month"
                    ? room.monthTotal
                    : room.liveAverage}
                <span class="text-[10px] text-[#AEB9CC] font-normal">
                  {sortBy === "live" ? "snitt" : "totalt"}
                </span>
              </div>
              <div class="text-[10px] font-mono text-[#AEB9CC]">
                {#if sortBy === "month" && room.monthGamesPlayed > 0}
                  {room.monthGamesPlayed} {room.monthGamesPlayed === 1 ? "runde" : "runder"}
                {:else}
                  {room.teamCount} {room.teamCount === 1 ? "spiller" : "spillere"}
                {/if}
              </div>
            </div>

            <!-- Rom-info popup -->
            <button
              type="button"
              onclick={(e) => { e.stopPropagation(); onOpenRoomModal(room); }}
              class="p-1 rounded-lg text-[#AEB9CC] hover:text-white hover:bg-black/20 transition-colors"
              title="Åpne rom-info"
            >
              <Info class="w-3.5 h-3.5" />
            </button>

            <!-- Ekspander-knapp -->
            <button
              type="button"
              onclick={(e) => toggleExpand(room._id, e)}
              class="p-1 rounded-lg text-[#AEB9CC] hover:text-white hover:bg-black/20 transition-colors"
              title={expandedRooms[room._id] ? "Skjul detaljer" : "Vis detaljer"}
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
          {@const showMonthCol = sortBy === "month" && room.monthBreakdown && room.monthBreakdown.length > 0}
          <div class="mt-2.5 pt-2.5 border-t border-white/10 bg-black/20 rounded-lg p-2 animate-in fade-in duration-150">
            <div class={showMonthCol ? "grid md:grid-cols-2 gap-x-4 gap-y-3" : ""}>
              <!-- Kolonne 1: Runde-info for valgt måned -->
              {#if showMonthCol}
                <div class="space-y-1.5 md:border-r md:border-white/10/60 md:pr-4">
                  <div class="text-[10px] text-[#AEB9CC] font-semibold uppercase tracking-wide px-1">
                    Topp 2 per gameweek denne måneden
                  </div>
                  {#each room.monthBreakdown as b (b.gw)}
                    <div class="rounded-lg bg-white/[0.04] border border-white/10 px-2.5 py-1.5 text-[11px]">
                      <div class="flex items-center justify-between mb-1">
                        <span class="font-mono font-bold text-[#AEB9CC]">GW{b.gw}</span>
                        <span class="font-mono font-bold text-[#9FE88D]">
                          {b.average}<span class="text-[9px] text-[#AEB9CC] font-normal"> snitt</span>
                        </span>
                      </div>
                      {#each [b.top1, b.top2] as c, ci}
                        {#if c}
                          <button
                            type="button"
                            onclick={(e) => { e.stopPropagation(); onOpenProfile(c.entryId); }}
                            class="flex items-center gap-1 w-full min-w-0 hover:text-[#9FE88D] transition-colors"
                            title={`Se profilen til ${c.managerName}`}
                          >
                            <span class="shrink-0">{ci === 0 ? "🥇" : "🥈"}</span>
                            <span class="font-semibold text-white hover:underline truncate">{c.managerName}</span>
                            <span class="font-mono text-[#9FE88D] shrink-0 ml-auto">{c.points}p</span>
                          </button>
                        {/if}
                      {/each}
                      {#if !b.top1 && !b.top2}
                        <span class="text-[#AEB9CC] italic">Ingen data for denne gameweeken enda</span>
                      {/if}
                    </div>
                  {/each}
                  <div class="flex items-center justify-between px-1 pt-0.5 text-[11px]">
                    <span class="text-[#AEB9CC]">Totalt for måneden</span>
                    <span class="font-mono font-bold text-[#9FE88D] px-1.5 py-0.5 rounded bg-[#9FE88D]/15 border border-[#9FE88D]/40">
                      {room.monthTotal}
                    </span>
                  </div>
                </div>
              {/if}

              <!-- Kolonne 2: Manager og lag -->
              <div class="space-y-1.5 min-w-0">
                <div class="flex items-center justify-between text-[11px] text-[#AEB9CC] font-semibold px-2 pb-1">
                  <span>Manager og lag</span>
                  <span>Poeng (hits)</span>
                </div>

                {#if !room.teams || room.teams.length === 0}
                  <div class="p-3 text-center text-xs text-[#AEB9CC]">
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
                    class="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.055] border border-white/10 transition-colors text-xs cursor-pointer group"
                  >
                    <div class="flex items-center gap-2 min-w-0">
                      <span class="font-mono text-[11px] font-bold text-[#AEB9CC] w-4">
                        #{tIdx + 1}
                      </span>
                      <div class="min-w-0">
                        <span class="font-bold text-white group-hover:text-[#9FE88D] transition-colors truncate block">
                          {team.managerName}
                        </span>
                        <span class="text-[11px] text-[#AEB9CC] truncate block">
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
            </div>
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>
