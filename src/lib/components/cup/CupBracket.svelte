<script lang="ts">
  import {
    Trophy,
    Crown,
    Swords,
    Layers,
    Users,
    ChevronLeft,
    ChevronRight,
  } from "lucide-svelte";

  let {
    cup = null,
    matches = [],
    groupStandings = null,
    onSelectMatch = (_match: any) => {},
    onOpenProfile = (_entryId: number) => {},
  }: {
    cup?: any;
    matches?: any[];
    groupStandings?: any[] | null;
    onSelectMatch?: (match: any) => void;
    onOpenProfile?: (entryId: number) => void;
  } = $props();

  function scrollHorizontal(id: string, amount: number) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollBy({ left: amount, behavior: "smooth" });
    }
  }

  let activeBracketTab = $state<"all" | "winners" | "losers" | "finals">("all");
  let activeGroupTab = $state<"all" | "A" | "B" | "playoffs">("all");

  let format = $derived(cup?.format || "lucky_loser_12");
  let isDoubleElimination = $derived(format === "double_elimination_12");
  let isGroupStage = $derived(format === "group_stage_12");

  // Grupper for Double Elimination
  let winnersMatches = $derived(matches.filter((m) => m.bracketType === "winners"));
  let losersMatches = $derived(matches.filter((m) => m.bracketType === "losers"));
  let finalMatches = $derived(
    matches.filter(
      (m) => m.bracketType === "grand_final" || m.bracketType === "grand_final_reset" || m.roundTitle?.includes("Grand Final")
    )
  );

  // Renser og forenkler rundetitler slik at unødvendige parenteser fjernes
  function cleanRoundHeader(roundNum: number, roundMatches: any[], isLoser = false): string {
    const cupRound = cup?.rounds?.find((r: any) => r.roundNumber === roundNum);
    if (cupRound?.roundTitle) {
      const parts = cupRound.roundTitle.split(":");
      if (parts.length > 1) {
        const afterColon = parts[1].replace(/\s*\([^)]*\)/g, "").trim();
        if (afterColon) return afterColon;
      }
      const cleaned = cupRound.roundTitle.replace(/\s*\([^)]*\)/g, "").trim();
      if (cleaned) return cleaned;
    }
    const raw = roundMatches[0]?.roundTitle || "";
    const cleaned = raw.replace(/\s*\([^)]*\)/g, "").replace(/\s*-\s*Kamp\s*\d+/i, "").replace(/\s*Kamp\s*\d+/i, "").trim();
    if (cleaned && !cleaned.toLowerCase().startsWith("kamp")) {
      return cleaned;
    }
    return isLoser ? `Taperrunde ${roundNum}` : `Runde ${roundNum}`;
  }

  // Renser og forenkler kamptitler slik at (Seed 1 vs 12) eller (Vinner K1 vs Vinner K6) fjernes
  function cleanMatchTitle(match: any): string {
    if (!match?.roundTitle) return `Kamp ${match?.matchIndex || 1}`;
    const clean = match.roundTitle.replace(/\s*\([^)]*\)/g, "").trim();
    return clean || `Kamp ${match.matchIndex || 1}`;
  }

  // Knockout / Single-elimination / Lucky Loser runder
  let knockoutRounds = $derived.by(() => {
    const roundsMap = new Map<number, any[]>();
    for (const m of matches) {
      if (isGroupStage && m.stage === "group") continue;
      const list = roundsMap.get(m.roundNumber) || [];
      list.push(m);
      roundsMap.set(m.roundNumber, list);
    }
    return Array.from(roundsMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([roundNum, roundMatches]) => ({
        roundNum,
        title: cleanRoundHeader(roundNum, roundMatches, false),
        gameweek: roundMatches[0]?.gameweek || 1,
        matches: roundMatches.sort((a, b) => a.matchIndex - b.matchIndex),
      }));
  });

  // DE Vinnerrunder
  let winnersRounds = $derived.by(() => {
    const roundsMap = new Map<number, any[]>();
    for (const m of winnersMatches) {
      const list = roundsMap.get(m.roundNumber) || [];
      list.push(m);
      roundsMap.set(m.roundNumber, list);
    }
    return Array.from(roundsMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([roundNum, roundMatches]) => ({
        roundNum,
        title: cleanRoundHeader(roundNum, roundMatches, false),
        gameweek: roundMatches[0]?.gameweek || 1,
        matches: roundMatches.sort((a, b) => a.matchIndex - b.matchIndex),
      }));
  });

  // DE Taperrunder
  let losersRounds = $derived.by(() => {
    const roundsMap = new Map<number, any[]>();
    for (const m of losersMatches) {
      const list = roundsMap.get(m.roundNumber) || [];
      list.push(m);
      roundsMap.set(m.roundNumber, list);
    }
    return Array.from(roundsMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([roundNum, roundMatches]) => ({
        roundNum,
        title: cleanRoundHeader(roundNum, roundMatches, true),
        gameweek: roundMatches[0]?.gameweek || 1,
        matches: roundMatches.sort((a, b) => a.matchIndex - b.matchIndex),
      }));
  });

  // Gruppespilltabeller
  let groupAStandings = $derived(
    (groupStandings || [])
      .filter((s) => s.group === "A")
      .sort((a, b) => b.points - a.points || b.totalRoomScore - a.totalRoomScore)
  );
  let groupBStandings = $derived(
    (groupStandings || [])
      .filter((s) => s.group === "B")
      .sort((a, b) => b.points - a.points || b.totalRoomScore - a.totalRoomScore)
  );
