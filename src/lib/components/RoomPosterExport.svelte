<script lang="ts">
  import { tick } from "svelte";
  import { Printer, Loader2, AlertTriangle } from "lucide-svelte";
  import { useQuery } from "$lib/convex.svelte";
  import { api } from "../../../convex/_generated/api";

  let monthKey = $state<string | undefined>(undefined);
  let format = $state<"a4" | "a3">("a4");
  let showContrib = $state(false);
  let showSeason = $state(true);
  let isPreparingPrint = $state(false);
  let posterEl: HTMLDivElement | undefined = $state();
  let listEl: HTMLDivElement | undefined = $state();
  let densityScale = $state(1);

  const monthsQuery = useQuery(api.rooms.listAvailableMonths);
  const leaderboardQuery = useQuery(api.rooms.getLeaderboard, () => ({
    sortBy: "month",
    monthKey,
  }));

  let months = $derived(monthsQuery.data ?? []);
  let leaderboard = $derived(leaderboardQuery.data ?? []);
  let resolvedMonthKey = $derived(leaderboard[0]?.monthKey ?? null);
  let resolvedMonthName = $derived(leaderboard[0]?.monthName ?? "");
  let selectedMonthMeta = $derived(
    months.find((m) => m.monthKey === resolvedMonthKey) ?? null
  );
  let periodLabel = $derived(
    selectedMonthMeta
      ? `runde ${selectedMonthMeta.gameweekStart}–${selectedMonthMeta.gameweekEnd}`
      : ""
  );
  let isScaled = $derived(densityScale < 0.995);
  let isCriticallyScaled = $derived(densityScale <= 0.56);

  // Følg backendens resolverte måned til <select> har fått en verdi, uten å
  // overstyre et eksplisitt brukervalg senere.
  $effect(() => {
    if (monthKey === undefined && resolvedMonthKey) {
      monthKey = resolvedMonthKey;
    }
  });

  // Krymper lista (skrift, padding, mellomrom - via CSS-variabelen --density)
  // til den faktisk får plass i den faste side-boksen, uansett hvor mange rom
  // eller spilte gameweeks perioden har. Konvergerer på noen få runder siden
  // mindre skrift endrer den faktiske høyden litt ujevnt.
  async function fitContent() {
    if (!listEl) return;
    let scale = 1;
    for (let i = 0; i < 6; i++) {
      densityScale = scale;
      await tick();
      await new Promise(requestAnimationFrame);
      if (!listEl) return;
      const natural = listEl.scrollHeight;
      const available = listEl.clientHeight;
      if (natural <= available + 0.5 || scale <= 0.5) break;
      scale = Math.max(0.5, scale * (available / natural) * 0.98);
    }
  }

  $effect(() => {
    // Referer state som skal trigge en ny tilpasning når innholdet endrer form.
    void [leaderboard, showContrib, showSeason, format];
    fitContent();
  });

  function abbrev(name: string) {
    const parts = name.trim().split(/\s+/);
    if (parts.length < 2) return name;
    return `${parts[0]} ${parts[1].charAt(0)}.`;
  }

  // Bruker WebView2 sin egen print-motor i stedet for html2canvas: siden det
  // er den samme motoren som tegner forhåndsvisningen, blir utskriften
  // garantert 1:1 - ingen egen rendering-logikk som kan avvike. Admin velger
  // "Microsoft Print to PDF" (eller en fysisk skriver) i den vanlige
  // Windows-utskriftsdialogen. @page-størrelsen settes dynamisk siden CSS
  // ikke støtter et variabelt @page-mål.
  //
  // Plakaten klones til en egen node rett under <body> i stedet for å
  // printes der den står inne i admin-modalen: position:fixed for å "hoppe
  // ut" til selve papirsiden brytes av enhver forelder med transform/filter
  // et sted i treet (modalens åpne-animasjon, skygge-wrapperen, osv.) - ved
  // å klone ut av treet finnes det ingen slike foreldre å bekymre seg for.
  async function printPoster() {
    if (!posterEl || isPreparingPrint) return;
    isPreparingPrint = true;
    try {
      await fitContent();

      const pageStyle = document.createElement("style");
      pageStyle.textContent = `@page { size: ${format} portrait; margin: 0; }`;
      document.head.appendChild(pageStyle);

      const printRoot = document.createElement("div");
      printRoot.id = "poster-print-root";
      printRoot.appendChild(posterEl.cloneNode(true));
      document.body.appendChild(printRoot);

      // window.print() isn't guaranteed to block until the dialog closes -
      // clean up on `afterprint` instead of right after the call, so the
      // print engine still has both nodes whenever it actually reads them.
      const cleanup = () => {
        pageStyle.remove();
        printRoot.remove();
        window.removeEventListener("afterprint", cleanup);
      };
      window.addEventListener("afterprint", cleanup);
      window.print();
    } finally {
      isPreparingPrint = false;
    }
  }
