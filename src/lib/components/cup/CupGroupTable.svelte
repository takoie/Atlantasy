<script lang="ts">
  import { Users } from "lucide-svelte";

  let {
    letter,
    rows,
    advance = 2,
    color = "#9FE88D",
    singleTable = false,
  }: {
    letter: string;
    rows: any[];
    /** Antall plasser (fra toppen) som går videre. */
    advance?: number;
    color?: string;
    singleTable?: boolean;
  } = $props();
</script>

<div class="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-3 shadow-md min-w-0">
  <div class="flex items-center justify-between pb-2 border-b border-white/10">
    <h4 class="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={`color: ${color}`}>
      <Users class="w-4 h-4" />
      <span>{singleTable ? "Tabell" : `Gruppe ${letter}`}</span>
    </h4>
    {#if advance > 0}
      <span class="text-[11px] text-[#AEB9CC]">Topp {advance} videre</span>
    {/if}
  </div>

  <div class="overflow-x-auto">
    <table class="w-full text-xs text-left border-collapse min-w-[320px]">
      <thead>
        <tr class="text-[#AEB9CC] border-b border-white/10">
          <th class="py-1.5 px-2">#</th>
          <th class="py-1.5 px-2">Rom</th>
          <th class="py-1.5 px-2 text-center" title="Kamper">K</th>
          <th class="py-1.5 px-2 text-center" title="Seier">V</th>
          <th class="py-1.5 px-2 text-center" title="Uavgjort">U</th>
          <th class="py-1.5 px-2 text-center" title="Tap">T</th>
          <th class="py-1.5 px-2 text-right" title="Sum av romsnitt">Sum</th>
          <th class="py-1.5 px-2 text-right font-bold text-[#F4C152]" title="Poeng">P</th>
        </tr>
      </thead>
      <tbody>
        {#each rows as row, i}
          <tr
            class="border-b border-white/5 transition-colors"
            class:font-bold={i < advance}
            style={i < advance ? `background-color: ${color}1a` : ""}
          >
            <td class="py-2 px-2 text-[#AEB9CC]">{i + 1}</td>
            <td class="py-2 px-2 text-white max-w-[140px]">
              <span class="flex items-center gap-1.5 min-w-0">
                <span class="w-2 h-2 rounded-full shrink-0" style={`background-color: ${row.room?.accentColor || color}`}></span>
                <span class="truncate">{row.room?.name || "Rom"}</span>
              </span>
            </td>
            <td class="py-2 px-2 text-center">{row.played}</td>
            <td class="py-2 px-2 text-center text-[#9FE88D]">{row.won}</td>
            <td class="py-2 px-2 text-center text-[#AEB9CC]">{row.drawn}</td>
            <td class="py-2 px-2 text-center text-[#FB6F84]">{row.lost}</td>
            <td class="py-2 px-2 text-right font-mono text-[#AEB9CC]">{row.totalRoomScore}</td>
            <td class="py-2 px-2 text-right font-mono font-bold text-[#F4C152]">{row.points}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
