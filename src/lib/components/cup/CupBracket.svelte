<script lang="ts">
  import {
    Trophy,
    Crown,
    Swords,
    Sparkles,
    Shield,
    Calendar,
    Layers,
    Users,
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
      (m) => m.bracketType === "grand_final" || m.bracketType === "grand_final_reset" || m.roundTitle?.includes("Storfinale")
    )
  );

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
        title: roundMatches[0]?.roundTitle?.replace(/\s*-\s*Kamp\s*\d+/i, "") || `Runde ${roundNum}`,
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
        title: roundMatches[0]?.roundTitle?.replace(/\s*-\s*Kamp\s*\d+/i, "") || `Runde ${roundNum}`,
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
        title: roundMatches[0]?.roundTitle?.replace(/\s*-\s*Kamp\s*\d+/i, "") || `Taperrunde ${roundNum}`,
        gameweek: roundMatches[0]?.gameweek || 1,
        matches: roundMatches.sort((a, b) => a.matchIndex - b.matchIndex),
      }));
  });

  // Gruppespill-kamper og tabeller
  let groupAMatches = $derived(matches.filter((m) => m.group === "A"));
  let groupBMatches = $derived(matches.filter((m) => m.group === "B"));
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
      <div class="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-[#384252]">
        <div class="flex items-center gap-2">
          <div class="p-1.5 rounded-lg bg-[#9FE88D]/15 text-[#9FE88D] border border-[#9FE88D]/30">
            <Trophy class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-white uppercase tracking-wider">
              {format === "lucky_loser_12" ? "12 Lag: 6 Kamper + 2 Lucky Losers til Kvartfinale" : "Sluttspilltre"}
            </h3>
            <p class="text-[11px] text-[#94A3B8]">
              {format === "lucky_loser_12" ? "Alle 12 lag spiller i R1. De 6 vinnerne + 2 beste tapere (Lucky Losers) går til kvartfinalene." : "Vinnerne avanserer til neste runde."}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2 text-xs text-[#94A3B8]">
          <span class="inline-block w-2 h-2 rounded-full bg-[#9FE88D]"></span>
          <span>Topp 2-snitt per rom avgjør</span>
        </div>
      </div>

      <!-- Horisontal rullekolonne for runder -->
      <div class="overflow-x-auto pb-4 custom-scrollbar">
        <div class="flex items-start gap-6 min-w-max pt-2">
          {#each knockoutRounds as round, rIdx}
            <div class="w-72 flex flex-col space-y-3 shrink-0">
              <!-- Rundetittel -->
              <div class="p-2.5 rounded-xl bg-[#191E24] border border-[#384252] flex items-center justify-between shadow-sm">
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
                    class="w-full text-left p-3 rounded-xl bg-[#2A303C] hover:bg-[#323947] border border-[#384252] hover:border-[#9FE88D]/60 transition-all shadow-md group relative overflow-hidden focus:outline-none focus:ring-1 focus:ring-[#9FE88D]"
                  >
                    <!-- Match Header -->
                    <div class="flex items-center justify-between text-[11px] text-[#94A3B8] pb-2 mb-2 border-b border-[#384252]/50">
                      <span class="font-semibold truncate max-w-[150px]">
                        {match.roundTitle || `Kamp ${match.matchIndex}`}
                      </span>
                      <span
                        class={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          match.status === "completed"
                            ? "text-[#9FE88D] bg-[#9FE88D]/10"
                            : match.status === "live"
                            ? "text-[#70E1F8] bg-[#70E1F8]/10 animate-pulse"
                            : "text-[#94A3B8] bg-[#191E24]"
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
                          <span class="text-xs text-[#94A3B8] italic truncate">
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
                          <span class="text-xs text-[#94A3B8] italic truncate">
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
    <div class="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-[#384252]">
      <div class="flex items-center gap-1.5 p-1 bg-[#191E24] rounded-xl border border-[#384252]">
        <button
          onclick={() => (activeBracketTab = "all")}
          class={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeBracketTab === "all"
              ? "bg-[#2A303C] text-white shadow-sm border border-[#384252]"
              : "text-[#94A3B8] hover:text-white"
          }`}
        >
          <Layers class="w-3.5 h-3.5" />
          <span>Full Brakettoversikt</span>
        </button>

        <button
          onclick={() => (activeBracketTab = "winners")}
          class={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeBracketTab === "winners"
              ? "bg-[#9FE88D]/20 text-[#9FE88D] shadow-sm border border-[#9FE88D]/40"
              : "text-[#94A3B8] hover:text-[#9FE88D]"
          }`}
        >
          <Trophy class="w-3.5 h-3.5 text-[#9FE88D]" />
          <span>Vinnerbrakett (WB)</span>
        </button>

        <button
          onclick={() => (activeBracketTab = "losers")}
          class={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeBracketTab === "losers"
              ? "bg-[#FB6F84]/20 text-[#FB6F84] shadow-sm border border-[#FB6F84]/40"
              : "text-[#94A3B8] hover:text-[#FB6F84]"
          }`}
        >
          <Swords class="w-3.5 h-3.5 text-[#FB6F84]" />
          <span>Taperbrakett (LB)</span>
        </button>

        <button
          onclick={() => (activeBracketTab = "finals")}
          class={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeBracketTab === "finals"
              ? "bg-[#F4C152]/20 text-[#F4C152] shadow-sm border border-[#F4C152]/40"
              : "text-[#94A3B8] hover:text-[#F4C152]"
          }`}
        >
          <Crown class="w-3.5 h-3.5 text-[#F4C152]" />
          <span>Storfinale</span>
        </button>
      </div>

      <div class="flex items-center gap-2 text-xs text-[#94A3B8]">
        <span class="inline-block w-2 h-2 rounded-full bg-[#9FE88D]"></span>
        <span>Topp 2-snitt avgjør hver match</span>
      </div>
    </div>

    <!-- Seksjon 1: Vinnerbrakett (Winners Bracket) -->
    {#if activeBracketTab === "all" || activeBracketTab === "winners"}
      <div class="space-y-3 bg-[#242B35] p-4 rounded-2xl border border-[#384252]">
        <div class="flex items-center justify-between pb-2 border-b border-[#384252]/60">
          <div class="flex items-center gap-2">
            <div class="p-1.5 rounded-lg bg-[#9FE88D]/15 text-[#9FE88D] border border-[#9FE88D]/30">
              <Trophy class="w-4 h-4" />
            </div>
            <div>
              <h3 class="text-sm font-bold text-white uppercase tracking-wider">
                Vinnerbrakett (Winners Bracket)
              </h3>
              <p class="text-[11px] text-[#94A3B8]">
                Vinnere avanserer oppover i treet. Tapere faller ned til Taperbraketten.
              </p>
            </div>
          </div>
        </div>

        <div class="overflow-x-auto pb-4 custom-scrollbar">
          <div class="flex items-start gap-5 min-w-max pt-2">
            {#each winnersRounds as round}
              <div class="w-72 flex flex-col space-y-3 shrink-0">
                <div class="p-2.5 rounded-xl bg-[#191E24] border border-[#384252] flex items-center justify-between shadow-sm">
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
                      class="w-full text-left p-3 rounded-xl bg-[#2A303C] hover:bg-[#323947] border border-[#384252] hover:border-[#9FE88D]/60 transition-all shadow-md group relative overflow-hidden focus:outline-none focus:ring-1 focus:ring-[#9FE88D]"
                    >
                      <div class="flex items-center justify-between text-[11px] text-[#94A3B8] pb-2 mb-2 border-b border-[#384252]/50">
                        <span class="font-semibold truncate max-w-[150px]">{match.roundTitle || `Kamp ${match.matchIndex}`}</span>
                        <span class={`text-[10px] font-bold px-1.5 py-0.5 rounded ${match.status === "completed" ? "text-[#9FE88D] bg-[#9FE88D]/10" : "text-[#94A3B8] bg-[#191E24]"}`}>
                          {match.status === "completed" ? "Ferdig" : "Kommende"}
                        </span>
                      </div>

                      <div class={`flex items-center justify-between p-1.5 rounded-lg transition-colors ${match.winnerRoomId && match.room1Id === match.winnerRoomId ? "bg-[#9FE88D]/15 text-white font-bold" : "text-[#E2E8F0]"}`}>
                        <div class="flex items-center gap-2 min-w-0">
                          {#if match.room1}
                            <span class="w-2.5 h-2.5 rounded-full shrink-0" style={`background-color: ${match.room1.accentColor || "#1eb854"}`}></span>
                            <span class="text-xs truncate font-semibold">{match.room1.name}</span>
                          {:else}
                            <span class="text-xs text-[#94A3B8] italic truncate">Avventer kamp...</span>
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
                            <span class="text-xs text-[#94A3B8] italic truncate">Avventer kamp...</span>
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

    <!-- Seksjon 2: Taperbrakett (Losers Bracket) -->
    {#if activeBracketTab === "all" || activeBracketTab === "losers"}
      <div class="space-y-3 bg-[#242B35] p-4 rounded-2xl border border-[#384252]">
        <div class="flex items-center justify-between pb-2 border-b border-[#384252]/60">
          <div class="flex items-center gap-2">
            <div class="p-1.5 rounded-lg bg-[#FB6F84]/15 text-[#FB6F84] border border-[#FB6F84]/30">
              <Swords class="w-4 h-4" />
            </div>
            <div>
              <h3 class="text-sm font-bold text-white uppercase tracking-wider">
                Taperbrakett (Losers Bracket)
              </h3>
              <p class="text-[11px] text-[#94A3B8]">
                Tapere fra Vinnerbraketten får en siste sjanse. Nytt tap betyr eliminering.
              </p>
            </div>
          </div>
        </div>

        <div class="overflow-x-auto pb-4 custom-scrollbar">
          <div class="flex items-start gap-5 min-w-max pt-2">
            {#each losersRounds as round}
              <div class="w-72 flex flex-col space-y-3 shrink-0">
                <div class="p-2.5 rounded-xl bg-[#191E24] border border-[#384252] flex items-center justify-between shadow-sm">
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
                      class="w-full text-left p-3 rounded-xl bg-[#2A303C] hover:bg-[#323947] border border-[#384252] hover:border-[#FB6F84]/60 transition-all shadow-md group relative overflow-hidden focus:outline-none"
                    >
                      <div class="flex items-center justify-between text-[11px] text-[#94A3B8] pb-2 mb-2 border-b border-[#384252]/50">
                        <span class="font-semibold truncate max-w-[150px]">{match.roundTitle || `Kamp ${match.matchIndex}`}</span>
                        <span class={`text-[10px] font-bold px-1.5 py-0.5 rounded ${match.status === "completed" ? "text-[#9FE88D] bg-[#9FE88D]/10" : "text-[#94A3B8] bg-[#191E24]"}`}>
                          {match.status === "completed" ? "Ferdig" : "Kommende"}
                        </span>
                      </div>

                      <div class={`flex items-center justify-between p-1.5 rounded-lg transition-colors ${match.winnerRoomId && match.room1Id === match.winnerRoomId ? "bg-[#9FE88D]/15 text-white font-bold" : "text-[#E2E8F0]"}`}>
                        <div class="flex items-center gap-2 min-w-0">
                          {#if match.room1}
                            <span class="w-2.5 h-2.5 rounded-full shrink-0" style={`background-color: ${match.room1.accentColor || "#1eb854"}`}></span>
                            <span class="text-xs truncate font-semibold">{match.room1.name}</span>
                          {:else}
                            <span class="text-xs text-[#94A3B8] italic truncate">Avventer kamp...</span>
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
                            <span class="text-xs text-[#94A3B8] italic truncate">Avventer kamp...</span>
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

    <!-- Seksjon 3: Storfinale (Grand Final) -->
    {#if activeBracketTab === "all" || activeBracketTab === "finals"}
      {#if finalMatches.length > 0}
        <div class="p-5 rounded-2xl bg-gradient-to-r from-[#F4C152]/10 via-[#242B35] to-[#9FE88D]/10 border border-[#F4C152]/40 shadow-xl space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-[#384252]">
            <div class="flex items-center gap-2.5">
              <div class="p-2 rounded-xl bg-[#F4C152]/20 text-[#F4C152] border border-[#F4C152]/40">
                <Crown class="w-5 h-5" />
              </div>
              <div>
                <h3 class="text-base font-bold text-white flex items-center gap-2">
                  🏆 Den Store Cupfinalen (Grand Final)
                </h3>
                <p class="text-xs text-[#94A3B8]">Vinneren av Vinnerbraketten møter vinneren av Taperbraketten</p>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            {#each finalMatches as match}
              <button
                type="button"
                onclick={() => onSelectMatch(match)}
                class="p-4 rounded-xl bg-[#2A303C] hover:bg-[#323947] border border-[#F4C152]/50 transition-all text-left shadow-lg"
              >
                <div class="flex items-center justify-between pb-2 mb-2 border-b border-[#384252]">
                  <span class="text-xs font-bold text-[#F4C152]">{match.roundTitle}</span>
                  <span class="text-[11px] font-mono text-white bg-[#191E24] px-2 py-0.5 rounded border border-[#384252]">
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
      <div class="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-[#384252]">
        <div class="flex items-center gap-1.5 p-1 bg-[#191E24] rounded-xl border border-[#384252]">
          <button
            type="button"
            onclick={() => (activeGroupTab = "all")}
            class={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeGroupTab === "all" ? "bg-[#2A303C] text-white border border-[#384252]" : "text-[#94A3B8] hover:text-white"}`}
          >
            Alle Grupper & Sluttspill
          </button>
          <button
            type="button"
            onclick={() => (activeGroupTab = "A")}
            class={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeGroupTab === "A" ? "bg-[#9FE88D]/20 text-[#9FE88D] border border-[#9FE88D]/40" : "text-[#94A3B8] hover:text-white"}`}
          >
            Gruppe A
          </button>
          <button
            type="button"
            onclick={() => (activeGroupTab = "B")}
            class={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeGroupTab === "B" ? "bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/40" : "text-[#94A3B8] hover:text-white"}`}
          >
            Gruppe B
          </button>
          <button
            type="button"
            onclick={() => (activeGroupTab = "playoffs")}
            class={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeGroupTab === "playoffs" ? "bg-[#F4C152]/20 text-[#F4C152] border border-[#F4C152]/40" : "text-[#94A3B8] hover:text-white"}`}
          >
            Sluttspill (Semifinaler & Finale)
          </button>
        </div>

        <div class="flex items-center gap-2 text-xs text-[#94A3B8]">
          <span>Topp 2 fra hver gruppe avanserer til Semifinaler</span>
        </div>
      </div>

      <!-- Tabeller for Gruppe A og B -->
      {#if activeGroupTab === "all" || activeGroupTab === "A" || activeGroupTab === "B"}
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {#if activeGroupTab === "all" || activeGroupTab === "A"}
            <div class="p-4 rounded-2xl bg-[#242B35] border border-[#384252] space-y-3 shadow-md">
              <div class="flex items-center justify-between pb-2 border-b border-[#384252]">
                <h4 class="text-xs font-bold text-[#9FE88D] uppercase tracking-wider flex items-center gap-1.5">
                  <Users class="w-4 h-4" />
                  <span>Gruppe A Tabell</span>
                </h4>
                <span class="text-[11px] text-[#94A3B8]">Topp 2 videre</span>
              </div>

              <div class="overflow-x-auto custom-scrollbar">
                <table class="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr class="text-[#94A3B8] border-b border-[#384252]/60 pb-1">
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
                      <tr class={`border-b border-[#384252]/40 hover:bg-[#191E24]/50 transition-colors ${i < 2 ? "bg-[#9FE88D]/10 font-bold" : ""}`}>
                        <td class="py-2 px-2 text-[#94A3B8]">{i + 1}</td>
                        <td class="py-2 px-2 text-white truncate max-w-[130px] flex items-center gap-1.5">
                          <span class="w-2 h-2 rounded-full" style={`background-color: ${row.room?.accentColor || "#9FE88D"}`}></span>
                          <span>{row.room?.name || "Rom"}</span>
                        </td>
                        <td class="py-2 px-2 text-center">{row.played}</td>
                        <td class="py-2 px-2 text-center text-[#9FE88D]">{row.won}</td>
                        <td class="py-2 px-2 text-center text-[#94A3B8]">{row.drawn}</td>
                        <td class="py-2 px-2 text-center text-[#FB6F84]">{row.lost}</td>
                        <td class="py-2 px-2 text-right font-mono text-[#94A3B8]">{row.totalRoomScore}</td>
                        <td class="py-2 px-2 text-right font-mono font-bold text-[#F4C152]">{row.points}</td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            </div>
          {/if}

          {#if activeGroupTab === "all" || activeGroupTab === "B"}
            <div class="p-4 rounded-2xl bg-[#242B35] border border-[#384252] space-y-3 shadow-md">
              <div class="flex items-center justify-between pb-2 border-b border-[#384252]">
                <h4 class="text-xs font-bold text-[#38bdf8] uppercase tracking-wider flex items-center gap-1.5">
                  <Users class="w-4 h-4" />
                  <span>Gruppe B Tabell</span>
                </h4>
                <span class="text-[11px] text-[#94A3B8]">Topp 2 videre</span>
              </div>

              <div class="overflow-x-auto custom-scrollbar">
                <table class="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr class="text-[#94A3B8] border-b border-[#384252]/60 pb-1">
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
                      <tr class={`border-b border-[#384252]/40 hover:bg-[#191E24]/50 transition-colors ${i < 2 ? "bg-[#38bdf8]/10 font-bold" : ""}`}>
                        <td class="py-2 px-2 text-[#94A3B8]">{i + 1}</td>
                        <td class="py-2 px-2 text-white truncate max-w-[130px] flex items-center gap-1.5">
                          <span class="w-2 h-2 rounded-full" style={`background-color: ${row.room?.accentColor || "#38bdf8"}`}></span>
                          <span>{row.room?.name || "Rom"}</span>
                        </td>
                        <td class="py-2 px-2 text-center">{row.played}</td>
                        <td class="py-2 px-2 text-center text-[#9FE88D]">{row.won}</td>
                        <td class="py-2 px-2 text-center text-[#94A3B8]">{row.drawn}</td>
                        <td class="py-2 px-2 text-center text-[#FB6F84]">{row.lost}</td>
                        <td class="py-2 px-2 text-right font-mono text-[#94A3B8]">{row.totalRoomScore}</td>
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

      <!-- Sluttspill Semifinaler og Finale (for gruppespill) -->
      {#if activeGroupTab === "all" || activeGroupTab === "playoffs"}
        <div class="space-y-4 pt-2">
          <h4 class="text-xs font-bold text-[#F4C152] uppercase tracking-wider flex items-center gap-1.5">
            <Crown class="w-4 h-4 text-[#F4C152]" />
            <span>Sluttspill (Semifinaler & Storfinale)</span>
          </h4>

          <div class="overflow-x-auto pb-4 custom-scrollbar">
            <div class="flex items-start gap-6 min-w-max">
              {#each knockoutRounds.filter((r) => r.roundNum >= 4) as round}
                <div class="w-72 flex flex-col space-y-3 shrink-0">
                  <div class="p-2.5 rounded-xl bg-[#191E24] border border-[#384252] flex items-center justify-between shadow-sm">
                    <span class="font-bold text-xs text-[#F4C152]">{round.title}</span>
                    <span class="text-[10px] font-mono font-bold text-white bg-[#2A303C] px-2 py-0.5 rounded border border-[#384252]">
                      GW {round.gameweek}
                    </span>
                  </div>

                  <div class="space-y-3">
                    {#each round.matches as match}
                      <button
                        type="button"
                        onclick={() => onSelectMatch(match)}
                        class="w-full text-left p-3 rounded-xl bg-[#2A303C] hover:bg-[#323947] border border-[#384252] hover:border-[#F4C152]/60 transition-all shadow-md group"
                      >
                        <div class="flex items-center justify-between text-[11px] text-[#94A3B8] pb-1.5 mb-1.5 border-b border-[#384252]/50">
                          <span class="font-semibold truncate">{match.roundTitle}</span>
                          <span class={`text-[10px] font-bold px-1.5 py-0.5 rounded ${match.status === "completed" ? "text-[#9FE88D] bg-[#9FE88D]/10" : "text-[#94A3B8]"}`}>
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
