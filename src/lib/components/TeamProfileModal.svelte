<script lang="ts">
  import {
    X,
    ExternalLink,
    Trophy,
    TrendingUp,
    Shirt,
    Sparkles,
    RefreshCw,
  } from "lucide-svelte";
  import { useQuery } from "$lib/convex.svelte";
  import { api } from "../../../convex/_generated/api";

  interface PitchPlayer {
    id?: number;
    name: string;
    pos: "GKP" | "DEF" | "MID" | "FWD";
    points: number;
    isCaptain?: boolean;
    isViceCaptain?: boolean;
  }

  interface HistoryEntry {
    gw: number;
    points: number;
    rank: number;
  }

  interface ChipEntry {
    name: string;
    status: string;
    gw: number | null | string;
  }

  interface TeamProfileData {
    entryId: number;
    managerName: string;
    teamName: string;
    leagueRank: number;
    totalManagers: number;
    totalPoints: number;
    currentGwPoints: number;
    currentGwTransfersCost: number;
    roomName?: string;
    roomColor?: string;
    roomNumber?: number;
    overallFplRank?: number | null;
    teamValue: string;
    bank?: string;
    totalTransfers: number;
    pitch?: PitchPlayer[];
    bench?: PitchPlayer[];
    history?: HistoryEntry[];
    chips?: ChipEntry[];
    fplUrl?: string;
  }

  let {
    entryId = null,
    isOpen = false,
    onClose = () => {},
  }: {
    entryId: number | null;
    isOpen: boolean;
    onClose: () => void;
  } = $props();

  const profileQuery = useQuery(
    api.rooms.getTeamProfile,
    () => (entryId ? { entryId } : undefined)
  );

  let profile = $derived((profileQuery.data as TeamProfileData | undefined) ?? null);
  let activeTab = $state<"pitch" | "stats" | "chips">("pitch");

  // Effektive $derived-oppdelinger for fotballbanen (unngår re-filtrering i DOM)
  let goalkeepers = $derived(profile?.pitch?.filter((p) => p.pos === "GKP") ?? []);
  let defenders = $derived(profile?.pitch?.filter((p) => p.pos === "DEF") ?? []);
  let midfielders = $derived(profile?.pitch?.filter((p) => p.pos === "MID") ?? []);
  let forwards = $derived(profile?.pitch?.filter((p) => p.pos === "FWD") ?? []);
  let benchPlayers = $derived(profile?.bench ?? []);

  // Dynamisk beregning av maks poeng for proporsjonale søyler i grafen
  let maxHistoryPoints = $derived(
    Math.max(...(profile?.history?.map((h) => h.points) ?? [100]), 60)
  );

  import { openExternalUrl } from "$lib/utils/openUrl";

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape" && isOpen) {
      onClose();
    }
  }

  function openExternalFpl(url?: string) {
    if (!url) return;
    openExternalUrl(url);
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen && entryId}
  <!-- Backdrop -->
  <div
    role="presentation"
    onclick={onClose}
    class="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
  >
    <!-- Modal Container (DaisyUI Dim Theme) -->
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-manager-title"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
      class="bg-[#2A303C] border border-[#384252] rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-[#E2E8F0] font-sans"
    >
      <!-- Toppheader med managerinfo, rom og ekstern FPL-knapp -->
      <div class="p-4 sm:p-5 bg-[#191E24] border-b border-[#384252] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div class="flex items-center gap-3.5 min-w-0">
          <div
            class="w-11 h-11 rounded-xl bg-[#9FE88D] text-[#16380c] flex items-center justify-center font-black text-xl shadow-sm shrink-0"
          >
            <Shirt class="w-6 h-6 text-[#16380c]" />
          </div>

          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h2 id="modal-manager-title" class="text-base sm:text-lg font-bold text-white truncate">
                {profile?.managerName || "Laster manager..."}
              </h2>
              {#if profile?.roomName}
                <span
                  class="text-[11px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border"
                  style={`border-color: ${profile.roomColor || "#9FE88D"}50; color: ${profile.roomColor || "#9FE88D"}; background-color: ${profile.roomColor || "#9FE88D"}15;`}
                >
                  {profile.roomName}
                </span>
              {/if}
            </div>

            <p class="text-xs text-[#94A3B8] truncate mt-0.5">
              {profile?.teamName || "FPL-lag"} • ID: #{entryId}
            </p>
          </div>
        </div>

        <!-- Handlinger og ekstern FPL-lenke -->
        <div class="flex items-center gap-2">
          {#if profile?.fplUrl}
            <button
              type="button"
              onclick={() => openExternalFpl(profile?.fplUrl)}
              class="px-3 py-1.5 rounded-xl bg-[#242B35] hover:bg-[#384252] text-[#E2E8F0] border border-[#384252] text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
              title="Åpne offisiell FPL-lagside i ekstern nettleser"
            >
              <span>Åpne i FPL</span>
              <ExternalLink class="w-3.5 h-3.5 text-[#9FE88D]" />
            </button>
          {/if}

          <button
            type="button"
            onclick={onClose}
            aria-label="Lukk modal"
            class="p-1.5 rounded-xl text-[#94A3B8] hover:text-white hover:bg-[#242B35] transition-colors"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- Hurtigtall / Nøkkeltall Stripe -->
      <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2 p-3 bg-[#191E24] border-b border-[#384252] text-xs shrink-0 font-mono">
        <div class="p-2.5 rounded-xl bg-[#242B35] border border-[#384252]">
          <span class="text-[10px] text-[#94A3B8] uppercase font-sans block">Ligaplassering</span>
          <div class="text-base font-bold text-[#F4C152] flex items-center gap-1">
            <Trophy class="w-4 h-4" />
            <span>#{profile?.leagueRank ?? "--"}</span>
            {#if profile?.totalManagers}
              <span class="text-[10px] text-[#94A3B8] font-normal font-sans">av {profile.totalManagers}</span>
            {/if}
          </div>
        </div>

        <div class="p-2.5 rounded-xl bg-[#242B35] border border-[#384252]">
          <span class="text-[10px] text-[#94A3B8] uppercase font-sans block">Totalt i sesongen</span>
          <span class="text-base font-bold text-[#9FE88D]">
            {profile?.totalPoints ?? 0} <span class="text-[10px] text-[#94A3B8] font-normal">pts</span>
          </span>
        </div>

        <div class="p-2.5 rounded-xl bg-[#242B35] border border-[#384252]">
          <span class="text-[10px] text-[#94A3B8] uppercase font-sans block">Rundepoeng (live)</span>
          <span class="text-base font-bold text-white">
            {profile?.currentGwPoints ?? 0} <span class="text-[10px] text-[#94A3B8] font-normal">pts</span>
            {#if profile && profile.currentGwTransfersCost > 0}
              <span class="text-[10px] text-[#FB6F84]">(-{profile.currentGwTransfersCost})</span>
            {/if}
          </span>
        </div>

        <div class="p-2.5 rounded-xl bg-[#242B35] border border-[#384252]">
          <span class="text-[10px] text-[#94A3B8] uppercase font-sans block">Total FPL-ranking</span>
          <span class="text-base font-bold text-[#E2E8F0]">
            {profile?.overallFplRank ? profile.overallFplRank.toLocaleString("no-NO") : "--"}
          </span>
        </div>

        <div class="p-2.5 rounded-xl bg-[#242B35] border border-[#384252] col-span-2 sm:col-span-1">
          <span class="text-[10px] text-[#94A3B8] uppercase font-sans block">Lagverdi</span>
          <span class="text-sm font-bold text-[#9FE88D]">
            {profile?.teamValue || "£100.0m"}
          </span>
        </div>
      </div>

      <!-- Fanemeny -->
      <div class="flex items-center gap-2 px-4 pt-3 border-b border-[#384252] bg-[#191E24] shrink-0">
        <button
          type="button"
          onclick={() => (activeTab = "pitch")}
          class={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === "pitch"
              ? "border-[#9FE88D] text-[#9FE88D]"
              : "border-transparent text-[#94A3B8] hover:text-white"
          }`}
        >
          <Shirt class="w-3.5 h-3.5" />
          <span>Lagoppstilling og poeng</span>
        </button>

        <button
          type="button"
          onclick={() => (activeTab = "stats")}
          class={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === "stats"
              ? "border-[#9FE88D] text-[#9FE88D]"
              : "border-transparent text-[#94A3B8] hover:text-white"
          }`}
        >
          <TrendingUp class="w-3.5 h-3.5" />
          <span>Plassering og klatregraf</span>
        </button>

        <button
          type="button"
          onclick={() => (activeTab = "chips")}
          class={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === "chips"
              ? "border-[#9FE88D] text-[#9FE88D]"
              : "border-transparent text-[#94A3B8] hover:text-white"
          }`}
        >
          <Sparkles class="w-3.5 h-3.5" />
          <span>Chips og bytter</span>
        </button>
      </div>

      <!-- Faneinnhold -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        <!-- 1. FOTBALLBANE & LAGOPPSTILLING -->
        {#if activeTab === "pitch"}
          <div class="space-y-3">
            {#if !profile?.pitch || profile.pitch.length === 0}
              <div class="p-8 rounded-2xl bg-[#242B35] border border-[#384252] text-center flex flex-col items-center justify-center space-y-2">
                <Shirt class="w-10 h-10 text-[#94A3B8]/40" />
                <h4 class="text-sm font-bold text-white">Lagoppstilling før sesongstart</h4>
                <p class="text-xs text-[#94A3B8] max-w-md">
                  FPL skjuler lagoppstillingen til andre managere frem til fristen for runde 1 har passert. Så snart runden er i gang, oppdateres lagoppstillingen her automatisk.
                </p>
                {#if profile?.fplUrl}
                  <button
                    type="button"
                    onclick={() => openExternalFpl(profile?.fplUrl)}
                    class="mt-2 px-3.5 py-1.5 rounded-xl bg-[#9FE88D] text-[#16380c] font-bold text-xs hover:bg-[#8ce078] transition-colors"
                  >
                    Åpne i FPL
                  </button>
                {/if}
              </div>
            {:else}
              <!-- Fotballbane -->
              <div class="relative rounded-2xl bg-gradient-to-b from-[#1a2820] via-[#203328] to-[#1a2820] border border-[#9FE88D]/40 p-4 sm:p-6 shadow-md overflow-hidden">
                <div class="absolute inset-x-6 top-0 h-16 border-b-2 border-x-2 border-[#9FE88D]/20 rounded-b-xl pointer-events-none"></div>
                <div class="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-[#9FE88D]/20 pointer-events-none"></div>
                <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full border-2 border-[#9FE88D]/20 pointer-events-none"></div>

                <div class="relative z-10 flex flex-col justify-between min-h-[380px] gap-4">
                  <!-- Målvakt -->
                  <div class="flex justify-center">
                    {#each goalkeepers as p}
                      <div class="flex flex-col items-center group cursor-pointer">
                        <div class="w-10 h-10 rounded-full bg-[#F4C152] border-2 border-white shadow-md flex items-center justify-center font-bold text-black text-xs group-hover:scale-110 transition-transform">
                          🧤
                        </div>
                        <div class="mt-1 bg-[#191E24]/95 border border-[#384252] px-2 py-0.5 rounded text-center shadow">
                          <span class="text-[11px] font-bold text-white block truncate max-w-[90px]">{p.name}</span>
                          <span class="text-[10px] font-mono font-bold text-[#9FE88D]">{p.points} pts</span>
                        </div>
                      </div>
                    {/each}
                  </div>

                  <!-- Forsvar -->
                  <div class="flex justify-around items-center px-2">
                    {#each defenders as p}
                      <div class="flex flex-col items-center group cursor-pointer">
                        <div class="w-9 h-9 rounded-full bg-[#70E1F8] border-2 border-white shadow-sm flex items-center justify-center font-bold text-black text-xs group-hover:scale-110 transition-transform">
                          🛡️
                        </div>
                        <div class="mt-1 bg-[#191E24]/95 border border-[#384252] px-2 py-0.5 rounded text-center shadow">
                          <span class="text-[11px] font-bold text-white block truncate max-w-[85px]">{p.name}</span>
                          <span class="text-[10px] font-mono font-bold text-[#9FE88D]">{p.points} pts</span>
                        </div>
                      </div>
                    {/each}
                  </div>

                  <!-- Midtbane -->
                  <div class="flex justify-around items-center px-2">
                    {#each midfielders as p}
                      <div class="flex flex-col items-center group cursor-pointer relative">
                        <div class="w-9 h-9 rounded-full bg-[#9FE88D] border-2 border-white shadow-sm flex items-center justify-center font-bold text-[#16380c] text-xs group-hover:scale-110 transition-transform">
                          ⚡
                        </div>
                        <div class="mt-1 bg-[#191E24]/95 border border-[#384252] px-2 py-0.5 rounded text-center shadow">
                          <span class="text-[11px] font-bold text-white block truncate max-w-[85px]">{p.name}</span>
                          <span class="text-[10px] font-mono font-bold text-[#9FE88D]">{p.points} pts</span>
                        </div>
                      </div>
                    {/each}
                  </div>

                  <!-- Angrep -->
                  <div class="flex justify-around items-center px-12">
                    {#each forwards as p}
                      <div class="flex flex-col items-center group cursor-pointer relative">
                        <div class="w-10 h-10 rounded-full bg-[#FB6F84] border-2 border-white shadow-sm flex items-center justify-center font-bold text-white text-xs group-hover:scale-110 transition-transform">
                          ⚽
                        </div>
                        <div class="mt-1 bg-[#191E24]/95 border border-[#384252] px-2.5 py-0.5 rounded text-center shadow">
                          <span class="text-[11px] font-bold text-white block truncate max-w-[95px]">{p.name}</span>
                          <span class="text-[10px] font-mono font-bold text-[#9FE88D]">{p.points} pts</span>
                        </div>
                      </div>
                    {/each}
                  </div>
                </div>
              </div>

              <!-- Innbyttere / Benk -->
              {#if benchPlayers.length > 0}
                <div class="p-3 rounded-xl bg-[#191E24] border border-[#384252]">
                  <span class="text-[11px] font-bold text-[#94A3B8] uppercase block mb-2">Innbyttere</span>
                  <div class="grid grid-cols-4 gap-2">
                    {#each benchPlayers as b}
                      <div class="flex flex-col items-center p-2 rounded-lg bg-[#242B35] border border-[#384252]">
                        <span class="text-[11px] font-bold text-white truncate max-w-[80px]">{b.name}</span>
                        <span class="text-[10px] font-mono text-[#9FE88D] font-bold">{b.points} pts</span>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}
            {/if}
          </div>
        {/if}

        <!-- 2. STATISTIKK & KLATREGRAF -->
        {#if activeTab === "stats"}
          <div class="space-y-4">
            <div class="p-4 rounded-xl bg-[#242B35] border border-[#384252] space-y-3">
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-bold text-white flex items-center gap-1.5">
                  <TrendingUp class="w-4 h-4 text-[#9FE88D]" />
                  <span>Plasseringsutvikling og poeng per runde</span>
                </h3>
              </div>

              {#if !profile?.history || profile.history.length === 0}
                <div class="p-6 text-center text-xs text-[#94A3B8]">
                  Ingen runderesultater registrert ennå. Plasseringsgrafen bygges opp automatisk etter hvert som rundene spilles.
                </div>
              {:else}
                <div class="flex items-end gap-2 pt-6 pb-2 h-48 border-b border-[#384252] overflow-x-auto custom-scrollbar">
                  {#each profile.history as h}
                    <div class="flex flex-col items-center gap-1.5 h-full justify-end group min-w-[34px] flex-1">
                      <span class="text-[10px] font-mono text-[#9FE88D] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                        {h.points}p
                      </span>
                      <div
                        class="w-full max-w-[28px] rounded-t-lg bg-[#9FE88D] group-hover:bg-[#8ce078] transition-all relative"
                        style={`height: ${Math.max(12, Math.min(100, (h.points / maxHistoryPoints) * 100))}%`}
                      >
                        <span class="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-mono font-bold text-[#F4C152] bg-[#191E24] px-1 rounded border border-[#384252] whitespace-nowrap">
                          #{h.rank}
                        </span>
                      </div>
                      <span class="text-[10px] font-mono text-[#94A3B8]">GW{h.gw}</span>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          </div>
        {/if}

        <!-- 3. CHIPS & BYTTEHISTORIKK -->
        {#if activeTab === "chips"}
          <div class="space-y-4">
            <div class="p-4 rounded-xl bg-[#242B35] border border-[#384252] space-y-3">
              <h3 class="text-sm font-bold text-white flex items-center gap-1.5">
                <Sparkles class="w-4 h-4 text-[#F4C152]" />
                <span>Chipoversikt for sesongen</span>
              </h3>

              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {#each profile?.chips ?? [] as chip}
                  <div class="p-3 rounded-xl border border-[#384252] bg-[#191E24] space-y-1.5 shadow-sm">
                    <div class="flex items-center justify-between">
                      <span class="font-bold text-xs text-white">{chip.name}</span>
                      <span class={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        chip.status === "Brukt"
                          ? "bg-[#242B35] text-[#94A3B8]"
                          : "bg-[#9FE88D]/20 text-[#9FE88D] border border-[#9FE88D]/30"
                      }`}>
                        {chip.status}
                      </span>
                    </div>

                    <p class="text-[11px] text-[#94A3B8] font-mono">
                      {chip.gw ? `Runde ${chip.gw}` : "Klar til bruk"}
                    </p>
                  </div>
                {/each}
              </div>
            </div>

            <!-- Overganger og bytter -->
            <div class="p-4 rounded-xl bg-[#242B35] border border-[#384252] space-y-2">
              <h3 class="text-sm font-bold text-white flex items-center gap-1.5">
                <RefreshCw class="w-4 h-4 text-[#9FE88D]" />
                <span>Overganger og minuspoeng</span>
              </h3>

              <div class="grid grid-cols-3 gap-3 text-xs font-mono">
                <div class="p-2.5 rounded-xl bg-[#191E24] border border-[#384252]">
                  <span class="text-[10px] text-[#94A3B8] font-sans block">Gjennomførte bytter</span>
                  <span class="text-base font-bold text-white">{profile?.totalTransfers ?? 0}</span>
                </div>

                <div class="p-2.5 rounded-xl bg-[#191E24] border border-[#384252]">
                  <span class="text-[10px] text-[#94A3B8] font-sans block">Minuspoeng denne runden</span>
                  <span class="text-base font-bold text-[#FB6F84]">-{profile?.currentGwTransfersCost ?? 0} pts</span>
                </div>

                <div class="p-2.5 rounded-xl bg-[#191E24] border border-[#384252]">
                  <span class="text-[10px] text-[#94A3B8] font-sans block">Lagverdi</span>
                  <span class="text-base font-bold text-[#9FE88D]">{profile?.teamValue || "£100.0m"}</span>
                </div>
              </div>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
