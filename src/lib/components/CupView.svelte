<script lang="ts">
  import {
    Trophy,
    Crown,
    Swords,
    Sparkles,
    Shield,
    Calendar,
    Flame,
    Info,
    ChevronDown,
    ChevronUp,
    RefreshCw,
    Plus,
    CheckCircle2,
    Users,
  } from "lucide-svelte";
  import CupBracket from "./cup/CupBracket.svelte";
  import CupMatchModal from "./cup/CupMatchModal.svelte";
  import { useQuery, useMutation } from "$lib/convex.svelte";
  import { api } from "../../../convex/_generated/api";
  import { formatConvexError } from "$lib/utils/formatError";

  let {
    currentUser = null,
    onOpenAdmin = () => {},
    onOpenProfile = (_entryId: number) => {},
  }: {
    currentUser?: any;
    onOpenAdmin?: () => void;
    onOpenProfile?: (entryId: number) => void;
  } = $props();

  const cupQuery = useQuery(api.cups.getActiveCup);
  let cup = $derived(cupQuery.data ?? null);
  let matches = $derived(cup?.matches ?? []);

  const calculateRoundMutation = useMutation(api.cups.calculateCupRoundScores);
  const advanceMatchMutation = useMutation(api.cups.advanceMatchManually);

  let selectedMatch = $state<any>(null);
  let isMatchModalOpen = $state(false);
  let showRulesInfo = $state(false);
  let isCalculating = $state(false);
  let calculationStatusMsg = $state("");

  let isAdmin = $derived(currentUser?.role === "admin");

  // Beregn raske statistikker for turneringen
  let topAverageInCup = $derived.by(() => {
    let max = 0;
    let topRoomName = "";
    for (const m of matches) {
      if (m.room1Score && m.room1Score > max) {
        max = m.room1Score;
        topRoomName = m.room1?.name || "Rom";
      }
      if (m.room2Score && m.room2Score > max) {
        max = m.room2Score;
        topRoomName = m.room2?.name || "Rom";
      }
    }
    return max > 0 ? { score: max, roomName: topRoomName } : null;
  });

  // Antall ubeseirede lag (i vinnerbraketten)
  let undefeatedRoomsCount = $derived.by(() => {
    const activeWinners = matches.filter(
      (m) => m.bracketType === "winners" && m.status !== "completed"
    );
    const rooms = new Set<string>();
    for (const m of activeWinners) {
      if (m.room1Id) rooms.add(m.room1Id);
      if (m.room2Id) rooms.add(m.room2Id);
    }
    return rooms.size;
  });

  function handleOpenMatchDetails(match: any) {
    selectedMatch = match;
    isMatchModalOpen = true;
  }

  async function handleCalculateCurrentRound() {
    if (!cup) return;
    isCalculating = true;
    calculationStatusMsg = "Beregner romsnitt for runden...";

    try {
      const res = await calculateRoundMutation.mutate({
        adminUserId: currentUser?._id,
        cupId: cup._id,
        roundNumber: cup.currentRound || 1,
      });

      calculationStatusMsg = `Oppdaterte ${res.updatedMatchesCount} kamper for runde ${res.roundNumber}!`;
      setTimeout(() => {
        calculationStatusMsg = "";
      }, 4000);
    } catch (err: any) {
      calculationStatusMsg = "Feil under beregning: " + formatConvexError(err);
    } finally {
      isCalculating = false;
    }
  }

  async function handleAdvanceMatch(matchId: string, winnerRoomId: string) {
    try {
      await advanceMatchMutation.mutate({
        adminUserId: currentUser?._id,
        matchId: matchId as any,
        winnerRoomId: winnerRoomId as any,
      });
      isMatchModalOpen = false;
      calculationStatusMsg = "Kampvinner overstyrt og avansert i turneringen!";
      setTimeout(() => {
        calculationStatusMsg = "";
      }, 3000);
    } catch (err: any) {
      alert(formatConvexError(err, "Kunne ikke overstyre kamp."));
    }
  }
</script>

