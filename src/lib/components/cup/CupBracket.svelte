<script lang="ts">
  import { Trophy, Swords, Crown, ChevronLeft, ChevronRight, Info } from "lucide-svelte";
  import CupMatchCard from "./CupMatchCard.svelte";
  import CupGroupTable from "./CupGroupTable.svelte";
  import {
    layoutFor,
    groupByRound,
    matchLabel,
    shortTitle,
    buildSlotHints,
    type RoundColumn,
  } from "$lib/utils/cup";

  let {
    cup = null,
    matches = [],
    groupStandings = null,
    onSelectMatch = (_match: any) => {},
  }: {
    cup?: any;
    matches?: any[];
    groupStandings?: any[] | null;
    onSelectMatch?: (match: any) => void;
    onOpenProfile?: (entryId: number) => void;
  } = $props();

  const GROUP_COLORS = ["#9FE88D", "#38bdf8", "#F4C152", "#FB6F84", "#c084fc", "#fb923c", "#2dd4bf", "#a3e635"];

  let layout = $derived(layoutFor(cup?.format));
  let hintFor = $derived(buildSlotHints(matches, cup));
  let luckyIds = $derived<string[]>(cup?.luckyLoserRoomIds ?? []);
  let currentRound = $derived(cup?.status === "completed" ? 0 : (cup?.currentRound ?? 0));
  let columns = $derived(groupByRound(matches));

  /* ---------- Dobbel knockout: vinner- og taperbrakett side om side ---------- */
  const isWinnersSide = (m: any) => m.bracketType === "winners" || m.bracketType === "knockout";
  let winnersBand = $derived(matches.filter(isWinnersSide));
  let losersBand = $derived(matches.filter((m) => m.bracketType === "losers"));
  let finalBand = $derived(matches.filter((m) => m.bracketType === "grand_final"));

  const cellMatches = (band: any[], col: RoundColumn) =>
    band.filter((m) => m.roundNumber === col.roundNumber).sort((a, b) => a.matchIndex - b.matchIndex);

  const gridStyle = (n: number) => `grid-template-columns: repeat(${n}, 17rem);`;

  function describeColumn(col: RoundColumn) {
    const titles = (band: any[]) => [
      ...new Set(cellMatches(band, col).map((m) => shortTitle(m.roundTitle))),
    ];
    return { wb: titles(winnersBand), lb: titles(losersBand), gf: titles(finalBand) };
  }

  /* ---------- Grupper ---------- */
  let groupLetters = $derived(
    [...new Set((groupStandings ?? []).map((s) => s.group))].sort() as string[]
  );
  const tableFor = (letter: string) =>
    (groupStandings ?? [])
      .filter((s) => s.group === letter)
      .sort((a, b) => b.points - a.points || b.totalRoomScore - a.totalRoomScore || b.won - a.won);

  /* ---------- Felles ---------- */
  function columnTitle(col: RoundColumn): string {
    return [...new Set(col.matches.map((m) => shortTitle(m.roundTitle)))].join(" · ");
  }

  function accentOf(m: any): "default" | "winners" | "losers" | "final" {
    if (m.bracketType === "grand_final" || m.role === "final") return "final";
    if (m.bracketType === "losers") return "losers";
    if (layout === "double") return "winners";
    return "default";
  }

  let scroller = $state<HTMLDivElement | null>(null);
  let scrolledFor = "";

  function scrollHorizontal(amount: number) {
    scroller?.scrollBy({ left: amount, behavior: "smooth" });
  }

  // Start i riktig ende: scroll til kolonnen for aktiv runde når cupen åpnes.
  $effect(() => {
    const key = `${cup?._id}:${currentRound}`;
    if (!scroller || !currentRound || scrolledFor === key) return;
    const target = scroller.querySelector<HTMLElement>(`[data-round="${currentRound}"]`);
    if (target) {
      scroller.scrollTo({ left: Math.max(0, target.offsetLeft - 12) });
      scrolledFor = key;
    }
  });
</script>

