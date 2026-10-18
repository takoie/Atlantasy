<script lang="ts">
  import { Crown, TrendingUp } from "lucide-svelte";

  type Accent = "default" | "winners" | "losers" | "final";

  let {
    match,
    label,
    hint1 = "Avventer kamp",
    hint2 = "Avventer kamp",
    accent = "default",
    isCurrent = false,
    luckyLoserIds = [],
    onSelect = (_match: any) => {},
  }: {
    match: any;
    label: string;
    hint1?: string;
    hint2?: string;
    accent?: Accent;
    isCurrent?: boolean;
    luckyLoserIds?: string[];
    onSelect?: (match: any) => void;
  } = $props();

  const hover: Record<Accent, string> = {
    default: "hover:border-[#9FE88D]/60 focus:ring-[#9FE88D]",
    winners: "hover:border-[#9FE88D]/60 focus:ring-[#9FE88D]",
    losers: "hover:border-[#FB6F84]/60 focus:ring-[#FB6F84]",
    final: "border-[#F4C152]/50 hover:border-[#F4C152] focus:ring-[#F4C152]",
  };

  let completed = $derived(match.status === "completed");
  let isDraw = $derived(completed && !match.winnerRoomId && !match.isBye);
  // Foreløpige poeng (server fyller `live` for uferdige kamper i en gameweek som har startet).
  let live = $derived(!completed && !match.isBye ? (match.live ?? null) : null);
  let lead = $derived(live && live.leader !== 0 ? Math.abs(live.score1 - live.score2) : 0);
  let rows = $derived([
    {
      room: match.room1,
      roomId: match.room1Id,
      score: live ? live.score1 : match.room1Score,
      leading: live?.leader === 1,
      hint: hint1,
      fallbackColor: "#1eb854",
    },
    ...(match.isBye
      ? []
      : [
          {
            room: match.room2,
            roomId: match.room2Id,
            score: live ? live.score2 : match.room2Score,
            leading: live?.leader === 2,
            hint: hint2,
            fallbackColor: "#38bdf8",
          },
        ]),
  ]);

  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
</script>

<button
  type="button"
  onclick={() => onSelect(match)}
  class={`w-full text-left p-3 rounded-xl bg-white/[0.055] backdrop-blur-sm border transition-all shadow-md focus:outline-none focus:ring-1 ${
    isCurrent && !completed ? "border-[#70E1F8]/50" : "border-white/10"
  } ${hover[accent]}`}
>
  <div class="flex items-center justify-between gap-2 text-[11px] text-[#AEB9CC] pb-2 mb-2 border-b border-white/10">
    <span class="font-semibold truncate">{label}</span>
    <span
      class={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${
        completed
          ? "text-[#9FE88D] bg-[#9FE88D]/10"
          : isCurrent
            ? "text-[#70E1F8] bg-[#70E1F8]/10"
            : "text-[#AEB9CC] bg-black/20"
      }`}
    >
      {#if live}
        <span class="inline-flex items-center gap-1">
          <span class="live-dot w-1.5 h-1.5 rounded-full bg-[#70E1F8]"></span>Live
        </span>
      {:else}
        {match.isBye ? "Videre" : isDraw ? "Uavgjort" : completed ? "Ferdig" : isCurrent ? "Neste" : "Kommende"}
      {/if}
    </span>
  </div>

  <div class="space-y-1">
    {#each rows as row}
      {@const won = !!match.winnerRoomId && row.roomId === match.winnerRoomId}
      <div
        class={`relative flex items-center justify-between gap-2 p-1.5 rounded-lg ${
          won
            ? "bg-[#9FE88D]/15 text-white font-bold"
            : row.leading
              ? "bg-[#70E1F8]/15 text-white font-bold shadow-[inset_0_0_0_1px_rgba(112,225,248,0.35)]"
              : "text-[#E2E8F0]"
        }`}
      >
        {#if row.leading}
          <span class="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-[#70E1F8]"></span>
        {/if}
        <div class="flex items-center gap-2 min-w-0">
          {#if row.room}
            <span
              class="w-2.5 h-2.5 rounded-full shrink-0"
              style={`background-color: ${row.room.accentColor || row.fallbackColor}`}
            ></span>
            <span class="text-xs truncate font-semibold">{row.room.name}</span>
            {#if row.roomId && luckyLoserIds.includes(row.roomId)}
              <span class="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#F4C152]/20 text-[#F4C152] border border-[#F4C152]/30">
                Lucky loser
              </span>
            {/if}
          {:else}
            <span class="text-xs text-[#AEB9CC] italic truncate">{row.hint}</span>
          {/if}
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          {#if won && !match.isBye}
            <Crown class="w-3 h-3 text-[#F4C152]" />
          {:else if row.leading}
            <span class="flex items-center gap-1 text-[10px] font-bold text-[#70E1F8]" title="Leder foreløpig">
              <TrendingUp class="w-3 h-3" />+{fmt(lead)}
            </span>
            <span class="w-px h-3.5 bg-[#70E1F8]/40 mx-1" aria-hidden="true"></span>
          {/if}
          <span
            class={`font-mono text-xs font-bold ${live ? (row.leading ? "text-[#70E1F8]" : "text-[#AEB9CC]") : ""}`}
            title={live ? "Foreløpig poengsum" : undefined}
          >
            {row.score !== undefined ? fmt(row.score) : "-"}
          </span>
        </div>
      </div>
    {/each}
  </div>
</button>

<style>
  .live-dot {
    animation: live-pulse 1.6s ease-in-out infinite;
  }

  @keyframes live-pulse {
    0%,
    100% {
      opacity: 1;
      box-shadow: 0 0 0 0 rgba(112, 225, 248, 0.6);
    }
    50% {
      opacity: 0.55;
      box-shadow: 0 0 0 4px rgba(112, 225, 248, 0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .live-dot {
      animation: none;
    }
  }
</style>
