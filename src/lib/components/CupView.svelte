<script lang="ts">
  import {
    Trophy,
    Crown,
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
    Medal,
  } from "lucide-svelte";
  import CupBracket from "./cup/CupBracket.svelte";
  import CupMatchModal from "./cup/CupMatchModal.svelte";
  import { useQuery, useMutation } from "$lib/convex.svelte";
  import { api } from "../../../convex/_generated/api";
  import { formatConvexError } from "$lib/utils/formatError";
  import { formatLabel, layoutFor } from "$lib/utils/cup";
  import { seasonFor } from "../../../convex/season";

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

  let cupFormatLabel = $derived(formatLabel(cup?.format));
  let layout = $derived(layoutFor(cup?.format));

  const advanceMatchMutation = useMutation(api.cups.advanceMatchManually);

  let selectedMatch = $state<any>(null);
  let isMatchModalOpen = $state(false);
  let showRulesInfo = $state(false);
  let statusMsg = $state("");

  let isAdmin = $derived(currentUser?.role === "admin");

  let playable = $derived(matches.filter((m: any) => !m.isBye));
  let playedCount = $derived(playable.filter((m: any) => m.status === "completed").length);
  let currentGw = $derived(
    matches.find((m: any) => m.roundNumber === cup?.currentRound)?.gameweek ?? null
  );

  // Beste romsnitt i cupen
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

  let podium = $derived(
    cup?.status === "completed"
      ? [
          { medal: "text-[#F4C152]", label: "Cupmester", room: cup.winnerRoom },
          { medal: "text-[#CBD5E1]", label: "2. plass", room: cup.runnerUpRoom },
          { medal: "text-[#D08A4B]", label: "3. plass", room: cup.thirdPlaceRoom },
        ].filter((p) => p.room)
      : []
  );

  function handleOpenMatchDetails(match: any) {
    selectedMatch = match;
    isMatchModalOpen = true;
  }

  async function handleAdvanceMatch(matchId: string, winnerRoomId: string) {
    try {
      await advanceMatchMutation.mutate({
        adminUserId: currentUser?._id,
        matchId: matchId as any,
        winnerRoomId: winnerRoomId as any,
      });
      isMatchModalOpen = false;
      statusMsg = "Kampvinner overstyrt og avansert i turneringen!";
      setTimeout(() => {
        statusMsg = "";
      }, 3000);
    } catch (err: any) {
      alert(formatConvexError(err, "Kunne ikke overstyre kamp."));
    }
  }
</script>

