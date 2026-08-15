<script lang="ts">
  import {
    TrendingUp,
    TrendingDown,
    Armchair,
    Percent,
    ArrowUpRight,
    ArrowDownRight,
    Sparkles,
    Zap,
    Crown,
    Flame,
    Gem,
    Activity,
    ShieldAlert,
    ShieldCheck,
    Trophy,
    RefreshCcw,
  } from "lucide-svelte";

  let {
    funStats = null,
    isFullPage = false,
    timeframe = "round",
    onChangeTimeframe = (_t: "round" | "month" | "season") => {},
    onOpenProfile = (_entryId: number) => {},
  }: {
    funStats?: any;
    isFullPage?: boolean;
    timeframe?: "round" | "month" | "season";
    onChangeTimeframe?: (t: "round" | "month" | "season") => void;
    onOpenProfile?: (entryId: number) => void;
  } = $props();

  let activeTab = $state<
    | "captains"
    | "hits"
    | "differentials"
    | "f1"
    | "dream"
    | "autosub"
    | "bench"
    | "ownership"
    | "climbers"
    | "chips"
  >("captains");

  let timeframeLabel = $derived(
    timeframe === "season"
      ? "sesongen så langt"
      : timeframe === "month"
      ? "denne måneden"
      : "denne runden"
  );
</script>

