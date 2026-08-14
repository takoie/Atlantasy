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

  let profile = $derived(profileQuery.data ?? null);
  let activeTab = $state<"pitch" | "stats" | "chips">("pitch");

  function openExternalFpl(url: string) {
    if (!url) return;
    window.open(url, "_blank");
  }
</script>

{#if isOpen && entryId}
  <!-- Backdrop -->
  <div
    role="presentation"
    onclick={onClose}
    class="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
  >
    <!-- Modal Container -->
    <div
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
      class="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
    >
      <!-- Toppheader med Manager-info, Rom og Ekstern FPL-knapp -->
      <div class="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div class="flex items-center gap-3.5 min-w-0">
          <div
            class="w-12 h-12 rounded-xl bg-gradient-to-br from-fpl-cyan to-emerald-600 text-slate-950 flex items-center justify-center font-black text-xl shadow-glow-cyan shrink-0"
          >
            <Shirt class="w-6 h-6 text-slate-950" />
          </div>

          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-base sm:text-lg font-black text-white truncate">
                {profile?.managerName || "Laster manager..."}
              </h2>
              {#if profile?.roomName}
                <span
                  class="text-[11px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border"
                  style={`border-color: ${profile.roomColor || "#00ff87"}50; color: ${profile.roomColor || "#00ff87"}; background-color: ${profile.roomColor || "#00ff87"}15;`}
                >
                  {profile.roomName}
                </span>
              {/if}
            </div>

            <p class="text-xs text-slate-400 truncate mt-0.5">
              {profile?.teamName || "FPL Lag"} • ID: #{entryId}
            </p>
          </div>
        </div>

        <!-- Handlinger & Ekstern FPL-lenke -->
        <div class="flex items-center gap-2">
          {#if profile?.fplUrl}
            <button
              onclick={() => openExternalFpl(profile.fplUrl)}
              class="px-3 py-1.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 border border-purple-700/60 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
              title="Åpne offisiell FPL lagside i ekstern nettleser"
            >
              <span>Åpne i FPL</span>
              <ExternalLink class="w-3.5 h-3.5" />
            </button>
          {/if}

          <button
            onclick={onClose}
            class="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- Hurtigtall / Nøkkeltall Stripe -->
      <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2 p-3 bg-slate-950/60 border-b border-slate-800 text-xs shrink-0 font-mono">
        <div class="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
          <span class="text-[10px] text-slate-400 uppercase font-sans block">Liga-plassering</span>
          <div class="text-base font-black text-amber-400 flex items-center gap-1">
            <Trophy class="w-4 h-4" />
            <span>#{profile?.leagueRank || 1}</span>
            <span class="text-[10px] text-slate-500 font-normal font-sans">av {profile?.totalManagers || 24}</span>
          </div>
        </div>

        <div class="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
          <span class="text-[10px] text-slate-400 uppercase font-sans block">Sesong totalt</span>
          <span class="text-base font-black text-emerald-400">
            {profile?.totalPoints || 0} <span class="text-[10px] text-slate-400 font-normal">pts</span>
          </span>
        </div>

        <div class="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
          <span class="text-[10px] text-slate-400 uppercase font-sans block">GW26 live</span>
          <span class="text-base font-black text-white">
            {profile?.currentGwPoints || 0} <span class="text-[10px] text-slate-400 font-normal">pts</span>
            {#if profile && profile.currentGwTransfersCost > 0}
              <span class="text-[10px] text-rose-400">(-{profile.currentGwTransfersCost})</span>
            {/if}
          </span>
        </div>

        <div class="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
          <span class="text-[10px] text-slate-400 uppercase font-sans block">Total FPL-rank</span>
          <span class="text-base font-black text-slate-200">
            {profile?.overallFplRank?.toLocaleString() || "42 350"}
          </span>
        </div>

        <div class="p-2.5 rounded-xl bg-slate-900 border border-slate-800 col-span-2 sm:col-span-1">
          <span class="text-[10px] text-slate-400 uppercase font-sans block">Lagverdi og bank</span>
          <span class="text-sm font-bold text-emerald-400">
            {profile?.teamValue || "£104.8m"}
            <span class="text-[10px] text-slate-400">({profile?.bank || "£1.2m"})</span>
          </span>
        </div>
      </div>

      <!-- Faner: Lagoppstilling, Statistikk og graf, Chips -->
      <div class="flex items-center gap-2 px-4 pt-3 border-b border-slate-800 bg-slate-900 shrink-0">
        <button
          onclick={() => (activeTab = "pitch")}
          class={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === "pitch"
              ? "border-emerald-500 text-emerald-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Shirt class="w-3.5 h-3.5" />
          <span>Lagoppstilling og poeng</span>
        </button>

        <button
          onclick={() => (activeTab = "stats")}
          class={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === "stats"
              ? "border-emerald-500 text-emerald-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <TrendingUp class="w-3.5 h-3.5" />
          <span>Plassering og klatregraf</span>
        </button>

        <button
          onclick={() => (activeTab = "chips")}
          class={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === "chips"
              ? "border-emerald-500 text-emerald-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Sparkles class="w-3.5 h-3.5" />
          <span>Chips og bytter</span>
        </button>
      </div>

      <!-- Faneinnhold -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4">
        <!-- 1. FOTBALLBANE & LAGOPPSTILLING -->
        {#if activeTab === "pitch"}
          <div class="space-y-3">
            <!-- Fotballbane -->
            <div class="relative rounded-2xl bg-gradient-to-b from-[#0b3820] via-[#0d4527] to-[#0b3820] border-2 border-emerald-500/30 p-4 sm:p-6 shadow-2xl overflow-hidden">
              <!-- Banelinjer -->
              <div class="absolute inset-x-6 top-0 h-16 border-b-2 border-x-2 border-emerald-400/20 rounded-b-xl pointer-events-none"></div>
              <div class="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-emerald-400/20 pointer-events-none"></div>
              <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full border-2 border-emerald-400/20 pointer-events-none"></div>

              <!-- Startellever i 4-3-3 / 4-4-2 formasjon -->
              <div class="relative z-10 flex flex-col justify-between min-h-[380px] gap-4">
                <!-- 1. Keeper -->
                <div class="flex justify-center">
                  {#each (profile?.pitch || []).filter((p: any) => p.pos === "GKP") as p}
                    <div class="flex flex-col items-center group cursor-pointer">
                      <div class="w-10 h-10 rounded-full bg-amber-500 border-2 border-white shadow-lg flex items-center justify-center font-bold text-slate-950 text-xs group-hover:scale-110 transition-transform">
                        🧤
                      </div>
                      <div class="mt-1 bg-slate-950/90 backdrop-blur-sm border border-slate-700/80 px-2 py-0.5 rounded text-center shadow">
                        <span class="text-[11px] font-bold text-white block truncate max-w-[90px]">{p.name}</span>
                        <span class="text-[10px] font-mono font-bold text-fpl-cyan">{p.points} pts</span>
                      </div>
                    </div>
                  {/each}
                </div>

                <!-- 2. Forsvar (DEF) -->
                <div class="flex justify-around items-center px-2">
                  {#each (profile?.pitch || []).filter((p: any) => p.pos === "DEF") as p}
                    <div class="flex flex-col items-center group cursor-pointer">
                      <div class="w-9 h-9 rounded-full bg-sky-500 border-2 border-white shadow-md flex items-center justify-center font-bold text-white text-xs group-hover:scale-110 transition-transform">
                        🛡️
                      </div>
                      <div class="mt-1 bg-slate-950/90 backdrop-blur-sm border border-slate-700/80 px-2 py-0.5 rounded text-center shadow">
                        <span class="text-[11px] font-bold text-white block truncate max-w-[85px]">{p.name}</span>
                        <span class="text-[10px] font-mono font-bold text-fpl-cyan">{p.points} pts</span>
                      </div>
                    </div>
                  {/each}
                </div>

                <!-- 3. Midtbane (MID) -->
                <div class="flex justify-around items-center px-2">
                  {#each (profile?.pitch || []).filter((p: any) => p.pos === "MID") as p}
                    <div class="flex flex-col items-center group cursor-pointer relative">
                      <div class="w-9 h-9 rounded-full bg-emerald-500 border-2 border-white shadow-md flex items-center justify-center font-bold text-slate-950 text-xs group-hover:scale-110 transition-transform">
                        ⚡
                      </div>

                      {#if p.isVice}
                        <span class="absolute -top-1 -right-1 bg-slate-300 text-slate-950 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow">
                          VC
                        </span>
                      {/if}

                      <div class="mt-1 bg-slate-950/90 backdrop-blur-sm border border-slate-700/80 px-2 py-0.5 rounded text-center shadow">
                        <span class="text-[11px] font-bold text-white block truncate max-w-[85px]">{p.name}</span>
                        <span class="text-[10px] font-mono font-bold text-fpl-cyan">{p.points} pts</span>
                      </div>
                    </div>
                  {/each}
                </div>

                <!-- 4. Angrep (FWD) -->
                <div class="flex justify-around items-center px-12">
                  {#each (profile?.pitch || []).filter((p: any) => p.pos === "FWD") as p}
                    <div class="flex flex-col items-center group cursor-pointer relative">
                      <div class="w-10 h-10 rounded-full bg-rose-500 border-2 border-white shadow-lg flex items-center justify-center font-bold text-white text-xs group-hover:scale-110 transition-transform">
                        ⚽
                      </div>

                      {#if p.isCaptain}
                        <span class="absolute -top-1 -right-1 bg-amber-400 text-slate-950 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-md border border-slate-950">
                          C
                        </span>
                      {/if}

                      <div class="mt-1 bg-slate-950/90 backdrop-blur-sm border border-slate-700/80 px-2.5 py-0.5 rounded text-center shadow">
                        <span class="text-[11px] font-bold text-white block truncate max-w-[95px]">
                          {p.name} {p.isCaptain ? "(C)" : ""}
                        </span>
                        <span class="text-[10px] font-mono font-bold text-fpl-cyan">{p.points} pts</span>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            </div>

            <!-- Benk / Innbyttere -->
            <div class="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div class="flex items-center justify-between text-xs text-slate-400 pb-1 border-b border-slate-800/80">
                <span class="font-bold text-slate-300">Innbyttere & Benk</span>
                <span class="text-[11px] font-mono text-amber-400">
                  Benkepoeng totalt: {(profile?.bench || []).reduce((s: number, b: any) => s + b.points, 0)} pts
                </span>
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {#each (profile?.bench || []) as sub, idx}
                  <div class="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2.5">
                    <span class="text-xs font-mono font-bold text-slate-500">{idx + 1}</span>
                    <div class="min-w-0 flex-1">
                      <span class="text-xs font-bold text-white block truncate">{sub.name}</span>
                      <span class="text-[10px] text-slate-400">{sub.pos} • {sub.club}</span>
                    </div>
                    <span class="text-xs font-mono font-bold text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded">
                      {sub.points}p
                    </span>
                  </div>
                {/each}
              </div>
            </div>
          </div>
        {/if}

        <!-- 2. STATISTIKK & KLATREGRAF -->
        {#if activeTab === "stats"}
          <div class="space-y-4">
            <!-- Rank & Poengutvikling siste runder -->
            <div class="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-bold text-white flex items-center gap-1.5">
                  <TrendingUp class="w-4 h-4 text-emerald-400" />
                  <span>Plasseringsutvikling & Poeng per Gameweek</span>
                </h3>
                <span class="text-xs text-slate-400 font-mono">Siste 8 runder</span>
              </div>

              <!-- Visuell Kurve / Grafbar -->
              <div class="grid grid-cols-8 gap-2 pt-6 pb-2 items-end h-48 border-b border-slate-800">
                {#each (profile?.history || []) as h}
                  <div class="flex flex-col items-center gap-1.5 h-full justify-end group">
                    <span class="text-[10px] font-mono text-fpl-cyan font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                      {h.points}p
                    </span>

                    <!-- Graf-søyle -->
                    <div
                      class="w-full max-w-[28px] rounded-t-lg bg-gradient-to-t from-slate-800 to-fpl-cyan/80 group-hover:to-fpl-cyan transition-all relative"
                      style={`height: ${Math.max((h.points / 100) * 100, 15)}%`}
                    >
                      <!-- Rank badge øverst -->
                      <span class="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-mono font-black text-amber-400 bg-slate-950 px-1 rounded border border-slate-700">
                        #{h.rank}
                      </span>
                    </div>

                    <span class="text-[10px] font-mono text-slate-400">GW{h.gw}</span>
                  </div>
                {/each}
              </div>

              <div class="flex items-center justify-between text-xs text-slate-400 pt-1">
                <span>🟢 Høyeste poengscore: <strong>91 pts (GW 23)</strong></span>
                <span>🏆 Beste plassering: <strong>#2 (GW 25)</strong></span>
              </div>
            </div>
          </div>
        {/if}

        <!-- 3. CHIPS & BYTTEHISTORIKK -->
        {#if activeTab === "chips"}
          <div class="space-y-4">
            <!-- Chipstatus -->
            <div class="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <h3 class="text-sm font-bold text-white flex items-center gap-1.5">
                <Sparkles class="w-4 h-4 text-purple-400" />
                <span>Chip-oversikt for sesongen</span>
              </h3>

              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {#each (profile?.chips || []) as chip}
                  <div class={`p-3 rounded-xl border space-y-1.5 ${
                    chip.status === "Brukt"
                      ? "bg-slate-900/60 border-slate-800 opacity-80"
                      : "bg-gradient-to-br from-purple-950/30 to-slate-900 border-purple-500/40 shadow-sm"
                  }`}>
                    <div class="flex items-center justify-between">
                      <span class="font-bold text-xs text-white">{chip.name}</span>
                      <span class={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        chip.status === "Brukt"
                          ? "bg-slate-800 text-slate-400"
                          : "bg-emerald-950 text-emerald-300 border border-emerald-800/60"
                      }`}>
                        {chip.status}
                      </span>
                    </div>

                    <p class="text-[11px] text-slate-400 font-mono">
                      {chip.gw ? chip.gw : "Klar til bruk når som helst"}
                    </p>
                  </div>
                {/each}
              </div>
            </div>

            <!-- Overganger og Bytter -->
            <div class="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <h3 class="text-sm font-bold text-white flex items-center gap-1.5">
                <RefreshCw class="w-4 h-4 text-fpl-cyan" />
                <span>Overganger & Transfer Hits</span>
              </h3>

              <div class="grid grid-cols-3 gap-3 text-xs font-mono">
                <div class="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span class="text-[10px] text-slate-400 font-sans block">Totalt Gjennomførte Bytter</span>
                  <span class="text-base font-bold text-white">{profile?.totalTransfers || 24}</span>
                </div>

                <div class="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span class="text-[10px] text-slate-400 font-sans block">Minuspoeng denne runden</span>
                  <span class="text-base font-bold text-rose-400">-{profile?.currentGwTransfersCost || 0} pts</span>
                </div>

                <div class="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span class="text-[10px] text-slate-400 font-sans block">Penger i Bank</span>
                  <span class="text-base font-bold text-emerald-400">{profile?.bank || "£1.2m"}</span>
                </div>
              </div>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