<div class="flex-1 flex flex-col min-h-0 space-y-3 overflow-hidden text-[#E2E8F0] font-sans">
  {#if cupQuery.isLoading}
    <div class="flex-1 flex items-center justify-center bg-[#2A303C] rounded-2xl border border-[#384252] p-8">
      <div class="flex flex-col items-center gap-3 text-[#94A3B8]">
        <RefreshCw class="w-8 h-8 animate-spin text-[#9FE88D]" />
        <span class="text-sm font-semibold">Laster inn Cup & Sluttspill...</span>
      </div>
    </div>
  {:else if !cup}
    <!-- Tom tilstand når ingen cup er opprettet -->
    <div class="flex-1 flex flex-col items-center justify-center bg-[#2A303C] rounded-2xl border border-[#384252] p-8 text-center space-y-4">
      <div class="p-4 rounded-2xl bg-[#9FE88D]/15 border border-[#9FE88D]/30 text-[#9FE88D]">
        <Trophy class="w-12 h-12" />
      </div>

      <div class="max-w-md space-y-1">
        <h2 class="text-xl font-bold text-white">Ingen aktiv Cup opprettet ennå</h2>
        <p class="text-xs text-[#94A3B8] leading-relaxed">
          Sluttspillet spilles som en Double Elimination turnering der rom matches mot rom basert på snittet av de 2 beste spillerne per runde.
        </p>
      </div>

      {#if isAdmin}
        <button
          onclick={onOpenAdmin}
          class="px-4 py-2.5 rounded-xl bg-[#9FE88D] hover:bg-[#8fd97e] text-[#16380c] text-xs font-bold transition-all shadow-md flex items-center gap-2"
        >
          <Plus class="w-4 h-4" />
          <span>Opprett og Seede Ny Cup i Adminpanelet</span>
        </button>
      {:else}
        <div class="text-xs text-[#94A3B8] bg-[#191E24] px-4 py-2 rounded-xl border border-[#384252]">
          Venter på at ligaledelsen setter opp cupbraketten.
        </div>
      {/if}
    </div>
  {:else}
    <!-- Aktiv Cup Visning -->
    <div class="flex-1 flex flex-col min-h-0 bg-[#2A303C] rounded-2xl border border-[#384252] p-3.5 sm:p-4 shadow-sm overflow-hidden space-y-3">
      <!-- Cup Toppheader -->
      <div class="flex items-center justify-between pb-3 border-b border-[#384252] flex-wrap gap-2 shrink-0">
        <div class="flex items-center gap-3">
          <div class="p-2.5 rounded-xl bg-gradient-to-br from-[#F4C152]/20 to-[#F4C152]/5 border border-[#F4C152]/30 text-[#F4C152] shadow-sm">
            <Trophy class="w-6 h-6" />
          </div>

          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-lg font-bold text-white tracking-tight">
                {cup.name || "Atlantasy Sluttspill"}
              </h1>
              <span
                class={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  cup.status === "completed"
                    ? "bg-[#9FE88D]/15 text-[#9FE88D] border-[#9FE88D]/30"
                    : "bg-[#70E1F8]/15 text-[#70E1F8] border-[#70E1F8]/30 animate-pulse"
                }`}
              >
                {cup.status === "completed" ? "Fullført" : "Pågår"}
              </span>
            </div>

            <div class="flex items-center gap-2 text-xs text-[#94A3B8] mt-0.5">
              <span>Sesong {cup.season || "2025/2026"}</span>
              <span>•</span>
              <span class="text-[#F4C152] font-semibold">
                Runde {cup.currentRound || 1} av {cup.totalRounds || 7}
              </span>
              <span>•</span>
              <span class="text-[#9FE88D]">Double Elimination</span>
            </div>
          </div>
        </div>

        <!-- Handlingsknapper for Cup -->
        <div class="flex items-center gap-2">
          <button
            onclick={() => (showRulesInfo = !showRulesInfo)}
            class="px-3 py-1.5 rounded-xl bg-[#242B35] hover:bg-[#384252] text-xs font-semibold text-[#E2E8F0] border border-[#384252] transition-colors flex items-center gap-1.5"
          >
            <Info class="w-3.5 h-3.5 text-[#70E1F8]" />
            <span>Slik fungerer Cupen</span>
            {#if showRulesInfo}
              <ChevronUp class="w-3.5 h-3.5" />
            {:else}
              <ChevronDown class="w-3.5 h-3.5" />
            {/if}
          </button>

          {#if isAdmin}
            <button
              onclick={handleCalculateCurrentRound}
              disabled={isCalculating}
              class="px-3.5 py-1.5 rounded-xl bg-[#9FE88D]/20 hover:bg-[#9FE88D]/30 text-[#9FE88D] border border-[#9FE88D]/50 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
              title="Beregn romsnitt for den aktive runden og send vinnere videre"
            >
              <RefreshCw class={`w-3.5 h-3.5 ${isCalculating ? "animate-spin" : ""}`} />
              <span>{isCalculating ? "Beregner..." : "Oppdater Runderesultat"}</span>
            </button>
          {/if}
        </div>
      </div>

      <!-- Varselmelding ved beregning -->
      {#if calculationStatusMsg}
        <div class="p-2.5 rounded-xl bg-[#9FE88D]/15 border border-[#9FE88D]/30 text-xs text-[#9FE88D] font-semibold flex items-center gap-2 animate-in fade-in shrink-0">
          <CheckCircle2 class="w-4 h-4" />
          <span>{calculationStatusMsg}</span>
        </div>
      {/if}

      <!-- Nedfellbar Regelforklaring -->
      {#if showRulesInfo}
        <div class="p-4 rounded-xl bg-[#191E24] border border-[#384252] text-xs text-[#E2E8F0] space-y-2 animate-in fade-in shrink-0">
          <div class="flex items-center gap-2 text-white font-bold">
            <Sparkles class="w-4 h-4 text-[#F4C152]" />
            <span>Regler for {cup.name} ({cup.format === "lucky_loser_12" ? "12 Lag: 6 Kamper + 2 Lucky Losers" : cup.format === "double_elimination_12" ? "Double Elimination" : cup.format === "group_stage_12" ? "Gruppespill + Sluttspill" : "Topp 8 Sluttspill"})</span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-[#94A3B8] leading-relaxed">
            <div class="p-2.5 rounded-lg bg-[#242B35] border border-[#384252]">
              <strong class="text-white block mb-1">1. Romsnitt (Topp 2)</strong>
              I hvert oppgjør er det gjennomsnittet av de 2 høyeste nettopoengene i hvert rom for gjeldende GW som avgjør hvem som vinner.
            </div>
            <div class="p-2.5 rounded-lg bg-[#242B35] border border-[#384252]">
              <strong class="text-[#9FE88D] block mb-1">2. Avansering</strong>
              {#if cup.format === "lucky_loser_12"}
                Alle 12 lag spiller i R1. De 6 vinnerne + de 2 taperne med høyest romsnitt («Lucky Losers») går til kvartfinalene.
              {:else if cup.format === "double_elimination_12"}
                Et rom er først ute av cupen etter **2 tap**. Vinnere fortsetter i WB, mens tapere faller ned i LB.
              {:else if cup.format === "group_stage_12"}
                Rommene kjemper om puljepoeng i Gruppe A og B. Topp 2 fra hver gruppe går til Semifinalene.
              {:else}
                Vinnerne avanserer direkte til neste runde i knockout-treet.
              {/if}
            </div>
            <div class="p-2.5 rounded-lg bg-[#242B35] border border-[#384252]">
              <strong class="text-[#F4C152] block mb-1">3. Tittel & Trofé</strong>
              Vinneren av den store finalen kåres til ligaens offisielle cupmester med evig heder på skryteveggen!
            </div>
          </div>
        </div>
      {/if}

      <!-- Raske Nøkkeltall / Statistikk -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
        <!-- Aktiv Runde -->
        <div class="p-3 rounded-xl bg-[#242B35] border border-[#384252] flex items-center justify-between">
          <div>
            <span class="text-[10px] uppercase font-bold text-[#94A3B8] tracking-wider">
              Gjeldende Runde
            </span>
            <p class="text-sm font-bold text-white mt-0.5">
              Runde {cup.currentRound || 1} av {cup.totalRounds || 4}
            </p>
          </div>
          <Calendar class="w-5 h-5 text-[#F4C152]" />
        </div>

        <!-- Høyeste Romsnitt i Cupen -->
        <div class="p-3 rounded-xl bg-[#242B35] border border-[#384252] flex items-center justify-between">
          <div>
            <span class="text-[10px] uppercase font-bold text-[#94A3B8] tracking-wider">
              Beste Romsnitt
            </span>
            <p class="text-sm font-bold text-[#9FE88D] mt-0.5">
              {topAverageInCup ? `${topAverageInCup.score}p (${topAverageInCup.roomName})` : "Ikke spilt"}
            </p>
          </div>
          <Flame class="w-5 h-5 text-[#9FE88D]" />
        </div>

        <!-- Format Badge -->
        <div class="p-3 rounded-xl bg-[#242B35] border border-[#384252] flex items-center justify-between">
          <div>
            <span class="text-[10px] uppercase font-bold text-[#94A3B8] tracking-wider">
              Turneringsmodell
            </span>
            <p class="text-sm font-bold text-[#70E1F8] truncate mt-0.5">
              {cup.format === "lucky_loser_12" ? "12L Lucky Loser" : cup.format === "double_elimination_12" ? "Double Elimination" : cup.format === "group_stage_12" ? "Gruppespill + Sluttspill" : "Topp 8 Sluttspill"}
            </p>
          </div>
          <Shield class="w-5 h-5 text-[#70E1F8]" />
        </div>

        <!-- Tittelforsvarer / Mester -->
        <div class="p-3 rounded-xl bg-[#242B35] border border-[#384252] flex items-center justify-between">
          <div>
            <span class="text-[10px] uppercase font-bold text-[#94A3B8] tracking-wider">
              Status / Mester
            </span>
            <p class="text-sm font-bold text-[#F4C152] truncate mt-0.5">
              {cup.winnerRoom ? cup.winnerRoom.name : "Kjemper om gull"}
            </p>
          </div>
          <Crown class="w-5 h-5 text-[#F4C152]" />
        </div>
      </div>

      <!-- Det Visuelle Bracket-treet -->
      <div class="flex-1 overflow-auto custom-scrollbar pr-1 min-h-0">
        <CupBracket
          {cup}
          {matches}
          groupStandings={cup.groupStandings}
          onSelectMatch={handleOpenMatchDetails}
          {onOpenProfile}
        />
      </div>
    </div>
  {/if}

  <!-- Match Detaljer Modal -->
  <CupMatchModal
    match={selectedMatch}
    isOpen={isMatchModalOpen}
    {currentUser}
    onClose={() => (isMatchModalOpen = false)}
    onAdvanceMatch={handleAdvanceMatch}
    {onOpenProfile}
  />
</div>