<div class="flex-1 flex flex-col min-h-0 space-y-3 overflow-hidden text-[#E2E8F0] font-sans">
  {#if cupQuery.isLoading}
    <div class="flex-1 flex items-center justify-center bg-white/[0.055] backdrop-blur-sm rounded-2xl border border-white/10 p-8">
      <div class="flex flex-col items-center gap-3 text-[#AEB9CC]">
        <RefreshCw class="w-8 h-8 animate-spin text-[#9FE88D]" />
        <span class="text-sm font-semibold">Laster inn Cup & Playoffs...</span>
      </div>
    </div>
  {:else if !cup}
    <!-- Tom tilstand når ingen cup er opprettet -->
    <div class="flex-1 flex flex-col items-center justify-center bg-white/[0.055] backdrop-blur-sm rounded-2xl border border-white/10 p-8 text-center space-y-4">
      <div class="p-4 rounded-2xl bg-[#9FE88D]/15 border border-[#9FE88D]/30 text-[#9FE88D]">
        <Trophy class="w-12 h-12" />
      </div>

      <div class="max-w-md space-y-1">
        <h2 class="text-xl font-bold text-white">Ingen aktiv Cup opprettet ennå</h2>
        <p class="text-xs text-[#AEB9CC] leading-relaxed">
          Playoffet spilles rom mot rom, avgjort av snittet av de 2 beste spillerne per gameweek. Format velges når cupen opprettes i adminpanelet.
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
        <div class="text-xs text-[#AEB9CC] bg-black/20 px-4 py-2 rounded-xl border border-white/10">
          Venter på at ligaledelsen setter opp cupbraketten.
        </div>
      {/if}
    </div>
  {:else}
    <!-- Aktiv Cup Visning -->
    <div class="flex-1 flex flex-col min-h-0 bg-white/[0.055] backdrop-blur-sm rounded-2xl border border-white/10 p-3.5 sm:p-4 shadow-sm overflow-hidden space-y-3">
      <!-- Cup Toppheader -->
      <div class="flex items-center justify-between pb-3 border-b border-white/10 flex-wrap gap-2 shrink-0">
        <div class="flex items-center gap-3">
          <div class="p-2.5 rounded-xl bg-gradient-to-br from-[#F4C152]/20 to-[#F4C152]/5 border border-[#F4C152]/30 text-[#F4C152] shadow-sm">
            <Trophy class="w-6 h-6" />
          </div>

          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-lg font-bold text-white tracking-tight">
                {cup.name || "Atlantasy Playoffs"}
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

            <div class="flex items-center gap-2 text-xs text-[#AEB9CC] mt-0.5">
              <span>Sesong {cup.season || seasonFor(cup.createdAt)}</span>
              <span>•</span>
              <span class="text-[#9FE88D]">{cupFormatLabel}</span>
            </div>
          </div>
        </div>

        <button
          onclick={() => (showRulesInfo = !showRulesInfo)}
          class="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/10 text-xs font-semibold text-[#E2E8F0] border border-white/10 transition-colors flex items-center gap-1.5"
        >
          <Info class="w-3.5 h-3.5 text-[#70E1F8]" />
          <span>Slik fungerer Cupen</span>
          {#if showRulesInfo}
            <ChevronUp class="w-3.5 h-3.5" />
          {:else}
            <ChevronDown class="w-3.5 h-3.5" />
          {/if}
        </button>
      </div>

      {#if statusMsg}
        <div class="p-2.5 rounded-xl bg-[#9FE88D]/15 border border-[#9FE88D]/30 text-xs text-[#9FE88D] font-semibold flex items-center gap-2 shrink-0">
          <CheckCircle2 class="w-4 h-4" />
          <span>{statusMsg}</span>
        </div>
      {/if}

      <!-- Nedfellbar Regelforklaring -->
      {#if showRulesInfo}
        <div class="p-4 rounded-xl bg-black/20 border border-white/10 text-xs text-[#E2E8F0] space-y-2 shrink-0">
          <div class="flex items-center gap-2 text-white font-bold">
            <Sparkles class="w-4 h-4 text-[#F4C152]" />
            <span>Regler for {cup.name} ({cupFormatLabel})</span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-[#AEB9CC] leading-relaxed">
            <div class="p-2.5 rounded-lg bg-white/[0.04] border border-white/10">
              <strong class="text-white block mb-1">1. Romsnitt (Topp 2)</strong>
              I hvert oppgjør er det gjennomsnittet av de 2 høyeste nettopoengene i hvert rom for gjeldende GW som avgjør hvem som vinner. Resultatene beregnes automatisk når gameweeken er ferdig.
            </div>
            <div class="p-2.5 rounded-lg bg-white/[0.04] border border-white/10">
              <strong class="text-[#9FE88D] block mb-1">2. Avansering</strong>
              {#if cup.format === "lucky_loser" || cup.format === "lucky_loser_12"}
                Alle spiller runde 1. Vinnerne går videre, og de beste taperne (lucky losers) fyller de ledige plassene i utslagsrundene.
              {:else if layout === "double"}
                Et rom er først ute etter <strong>2 tap</strong>. Tapere i vinnerbraketten faller ned i taperbraketten, og begge brakettene spilles i samme gameweeks.
              {:else if cup.format === "round_robin" && !((cup.groupStandings?.length ?? 0) > 1)}
                Alle møter alle. Plasseringen avgjøres av poeng (3 for seier, 1 for uavgjort), deretter samlet romsnitt. Tabellens ener tar cupen.
              {:else if layout === "groups"}
                Alle møter alle i sin gruppe. Topp 2 fra hver gruppe går videre til utslagsrundene (playoffs).
              {:else}
                Vinnerne avanserer direkte til neste runde. Lag uten motstander i første runde får walkover.
              {/if}
            </div>
            <div class="p-2.5 rounded-lg bg-white/[0.04] border border-white/10">
              <strong class="text-[#F4C152] block mb-1">3. Tittel & Trofé</strong>
              Vinneren av finalen kåres til ligaens offisielle cupmester med evig heder på skryteveggen!
            </div>
          </div>
        </div>
      {/if}

      <!-- Pallen når cupen er ferdig -->
      {#if podium.length > 0}
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
          {#each podium as p}
            <div class="p-3 rounded-xl bg-gradient-to-r from-[#F4C152]/10 to-white/[0.03] border border-[#F4C152]/30 flex items-center gap-3">
              <Medal class={`w-6 h-6 shrink-0 ${p.medal}`} />
              <div class="min-w-0">
                <span class="text-[10px] uppercase font-bold text-[#AEB9CC] tracking-wider">{p.label}</span>
                <p class="text-sm font-bold text-white truncate">{p.room?.name}</p>
              </div>
            </div>
          {/each}
        </div>
      {/if}

      <!-- Raske Nøkkeltall / Statistikk -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
        <div class="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
          <div>
            <span class="text-[10px] uppercase font-bold text-[#AEB9CC] tracking-wider">
              {cup.status === "completed" ? "Spilt" : "Neste runde"}
            </span>
            <p class="text-sm font-bold text-white mt-0.5">
              {#if cup.status === "completed"}
                {playedCount} kamper
              {:else if currentGw}
                GW {currentGw} · {playedCount}/{playable.length} spilt
              {:else}
                {playedCount}/{playable.length} spilt
              {/if}
            </p>
          </div>
          <Calendar class="w-5 h-5 text-[#F4C152]" />
        </div>

        <div class="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
          <div class="min-w-0">
            <span class="text-[10px] uppercase font-bold text-[#AEB9CC] tracking-wider">Beste Romsnitt</span>
            <p class="text-sm font-bold text-[#9FE88D] mt-0.5 truncate">
              {topAverageInCup ? `${topAverageInCup.score}p (${topAverageInCup.roomName})` : "Ikke spilt"}
            </p>
          </div>
          <Flame class="w-5 h-5 text-[#9FE88D] shrink-0" />
        </div>

        <div class="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
          <div class="min-w-0">
            <span class="text-[10px] uppercase font-bold text-[#AEB9CC] tracking-wider">Turneringsmodell</span>
            <p class="text-sm font-bold text-[#70E1F8] truncate mt-0.5">{cupFormatLabel}</p>
          </div>
          <Shield class="w-5 h-5 text-[#70E1F8] shrink-0" />
        </div>

        <div class="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
          <div class="min-w-0">
            <span class="text-[10px] uppercase font-bold text-[#AEB9CC] tracking-wider">Status / Mester</span>
            <p class="text-sm font-bold text-[#F4C152] truncate mt-0.5">
              {cup.winnerRoom ? cup.winnerRoom.name : "Kjemper om gull"}
            </p>
          </div>
          <Crown class="w-5 h-5 text-[#F4C152] shrink-0" />
        </div>
      </div>

      <!-- Bracket / tabeller -->
      <div class="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar pr-1 min-h-0">
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
