<script lang="ts">
  import { Crown } from "lucide-svelte";

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
  let rows = $derived([
    {
      room: match.room1,
      roomId: match.room1Id,
      score: match.room1Score,
      hint: hint1,
      fallbackColor: "#1eb854",
    },
    ...(match.isBye
      ? []
      : [
          {
            room: match.room2,
            roomId: match.room2Id,
            score: match.room2Score,
            hint: hint2,
            fallbackColor: "#38bdf8",
          },
        ]),
  ]);
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
      {match.isBye ? "Videre" : isDraw ? "Uavgjort" : completed ? "Ferdig" : isCurrent ? "Neste" : "Kommende"}
    </span>
  </div>

  <div class="space-y-1">
    {#each rows as row}
      {@const won = !!match.winnerRoomId && row.roomId === match.winnerRoomId}
      <div
        class={`flex items-center justify-between gap-2 p-1.5 rounded-lg ${
          won ? "bg-[#9FE88D]/15 text-white font-bold" : "text-[#E2E8F0]"
        }`}
      >
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
          {/if}
          <span class="font-mono text-xs font-bold">{row.score !== undefined ? row.score : "-"}</span>
        </div>
      </div>
    {/each}
  </div>
</button>