{#snippet scrollButtons()}
  <div class="flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded-xl border border-white/10">
    <span class="text-[10px] font-bold text-[#AEB9CC] uppercase tracking-wider hidden sm:inline mr-0.5">Rull:</span>
    <button
      type="button"
      onclick={() => scrollHorizontal(-340)}
      class="p-1 rounded-lg bg-white/[0.055] hover:bg-white/10 text-[#AEB9CC] hover:text-white transition-colors"
      title="Rull mot venstre"
      aria-label="Rull mot venstre"
    >
      <ChevronLeft class="w-3.5 h-3.5" />
    </button>
    <button
      type="button"
      onclick={() => scrollHorizontal(340)}
      class="p-1 rounded-lg bg-white/[0.055] hover:bg-white/10 text-[#AEB9CC] hover:text-white transition-colors"
      title="Rull mot høyre"
      aria-label="Rull mot høyre"
    >
      <ChevronRight class="w-3.5 h-3.5" />
    </button>
  </div>
{/snippet}

{#snippet card(match: any)}
  <CupMatchCard
    {match}
    label={matchLabel(match, matches)}
    hint1={hintFor(match, 1)}
    hint2={hintFor(match, 2)}
    accent={accentOf(match)}
    isCurrent={match.roundNumber === currentRound}
    luckyLoserIds={luckyIds}
    onSelect={onSelectMatch}
  />
{/snippet}

{#snippet roundColumns(cols: RoundColumn[])}
  <div class="flex items-start gap-5 min-w-max pt-1">
    {#each cols as col (col.roundNumber)}
      {@const isKnockout = col.matches.every((m) => m.stage === "knockout")}
      <div class="w-72 flex flex-col space-y-3 shrink-0" data-round={col.roundNumber}>
        <div class={`p-2.5 rounded-xl border flex items-center justify-between gap-2 shadow-sm ${
          col.roundNumber === currentRound ? "bg-[#70E1F8]/10 border-[#70E1F8]/40" : "bg-black/20 border-white/10"
        }`}>
          <span class={`font-bold text-xs truncate ${isKnockout && layout === "groups" ? "text-[#F4C152]" : "text-[#9FE88D]"}`}>
            {columnTitle(col)}
          </span>
          <span class="shrink-0 text-[10px] font-mono font-bold text-[#F4C152] bg-[#F4C152]/10 px-2 py-0.5 rounded border border-[#F4C152]/20">
            GW {col.gameweek}
          </span>
        </div>
        <div class="space-y-3">
          {#each col.matches as match (match._id)}
            {@render card(match)}
          {/each}
        </div>
      </div>
    {/each}
  </div>
{/snippet}

<div class="space-y-5 font-sans text-[#E2E8F0] select-none">
  {#if matches.length === 0}
    <div class="p-6 rounded-2xl bg-white/[0.04] border border-white/10 text-center text-xs text-[#AEB9CC] flex items-center justify-center gap-2">
      <Info class="w-4 h-4" />
      <span>Ingen kamper er generert for denne cupen.</span>
    </div>

  <!-- ===== DOBBEL KNOCKOUT: vinner- og taperbrakett går parallelt, delt tidslinje ===== -->
  {:else if layout === "double"}
    <div class="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-white/10">
      <p class="text-[11px] text-[#AEB9CC]">
        Vinner- og taperbrakett spilles parallelt – kamper over hverandre går i samme gameweek.
      </p>
      {@render scrollButtons()}
    </div>

    <div bind:this={scroller} class="cup-scroll-container pb-3">
      <div class="min-w-max space-y-4">
        <!-- Tidslinje -->
        <div class="grid gap-5" style={gridStyle(columns.length)}>
          {#each columns as col (col.roundNumber)}
            {@const d = describeColumn(col)}
            <div
              data-round={col.roundNumber}
              class={`p-2.5 rounded-xl border space-y-1 ${
                col.roundNumber === currentRound ? "bg-[#70E1F8]/10 border-[#70E1F8]/40" : "bg-black/20 border-white/10"
              }`}
            >
              <span class="inline-block text-[10px] font-mono font-bold text-[#F4C152] bg-[#F4C152]/10 px-2 py-0.5 rounded border border-[#F4C152]/20">
                GW {col.gameweek}
              </span>
              {#each d.wb as t}
                <p class="text-[11px] font-semibold text-[#9FE88D] truncate">{t}</p>
              {/each}
              {#each d.lb as t}
                <p class="text-[11px] font-semibold text-[#FB6F84] truncate">{t}</p>
              {/each}
              {#each d.gf as t}
                <p class="text-[11px] font-semibold text-[#F4C152] truncate">{t}</p>
              {/each}
            </div>
          {/each}
        </div>

        {#each [
          { key: "wb", band: winnersBand, title: "Vinnerbrakett", sub: "Tapere faller ned i taperbraketten", color: "#9FE88D", icon: Trophy },
          { key: "lb", band: losersBand, title: "Taperbrakett", sub: "Ett tap til betyr eliminering", color: "#FB6F84", icon: Swords },
          { key: "gf", band: finalBand, title: "Grand Final", sub: "Vinner av vinnerbraketten møter vinner av taperbraketten", color: "#F4C152", icon: Crown },
        ] as section (section.key)}
          {#if section.band.length > 0}
            <div class="space-y-2">
              <div class="sticky left-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border"
                style={`color: ${section.color}; border-color: ${section.color}40; background-color: ${section.color}15`}>
                <section.icon class="w-3.5 h-3.5" />
                <span class="text-xs font-bold uppercase tracking-wider">{section.title}</span>
                <span class="text-[11px] text-[#AEB9CC] normal-case font-normal hidden sm:inline">{section.sub}</span>
              </div>
              <div class="grid gap-5 items-start" style={gridStyle(columns.length)}>
                {#each columns as col (col.roundNumber)}
                  <div class="space-y-3">
                    {#each cellMatches(section.band, col) as match (match._id)}
                      {@render card(match)}
                    {/each}
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        {/each}
      </div>
    </div>

  <!-- ===== GRUPPESPILL / SERIE: tabeller + kampprogram ===== -->
  {:else if layout === "groups"}
    {#if groupLetters.length > 0}
      <div class={`grid gap-4 ${groupLetters.length === 1 ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2"}`}>
        {#each groupLetters as letter, i (letter)}
          <CupGroupTable
            {letter}
            rows={tableFor(letter)}
            advance={groupLetters.length >= 2 ? 2 : 1}
            color={GROUP_COLORS[i % GROUP_COLORS.length]}
            singleTable={groupLetters.length === 1}
          />
        {/each}
      </div>
    {/if}

    <div class="space-y-3">
      <div class="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-white/10">
        <h4 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <Trophy class="w-4 h-4 text-[#F4C152]" />
          <span>Kampprogram{groupLetters.length >= 2 ? " og playoffs" : ""}</span>
        </h4>
        {@render scrollButtons()}
      </div>
      <div bind:this={scroller} class="cup-scroll-container pb-3">
        {@render roundColumns(columns)}
      </div>
    </div>

  <!-- ===== KNOCKOUT / LUCKY LOSER ===== -->
  {:else}
    <div class="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-white/10">
      <p class="text-[11px] text-[#AEB9CC]">
        {#if cup?.format === "lucky_loser" || cup?.format === "lucky_loser_12"}
          Alle spiller runde 1. Vinnerne og de beste taperne (lucky losers) går videre til utslagsrundene.
        {:else}
          Vinnerne avanserer til neste runde. Topp 2-snittet per rom avgjør hver kamp.
        {/if}
      </p>
      {@render scrollButtons()}
    </div>
    <div bind:this={scroller} class="cup-scroll-container pb-3">
      {@render roundColumns(columns)}
    </div>
  {/if}
</div>

<style>
  .cup-scroll-container {
    position: relative; /* offsetLeft for rundekolonnene måles mot denne */
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: thin;
    scrollbar-color: #9fe88d #141b27;
    padding-bottom: 6px;
  }

  .cup-scroll-container::-webkit-scrollbar {
    height: 10px;
  }

  .cup-scroll-container::-webkit-scrollbar-track {
    background: #141b27;
    border-radius: 8px;
    border: 1px solid #2c3850;
  }

  .cup-scroll-container::-webkit-scrollbar-thumb {
    background: #9fe88d;
    border-radius: 8px;
    border: 2px solid #141b27;
  }

  .cup-scroll-container::-webkit-scrollbar-thumb:hover {
    background: #bbf7ab;
  }
</style>
