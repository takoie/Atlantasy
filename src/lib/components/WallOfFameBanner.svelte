<script lang="ts">
  import {
    Crown,
    Trophy,
    Sparkles,
    ChevronRight,
    ChevronDown,
    Flame,
    Award,
    Star,
    ExternalLink,
  } from "lucide-svelte";

  let {
    roomWinner = null,
    soloWinner = null,
    announcement = null,
    onSelectRoom = (_roomId: string) => {},
    onOpenWallOfFame = () => {},
  }: {
    roomWinner?: any;
    soloWinner?: any;
    announcement?: any;
    onSelectRoom?: (roomId: string) => void;
    onOpenWallOfFame?: () => void;
  } = $props();

  let isCollapsed = $state(false);

  // Normaliser vinnere fra props
  let resolvedRoomWinner = $derived(
    roomWinner ||
      (announcement &&
      (announcement.winnerType === "room" ||
        announcement.type === "winner_celebration")
        ? announcement
        : null)
  );

  let resolvedSoloWinner = $derived(
    soloWinner ||
      (announcement &&
      (announcement.winnerType === "individual" ||
        announcement.type === "individual_winner")
        ? announcement
        : null)
  );

  let hasAnyWinner = $derived(
    Boolean(resolvedRoomWinner || resolvedSoloWinner)
  );
</script>