</script>

<div class="p-4 sm:p-5 flex flex-col lg:flex-row gap-5 items-start overflow-y-auto flex-1 custom-scrollbar">
  <!-- Kontrollpanel -->
  <div class="w-full lg:w-[280px] shrink-0 bg-white/[0.055] backdrop-blur-sm border border-white/10 rounded-2xl p-4 space-y-5 lg:sticky lg:top-0">
    <p class="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
      🏆 Rom-plakat
    </p>

    <div class="space-y-1.5">
      <span class="block text-[11px] font-semibold uppercase tracking-wider text-[#8A93A6]">
        Periode
      </span>
      <select
        bind:value={monthKey}
        class="w-full px-3.5 py-2 rounded-xl bg-black/20 border border-white/10 text-white text-xs focus:border-[#9FE88D] focus:outline-none"
      >
        {#each months as m (m.monthKey)}
          <option value={m.monthKey}>
            {m.monthName} · runde {m.gameweekStart}–{m.gameweekEnd}
          </option>
        {/each}
      </select>
    </div>

    <div class="space-y-1.5">
      <span class="block text-[11px] font-semibold uppercase tracking-wider text-[#8A93A6]">
        Format
      </span>
      <div class="flex gap-1 p-1 rounded-xl bg-black/20 border border-white/10">
        <button
          type="button"
          onclick={() => (format = "a4")}
          class={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            format === "a4" ? "bg-[#9FE88D] text-[#0f1a0c]" : "text-[#AEB9CC] hover:text-white"
          }`}
        >
          A4 · 210×297
        </button>
        <button
          type="button"
          onclick={() => (format = "a3")}
          class={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            format === "a3" ? "bg-[#9FE88D] text-[#0f1a0c]" : "text-[#AEB9CC] hover:text-white"
          }`}
        >
          A3 · 297×420
        </button>
      </div>
    </div>

    <div class="space-y-0.5">
      <span class="block text-[11px] font-semibold uppercase tracking-wider text-[#8A93A6] mb-1.5">
        Statistikk på plakaten
      </span>

      <div class="flex items-center justify-between gap-3 py-2">
        <span class="flex flex-col gap-0.5">
          <span class="text-[13px] font-semibold text-white">Snitt &amp; månedspoeng</span>
          <span class="text-[10.5px] font-mono uppercase tracking-wide text-[#9FE88D]">Alltid med</span>
        </span>
        <span class="relative inline-flex h-[22px] w-[38px] shrink-0 items-center rounded-full bg-[#9FE88D]/25 border border-[#9FE88D]/60">
          <span class="inline-block h-4 w-4 translate-x-[18px] rounded-full bg-[#9FE88D]"></span>
        </span>
      </div>

      <label class="flex items-center justify-between gap-3 py-2 border-t border-white/5 cursor-pointer">
        <span class="flex flex-col gap-0.5">
          <span class="text-[13px] font-semibold text-white">Bidragsytere per gameweek</span>
          <span class="text-[11px] text-[#8A93A6]">Topp-2 og rundesnitt for hver spilte runde</span>
        </span>
        <span class={`relative inline-flex h-[22px] w-[38px] shrink-0 items-center rounded-full border transition-colors ${showContrib ? "bg-[#9FE88D]/25 border-[#9FE88D]/60" : "bg-white/10 border-white/10"}`}>
          <input type="checkbox" bind:checked={showContrib} class="absolute inset-0 opacity-0 cursor-pointer" aria-label="Vis bidragsytere per gameweek" />
          <span class={`inline-block h-4 w-4 rounded-full transition-transform ${showContrib ? "translate-x-[18px] bg-[#9FE88D]" : "translate-x-[3px] bg-[#6b7686]"}`}></span>
        </span>
      </label>

      <label class="flex items-center justify-between gap-3 py-2 border-t border-white/5 cursor-pointer">
        <span class="flex flex-col gap-0.5">
          <span class="text-[13px] font-semibold text-white">Sesongtotal</span>
          <span class="text-[11px] text-[#8A93A6]">Akkumulert hele sesongen</span>
        </span>
        <span class={`relative inline-flex h-[22px] w-[38px] shrink-0 items-center rounded-full border transition-colors ${showSeason ? "bg-[#9FE88D]/25 border-[#9FE88D]/60" : "bg-white/10 border-white/10"}`}>
          <input type="checkbox" bind:checked={showSeason} class="absolute inset-0 opacity-0 cursor-pointer" aria-label="Vis sesongtotal" />
          <span class={`inline-block h-4 w-4 rounded-full transition-transform ${showSeason ? "translate-x-[18px] bg-[#9FE88D]" : "translate-x-[3px] bg-[#6b7686]"}`}></span>
        </span>
      </label>
    </div>

    <button
      type="button"
      onclick={printPoster}
      disabled={isPreparingPrint || leaderboard.length === 0}
      class="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#9FE88D] text-[#0f1a0c] text-[13.5px] font-bold shadow-[0_8px_20px_-8px_rgba(159,232,141,0.55)] hover:brightness-105 disabled:opacity-60 disabled:cursor-not-allowed transition"
    >
      {#if isPreparingPrint}
        <Loader2 class="w-4 h-4 animate-spin" />
        Forbereder...
      {:else}
        <Printer class="w-4 h-4" />
        Skriv ut / Lagre som PDF
      {/if}
    </button>
    <p class="text-[11px] text-[#8A93A6]">
      Velg "Microsoft Print to PDF" i utskriftsdialogen for å lagre som fil.
    </p>
  </div>

  <!-- Plakat-forhåndsvisning -->
  <div class="flex-1 w-full flex flex-col items-center gap-3">
    <div class="w-full max-w-[520px] flex items-center justify-between text-[11px] font-mono text-[#8A93A6]">
      <span>Forhåndsvisning · <b class="text-[#AEB9CC] font-semibold">{format.toUpperCase()}</b></span>
      <span>{resolvedMonthName}</span>
    </div>

    {#if isCriticallyScaled}
      <div class="w-full max-w-[520px] flex items-start gap-2 text-xs text-[#F0B23A] bg-[#F0B23A]/10 border border-[#F0B23A]/35 rounded-xl px-3 py-2.5">
        <AlertTriangle class="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span>Med disse valgene og {leaderboard.length} rom blir teksten veldig liten selv nedskalert. Bytt til A3 for bedre lesbarhet.</span>
      </div>
    {:else if isScaled}
      <div class="w-full max-w-[520px] text-[11px] text-[#8A93A6]">
        Listen er skalert til {Math.round(densityScale * 100)}% for at alle {leaderboard.length} rom skal få plass på siden.
      </div>
    {/if}

    {#if leaderboardQuery.isLoading}
      <div class="w-full max-w-[520px] aspect-[1/1.4142] rounded bg-white/[0.03] border border-white/10 flex items-center justify-center text-xs text-[#8A93A6]">
        Laster topplista...
      </div>
    {:else}
      <div class="w-full max-w-[520px] poster-shell">
        <div
          class="poster"
          class:fmt-a3={format === "a3"}
          bind:this={posterEl}
        >
          <div class="p-head">
            <span class="p-wordmark">Atlantasy</span>
            <div class="p-title">ROMLIGAEN</div>
            <span class="p-sub">{resolvedMonthName}{periodLabel ? ` · ${periodLabel}` : ""}</span>
          </div>

          <div class="p-list" bind:this={listEl} style="--density:{densityScale};">
            {#each leaderboard as room (room._id)}
              {@const rankClass = room.rank === 1 ? "top1" : room.rank === 2 ? "top2" : room.rank === 3 ? "top3" : ""}
              <div class="p-row {rankClass}">
                <span class="p-rank">{String(room.rank).padStart(2, "0")}</span>
                <span
                  class="p-tag"
                  style="background:{room.accentColor}22; color:{room.accentColor}; border-color:{room.accentColor}55;"
                >
                  {room.tag}
                </span>
                <span class="p-name-col">
                  <span class="p-name">{room.name}</span>
                  {#if showSeason}
                    <span class="p-season">Sesong <b>{room.seasonTotal.toFixed(1)}p</b></span>
                  {/if}
                  {#if showContrib}
                    <span class="p-detail">
                      {#each room.monthBreakdown as b (b.gw)}
                        <span class="gwchip">
                          <span class="gw-label">GW{b.gw}</span>
                          {#if b.top1}
                            <b>{abbrev(b.top1.managerName)}</b> <span class="pt">{b.top1.points}p</span>{#if b.top2} · <b>{abbrev(b.top2.managerName)}</b> <span class="pt">{b.top2.points}p</span>{/if} ·
                          {/if}
                          <span class="gw-label">snitt</span> <span class="pt">{b.average.toFixed(1)}p</span>
                        </span>
                      {/each}
                    </span>
                  {/if}
                </span>
                <span class="p-stat-col">
                  <span class="p-points">{room.monthTotal.toFixed(1)}<small>p</small></span>
                </span>
              </div>
            {/each}
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .poster-shell {
    filter: drop-shadow(0 30px 50px rgba(0, 0, 0, 0.55));
  }
  .poster {
    /* Etablerer en query-container så cqw-enhetene under alltid er relativt
       til PLAKATENS egen bredde - identisk forhold enten den vises i en
       520px forhåndsvisning eller skrives ut i full A4/A3-størrelse. */
    container-type: inline-size;
    width: 100%;
    aspect-ratio: 1 / 1.4142;
    background:
      radial-gradient(120% 90% at 15% -10%, rgba(159, 232, 141, 0.1), transparent 55%),
      radial-gradient(100% 70% at 100% 0%, rgba(112, 225, 248, 0.08), transparent 50%),
      linear-gradient(180deg, #171b21 0%, #12151a 100%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 6px;
    padding: 3.6% 5.6%;
    display: flex;
    flex-direction: column;
    color: #eef1f5;
    position: relative;
  }
  .poster.fmt-a3 {
    padding: 4.2% 6%;
  }

  .p-head {
    display: flex;
    flex-direction: column;
    gap: 0.4cqw;
    padding-bottom: 3%;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    margin-bottom: 2.8%;
  }
  .p-wordmark {
    font: 600 1px/1 "JetBrains Mono", monospace;
    font-size: clamp(9px, 1.9cqw, 13px);
    letter-spacing: 0.22em;
    color: #9fe88d;
    text-transform: uppercase;
  }
  .p-title {
    font: 400 1px/0.86 "Bebas Neue", Impact, sans-serif;
    font-size: clamp(24px, 7.6cqw, 44px);
    letter-spacing: 0.01em;
    color: #eef1f5;
    margin-top: 1cqw;
  }
  .p-sub {
    font: 600 1px/1 "JetBrains Mono", monospace;
    font-size: clamp(9px, 2cqw, 13px);
    color: #9aa5b4;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    margin-top: 1.15cqw;
  }

  .p-list {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
  .p-row {
    display: flex;
    align-items: center;
    gap: 2.6%;
    padding-block: calc(2% * var(--density, 1));
    padding-inline: 2%;
    border-radius: 8px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }
  .p-row:last-child {
    border-bottom: 0;
  }
  .p-row.top1 {
    background: linear-gradient(90deg, rgba(244, 193, 82, 0.18), rgba(244, 193, 82, 0.02));
  }
  .p-row.top2 {
    background: linear-gradient(90deg, rgba(203, 213, 225, 0.13), rgba(203, 213, 225, 0.02));
  }
  .p-row.top3 {
    background: linear-gradient(90deg, rgba(219, 138, 58, 0.15), rgba(219, 138, 58, 0.02));
  }
  .p-rank {
    font: 400 1px/1 "Bebas Neue", Impact, sans-serif;
    font-size: calc(clamp(15px, 3.9cqw, 22px) * var(--density, 1));
    width: 1.6em;
    flex: none;
    text-align: center;
    color: #66707d;
  }
  .p-row.top1 .p-rank {
    color: #f4c152;
    text-shadow: 0 0 14px rgba(244, 193, 82, 0.55);
  }
  .p-row.top2 .p-rank {
    color: #cbd5e1;
    text-shadow: 0 0 10px rgba(203, 213, 225, 0.35);
  }
  .p-row.top3 .p-rank {
    color: #db8a3a;
    text-shadow: 0 0 10px rgba(219, 138, 58, 0.35);
  }
  .p-row.top1 .p-name {
    color: #f4c152;
    text-shadow: 0 0 7px rgba(244, 193, 82, 0.5);
  }
  .p-row.top2 .p-name {
    color: #cbd5e1;
    text-shadow: 0 0 6px rgba(203, 213, 225, 0.4);
  }
  .p-row.top3 .p-name {
    color: #db8a3a;
    text-shadow: 0 0 6px rgba(219, 138, 58, 0.4);
  }

  .p-tag {
    min-width: 2.3em;
    height: 2.3em;
    padding-inline: 0.3em;
    border-radius: 7px;
    display: flex;
    align-items: center;
    justify-content: center;
    font: 700 1px/1 "JetBrains Mono", monospace;
    font-size: calc(1.83cqw * var(--density, 1));
    letter-spacing: -0.02em;
    flex: none;
    border: 1px solid rgba(255, 255, 255, 0.14);
  }

  .p-name-col {
    display: flex;
    flex-direction: column;
    gap: calc(0.6cqw * var(--density, 1));
    flex: 1 1 0%;
    min-width: 0;
  }
  .p-name {
    display: block;
    font: 700 1px/1.2 "Inter", sans-serif;
    font-size: calc(2.3cqw * var(--density, 1));
    color: #eef1f5;
  }
  .p-detail {
    display: flex;
    flex-wrap: wrap;
    gap: calc(0.6cqw * var(--density, 1)) calc(1.5cqw * var(--density, 1));
    margin-top: calc(0.4cqw * var(--density, 1));
  }
  .gwchip {
    font: 500 1px/1.5 "JetBrains Mono", monospace;
    font-size: calc(1.6cqw * var(--density, 1));
    color: #eef1f5;
    background: rgba(255, 255, 255, 0.07);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 4px;
    padding: calc(0.3cqw * var(--density, 1)) calc(1cqw * var(--density, 1));
    white-space: nowrap;
  }
  .gwchip :global(b) {
    color: #eef1f5;
    font-weight: 600;
  }
  .gwchip .gw-label {
    color: #7c8794;
  }
  .gwchip .pt {
    color: #9fe88d;
    font-weight: 700;
  }
  .p-season {
    display: block;
    font: 500 1px/1 "JetBrains Mono", monospace;
    font-size: calc(1.8cqw * var(--density, 1));
    color: #66707d;
    letter-spacing: 0.02em;
    margin-top: calc(0.4cqw * var(--density, 1));
  }
  .p-season :global(b) {
    color: #9fe88d;
    font-weight: 600;
  }

  .p-stat-col {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    flex: none;
    gap: 1px;
  }
  .p-points {
    font: 700 1px/1 "JetBrains Mono", monospace;
    font-size: calc(clamp(13px, 3.1cqw, 17px) * var(--density, 1));
    color: #eef1f5;
  }
  .p-points :global(small) {
    font-size: 0.5em;
    color: #66707d;
    font-weight: 500;
    margin-left: 2px;
  }

  /* Skjuler alt annet på siden under utskrift og viser kun selve plakaten,
     i faktisk fysisk A4/A3-størrelse (WebView2 sin ekte layout-motor -
     samme rendering som forhåndsvisningen, derfor 1:1). */
  @media print {
    /* Alt annet på siden er skjult - #poster-print-root er en klone av
       plakaten, satt rett under <body> (se printPoster()), så den har ingen
       mellomliggende foreldre med transform/filter som kan forstyrre den. */
    :global(body > *:not(#poster-print-root)) {
      display: none !important;
    }
    :global(#poster-print-root) {
      display: block;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    :global(#poster-print-root .poster) {
      width: 210mm !important;
      height: 297mm !important;
      aspect-ratio: unset !important;
      margin: 0;
      border: 0;
      border-radius: 0;
      box-shadow: none;
      filter: none;
    }
    :global(#poster-print-root .poster.fmt-a3) {
      width: 297mm !important;
      height: 420mm !important;
    }
  }
</style>