</script>

<div class="space-y-5 font-sans text-[#E2E8F0] select-none">
  <!-- FORMAT 1 & 3: KNOCKOUT / LUCKY LOSER / TOPP 8 TRE -->
  {#if !isDoubleElimination && !isGroupStage}
    <div class="space-y-4">
      <!-- Format Header & Badge -->
      <div class="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-white/10">
        <div class="flex items-center gap-2">
          <div class="p-1.5 rounded-lg bg-[#9FE88D]/15 text-[#9FE88D] border border-[#9FE88D]/30">
            <Trophy class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-white uppercase tracking-wider">
              {format === "lucky_loser_12" ? "12 lag: 6 kamper + 2 lucky losers til kvartfinale" : "Playoffstre"}
            </h3>
            <p class="text-[11px] text-[#AEB9CC]">
              {format === "lucky_loser_12" ? "Alle 12 lag spiller i R1. De 6 vinnerne + 2 beste tapere (Lucky Losers) går til kvartfinalene." : "Vinnerne avanserer til neste runde."}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <div class="flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded-xl border border-white/10">
            <span class="text-[10px] font-bold text-[#AEB9CC] uppercase tracking-wider hidden sm:inline mr-0.5">Rull:</span>
            <button
              type="button"
              onclick={() => scrollHorizontal("bracket-scroll-knockout", -320)}
              class="p-1 rounded-lg bg-white/[0.055] backdrop-blur-sm hover:bg-white/10 text-[#AEB9CC] hover:text-white transition-colors"
              title="Rull mot venstre"
            >
              <ChevronLeft class="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onclick={() => scrollHorizontal("bracket-scroll-knockout", 320)}
              class="p-1 rounded-lg bg-white/[0.055] backdrop-blur-sm hover:bg-white/10 text-[#AEB9CC] hover:text-white transition-colors"
              title="Rull mot høyre"
            >
              <ChevronRight class="w-3.5 h-3.5" />
            </button>
          </div>

          <div class="flex items-center gap-2 text-xs text-[#AEB9CC]">
            <span class="inline-block w-2 h-2 rounded-full bg-[#9FE88D]"></span>
            <span>Topp 2-snitt per rom avgjør</span>
          </div>
        </div>
      </div>

      <!-- Horisontal rullekolonne for runder -->
      <div id="bracket-scroll-knockout" class="cup-scroll-container pb-4">
        <div class="flex items-start gap-6 min-w-max pt-2">
          {#each knockoutRounds as round}
            <div class="w-72 flex flex-col space-y-3 shrink-0">
              <!-- Rundetittel -->
              <div class="p-2.5 rounded-xl bg-black/20 border border-white/10 flex items-center justify-between shadow-sm">
                <span class="font-bold text-xs text-[#9FE88D]">
                  {round.title}
                </span>
                <span class="text-[10px] font-mono font-bold text-[#F4C152] bg-[#F4C152]/10 px-2 py-0.5 rounded border border-[#F4C152]/20">
                  GW {round.gameweek}
                </span>
              </div>

              <!-- Matchkort i denne runden -->
              <div class="space-y-4">
                {#each round.matches as match}
                  <button
                    type="button"
                    onclick={() => onSelectMatch(match)}
                    class="w-full text-left p-3 rounded-xl bg-white/[0.055] backdrop-blur-sm hover:bg-white/[0.06] border border-white/10 hover:border-[#9FE88D]/60 transition-all shadow-md group relative overflow-hidden focus:outline-none focus:ring-1 focus:ring-[#9FE88D]"
                  >
                    <!-- Match Header -->
                    <div class="flex items-center justify-between text-[11px] text-[#AEB9CC] pb-2 mb-2 border-b border-white/10/50">
                      <span class="font-semibold truncate max-w-[150px]">
                        {cleanMatchTitle(match)}
                      </span>
                      <span
                        class={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          match.status === "completed"
                            ? "text-[#9FE88D] bg-[#9FE88D]/10"
                            : match.status === "live"
                            ? "text-[#70E1F8] bg-[#70E1F8]/10 animate-pulse"
                            : "text-[#AEB9CC] bg-black/20"
                        }`}
                      >
                        {match.status === "completed" ? "Ferdig" : match.status === "live" ? "Live" : "Kommende"}
                      </span>
                    </div>

                    <!-- Rom 1 rad -->
                    <div
                      class={`flex items-center justify-between p-1.5 rounded-lg transition-colors ${
                        match.winnerRoomId && match.room1Id === match.winnerRoomId
                          ? "bg-[#9FE88D]/15 text-white font-bold"
                          : "text-[#E2E8F0]"
                      }`}
                    >
                      <div class="flex items-center gap-2 min-w-0">
                        {#if match.room1}
                          <span
                            class="w-2.5 h-2.5 rounded-full shrink-0"
                            style={`background-color: ${match.room1.accentColor || "#1eb854"}`}
                          ></span>
                          <span class="text-xs truncate font-semibold">
                            {match.room1.name}
                          </span>
                        {:else}
                          <span class="text-xs text-[#AEB9CC] italic truncate">
                            Avventer kamp...
                          </span>
                        {/if}
                      </div>

                      <div class="flex items-center gap-1.5">
                        {#if match.winnerRoomId && match.room1Id === match.winnerRoomId}
                          <Crown class="w-3 h-3 text-[#F4C152]" />
                        {/if}
                        <span class="font-mono text-xs font-bold">
                          {match.room1Score !== undefined ? `${match.room1Score}` : "-"}
                        </span>
                      </div>
                    </div>

                    <!-- Rom 2 rad -->
                    <div
                      class={`flex items-center justify-between p-1.5 rounded-lg mt-1 transition-colors ${
                        match.winnerRoomId && match.room2Id === match.winnerRoomId
                          ? "bg-[#9FE88D]/15 text-white font-bold"
                          : "text-[#E2E8F0]"
                      }`}
                    >
                      <div class="flex items-center gap-2 min-w-0">
                        {#if match.room2}
                          <span
                            class="w-2.5 h-2.5 rounded-full shrink-0"
                            style={`background-color: ${match.room2.accentColor || "#38bdf8"}`}
                          ></span>
                          <span class="text-xs truncate font-semibold">
                            {match.room2.name}
                          </span>
                        {:else}
                          <span class="text-xs text-[#AEB9CC] italic truncate">
                            Avventer kamp...
                          </span>
                        {/if}
                      </div>

                      <div class="flex items-center gap-1.5">
                        {#if match.isLuckyLoser}
                          <span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#F4C152]/20 text-[#F4C152] border border-[#F4C152]/30">
                            Lucky Loser
                          </span>
                        {/if}
                        {#if match.winnerRoomId && match.room2Id === match.winnerRoomId}
                          <Crown class="w-3 h-3 text-[#F4C152]" />
                        {/if}
                        <span class="font-mono text-xs font-bold">
                          {match.room2Score !== undefined ? `${match.room2Score}` : "-"}
                        </span>
                      </div>
                    </div>
                  </button>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>

  <!-- FORMAT 2: DOUBLE ELIMINATION (CHALLONGE-STIL) -->
  {:else if isDoubleElimination}
    <!-- Brakett-velger Tabs -->
    <div class="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-white/10">
      <div class="flex items-center gap-1.5 p-1 bg-black/20 rounded-xl border border-white/10">
        <button
          onclick={() => (activeBracketTab = "all")}
          class={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeBracketTab === "all"
              ? "bg-white/[0.055] backdrop-blur-sm text-white shadow-sm border border-white/10"
              : "text-[#AEB9CC] hover:text-white"
          }`}
        >
          <Layers class="w-3.5 h-3.5" />
          <span>Full brakettoversikt</span>
        </button>

        <button
          onclick={() => (activeBracketTab = "winners")}
          class={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeBracketTab === "winners"
              ? "bg-[#9FE88D]/20 text-[#9FE88D] shadow-sm border border-[#9FE88D]/40"
              : "text-[#AEB9CC] hover:text-[#9FE88D]"
          }`}
        >
          <Trophy class="w-3.5 h-3.5 text-[#9FE88D]" />
          <span>Winners bracket (WB)</span>
        </button>

        <button
          onclick={() => (activeBracketTab = "losers")}
          class={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeBracketTab === "losers"
              ? "bg-[#FB6F84]/20 text-[#FB6F84] shadow-sm border border-[#FB6F84]/40"
              : "text-[#AEB9CC] hover:text-[#FB6F84]"
          }`}
        >
          <Swords class="w-3.5 h-3.5 text-[#FB6F84]" />
          <span>Losers bracket (LB)</span>
        </button>

        <button
          onclick={() => (activeBracketTab = "finals")}
          class={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeBracketTab === "finals"
              ? "bg-[#F4C152]/20 text-[#F4C152] shadow-sm border border-[#F4C152]/40"
              : "text-[#AEB9CC] hover:text-[#F4C152]"
          }`}
        >
          <Crown class="w-3.5 h-3.5 text-[#F4C152]" />
          <span>Grand Final</span>
        </button>
      </div>

      <div class="flex items-center gap-2 text-xs text-[#AEB9CC]">
        <span class="inline-block w-2 h-2 rounded-full bg-[#9FE88D]"></span>
        <span>Topp 2-snitt avgjør hver match</span>
      </div>
    </div>

    <!-- Seksjon 1: Winners bracket (Winners Bracket) -->
    {#if activeBracketTab === "all" || activeBracketTab === "winners"}
      <div class="space-y-3 bg-white/[0.04] p-4 rounded-2xl border border-white/10">
        <div class="flex items-center justify-between pb-2 border-b border-white/10/60">
          <div class="flex items-center gap-2">
            <div class="p-1.5 rounded-lg bg-[#9FE88D]/15 text-[#9FE88D] border border-[#9FE88D]/30">
              <Trophy class="w-4 h-4" />
            </div>
            <div>
              <h3 class="text-sm font-bold text-white uppercase tracking-wider">
                Winners bracket (Winners Bracket)
              </h3>
              <p class="text-[11px] text-[#AEB9CC]">
                Vinnere avanserer oppover i treet. Tapere faller ned til taperbraketten.
              </p>
            </div>
          </div>

          <div class="flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded-xl border border-white/10">
            <span class="text-[10px] font-bold text-[#AEB9CC] uppercase tracking-wider hidden sm:inline mr-0.5">Rull:</span>
            <button
              type="button"
              onclick={() => scrollHorizontal("bracket-scroll-winners", -320)}
              class="p-1 rounded-lg bg-white/[0.055] backdrop-blur-sm hover:bg-white/10 text-[#AEB9CC] hover:text-white transition-colors"
              title="Rull mot venstre"
            >
              <ChevronLeft class="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onclick={() => scrollHorizontal("bracket-scroll-winners", 320)}
              class="p-1 rounded-lg bg-white/[0.055] backdrop-blur-sm hover:bg-white/10 text-[#AEB9CC] hover:text-white transition-colors"
              title="Rull mot høyre"
            >
              <ChevronRight class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div id="bracket-scroll-winners" class="cup-scroll-container pb-4">
          <div class="flex items-start gap-5 min-w-max pt-2">
            {#each winnersRounds as round}
              <div class="w-72 flex flex-col space-y-3 shrink-0">
                <div class="p-2.5 rounded-xl bg-black/20 border border-white/10 flex items-center justify-between shadow-sm">
                  <span class="font-bold text-xs text-[#9FE88D]">{round.title}</span>
                  <span class="text-[10px] font-mono font-bold text-[#F4C152] bg-[#F4C152]/10 px-2 py-0.5 rounded border border-[#F4C152]/20">
                    GW {round.gameweek}
                  </span>
                </div>

                <div class="space-y-4">
                  {#each round.matches as match}
                    <button
                      type="button"
                      onclick={() => onSelectMatch(match)}
                      class="w-full text-left p-3 rounded-xl bg-white/[0.055] backdrop-blur-sm hover:bg-white/[0.06] border border-white/10 hover:border-[#9FE88D]/60 transition-all shadow-md group relative overflow-hidden focus:outline-none focus:ring-1 focus:ring-[#9FE88D]"
                    >
                      <div class="flex items-center justify-between text-[11px] text-[#AEB9CC] pb-2 mb-2 border-b border-white/10/50">
                        <span class="font-semibold truncate max-w-[150px]">{cleanMatchTitle(match)}</span>
                        <span class={`text-[10px] font-bold px-1.5 py-0.5 rounded ${match.status === "completed" ? "text-[#9FE88D] bg-[#9FE88D]/10" : "text-[#AEB9CC] bg-black/20"}`}>
                          {match.status === "completed" ? "Ferdig" : "Kommende"}
                        </span>
                      </div>

                      <div class={`flex items-center justify-between p-1.5 rounded-lg transition-colors ${match.winnerRoomId && match.room1Id === match.winnerRoomId ? "bg-[#9FE88D]/15 text-white font-bold" : "text-[#E2E8F0]"}`}>
                        <div class="flex items-center gap-2 min-w-0">
                          {#if match.room1}
                            <span class="w-2.5 h-2.5 rounded-full shrink-0" style={`background-color: ${match.room1.accentColor || "#1eb854"}`}></span>
                            <span class="text-xs truncate font-semibold">{match.room1.name}</span>
                          {:else}
                            <span class="text-xs text-[#AEB9CC] italic truncate">Avventer kamp...</span>
                          {/if}
                        </div>
                        <div class="flex items-center gap-1.5">
                          {#if match.winnerRoomId && match.room1Id === match.winnerRoomId}<Crown class="w-3 h-3 text-[#F4C152]" />{/if}
                          <span class="font-mono text-xs font-bold">{match.room1Score !== undefined ? `${match.room1Score}` : "-"}</span>
                        </div>
                      </div>

                      <div class={`flex items-center justify-between p-1.5 rounded-lg mt-1 transition-colors ${match.winnerRoomId && match.room2Id === match.winnerRoomId ? "bg-[#9FE88D]/15 text-white font-bold" : "text-[#E2E8F0]"}`}>
                        <div class="flex items-center gap-2 min-w-0">
                          {#if match.room2}
                            <span class="w-2.5 h-2.5 rounded-full shrink-0" style={`background-color: ${match.room2.accentColor || "#38bdf8"}`}></span>
                            <span class="text-xs truncate font-semibold">{match.room2.name}</span>
                          {:else}
                            <span class="text-xs text-[#AEB9CC] italic truncate">Avventer kamp...</span>
                          {/if}
                        </div>
                        <div class="flex items-center gap-1.5">
                          {#if match.winnerRoomId && match.room2Id === match.winnerRoomId}<Crown class="w-3 h-3 text-[#F4C152]" />{/if}
                          <span class="font-mono text-xs font-bold">{match.room2Score !== undefined ? `${match.room2Score}` : "-"}</span>
                        </div>
                      </div>
                    </button>
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>
    {/if}

    <!-- Seksjon 2: Losers bracket (Losers Bracket) -->
    {#if activeBracketTab === "all" || activeBracketTab === "losers"}
      <div class="space-y-3 bg-white/[0.04] p-4 rounded-2xl border border-white/10">
        <div class="flex items-center justify-between pb-2 border-b border-white/10/60">
          <div class="flex items-center gap-2">
            <div class="p-1.5 rounded-lg bg-[#FB6F84]/15 text-[#FB6F84] border border-[#FB6F84]/30">
              <Swords class="w-4 h-4" />
            </div>
            <div>
              <h3 class="text-sm font-bold text-white uppercase tracking-wider">
                Losers bracket (Losers Bracket)
              </h3>
              <p class="text-[11px] text-[#AEB9CC]">
                Tapere fra vinnerbraketten får en siste sjanse. Nytt tap betyr eliminering.
              </p>
            </div>
          </div>

          <div class="flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded-xl border border-white/10">
            <span class="text-[10px] font-bold text-[#AEB9CC] uppercase tracking-wider hidden sm:inline mr-0.5">Rull:</span>
            <button
              type="button"
              onclick={() => scrollHorizontal("bracket-scroll-losers", -320)}
              class="p-1 rounded-lg bg-white/[0.055] backdrop-blur-sm hover:bg-white/10 text-[#AEB9CC] hover:text-white transition-colors"
              title="Rull mot venstre"
            >
              <ChevronLeft class="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onclick={() => scrollHorizontal("bracket-scroll-losers", 320)}
              class="p-1 rounded-lg bg-white/[0.055] backdrop-blur-sm hover:bg-white/10 text-[#AEB9CC] hover:text-white transition-colors"
              title="Rull mot høyre"
            >
              <ChevronRight class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div id="bracket-scroll-losers" class="cup-scroll-container pb-4">
          <div class="flex items-start gap-5 min-w-max pt-2">
            {#each losersRounds as round}
              <div class="w-72 flex flex-col space-y-3 shrink-0">
                <div class="p-2.5 rounded-xl bg-black/20 border border-white/10 flex items-center justify-between shadow-sm">
                  <span class="font-bold text-xs text-[#FB6F84]">{round.title}</span>
                  <span class="text-[10px] font-mono font-bold text-[#F4C152] bg-[#F4C152]/10 px-2 py-0.5 rounded border border-[#F4C152]/20">
                    GW {round.gameweek}
                  </span>
                </div>

                <div class="space-y-4">
                  {#each round.matches as match}
                    <button
                      type="button"
                      onclick={() => onSelectMatch(match)}
                      class="w-full text-left p-3 rounded-xl bg-white/[0.055] backdrop-blur-sm hover:bg-white/[0.06] border border-white/10 hover:border-[#FB6F84]/60 transition-all shadow-md group relative overflow-hidden focus:outline-none focus:ring-1 focus:ring-[#FB6F84]"
                    >
                      <div class="flex items-center justify-between text-[11px] text-[#AEB9CC] pb-2 mb-2 border-b border-white/10/50">
                        <span class="font-semibold truncate max-w-[150px]">{cleanMatchTitle(match)}</span>
                        <span class={`text-[10px] font-bold px-1.5 py-0.5 rounded ${match.status === "completed" ? "text-[#9FE88D] bg-[#9FE88D]/10" : "text-[#AEB9CC] bg-black/20"}`}>
                          {match.status === "completed" ? "Ferdig" : "Kommende"}
                        </span>
                      </div>

                      <div class={`flex items-center justify-between p-1.5 rounded-lg transition-colors ${match.winnerRoomId && match.room1Id === match.winnerRoomId ? "bg-[#9FE88D]/15 text-white font-bold" : "text-[#E2E8F0]"}`}>
                        <div class="flex items-center gap-2 min-w-0">
                          {#if match.room1}
                            <span class="w-2.5 h-2.5 rounded-full shrink-0" style={`background-color: ${match.room1.accentColor || "#1eb854"}`}></span>
                            <span class="text-xs truncate font-semibold">{match.room1.name}</span>
                          {:else}
                            <span class="text-xs text-[#AEB9CC] italic truncate">Avventer kamp...</span>
                          {/if}
                        </div>
                        <div class="flex items-center gap-1.5">
                          {#if match.winnerRoomId && match.room1Id === match.winnerRoomId}<Crown class="w-3 h-3 text-[#F4C152]" />{/if}
                          <span class="font-mono text-xs font-bold">{match.room1Score !== undefined ? `${match.room1Score}` : "-"}</span>
                        </div>
                      </div>

                      <div class={`flex items-center justify-between p-1.5 rounded-lg mt-1 transition-colors ${match.winnerRoomId && match.room2Id === match.winnerRoomId ? "bg-[#9FE88D]/15 text-white font-bold" : "text-[#E2E8F0]"}`}>
                        <div class="flex items-center gap-2 min-w-0">
                          {#if match.room2}
                            <span class="w-2.5 h-2.5 rounded-full shrink-0" style={`background-color: ${match.room2.accentColor || "#38bdf8"}`}></span>
                            <span class="text-xs truncate font-semibold">{match.room2.name}</span>
                          {:else}
                            <span class="text-xs text-[#AEB9CC] italic truncate">Avventer kamp...</span>
                          {/if}
                        </div>
                        <div class="flex items-center gap-1.5">
                          {#if match.winnerRoomId && match.room2Id === match.winnerRoomId}<Crown class="w-3 h-3 text-[#F4C152]" />{/if}
                          <span class="font-mono text-xs font-bold">{match.room2Score !== undefined ? `${match.room2Score}` : "-"}</span>
                        </div>
                      </div>
                    </button>
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>
    {/if}

    <!-- Seksjon 3: Grand Final (Grand Final) -->
    {#if activeBracketTab === "all" || activeBracketTab === "finals"}
      {#if finalMatches.length > 0}
        <div class="p-5 rounded-2xl bg-gradient-to-r from-[#F4C152]/10 via-white/[0.04] to-[#9FE88D]/10 border border-[#F4C152]/40 shadow-xl space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-white/10">
            <div class="flex items-center gap-2.5">
              <div class="p-2 rounded-xl bg-[#F4C152]/20 text-[#F4C152] border border-[#F4C152]/40">
                <Crown class="w-5 h-5" />
              </div>
              <div>
                <h3 class="text-base font-bold text-white flex items-center gap-2">
                  🏆 Den store cupfinalen (Grand Final)
                </h3>
                <p class="text-xs text-[#AEB9CC]">Vinneren av vinnerbraketten møter vinneren av taperbraketten</p>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            {#each finalMatches as match}
              <button
                type="button"
                onclick={() => onSelectMatch(match)}
                class="p-4 rounded-xl bg-white/[0.055] backdrop-blur-sm hover:bg-white/[0.06] border border-[#F4C152]/50 transition-all text-left shadow-lg"
              >
                <div class="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                  <span class="text-xs font-bold text-[#F4C152]">{cleanMatchTitle(match)}</span>
                  <span class="text-[11px] font-mono text-white bg-black/20 px-2 py-0.5 rounded border border-white/10">
                    GW {match.gameweek}
                  </span>
                </div>

                <div class="space-y-2">
                  <div class={`p-2.5 rounded-lg flex items-center justify-between ${match.winnerRoomId && match.room1Id === match.winnerRoomId ? "bg-[#9FE88D]/20 text-white font-bold" : "text-[#E2E8F0]"}`}>
                    <span class="font-semibold text-xs truncate">{match.room1?.name || "Vinner av WB"}</span>
                    <span class="font-mono text-sm font-bold">{match.room1Score !== undefined ? `${match.room1Score}p` : "-"}</span>
                  </div>
                  <div class={`p-2.5 rounded-lg flex items-center justify-between ${match.winnerRoomId && match.room2Id === match.winnerRoomId ? "bg-[#9FE88D]/20 text-white font-bold" : "text-[#E2E8F0]"}`}>
                    <span class="font-semibold text-xs truncate">{match.room2?.name || "Vinner av LB"}</span>
                    <span class="font-mono text-sm font-bold">{match.room2Score !== undefined ? `${match.room2Score}p` : "-"}</span>
                  </div>
                </div>
              </button>
            {/each}
          </div>
        </div>
      {/if}
    {/if}

  <!-- FORMAT 4: GRUPPESPILL (2 PULJER À 6 ROM) + SLUTTSPILL -->
  {:else if isGroupStage}
    <div class="space-y-5">
      <!-- Tabs for Gruppespill -->
      <div class="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-white/10">
        <div class="flex items-center gap-1.5 p-1 bg-black/20 rounded-xl border border-white/10">
          <button
            type="button"
            onclick={() => (activeGroupTab = "all")}
            class={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeGroupTab === "all" ? "bg-white/[0.055] backdrop-blur-sm text-white border border-white/10" : "text-[#AEB9CC] hover:text-white"}`}
          >
            Alle Grupper & Playoffs
          </button>
          <button
            type="button"
            onclick={() => (activeGroupTab = "A")}
            class={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeGroupTab === "A" ? "bg-[#9FE88D]/20 text-[#9FE88D] border border-[#9FE88D]/40" : "text-[#AEB9CC] hover:text-white"}`}
          >
            Gruppe A
          </button>
          <button
            type="button"
            onclick={() => (activeGroupTab = "B")}
            class={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeGroupTab === "B" ? "bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/40" : "text-[#AEB9CC] hover:text-white"}`}
          >
            Gruppe B
          </button>
          <button
            type="button"
            onclick={() => (activeGroupTab = "playoffs")}
            class={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeGroupTab === "playoffs" ? "bg-[#F4C152]/20 text-[#F4C152] border border-[#F4C152]/40" : "text-[#AEB9CC] hover:text-white"}`}
          >
            Playoffs (Semifinaler & Finale)
          </button>
        </div>

        <div class="flex items-center gap-2 text-xs text-[#AEB9CC]">
          <span>Topp 2 fra hver gruppe avanserer til Semifinaler</span>
        </div>
      </div>

      <!-- Tabeller for Gruppe A og B -->
      {#if activeGroupTab === "all" || activeGroupTab === "A" || activeGroupTab === "B"}
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {#if activeGroupTab === "all" || activeGroupTab === "A"}
            <div class="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-3 shadow-md">
              <div class="flex items-center justify-between pb-2 border-b border-white/10">
                <h4 class="text-xs font-bold text-[#9FE88D] uppercase tracking-wider flex items-center gap-1.5">
                  <Users class="w-4 h-4" />
                  <span>Gruppe A Tabell</span>
                </h4>
                <span class="text-[11px] text-[#AEB9CC]">Topp 2 videre</span>
              </div>

              <div class="cup-scroll-container">
                <table class="w-full text-xs text-left border-collapse min-w-[340px]">
                  <thead>
                    <tr class="text-[#AEB9CC] border-b border-white/10/60 pb-1">
                      <th class="py-1.5 px-2">#</th>
                      <th class="py-1.5 px-2">Rom</th>
                      <th class="py-1.5 px-2 text-center">K</th>
                      <th class="py-1.5 px-2 text-center">V</th>
                      <th class="py-1.5 px-2 text-center">U</th>
                      <th class="py-1.5 px-2 text-center">T</th>
                      <th class="py-1.5 px-2 text-right">Snitt</th>
                      <th class="py-1.5 px-2 text-right font-bold text-[#F4C152]">P</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each groupAStandings as row, i}
                      <tr class={`border-b border-white/10/40 hover:bg-black/20/50 transition-colors ${i < 2 ? "bg-[#9FE88D]/10 font-bold" : ""}`}>
                        <td class="py-2 px-2 text-[#AEB9CC]">{i + 1}</td>
                        <td class="py-2 px-2 text-white truncate max-w-[130px] flex items-center gap-1.5">
                          <span class="w-2 h-2 rounded-full shrink-0" style={`background-color: ${row.room?.accentColor || "#9FE88D"}`}></span>
                          <span class="truncate">{row.room?.name || "Rom"}</span>
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
          {/if}

          {#if activeGroupTab === "all" || activeGroupTab === "B"}
            <div class="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-3 shadow-md">
              <div class="flex items-center justify-between pb-2 border-b border-white/10">
                <h4 class="text-xs font-bold text-[#38bdf8] uppercase tracking-wider flex items-center gap-1.5">
                  <Users class="w-4 h-4" />
                  <span>Gruppe B Tabell</span>
                </h4>
                <span class="text-[11px] text-[#AEB9CC]">Topp 2 videre</span>
              </div>

              <div class="cup-scroll-container">
                <table class="w-full text-xs text-left border-collapse min-w-[340px]">
                  <thead>
                    <tr class="text-[#AEB9CC] border-b border-white/10/60 pb-1">
                      <th class="py-1.5 px-2">#</th>
                      <th class="py-1.5 px-2">Rom</th>
                      <th class="py-1.5 px-2 text-center">K</th>
                      <th class="py-1.5 px-2 text-center">V</th>
                      <th class="py-1.5 px-2 text-center">U</th>
                      <th class="py-1.5 px-2 text-center">T</th>
                      <th class="py-1.5 px-2 text-right">Snitt</th>
                      <th class="py-1.5 px-2 text-right font-bold text-[#F4C152]">P</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each groupBStandings as row, i}
                      <tr class={`border-b border-white/10/40 hover:bg-black/20/50 transition-colors ${i < 2 ? "bg-[#38bdf8]/10 font-bold" : ""}`}>
                        <td class="py-2 px-2 text-[#AEB9CC]">{i + 1}</td>
                        <td class="py-2 px-2 text-white truncate max-w-[130px] flex items-center gap-1.5">
                          <span class="w-2 h-2 rounded-full shrink-0" style={`background-color: ${row.room?.accentColor || "#38bdf8"}`}></span>
                          <span class="truncate">{row.room?.name || "Rom"}</span>
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
          {/if}
        </div>
      {/if}

      <!-- Playoffs Semifinaler og Finale (for gruppespill) -->
      {#if activeGroupTab === "all" || activeGroupTab === "playoffs"}
        <div class="space-y-4 pt-2">
          <div class="flex items-center justify-between pb-2 border-b border-white/10">
            <h4 class="text-xs font-bold text-[#F4C152] uppercase tracking-wider flex items-center gap-1.5">
              <Crown class="w-4 h-4 text-[#F4C152]" />
              <span>Playoffs (Semifinaler & Grand Final)</span>
            </h4>

            <div class="flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded-xl border border-white/10">
              <span class="text-[10px] font-bold text-[#AEB9CC] uppercase tracking-wider hidden sm:inline mr-0.5">Rull:</span>
              <button
                type="button"
                onclick={() => scrollHorizontal("bracket-scroll-playoffs", -320)}
                class="p-1 rounded-lg bg-white/[0.055] backdrop-blur-sm hover:bg-white/10 text-[#AEB9CC] hover:text-white transition-colors"
                title="Rull mot venstre"
              >
                <ChevronLeft class="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onclick={() => scrollHorizontal("bracket-scroll-playoffs", 320)}
                class="p-1 rounded-lg bg-white/[0.055] backdrop-blur-sm hover:bg-white/10 text-[#AEB9CC] hover:text-white transition-colors"
                title="Rull mot høyre"
              >
                <ChevronRight class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div id="bracket-scroll-playoffs" class="cup-scroll-container pb-4">
            <div class="flex items-start gap-6 min-w-max pt-1">
              {#each knockoutRounds.filter((r) => r.roundNum >= 4) as round}
                <div class="w-72 flex flex-col space-y-3 shrink-0">
                  <div class="p-2.5 rounded-xl bg-black/20 border border-white/10 flex items-center justify-between shadow-sm">
                    <span class="font-bold text-xs text-[#F4C152]">{round.title}</span>
                    <span class="text-[10px] font-mono font-bold text-white bg-white/[0.055] backdrop-blur-sm px-2 py-0.5 rounded border border-white/10">
                      GW {round.gameweek}
                    </span>
                  </div>

                  <div class="space-y-3">
                    {#each round.matches as match}
                      <button
                        type="button"
                        onclick={() => onSelectMatch(match)}
                        class="w-full text-left p-3 rounded-xl bg-white/[0.055] backdrop-blur-sm hover:bg-white/[0.06] border border-white/10 hover:border-[#F4C152]/60 transition-all shadow-md group"
                      >
                        <div class="flex items-center justify-between text-[11px] text-[#AEB9CC] pb-1.5 mb-1.5 border-b border-white/10/50">
                          <span class="font-semibold truncate">{cleanMatchTitle(match)}</span>
                          <span class={`text-[10px] font-bold px-1.5 py-0.5 rounded ${match.status === "completed" ? "text-[#9FE88D] bg-[#9FE88D]/10" : "text-[#AEB9CC]"}`}>
                            {match.status === "completed" ? "Ferdig" : "Kommende"}
                          </span>
                        </div>

                        <div class="space-y-1">
                          <div class={`p-1.5 rounded-md flex items-center justify-between text-xs ${match.winnerRoomId && match.room1Id === match.winnerRoomId ? "bg-[#9FE88D]/15 font-bold text-white" : "text-[#E2E8F0]"}`}>
                            <span class="truncate">{match.room1?.name || "TBD (Puljevinner)"}</span>
                            <span class="font-mono">{match.room1Score !== undefined ? `${match.room1Score}p` : "-"}</span>
                          </div>
                          <div class={`p-1.5 rounded-md flex items-center justify-between text-xs ${match.winnerRoomId && match.room2Id === match.winnerRoomId ? "bg-[#9FE88D]/15 font-bold text-white" : "text-[#E2E8F0]"}`}>
                            <span class="truncate">{match.room2?.name || "TBD (Puljetoer)"}</span>
                            <span class="font-mono">{match.room2Score !== undefined ? `${match.room2Score}p` : "-"}</span>
                          </div>
                        </div>
                      </button>
                    {/each}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .cup-scroll-container {
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: thin;
    scrollbar-color: #9FE88D #141b27;
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
    background: #9FE88D;
    border-radius: 8px;
    border: 2px solid #141b27;
  }

  .cup-scroll-container::-webkit-scrollbar-thumb:hover {
    background: #bbf7ab;
  }
</style>