<div class={`${isFullPage ? "h-full flex-1 min-h-0" : "h-[320px] shrink-0"} rounded-2xl bg-[#2A303C] border border-[#384252] p-4 md:p-5 flex flex-col space-y-3.5 shadow-sm overflow-hidden text-[#E2E8F0] font-sans`}>
  <!-- Topplinje med tittel, tidsrom-velger og faner for innsiktsmoduler -->
  <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[#384252] pb-3 shrink-0">
    <div class="flex items-center gap-3">
      <div class="p-2 rounded-xl bg-[#F4C152]/15 text-[#F4C152] border border-[#F4C152]/30">
        <Sparkles class="w-4 h-4" />
      </div>
      <div>
        <span class="text-sm md:text-base font-bold text-white tracking-wide block leading-tight">
          Ligainnsikt og høydepunkter
        </span>
        <span class="text-xs text-[#94A3B8]">Moro, taktikk og dyp statistikk for {timeframeLabel}</span>
      </div>
    </div>

    <!-- Tidsrom toggle: Runde / Måned / Sesong -->
    <div class="flex items-center gap-1 p-1 rounded-xl bg-[#191E24] border border-[#384252] text-xs font-semibold">
      <button
        onclick={() => onChangeTimeframe("round")}
        class={`px-3 py-1 rounded-lg transition-colors text-xs ${
          timeframe === "round"
            ? "bg-[#9FE88D] text-[#16380c] font-bold shadow-sm"
            : "text-[#94A3B8] hover:text-white"
        }`}
      >
        Runde
      </button>

      <button
        onclick={() => onChangeTimeframe("month")}
        class={`px-3 py-1 rounded-lg transition-colors text-xs ${
          timeframe === "month"
            ? "bg-[#9FE88D] text-[#16380c] font-bold shadow-sm"
            : "text-[#94A3B8] hover:text-white"
        }`}
      >
        Måned
      </button>

      <button
        onclick={() => onChangeTimeframe("season")}
        class={`px-3 py-1 rounded-lg transition-colors text-xs ${
          timeframe === "season"
            ? "bg-[#9FE88D] text-[#16380c] font-bold shadow-sm"
            : "text-[#94A3B8] hover:text-white"
        }`}
      >
        Sesongen
      </button>
    </div>

    <!-- Faner med DaisyUI Dim stil -->
    <div class="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[#191E24] border border-[#384252] text-xs font-semibold overflow-x-auto max-w-full custom-scrollbar">
      <button
        onclick={() => (activeTab = "captains")}
        class={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shrink-0 ${
          activeTab === "captains"
            ? "bg-[#F4C152] text-black font-bold shadow-sm"
            : "text-[#94A3B8] hover:text-white"
        }`}
      >
        <Crown class="w-3.5 h-3.5" />
        <span>Kapteiner</span>
      </button>

      <button
        onclick={() => (activeTab = "hits")}
        class={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shrink-0 ${
          activeTab === "hits"
            ? "bg-[#FB6F84] text-white font-bold shadow-sm"
            : "text-[#94A3B8] hover:text-white"
        }`}
      >
        <Flame class="w-3.5 h-3.5" />
        <span>Hit-jegeren</span>
      </button>

      <button
        onclick={() => (activeTab = "differentials")}
        class={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shrink-0 ${
          activeTab === "differentials"
            ? "bg-[#70E1F8] text-black font-bold shadow-sm"
            : "text-[#94A3B8] hover:text-white"
        }`}
      >
        <Gem class="w-3.5 h-3.5" />
        <span>Differensialer</span>
      </button>

      <button
        onclick={() => (activeTab = "f1")}
        class={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shrink-0 ${
          activeTab === "f1"
            ? "bg-[#9FE88D] text-[#16380c] font-bold shadow-sm"
            : "text-[#94A3B8] hover:text-white"
        }`}
      >
        <Trophy class="w-3.5 h-3.5" />
        <span>Formel 1-tabell</span>
      </button>

      <button
        onclick={() => (activeTab = "dream")}
        class={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shrink-0 ${
          activeTab === "dream"
            ? "bg-[#9FE88D] text-[#16380c] font-bold shadow-sm"
            : "text-[#94A3B8] hover:text-white"
        }`}
      >
        <ShieldCheck class="w-3.5 h-3.5" />
        <span>Drømmeellever</span>
      </button>

      <button
        onclick={() => (activeTab = "autosub")}
        class={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shrink-0 ${
          activeTab === "autosub"
            ? "bg-[#70E1F8] text-black font-bold shadow-sm"
            : "text-[#94A3B8] hover:text-white"
        }`}
      >
        <RefreshCcw class="w-3.5 h-3.5" />
        <span>Auto-sub</span>
      </button>

      <button
        onclick={() => (activeTab = "bench")}
        class={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shrink-0 ${
          activeTab === "bench"
            ? "bg-[#F4C152] text-black font-bold shadow-sm"
            : "text-[#94A3B8] hover:text-white"
        }`}
      >
        <Armchair class="w-3.5 h-3.5" />
        <span>Benk-tabber</span>
      </button>

      <button
        onclick={() => (activeTab = "ownership")}
        class={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shrink-0 ${
          activeTab === "ownership"
            ? "bg-[#9FE88D] text-[#16380c] font-bold shadow-sm"
            : "text-[#94A3B8] hover:text-white"
        }`}
      >
        <Percent class="w-3.5 h-3.5" />
        <span>Eierskap</span>
      </button>

      <button
        onclick={() => (activeTab = "climbers")}
        class={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shrink-0 ${
          activeTab === "climbers"
            ? "bg-[#9FE88D] text-[#16380c] font-bold shadow-sm"
            : "text-[#94A3B8] hover:text-white"
        }`}
      >
        <TrendingUp class="w-3.5 h-3.5" />
        <span>Klatrere</span>
      </button>

      <button
        onclick={() => (activeTab = "chips")}
        class={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shrink-0 ${
          activeTab === "chips"
            ? "bg-[#F4C152] text-black font-bold shadow-sm"
            : "text-[#94A3B8] hover:text-white"
        }`}
      >
        <Zap class="w-3.5 h-3.5" />
        <span>Chips</span>
      </button>
    </div>
  </div>

  <!-- Hovedinnhold i innsiktsmodulen -->
  <div class="flex-1 min-h-0 overflow-y-auto pr-1 custom-scrollbar">
    <!-- 1. Kapteinslotteriet & Kapteinsblemmen -->
    {#if activeTab === "captains"}
      {#if !funStats?.captainStats?.topCaptains || funStats.captainStats.topCaptains.length === 0}
        <div class="h-full flex flex-col items-center justify-center text-center p-6 bg-[#242B35] rounded-xl border border-[#384252] space-y-1.5">
          <Crown class="w-8 h-8 text-[#94A3B8] mb-1" />
          <p class="text-sm font-bold text-white">Ingen kapteinsvalg registrert for {timeframeLabel}</p>
          <p class="text-xs text-[#94A3B8]">Kapteinsstatistikken oppdateres automatisk så snart runden starter og lagoppstillingene er klare.</p>
        </div>
      {:else}
        <div class="grid grid-cols-1 md:grid-cols-12 gap-3.5 h-full">
          <!-- Genitrekket (Topp kapteiner) -->
          <div class="md:col-span-5 p-4 rounded-xl bg-[#242B35] border border-[#384252] space-y-3">
            <div class="flex items-center justify-between border-b border-[#384252] pb-2">
              <h4 class="text-xs font-bold text-[#9FE88D] uppercase tracking-wider flex items-center gap-1.5">
                <Crown class="w-3.5 h-3.5" />
                <span>Genitrekkene (topp kaptein)</span>
              </h4>
              <span class="text-[10px] text-[#94A3B8]">Doble poeng</span>
            </div>

            <div class="space-y-2">
              {#each funStats?.captainStats?.topCaptains || [] as item, idx}
                <div
                  role="button"
                  tabindex="0"
                  onclick={() => onOpenProfile(item.entryId)}
                  onkeydown={(e) => (e.key === "Enter" || e.key === " ") && onOpenProfile(item.entryId)}
                  class="p-2.5 rounded-lg bg-[#191E24] border border-[#384252] hover:border-[#9FE88D] flex items-center justify-between text-xs cursor-pointer group transition-colors"
                >
                  <div class="min-w-0">
                    <div class="flex items-center gap-1.5">
                      <span class="font-mono font-bold text-[#9FE88D]">#{idx + 1}</span>
                      <span class="font-bold text-white group-hover:text-[#9FE88D] truncate">{item.managerName}</span>
                    </div>
                    <p class="text-[11px] text-[#94A3B8] truncate mt-0.5">{item.captainName} (C)</p>
                  </div>
                  <span class="font-mono font-bold text-sm text-[#9FE88D] shrink-0 bg-[#9FE88D]/10 px-2 py-0.5 rounded border border-[#9FE88D]/20">
                    {item.points}p
                  </span>
                </div>
              {/each}
            </div>
          </div>

          <!-- Kapteinsblemmen (Laveste kapteinspoeng) -->
          <div class="md:col-span-4 p-4 rounded-xl bg-[#242B35] border border-[#384252] space-y-3">
            <div class="flex items-center justify-between border-b border-[#384252] pb-2">
              <h4 class="text-xs font-bold text-[#FB6F84] uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert class="w-3.5 h-3.5" />
                <span>Kapteinsblemmen (svidde bind)</span>
              </h4>
              <span class="text-[10px] text-[#94A3B8]">Lavest score</span>
            </div>

            <div class="space-y-2">
              {#each funStats?.captainStats?.captainFails || [] as item, idx}
                <div
                  role="button"
                  tabindex="0"
                  onclick={() => onOpenProfile(item.entryId)}
                  onkeydown={(e) => (e.key === "Enter" || e.key === " ") && onOpenProfile(item.entryId)}
                  class="p-2.5 rounded-lg bg-[#191E24] border border-[#384252] hover:border-[#FB6F84] flex items-center justify-between text-xs cursor-pointer group transition-colors"
                >
                  <div class="min-w-0">
                    <div class="flex items-center gap-1.5">
                      <span class="font-mono font-bold text-[#FB6F84]">#{idx + 1}</span>
                      <span class="font-bold text-white group-hover:text-[#FB6F84] truncate">{item.managerName}</span>
                    </div>
                    <p class="text-[11px] text-[#94A3B8] truncate mt-0.5">{item.captainName} (C)</p>
                  </div>
                  <span class="font-mono font-bold text-sm text-[#FB6F84] shrink-0 bg-[#FB6F84]/10 px-2 py-0.5 rounded border border-[#FB6F84]/20">
                    {item.points}p
                  </span>
                </div>
              {/each}
            </div>
          </div>

          <!-- Kapteinsfordeling -->
          <div class="md:col-span-3 p-4 rounded-xl bg-[#242B35] border border-[#384252] space-y-3">
            <h4 class="text-xs font-bold text-[#F4C152] uppercase tracking-wider border-b border-[#384252] pb-2">
              Valgte kapteiner
            </h4>
            <div class="space-y-2.5 text-xs">
              {#each funStats?.captainStats?.distribution || [] as cap}
                <div>
                  <div class="flex justify-between text-[11px] mb-1">
                    <span class="text-white font-bold truncate">{cap.name}</span>
                    <span class="text-[#9FE88D] font-mono font-bold">{cap.percent}%</span>
                  </div>
                  <div class="w-full bg-[#191E24] h-2 rounded-full overflow-hidden border border-[#384252]">
                    <div class="bg-[#9FE88D] h-full rounded-full" style={`width: ${cap.percent}%`}></div>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        </div>
      {/if}
    {/if}

    <!-- 2. Hit-kongen & Overgangskaos -->
    {#if activeTab === "hits"}
      <div class="space-y-3.5">
        <div class="p-3.5 rounded-xl bg-[#242B35] border border-[#384252] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 class="text-sm font-bold text-white flex items-center gap-2">
              <Flame class="w-4 h-4 text-[#FB6F84]" />
              <span>Overgangsspillere og minuspoeng</span>
            </h4>
            <p class="text-xs text-[#94A3B8]">Totalt har ligaen ofret <strong class="text-[#FB6F84] font-mono">-{funStats?.transferHitStats?.totalLeagueHits || 0} poeng</strong> på ekstra overganger for {timeframeLabel}.</p>
          </div>
        </div>

        {#if !funStats?.transferHitStats?.topHitTakers || funStats.transferHitStats.topHitTakers.length === 0}
          <div class="p-8 text-center bg-[#242B35] rounded-xl border border-[#384252] text-[#94A3B8] text-xs">
            Ingen i ligaen har tatt transfer hits for {timeframeLabel}. Alle holdt seg innenfor gratisbyttet!
          </div>
        {:else}
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {#each funStats.transferHitStats.topHitTakers as item, idx}
              <div
                role="button"
                tabindex="0"
                onclick={() => onOpenProfile(item.entryId)}
                onkeydown={(e) => (e.key === "Enter" || e.key === " ") && onOpenProfile(item.entryId)}
                class="p-3.5 rounded-xl bg-[#242B35] border border-[#384252] hover:border-[#FB6F84] cursor-pointer group transition-all"
              >
                <div class="flex items-center justify-between mb-1.5 text-xs">
                  <span class="font-bold text-[#FB6F84]">#{idx + 1} Hit-jeger</span>
                  <span class="font-mono font-bold text-sm text-[#FB6F84] bg-[#FB6F84]/15 px-2 py-0.5 rounded border border-[#FB6F84]/30">
                    -{item.gwHits}p ({item.hitsCount} {item.hitsCount === 1 ? "ekstrabytte" : "ekstrabyter"})
                  </span>
                </div>
                <h5 class="text-sm font-bold text-white group-hover:text-[#FB6F84] truncate">{item.managerName}</h5>
                <p class="text-xs text-[#94A3B8] truncate">{item.teamName}</p>
                <div class="mt-2 pt-2 border-t border-[#384252] text-[11px] text-[#94A3B8] flex justify-between">
                  <span>{item.roomName}</span>
                  <span class="font-mono">Totale hits: -{item.totalHits}p</span>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    <!-- 3. Differensial-kongen -->
    {#if activeTab === "differentials"}
      <div class="space-y-3.5">
        <div class="p-3 rounded-xl bg-[#242B35] border border-[#384252]">
          <h4 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Gem class="w-3.5 h-3.5 text-[#70E1F8]" />
            <span>Lavt eide jokere som leverte</span>
          </h4>
          <p class="text-xs text-[#94A3B8] mt-0.5">Spillere med lavt eierskap som ga eierne et solid forsprang i ligaen.</p>
        </div>

        {#if !funStats?.differentialStats || funStats.differentialStats.length === 0}
          <div class="p-8 text-center bg-[#242B35] rounded-xl border border-[#384252] text-[#94A3B8] text-xs">
            Ingen differensialer registrert for {timeframeLabel} ennå. Beregnes automatisk når runder spilles.
          </div>
        {:else}
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {#each funStats.differentialStats as diff}
              <div class="p-3.5 rounded-xl bg-[#242B35] border border-[#384252] hover:border-[#70E1F8] flex flex-col justify-between shadow-sm">
                <div>
                  <div class="flex items-center justify-between text-xs mb-1">
                    <span class="text-[10px] font-mono text-[#94A3B8] uppercase">{diff.club} • {diff.pos}</span>
                    <span class="font-mono font-bold text-sm text-[#70E1F8] bg-[#70E1F8]/10 px-2 py-0.5 rounded border border-[#70E1F8]/30">
                      {diff.points} pts
                    </span>
                  </div>
                  <h5 class="text-sm font-bold text-white truncate">{diff.player}</h5>
                  <p class="text-[11px] text-[#94A3B8] mt-0.5 font-mono">{diff.ownership}% globalt eierskap</p>
                </div>

                <div class="mt-3 pt-2 border-t border-[#384252] text-[11px]">
                  <span class="text-[#94A3B8] block text-[10px] uppercase font-semibold">Eid av i ligaen:</span>
                  <span class="text-[#9FE88D] font-medium truncate block">{diff.owners.join(", ")}</span>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    <!-- 4. Formel 1-Poengtabell -->
    {#if activeTab === "f1"}
      <div class="space-y-3">
        <div class="p-3 rounded-xl bg-[#242B35] border border-[#384252] flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Trophy class="w-3.5 h-3.5 text-[#9FE88D]" />
              <span>Formel 1 runderanking</span>
            </h4>
            <p class="text-xs text-[#94A3B8]">Topp 10 belønnes med F1-poeng (25, 18, 15, 12, 10, 8, 6, 4, 2, 1).</p>
          </div>
          <span class="text-[11px] font-mono bg-[#191E24] px-2.5 py-1 rounded-lg border border-[#384252] text-[#9FE88D]">
            F1 Grand Prix system
          </span>
        </div>

        {#if !funStats?.f1Standings || funStats.f1Standings.length === 0}
          <div class="p-8 text-center bg-[#242B35] rounded-xl border border-[#384252] text-[#94A3B8] text-xs">
            Formel 1-tabellen oppdateres så snart de første poengene registreres i ligaen.
          </div>
        {:else}
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            {#each funStats.f1Standings as f1, idx}
              <div
                role="button"
                tabindex="0"
                onclick={() => onOpenProfile(f1.entryId)}
                onkeydown={(e) => (e.key === "Enter" || e.key === " ") && onOpenProfile(f1.entryId)}
                class={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs cursor-pointer group transition-colors ${
                  idx === 0
                    ? "bg-[#242B35] border-[#F4C152]/50 hover:border-[#F4C152]"
                    : idx === 1
                    ? "bg-[#242B35] border-[#CBD5E1]/40 hover:border-[#CBD5E1]"
                    : idx === 2
                    ? "bg-[#242B35] border-[#D97706]/40 hover:border-[#D97706]"
                    : "bg-[#242B35] border-[#384252] hover:border-[#4B5563]"
                }`}
              >
                <div class="flex items-center gap-2.5 min-w-0">
                  <span class="font-mono font-bold text-xs w-6 text-center shrink-0">
                    {#if idx === 0}
                      🥇
                    {:else if idx === 1}
                      🥈
                    {:else if idx === 2}
                      🥉
                    {:else}
                      #{f1.f1Rank}
                    {/if}
                  </span>

                  <div class="min-w-0">
                    <h5 class="font-bold text-white group-hover:text-[#9FE88D] truncate text-xs">{f1.managerName}</h5>
                    <span class="text-[10px] text-[#94A3B8] truncate block">{f1.teamName} • {f1.roomName}</span>
                  </div>
                </div>

                <div class="text-right shrink-0">
                  <span class="font-mono font-bold text-sm text-[#9FE88D] block leading-none">
                    {f1.f1Points} F1-poeng
                  </span>
                  <span class="text-[10px] text-[#94A3B8] font-mono">({f1.fplGwPoints} FPL-poeng)</span>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    <!-- 5. Drømmeellever vs. Skrekkellever -->
    {#if activeTab === "dream"}
      {#if (!funStats?.dreamAndNightmareXI?.dreamTeam || funStats.dreamAndNightmareXI.dreamTeam.length === 0) && (!funStats?.dreamAndNightmareXI?.nightmareTeam || funStats.dreamAndNightmareXI.nightmareTeam.length === 0)}
        <div class="h-full flex flex-col items-center justify-center text-center p-6 bg-[#242B35] rounded-xl border border-[#384252] space-y-1.5">
          <ShieldCheck class="w-8 h-8 text-[#94A3B8] mb-1" />
          <p class="text-sm font-bold text-white">Drømme- og skrekkellever klargjøres</p>
          <p class="text-xs text-[#94A3B8]">Genereres automatisk fra spillernes startellevere så snart runder spilles.</p>
        </div>
      {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
          <!-- Drømmeellever -->
          <div class="p-4 rounded-xl bg-[#242B35] border border-[#384252] space-y-2.5">
            <div class="flex items-center justify-between border-b border-[#384252] pb-2">
              <h4 class="text-xs font-bold text-[#9FE88D] uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck class="w-4 h-4 text-[#9FE88D]" />
                <span>Drømmeelleveren i ligaen</span>
              </h4>
              <span class="text-[10px] text-[#94A3B8]">Beste poengfangst</span>
            </div>

            <div class="space-y-1.5 text-xs">
              {#each funStats?.dreamAndNightmareXI?.dreamTeam || [] as player}
                <div class="flex items-center justify-between p-1.5 rounded-lg bg-[#191E24] border border-[#384252]">
                  <div class="flex items-center gap-2">
                    <span class="font-mono text-[10px] text-[#9FE88D] font-bold w-7">{player.pos}</span>
                    <span class="text-white font-medium">{player.name}</span>
                    <span class="text-[10px] text-[#94A3B8]">({player.club})</span>
                  </div>
                  <span class="font-mono font-bold text-[#9FE88D]">{player.points}p</span>
                </div>
              {/each}
            </div>
          </div>

          <!-- Skrekkellever -->
          <div class="p-4 rounded-xl bg-[#242B35] border border-[#384252] space-y-2.5">
            <div class="flex items-center justify-between border-b border-[#384252] pb-2">
              <h4 class="text-xs font-bold text-[#FB6F84] uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert class="w-4 h-4 text-[#FB6F84]" />
                <span>Skrekkelleveren i ligaen</span>
              </h4>
              <span class="text-[10px] text-[#94A3B8]">Laveste startpoeng</span>
            </div>

            <div class="space-y-1.5 text-xs">
              {#each funStats?.dreamAndNightmareXI?.nightmareTeam || [] as player}
                <div class="flex items-center justify-between p-1.5 rounded-lg bg-[#191E24] border border-[#384252]">
                  <div class="flex items-center gap-2">
                    <span class="font-mono text-[10px] text-[#FB6F84] font-bold w-7">{player.pos}</span>
                    <span class="text-white font-medium">{player.name}</span>
                    <span class="text-[10px] text-[#94A3B8]">({player.club})</span>
                  </div>
                  <span class="font-mono font-bold text-[#FB6F84]">{player.points}p</span>
                </div>
              {/each}
            </div>
          </div>
        </div>
      {/if}
    {/if}

    <!-- 6. Auto-Sub Mirakler -->
    {#if activeTab === "autosub"}
      <div class="space-y-3">
        <div class="p-3 rounded-xl bg-[#242B35] border border-[#384252]">
          <h4 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <RefreshCcw class="w-3.5 h-3.5 text-[#70E1F8]" />
            <span>Auto-sub mirakler</span>
          </h4>
          <p class="text-xs text-[#94A3B8] mt-0.5">Spillere som kom inn fra benken automatisk og reddet viktige poeng.</p>
        </div>

        {#if !funStats?.autoSubStats || funStats.autoSubStats.length === 0}
          <div class="p-8 text-center bg-[#242B35] rounded-xl border border-[#384252] text-[#94A3B8] text-xs">
            Ingen automatiske innbytter registrert for {timeframeLabel} ennå.
          </div>
        {:else}
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {#each funStats.autoSubStats as auto}
              <div
                role="button"
                tabindex="0"
                onclick={() => onOpenProfile(auto.entryId)}
                onkeydown={(e) => (e.key === "Enter" || e.key === " ") && onOpenProfile(auto.entryId)}
                class="p-3.5 rounded-xl bg-[#242B35] border border-[#384252] hover:border-[#70E1F8] cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div class="flex items-center justify-between text-xs mb-1">
                    <span class="text-[10px] text-[#94A3B8] uppercase">Reddet poeng</span>
                    <span class="font-mono font-bold text-sm text-[#70E1F8] bg-[#70E1F8]/10 px-2 py-0.5 rounded border border-[#70E1F8]/30">
                      +{auto.pointsRescued}p
                    </span>
                  </div>
                  <h5 class="text-sm font-bold text-white truncate">{auto.managerName}</h5>
                  <p class="text-xs text-[#94A3B8] truncate">{auto.teamName}</p>
                </div>

                <div class="mt-2.5 pt-2 border-t border-[#384252] text-[11px] space-y-0.5">
                  <div class="flex items-center gap-1 text-[#9FE88D]">
                    <span>Inn:</span> <strong class="text-white truncate">{auto.inPlayer}</strong>
                  </div>
                  <div class="flex items-center gap-1 text-[#FB6F84]">
                    <span>Ut:</span> <span class="text-[#94A3B8] truncate">{auto.outPlayer} (0p)</span>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    <!-- 7. Benkevarmer-skammen (Mest poeng på benken) -->
    {#if activeTab === "bench"}
      {#if !funStats?.benchNightmares || funStats.benchNightmares.length === 0}
        <div class="h-full flex flex-col items-center justify-center text-center p-6 bg-[#242B35] rounded-xl border border-[#384252] space-y-1.5">
          <Armchair class="w-8 h-8 text-[#94A3B8] mb-1" />
          <p class="text-sm font-bold text-white">Ingen benkepoeng registrert ennå</p>
          <p class="text-xs text-[#94A3B8]">Benkestatistikken oppdateres automatisk så snart runder spilles.</p>
        </div>
      {:else}
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 h-full">
          {#each funStats.benchNightmares as item, idx}
            <div
              role="button"
              tabindex="0"
              onclick={() => onOpenProfile(item.entryId)}
              onkeydown={(e) => (e.key === "Enter" || e.key === " ") && onOpenProfile(item.entryId)}
              class="p-3.5 rounded-xl bg-[#242B35] border border-[#384252] hover:border-[#F4C152] transition-colors flex flex-col justify-between cursor-pointer group shadow-sm"
            >
              <div>
                <div class="flex items-center justify-between text-xs mb-1.5">
                  <span class="font-bold text-[#F4C152]">#{idx + 1} Benk-tabbe</span>
                  <span class="font-mono font-bold text-sm text-[#F4C152] bg-[#F4C152]/10 px-2 py-0.5 rounded border border-[#F4C152]/30">
                    {item.benchPoints}p
                  </span>
                </div>
                <p class="font-bold text-white text-sm truncate group-hover:text-[#F4C152] transition-colors">
                  {item.managerName}
                </p>
                <p class="text-xs text-[#94A3B8] truncate">{item.teamName}</p>
              </div>
              <div class="mt-2 pt-2 border-t border-[#384252] text-xs text-[#94A3B8] flex items-center justify-between">
                <span class="truncate">{item.benchedPlayer || "Benk"}</span>
                <span class="text-[10px] font-mono">{item.roomName}</span>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    {/if}

    <!-- 8. Topp 10 eide fotballspillere i ligaen -->
    {#if activeTab === "ownership"}
      {#if !funStats?.topOwnedFootballers || funStats.topOwnedFootballers.length === 0}
        <div class="h-full flex flex-col items-center justify-center text-center p-6 bg-[#242B35] rounded-xl border border-[#384252] space-y-1.5">
          <Percent class="w-8 h-8 text-[#94A3B8] mb-1" />
          <p class="text-sm font-bold text-white">Eierskapsstatistikk klargjøres</p>
          <p class="text-xs text-[#94A3B8]">Beregnes automatisk på tvers av alle ligaens lag ved sesongstart.</p>
        </div>
      {:else}
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 h-full">
          {#each funStats.topOwnedFootballers.slice(0, 10) as player, idx}
            <div class="p-3 rounded-xl bg-[#242B35] border border-[#384252] flex items-center justify-between gap-2 shadow-sm">
              <div class="min-w-0">
                <div class="flex items-center gap-1.5 text-xs text-[#94A3B8]">
                  <span class="font-bold text-[#9FE88D]">#{idx + 1}</span>
                  <span class="font-mono">{player.club} • {player.pos}</span>
                </div>
                <p class="font-bold text-white text-sm truncate">{player.name}</p>
              </div>
              <div class="text-right shrink-0">
                <span class="font-mono font-bold text-sm text-[#9FE88D] block leading-none">{player.percent}%</span>
                <span class="text-xs text-[#94A3B8]">{player.points}p</span>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    {/if}

    <!-- 9. Rundens Klatrere & Trynerne -->
    {#if activeTab === "climbers"}
      {#if (!funStats?.topClimbers || funStats.topClimbers.length === 0) && (!funStats?.topFallers || funStats.topFallers.length === 0)}
        <div class="h-full flex flex-col items-center justify-center text-center p-6 bg-[#242B35] rounded-xl border border-[#384252] space-y-1.5">
          <TrendingUp class="w-8 h-8 text-[#94A3B8] mb-1" />
          <p class="text-sm font-bold text-white">Klatrere og trynerne klargjøres</p>
          <p class="text-xs text-[#94A3B8]">Beregnes automatisk på tvers av tabellen når flere runder er ferdigspilt.</p>
        </div>
      {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
          <!-- Klatrere -->
          <div class="p-4 rounded-xl bg-[#242B35] border border-[#384252] space-y-2.5">
            <h4 class="text-xs font-bold text-[#9FE88D] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#384252] pb-2">
              <TrendingUp class="w-4 h-4 text-[#9FE88D]" />
              <span>Klatrerne (størst fremgang)</span>
            </h4>
            <div class="space-y-2">
              {#each funStats?.topClimbers || [] as item}
                <div
                  role="button"
                  tabindex="0"
                  onclick={() => onOpenProfile(item.entryId)}
                  onkeydown={(e) => (e.key === "Enter" || e.key === " ") && onOpenProfile(item.entryId)}
                  class="p-2.5 rounded-lg bg-[#191E24] border border-[#384252] hover:border-[#9FE88D] flex items-center justify-between text-xs cursor-pointer group"
                >
                  <div class="min-w-0">
                    <div class="flex items-center gap-1.5">
                      <span class="font-bold text-[#9FE88D] flex items-center">
                        <ArrowUpRight class="w-3.5 h-3.5" /> +{item.spotsClimbed}
                      </span>
                      <span class="font-bold text-white group-hover:text-[#9FE88D] truncate">{item.managerName}</span>
                    </div>
                    <p class="text-[11px] text-[#94A3B8] truncate">{item.teamName}</p>
                  </div>
                  <div class="text-right shrink-0 font-mono">
                    <span class="text-white font-bold block">#{item.currentRank}</span>
                    <span class="text-[10px] text-[#9FE88D]">fra #{item.previousRank}</span>
                  </div>
                </div>
              {/each}
            </div>
          </div>

          <!-- Trynerne -->
          <div class="p-4 rounded-xl bg-[#242B35] border border-[#384252] space-y-2.5">
            <h4 class="text-xs font-bold text-[#FB6F84] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#384252] pb-2">
              <TrendingDown class="w-4 h-4 text-[#FB6F84]" />
              <span>Trynerne (størst fall)</span>
            </h4>
            <div class="space-y-2">
              {#each funStats?.topFallers || [] as item}
                <div
                  role="button"
                  tabindex="0"
                  onclick={() => onOpenProfile(item.entryId)}
                  onkeydown={(e) => (e.key === "Enter" || e.key === " ") && onOpenProfile(item.entryId)}
                  class="p-2.5 rounded-lg bg-[#191E24] border border-[#384252] hover:border-[#FB6F84] flex items-center justify-between text-xs cursor-pointer group"
                >
                  <div class="min-w-0">
                    <div class="flex items-center gap-1.5">
                      <span class="font-bold text-[#FB6F84] flex items-center">
                        <ArrowDownRight class="w-3.5 h-3.5" /> -{item.spotsDropped}
                      </span>
                      <span class="font-bold text-white group-hover:text-[#FB6F84] truncate">{item.managerName}</span>
                    </div>
                    <p class="text-[11px] text-[#94A3B8] truncate">{item.teamName}</p>
                  </div>
                  <div class="text-right shrink-0 font-mono">
                    <span class="text-white font-bold block">#{item.currentRank}</span>
                    <span class="text-[10px] text-[#FB6F84]">fra #{item.previousRank}</span>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        </div>
      {/if}
    {/if}

    <!-- 10. Chip-statistikk i ligaen -->
    {#if activeTab === "chips"}
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-3.5 h-full">
        <!-- 4 Chip tellere -->
        <div class="lg:col-span-4 grid grid-cols-2 gap-2.5">
          <div class="p-3 rounded-xl bg-[#242B35] border border-[#384252] flex flex-col justify-between">
            <span class="text-xs text-[#94A3B8] uppercase font-bold">Wildcard</span>
            <span class="font-mono font-bold text-base text-[#9FE88D]">{funStats?.chipStats?.counts?.wildcard ?? 0} brukt</span>
          </div>
          <div class="p-3 rounded-xl bg-[#242B35] border border-[#384252] flex flex-col justify-between">
            <span class="text-xs text-[#94A3B8] uppercase font-bold">Triple Capt.</span>
            <span class="font-mono font-bold text-base text-[#F4C152]">{funStats?.chipStats?.counts?.tripleCaptain ?? 0} brukt</span>
          </div>
          <div class="p-3 rounded-xl bg-[#242B35] border border-[#384252] flex flex-col justify-between">
            <span class="text-xs text-[#94A3B8] uppercase font-bold">Free Hit</span>
            <span class="font-mono font-bold text-base text-[#70E1F8]">{funStats?.chipStats?.counts?.freeHit ?? 0} brukt</span>
          </div>
          <div class="p-3 rounded-xl bg-[#242B35] border border-[#384252] flex flex-col justify-between">
            <span class="text-xs text-[#94A3B8] uppercase font-bold">Bench Boost</span>
            <span class="font-mono font-bold text-base text-[#A78BFA]">{funStats?.chipStats?.counts?.benchBoost ?? 0} brukt</span>
          </div>
        </div>

        <!-- Siste spilte chips -->
        <div class="lg:col-span-8 flex flex-col justify-center">
          {#if !funStats?.chipStats?.recentPlays || funStats.chipStats.recentPlays.length === 0}
            <div class="p-5 bg-[#242B35] rounded-xl border border-[#384252] text-center text-xs text-[#94A3B8]">
              Ingen chips aktivert i ligaen enda for sesongen 2025/2026.
            </div>
          {:else}
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {#each funStats.chipStats.recentPlays.slice(0, 6) as play}
                <div
                  role="button"
                  tabindex="0"
                  onclick={() => onOpenProfile(play.entryId)}
                  onkeydown={(e) => (e.key === "Enter" || e.key === " ") && onOpenProfile(play.entryId)}
                  class="p-3 rounded-xl bg-[#242B35] border border-[#384252] hover:border-[#9FE88D] cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div class="flex items-center justify-between text-xs">
                      <span class="font-bold text-[#F4C152]">GW {play.event}</span>
                      <span class="font-mono font-bold text-[#9FE88D]">+{play.pointsGained}p</span>
                    </div>
                    <p class="font-bold text-white text-sm truncate">{play.managerName}</p>
                  </div>
                  <p class="text-xs text-[#94A3B8] truncate">{play.chipName}</p>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>
</div>
