<script lang="ts">
  import { tick } from "svelte";
  import { Download, Loader2, AlertTriangle } from "lucide-svelte";
  import { useQuery } from "$lib/convex.svelte";
  import { api } from "../../../convex/_generated/api";

  let monthKey = $state<string | undefined>(undefined);
  let format = $state<"a4" | "a3">("a4");
  let showContrib = $state(false);
  let showSpark = $state(false);
  let showSeason = $state(true);
  let isExporting = $state(false);
  let exportError = $state<string | null>(null);
  let posterEl: HTMLDivElement | undefined = $state();
  let fitWarning = $state(false);

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

  // Følg backendens resolverte måned til <select> har fått en verdi, uten å
  // overstyre et eksplisitt brukervalg senere.
  $effect(() => {
    if (monthKey === undefined && resolvedMonthKey) {
      monthKey = resolvedMonthKey;
    }
  });

  function checkFit() {
    if (!posterEl) return;
    const nominal = posterEl.clientWidth * 1.4142;
    fitWarning = format === "a4" && posterEl.scrollHeight > nominal * 1.04;
  }

  $effect(() => {
    // Referer state som skal trigge en ny måling når innholdet endrer form.
    void [leaderboard, showContrib, showSpark, showSeason, format];
    tick().then(checkFit);
  });

  $effect(() => {
    window.addEventListener("resize", checkFit);
    return () => window.removeEventListener("resize", checkFit);
  });

  function abbrev(name: string) {
    const parts = name.trim().split(/\s+/);
    if (parts.length < 2) return name;
    return `${parts[0]} ${parts[1].charAt(0)}.`;
  }

  function sparkPoints(values: number[]) {
    const w = 56;
    const h = 18;
    const pad = 2;
    if (values.length === 0) {
      return { areaD: "", line: "", lastX: 0, lastY: 0 };
    }
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const step = (w - pad * 2) / Math.max(values.length - 1, 1);
    const pts = values.map((v, i) => {
      const x = pad + i * step;
      const y = h - pad - ((v - min) / range) * (h - pad * 2);
      return [x, y] as const;
    });
    const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
    const areaD =
      `M${pts[0][0].toFixed(1)},${(h - pad).toFixed(1)} ` +
      `L${line} ` +
      `L${pts[pts.length - 1][0].toFixed(1)},${(h - pad).toFixed(1)} Z`;
    const [lastX, lastY] = pts[pts.length - 1];
    return { areaD, line, lastX, lastY };
  }

  async function exportPdf() {
    if (!posterEl || isExporting) return;
    isExporting = true;
    exportError = null;
    try {
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
      pdf.save(`romliga-${fileLabel}-${format}.pdf`);
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
          <span class="text-[11px] text-[#8A93A6]">Topp-2 spillere for hver runde i perioden</span>
        </span>
        <span class={`relative inline-flex h-[22px] w-[38px] shrink-0 items-center rounded-full border transition-colors ${showContrib ? "bg-[#9FE88D]/25 border-[#9FE88D]/60" : "bg-white/10 border-white/10"}`}>
          <input type="checkbox" bind:checked={showContrib} class="absolute inset-0 opacity-0 cursor-pointer" aria-label="Vis bidragsytere per gameweek" />
          <span class={`inline-block h-4 w-4 rounded-full transition-transform ${showContrib ? "translate-x-[18px] bg-[#9FE88D]" : "translate-x-[3px] bg-[#6b7686]"}`}></span>
        </span>
      </label>

      <label class="flex items-center justify-between gap-3 py-2 border-t border-white/5 cursor-pointer">
        <span class="flex flex-col gap-0.5">
          <span class="text-[13px] font-semibold text-white">Måned-for-måned</span>
          <span class="text-[11px] text-[#8A93A6]">Sparkline pr. runde</span>
        </span>
        <span class={`relative inline-flex h-[22px] w-[38px] shrink-0 items-center rounded-full border transition-colors ${showSpark ? "bg-[#9FE88D]/25 border-[#9FE88D]/60" : "bg-white/10 border-white/10"}`}>
          <input type="checkbox" bind:checked={showSpark} class="absolute inset-0 opacity-0 cursor-pointer" aria-label="Vis måned-for-måned sparkline" />
          <span class={`inline-block h-4 w-4 rounded-full transition-transform ${showSpark ? "translate-x-[18px] bg-[#9FE88D]" : "translate-x-[3px] bg-[#6b7686]"}`}></span>
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

    {#if fitWarning}
      <div class="w-full max-w-[520px] flex items-start gap-2 text-xs text-[#F0B23A] bg-[#F0B23A]/10 border border-[#F0B23A]/35 rounded-xl px-3 py-2.5">
        <AlertTriangle class="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span>Med disse valgene og {leaderboard.length} rom blir A4 tett. Bytt til A3 for bedre lesbarhet på avstand.</span>
      </div>
    {/if}

    {#if leaderboardQuery.isLoading}
      <div class="w-full max-w-[520px] aspect-[1/1.4142] rounded bg-white/[0.03] border border-white/10 flex items-center justify-center text-xs text-[#8A93A6]">
        Laster topplista...
      </div>
    {:else}
      <div class="w-full max-w-[520px] poster-shell">
        <div class="poster" class:fmt-a3={format === "a3"} bind:this={posterEl}>
          <div class="p-head">
            <span class="p-wordmark">Atlantasy</span>
            <div class="p-title">ROMLIGAEN</div>
            <span class="p-sub">{resolvedMonthName}{periodLabel ? ` · ${periodLabel}` : ""}</span>
          </div>

          <div class="p-list">
            {#each leaderboard as room (room._id)}
              {@const rankClass = room.rank === 1 ? "top1" : room.rank === 2 ? "top2" : room.rank === 3 ? "top3" : ""}
              {@const avgPerGw = room.monthGamesPlayed > 0 ? room.monthTotal / room.monthGamesPlayed : room.liveAverage}
              {@const spark = sparkPoints(room.monthBreakdown.map((b) => b.average))}
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
                        {#if b.top1}
                          <span class="gwchip">
                            GW{b.gw} <b>{abbrev(b.top1.managerName)}</b> {b.top1.points}p{#if b.top2} · <b>{abbrev(b.top2.managerName)}</b> {b.top2.points}p{/if}
                          </span>
                        {/if}
                      {/each}
                    </span>
                  {/if}
                </span>
                <span class="p-stat-col">
                  <span class="p-points">{room.monthTotal.toFixed(1)}<small>p</small></span>
                  <span class="p-avg">snitt {avgPerGw.toFixed(1)}</span>
                  {#if showSpark && spark.line}
                    <svg class="p-spark" width="56" height="18" viewBox="0 0 56 18" role="img" aria-label="Poeng per runde">
                      <path d={spark.areaD} fill={room.accentColor} opacity="0.16" />
                      <polyline points={spark.line} fill="none" stroke={room.accentColor} stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" />
                      <circle cx={spark.lastX} cy={spark.lastY} r="2" fill={room.accentColor} />
                    </svg>
                  {/if}
                </span>
              </div>
            {/each}
          </div>

          <div class="p-foot">
            <span>Generert {new Date().toLocaleDateString("nb-NO")} · atlantasy.no</span>
            <span class="qr" aria-hidden="true"></span>
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
    width: 100%;
    aspect-ratio: 1 / 1.4142;
    height: auto;
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
  }
  .p-row {
    display: grid;
    grid-template-columns: auto auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 2.6%;
    padding-block: 1.6%;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }
  .p-row:last-child {
    border-bottom: 0;
  }
  .p-rank {
    font: 400 1px/1 "Bebas Neue", Impact, sans-serif;
    font-size: clamp(15px, 3.9vw, 22px);
    width: 1.6em;
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

  .p-tag {
    width: 2.1em;
    height: 2.1em;
    border-radius: 7px;
    display: flex;
    align-items: center;
    justify-content: center;
    font: 700 9.5px/1 "JetBrains Mono", monospace;
    flex: none;
    border: 1px solid rgba(255, 255, 255, 0.12);
  }

  .p-name-col {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .p-name {
    font: 700 12px/1.2 "Inter", sans-serif;
    color: #eef1f5;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .p-detail {
    display: flex;
    flex-wrap: wrap;
    gap: 3px 8px;
    margin-top: 2px;
  }
  .gwchip {
    font: 500 8.4px/1.5 "JetBrains Mono", monospace;
    color: #66707d;
    background: rgba(255, 255, 255, 0.035);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 4px;
    padding: 1.5px 5px;
    white-space: nowrap;
  }
  .gwchip :global(b) {
    color: #9aa5b4;
    font-weight: 600;
  }
  .p-season {
    font: 500 9.5px/1 "JetBrains Mono", monospace;
    color: #66707d;
    letter-spacing: 0.02em;
    margin-top: 2px;
  }
  .p-season :global(b) {
    color: #9fe88d;
    font-weight: 600;
  }

  .p-stat-col {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 1px;
  }
  .p-points {
    font: 700 1px/1 "JetBrains Mono", monospace;
    font-size: clamp(13px, 3.1vw, 17px);
    color: #eef1f5;
  }
  .p-points :global(small) {
    font-size: 0.5em;
    color: #66707d;
    font-weight: 500;
    margin-left: 2px;
  }
  .p-avg {
    font: 500 9px/1 "JetBrains Mono", monospace;
    color: #66707d;
  }
  .p-spark {
    margin-top: 3px;
  }

  .p-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding-top: 2.6%;
    margin-top: 2.6%;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    font: 500 9px/1.4 "JetBrains Mono", monospace;
    color: #66707d;
    letter-spacing: 0.02em;
  }
  .p-foot .qr {
    width: 30px;
    height: 30px;
    border-radius: 4px;
    flex: none;
    background:
      linear-gradient(90deg, currentColor 0 2px, transparent 0 4px) 0 0 / 7px 7px,
      linear-gradient(0deg, currentColor 0 2px, transparent 0 4px) 0 0 / 7px 7px,
      #2a303c;
    color: rgba(255, 255, 255, 0.35);
    border: 1px solid rgba(255, 255, 255, 0.12);
  }
</style>