{#if hasAnyWinner}
  {#if isCollapsed}
    <!-- Kompakt sammenfoldet linje (DaisyUI Dim) -->
    <div
      class="flex items-center justify-between px-3.5 py-2 rounded-xl border border-[#384252] bg-[#2A303C] text-xs shadow-sm shrink-0 animate-in fade-in duration-200"
    >
      <div class="flex items-center gap-2">
        <span class="flex h-5 w-5 items-center justify-center rounded-md bg-[#F4C152] text-black font-black text-[10px]">
          🏆
        </span>
        <span class="font-bold text-[#F4C152] uppercase tracking-wider text-[10px]">
          Skrytevegg:
        </span>
        <span class="text-[#E2E8F0] text-xs">
          {#if resolvedRoomWinner}
            <strong class="text-white">{resolvedRoomWinner.winningRoom?.name || resolvedRoomWinner.winnerName || "Vinnerrom"}</strong>
          {/if}
          {#if resolvedRoomWinner && resolvedSoloWinner}
            <span class="text-[#94A3B8] mx-1">•</span>
          {/if}
          {#if resolvedSoloWinner}
            <strong class="text-[#9FE88D]">👑 {resolvedSoloWinner.winnerName || "Solovinner"}</strong>
          {/if}
        </span>
      </div>

      <div class="flex items-center gap-2">
        <button
          onclick={onOpenWallOfFame}
          class="text-[11px] text-[#F4C152] hover:text-white flex items-center gap-1 transition-colors"
        >
          <span>Historikk</span>
          <ExternalLink class="w-3 h-3" />
        </button>
        <button
          onclick={() => (isCollapsed = false)}
          class="px-2 py-0.5 rounded bg-[#242B35] hover:bg-[#384252] text-[#E2E8F0] text-[11px] font-semibold transition-colors flex items-center gap-1 border border-[#384252]"
        >
          <span>Vis skrytevegg</span>
          <ChevronDown class="w-3 h-3" />
        </button>
      </div>
    </div>
  {:else}
    <!-- Full Skrytevegg-modul (DaisyUI Dim) -->
    <div
      class="relative overflow-hidden rounded-2xl border border-[#384252] bg-[#2A303C] p-3 md:p-3.5 shadow-sm transition-all duration-300 shrink-0 space-y-2.5 text-[#E2E8F0]"
    >
      <!-- Topplinje for Skrytevegg-modul -->
      <div class="flex items-center justify-between border-b border-[#384252] pb-2">
        <div class="flex items-center gap-2">
          <div class="flex h-6 w-6 items-center justify-center rounded-lg bg-[#F4C152] text-black shadow-sm font-black">
            <Trophy class="h-3.5 w-3.5 fill-black text-black" />
          </div>
          <span class="text-xs font-bold uppercase tracking-wider text-[#F4C152] flex items-center gap-1.5">
            <span>Skrytevegg</span>
            <span class="text-[10px] text-[#94A3B8] font-normal">• Månedens kårede vinnere</span>
          </span>
          <span class="hidden sm:inline-flex items-center gap-1 rounded bg-[#F4C152]/15 px-2 py-0.5 text-[9px] font-bold text-[#F4C152] border border-[#F4C152]/30">
            <Sparkles class="h-2.5 w-2.5" />
            <span>Offisiell kåring</span>
          </span>
        </div>

        <div class="flex items-center gap-2">
          <button
            onclick={onOpenWallOfFame}
            class="px-2.5 py-1 rounded-lg bg-[#242B35] hover:bg-[#384252] text-[#E2E8F0] hover:text-white border border-[#384252] text-[11px] font-semibold transition-colors flex items-center gap-1"
          >
            <span>Se hedersvegg og historikk</span>
            <ChevronRight class="w-3 h-3" />
          </button>
          <button
            onclick={() => (isCollapsed = true)}
            title="Minimer skrytevegg"
            class="rounded-lg p-1 text-[#94A3B8] hover:bg-[#242B35] hover:text-white transition-colors"
          >
            <ChevronDown class="h-4 w-4" />
          </button>
        </div>
      </div>

      <!-- Vinner-kort Grid (Romvinner + Solovinner) -->
      <div
        class={`grid gap-2.5 ${
          resolvedRoomWinner && resolvedSoloWinner
            ? "grid-cols-1 md:grid-cols-2"
            : "grid-cols-1"
        }`}
      >
        <!-- 1. Månedens Vinnerrom -->
        {#if resolvedRoomWinner}
          <div
            class="relative overflow-hidden rounded-xl border border-[#384252] bg-[#242B35] p-3 flex flex-col justify-between space-y-2 shadow-sm hover:border-[#F4C152]/50 transition-all"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-start gap-2.5 min-w-0">
                <div
                  class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F4C152] text-black shadow-sm font-black text-sm"
                >
                  🏆
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="rounded bg-[#F4C152]/20 px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider text-[#F4C152] border border-[#F4C152]/30">
                      Månedens romvinner
                    </span>
                    {#if resolvedRoomWinner.monthName}
                      <span class="text-[10px] font-semibold text-[#94A3B8]">
                        {resolvedRoomWinner.monthName}
                      </span>
                    {/if}
                  </div>
                  <h4 class="text-sm font-bold text-white truncate mt-0.5">
                    {resolvedRoomWinner.winningRoom?.name || resolvedRoomWinner.winnerName || "Vinnerrom"}
                  </h4>
                </div>
              </div>

              {#if resolvedRoomWinner.winningScore}
                <div class="text-right shrink-0">
                  <span class="text-[9px] text-[#94A3B8] uppercase font-semibold block">Vinnende snitt</span>
                  <span class="text-xs font-mono font-bold text-[#9FE88D] bg-[#191E24] px-2 py-0.5 rounded-lg border border-[#384252] block">
                    {resolvedRoomWinner.winningScore} pts
                  </span>
                </div>
              {/if}
            </div>

            <!-- Hyllest / Melding -->
            <p class="text-xs text-[#E2E8F0] leading-snug line-clamp-2 italic">
              "{resolvedRoomWinner.content}"
            </p>

            <!-- Handlingslinje -->
            <div class="flex items-center justify-between pt-1 border-t border-[#384252] text-[11px]">
              <span class="text-[#94A3B8] flex items-center gap-1 text-[10px]">
                <Star class="w-3 h-3 text-[#F4C152] fill-[#F4C152]" />
                <span>Kåret av {resolvedRoomWinner.authorName || "Admin"}</span>
              </span>

              {#if resolvedRoomWinner.winningRoomId}
                <button
                  onclick={() => onSelectRoom(resolvedRoomWinner.winningRoomId)}
                  class="inline-flex items-center gap-1 rounded-md bg-[#2A303C] px-2 py-0.5 text-[11px] font-bold text-[#F4C152] hover:bg-[#384252] transition-colors border border-[#384252]"
                >
                  <Flame class="h-3 w-3 text-[#F4C152]" />
                  <span>Se rommet</span>
                  <ChevronRight class="h-3 w-3" />
                </button>
              {/if}
            </div>
          </div>
        {/if}

        <!-- 2. Månedens Solovinner -->
        {#if resolvedSoloWinner}
          <div
            class="relative overflow-hidden rounded-xl border border-[#384252] bg-[#242B35] p-3 flex flex-col justify-between space-y-2 shadow-sm hover:border-[#9FE88D]/50 transition-all"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-start gap-2.5 min-w-0">
                <div
                  class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#9FE88D] text-[#16380c] shadow-sm font-black text-sm"
                >
                  <Crown class="h-5 w-5 fill-[#16380c] text-[#16380c]" />
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="rounded bg-[#9FE88D]/20 px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider text-[#9FE88D] border border-[#9FE88D]/30">
                      Månedens solovinner
                    </span>
                    {#if resolvedSoloWinner.monthName}
                      <span class="text-[10px] font-semibold text-[#94A3B8]">
                        {resolvedSoloWinner.monthName}
                      </span>
                    {/if}
                  </div>
                  <h4 class="text-sm font-bold text-white truncate mt-0.5 flex items-center gap-1.5">
                    <span>{resolvedSoloWinner.winnerName || "Individuell vinner"}</span>
                    {#if resolvedSoloWinner.winnerTeamName}
                      <span class="text-xs text-[#94A3B8] font-normal">({resolvedSoloWinner.winnerTeamName})</span>
                    {/if}
                  </h4>
                </div>
              </div>

              {#if resolvedSoloWinner.winningScore}
                <div class="text-right shrink-0">
                  <span class="text-[9px] text-[#94A3B8] uppercase font-semibold block">Månedsscore</span>
                  <span class="text-xs font-mono font-bold text-[#9FE88D] bg-[#191E24] px-2 py-0.5 rounded-lg border border-[#384252] block">
                    {resolvedSoloWinner.winningScore} pts
                  </span>
                </div>
              {/if}
            </div>

            <!-- Hyllest / Melding -->
            <p class="text-xs text-[#E2E8F0] leading-snug line-clamp-2 italic">
              "{resolvedSoloWinner.content}"
            </p>

            <!-- Handlingslinje -->
            <div class="flex items-center justify-between pt-1 border-t border-[#384252] text-[11px]">
              <span class="text-[#94A3B8] flex items-center gap-1 text-[10px]">
                <Award class="w-3 h-3 text-[#9FE88D]" />
                <span>Kåret av {resolvedSoloWinner.authorName || "Admin"}</span>
              </span>

              {#if resolvedSoloWinner.winningRoomId}
                <button
                  onclick={() => onSelectRoom(resolvedSoloWinner.winningRoomId)}
                  class="inline-flex items-center gap-1 rounded-md bg-[#2A303C] px-2 py-0.5 text-[11px] font-bold text-[#9FE88D] hover:bg-[#384252] transition-colors border border-[#384252]"
                >
                  <Crown class="h-3 w-3 text-[#9FE88D]" />
                  <span>Se rommet</span>
                  <ChevronRight class="h-3 w-3" />
                </button>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}
{/if}
