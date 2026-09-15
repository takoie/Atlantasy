<script lang="ts">
  import { tick } from "svelte";
  import { Download, Loader2, AlertTriangle } from "lucide-svelte";
  import { save as saveFileDialog } from "@tauri-apps/plugin-dialog";
  import { writeFile } from "@tauri-apps/plugin-fs";
  import { useQuery } from "$lib/convex.svelte";
  import { api } from "../../../convex/_generated/api";

  let monthKey = $state<string | undefined>(undefined);
  let format = $state<"a4" | "a3">("a4");
  let showContrib = $state(false);
  let showSeason = $state(true);
  let isExporting = $state(false);
  let exportError = $state<string | null>(null);
  let posterEl: HTMLDivElement | undefined = $state();
  let posterShellEl: HTMLDivElement | undefined = $state();
  let listEl: HTMLDivElement | undefined = $state();
  let densityScale = $state(1);

  // A4/A3 share the ISO 216 ratio (1:1.4142). html2canvas doesn't reliably
  // respect the CSS `aspect-ratio` property, so the poster's pixel size is
  // computed here and applied as an explicit inline style instead - that
  // way the exported canvas always matches the page ratio regardless of
  // how much content it holds.
  const PAGE_RATIO = 1.4142;
  let shellWidth = $state(0);
  let posterHeight = $derived(shellWidth * PAGE_RATIO);

  $effect(() => {
    if (!posterShellEl) return;
    const ro = new ResizeObserver((entries) => {
      shellWidth = entries[0].contentRect.width;
    });
    ro.observe(posterShellEl);
    return () => ro.disconnect();
  });

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
    void [leaderboard, showContrib, showSeason, format, posterHeight];
    fitContent();
  });

  function abbrev(name: string) {
    const parts = name.trim().split(/\s+/);
    if (parts.length < 2) return name;
    return `${parts[0]} ${parts[1].charAt(0)}.`;
  }

  async function exportPdf() {
    if (!posterEl || isExporting) return;
    isExporting = true;
    exportError = null;
    try {
      await fitContent();

      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const canvas = await html2canvas(posterEl, {
        backgroundColor: "#12151a",
        scale: 3,
        useCORS: true,
      });

      const pageWidthMm = format === "a3" ? 297 : 210;
      const pageHeightMm = format === "a3" ? 420 : 297;
      let drawWidth = pageWidthMm;
      let drawHeight = (canvas.height / canvas.width) * pageWidthMm;
      if (drawHeight > pageHeightMm) {
        const shrink = pageHeightMm / drawHeight;
        drawHeight = pageHeightMm;
        drawWidth = pageWidthMm * shrink;
      }
      const offsetX = (pageWidthMm - drawWidth) / 2;

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: format === "a3" ? "a3" : "a4",
      });
      pdf.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        offsetX,
        0,
        drawWidth,
        drawHeight
      );

      const fileLabel = (resolvedMonthName || "romliga")
        .toLowerCase()
        .replace(/\s+/g, "-");

      const targetPath = await saveFileDialog({
        defaultPath: `romliga-${fileLabel}-${format}.pdf`,
        filters: [{ name: "PDF", extensions: ["pdf"] }],
      });
      if (!targetPath) return;

      const pdfBytes = pdf.output("arraybuffer") as ArrayBuffer;
      await writeFile(targetPath, new Uint8Array(pdfBytes));
    } catch (e) {
      exportError = e instanceof Error ? e.message : "Ukjent feil under eksport.";
    } finally {
      isExporting = false;
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
      onclick={exportPdf}
      disabled={isExporting || leaderboard.length === 0}
      class="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#9FE88D] text-[#0f1a0c] text-[13.5px] font-bold shadow-[0_8px_20px_-8px_rgba(159,232,141,0.55)] hover:brightness-105 disabled:opacity-60 disabled:cursor-not-allowed transition"
    >
      {#if isExporting}
        <Loader2 class="w-4 h-4 animate-spin" />
        Genererer PDF...
      {:else}
        <Download class="w-4 h-4" />
        Last ned PDF
      {/if}
    </button>
    {#if exportError}
      <p class="text-[11px] text-[#FB6F84]">{exportError}</p>
    {/if}
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
      <div class="w-full max-w-[520px] poster-shell" bind:this={posterShellEl}>
        <div
          class="poster"
          class:fmt-a3={format === "a3"}
          style="width:{shellWidth}px; height:{posterHeight}px;"
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
                          GW{b.gw}
                          {#if b.top1}
                            <b>{abbrev(b.top1.managerName)}</b> {b.top1.points}p{#if b.top2} · <b>{abbrev(b.top2.managerName)}</b> {b.top2.points}p{/if} ·
                          {/if}
                          snitt {b.average.toFixed(1)}p
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
    gap: 2px;
    padding-bottom: 3%;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    margin-bottom: 2.8%;
  }
  .p-wordmark {
    font: 600 10px/1 "JetBrains Mono", monospace;
    letter-spacing: 0.22em;
    color: #9fe88d;
    text-transform: uppercase;
  }
  .p-title {
    font: 400 1px/0.86 "Bebas Neue", Impact, sans-serif;
    font-size: clamp(24px, 7.6vw, 44px);
    letter-spacing: 0.01em;
    color: #eef1f5;
    margin-top: 5px;
  }
  .p-sub {
    font: 600 10.5px/1 "JetBrains Mono", monospace;
    color: #9aa5b4;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    margin-top: 6px;
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
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }
  .p-row:last-child {
    border-bottom: 0;
  }
  .p-rank {
    font: 400 1px/1 "Bebas Neue", Impact, sans-serif;
    font-size: calc(clamp(15px, 3.9vw, 22px) * var(--density, 1));
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
    width: 2.1em;
    height: 2.1em;
    border-radius: 7px;
    display: flex;
    align-items: center;
    justify-content: center;
    font: 700 9.5px/1 "JetBrains Mono", monospace;
    font-size: calc(9.5px * var(--density, 1));
    flex: none;
    border: 1px solid rgba(255, 255, 255, 0.12);
  }

  .p-name-col {
    display: flex;
    flex-direction: column;
    gap: calc(3px * var(--density, 1));
    flex: 1 1 0%;
    min-width: 0;
  }
  .p-name {
    display: block;
    font: 700 12px/1.2 "Inter", sans-serif;
    font-size: calc(12px * var(--density, 1));
    color: #eef1f5;
  }
  .p-detail {
    display: flex;
    flex-wrap: wrap;
    gap: calc(3px * var(--density, 1)) calc(8px * var(--density, 1));
    margin-top: calc(2px * var(--density, 1));
  }
  .gwchip {
    font: 500 8.4px/1.5 "JetBrains Mono", monospace;
    font-size: calc(8.4px * var(--density, 1));
    color: #a7b1bf;
    background: rgba(255, 255, 255, 0.065);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    padding: calc(1.5px * var(--density, 1)) calc(5px * var(--density, 1));
    white-space: nowrap;
  }
  .gwchip :global(b) {
    color: #eef1f5;
    font-weight: 600;
  }
  .p-season {
    display: block;
    font: 500 9.5px/1 "JetBrains Mono", monospace;
    font-size: calc(9.5px * var(--density, 1));
    color: #66707d;
    letter-spacing: 0.02em;
    margin-top: calc(2px * var(--density, 1));
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
    font-size: calc(clamp(13px, 3.1vw, 17px) * var(--density, 1));
    color: #eef1f5;
  }
  .p-points :global(small) {
    font-size: 0.5em;
    color: #66707d;
    font-weight: 500;
    margin-left: 2px;
  }
</style>
