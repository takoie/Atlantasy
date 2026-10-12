<script lang="ts">
  import { tick } from "svelte";
  import { Printer, Loader2 } from "lucide-svelte";
  import {
    layoutFor,
    formatLabel,
    groupByRound,
    matchLabel,
    shortTitle,
    buildSlotHints,
    type RoundColumn,
  } from "$lib/utils/cup";
  import { seasonFor } from "../../../../convex/season";

  let { cup }: { cup: any } = $props();

  let format = $state<"a3" | "a4">("a3");
  let theme = $state<"light" | "dark">("light");
  let isPreparingPrint = $state(false);

  let posterEl: HTMLDivElement | undefined = $state();
  let bodyEl: HTMLDivElement | undefined = $state();
  let fitEl: HTMLDivElement | undefined = $state();
  let fitK = $state(1); // enhetsfaktor: 1 = standardstørrelse, justeres så innholdet fyller siden

  let matches = $derived<any[]>(cup?.matches ?? []);
  let layout = $derived(layoutFor(cup?.format));
  let columns = $derived(groupByRound(matches));
  let hintFor = $derived(buildSlotHints(matches, cup));
  let luckyIds = $derived<string[]>(cup?.luckyLoserRoomIds ?? []);
  let isDone = $derived(cup?.status === "completed");
  let currentRound = $derived(isDone ? 0 : (cup?.currentRound ?? 0));

  let lastPlayedGw = $derived.by(() => {
    let gw = 0;
    for (const m of matches) if (m.status === "completed" && !m.isBye && m.gameweek > gw) gw = m.gameweek;
    return gw || null;
  });
  let nextGw = $derived(columns.find((c) => c.roundNumber === currentRound)?.gameweek ?? null);
  let printedOn = $derived(new Date().toLocaleDateString("nb-NO", { day: "numeric", month: "long", year: "numeric" }));

  const isWinnersSide = (m: any) => m.bracketType === "winners" || m.bracketType === "knockout";
  let winnersBand = $derived(matches.filter(isWinnersSide));
  let losersBand = $derived(matches.filter((m) => m.bracketType === "losers"));
  let finalBand = $derived(matches.filter((m) => m.bracketType === "grand_final"));
  const cell = (band: any[], col: RoundColumn) =>
    band.filter((m) => m.roundNumber === col.roundNumber).sort((a, b) => a.matchIndex - b.matchIndex);

  let groupLetters = $derived(
    [...new Set((cup?.groupStandings ?? []).map((s: any) => s.group))].sort() as string[]
  );
  const tableFor = (letter: string) =>
    (cup?.groupStandings ?? [])
      .filter((s: any) => s.group === letter)
      .sort((a: any, b: any) => b.points - a.points || b.totalRoomScore - a.totalRoomScore || b.won - a.won);

  const columnTitle = (col: RoundColumn) =>
    [...new Set(col.matches.map((m) => shortTitle(m.roundTitle)))].join(" · ");
  const colTitles = (band: any[], col: RoundColumn) => [
    ...new Set(cell(band, col).map((m) => shortTitle(m.roundTitle))),
  ];

  // Tilpasser enhetsfaktoren så innholdet fyller siden best mulig – krymper store cuper og
  // forstørrer små. Alt er målt i cqw, så forholdet er likt i forhåndsvisning og på papiret.
  async function fitContent() {
    let k = 1;
    for (let i = 0; i < 6; i++) {
      fitK = k;
      await tick();
      await new Promise(requestAnimationFrame);
      if (!bodyEl || !fitEl) return;
      const avail = bodyEl.clientHeight;
      const natural = fitEl.offsetHeight;
      if (natural <= avail && natural >= avail * 0.93) return;
      k = Math.min(1.45, Math.max(0.4, k * (avail / natural) * 0.985));
    }
    // Siste sikring: aldri la innholdet flyte utenfor siden.
    if (fitEl && bodyEl && fitEl.offsetHeight > bodyEl.clientHeight) {
      fitK = Math.max(0.4, fitK * (bodyEl.clientHeight / fitEl.offsetHeight) * 0.98);
    }
  }

  $effect(() => {
    void [cup, theme, format];
    fitContent();
  });

  async function printPoster() {
    if (!posterEl || isPreparingPrint) return;
    isPreparingPrint = true;
    try {
      await fitContent();

      const pageStyle = document.createElement("style");
      pageStyle.textContent = `@page { size: ${format} landscape; margin: 0; }`;
      document.head.appendChild(pageStyle);

      // Samme id som rom-plakaten: den globale utskriftsregelen skjuler alt
      // under <body> unntatt #poster-print-root.
      const printRoot = document.createElement("div");
      printRoot.id = "poster-print-root";
      printRoot.appendChild(posterEl.cloneNode(true));
      document.body.appendChild(printRoot);

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

{#snippet pcard(m: any)}
  {@const sides = m.isBye
    ? [{ room: m.room1, id: m.room1Id, score: m.room1Score, hint: "" }]
    : [
        { room: m.room1, id: m.room1Id, score: m.room1Score, hint: hintFor(m, 1) },
        { room: m.room2, id: m.room2Id, score: m.room2Score, hint: hintFor(m, 2) },
      ]}
  <div
    class="cp-card"
    class:cp-final={m.bracketType === "grand_final" || m.role === "final"}
    class:cp-current={m.roundNumber === currentRound && m.status !== "completed"}
  >
    <div class="cp-card-label">
      <span>{matchLabel(m, matches)}</span>
      {#if m.isBye}<span>Videre</span>{:else if m.status === "completed" && !m.winnerRoomId}<span>Uavgjort</span>{/if}
    </div>
    {#each sides as s}
      {@const won = !!m.winnerRoomId && s.id === m.winnerRoomId}
      {@const lost = !!m.winnerRoomId && !!s.id && s.id !== m.winnerRoomId}
      <div class="cp-side" class:cp-win={won} class:cp-lose={lost}>
        {#if s.room}
          <i class="cp-dot" style={`background:${s.room.accentColor || "#1eb854"}`}></i>
          <span class="cp-name">{s.room.name}</span>
          {#if s.id && luckyIds.includes(s.id)}<em class="cp-ll">LL</em>{/if}
        {:else}
          <span class="cp-name cp-hint">{s.hint}</span>
        {/if}
        <b class="cp-score">{s.score !== undefined ? s.score : ""}</b>
      </div>
    {/each}
  </div>
{/snippet}

{#snippet colHead(col: RoundColumn, title: string)}
  <div class="cp-colhead" class:cp-current={col.roundNumber === currentRound}>
    <span class="cp-colhead-title">{title}</span>
    <span class="cp-gw">GW {col.gameweek}</span>
  </div>
{/snippet}

<div class="p-4 sm:p-5 space-y-4">
  <div class="flex flex-wrap items-center gap-3">
    <div class="flex gap-1 p-1 rounded-xl bg-black/20 border border-white/10">
      {#each [["a3", "A3 · 420×297"], ["a4", "A4 · 297×210"]] as [val, label]}
        <button
          type="button"
          onclick={() => (format = val as "a3" | "a4")}
          class={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            format === val ? "bg-[#9FE88D] text-[#0f1a0c]" : "text-[#AEB9CC] hover:text-white"
          }`}
        >
          {label}
        </button>
      {/each}
    </div>

    <div class="flex gap-1 p-1 rounded-xl bg-black/20 border border-white/10">
      {#each [["light", "Lys (sparer blekk)"], ["dark", "Mørk"]] as [val, label]}
        <button
          type="button"
          onclick={() => (theme = val as "light" | "dark")}
          class={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            theme === val ? "bg-[#9FE88D] text-[#0f1a0c]" : "text-[#AEB9CC] hover:text-white"
          }`}
        >
          {label}
        </button>
      {/each}
    </div>

    <button
      type="button"
      onclick={printPoster}
      disabled={isPreparingPrint || matches.length === 0}
      class="ml-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#9FE88D] text-[#0f1a0c] text-xs font-bold hover:brightness-105 disabled:opacity-60 disabled:cursor-not-allowed transition"
    >
      {#if isPreparingPrint}
        <Loader2 class="w-4 h-4 animate-spin" />
        Forbereder...
      {:else}
        <Printer class="w-4 h-4" />
        Skriv ut / Lagre som PDF
      {/if}
    </button>
  </div>
  <p class="text-[11px] text-[#8A93A6]">
    Liggende {format.toUpperCase()}. Plakaten viser stillingen akkurat nå – skriv ut på nytt etter hver runde. Velg "Microsoft Print to PDF" i utskriftsdialogen for å lagre som fil.
  </p>

  <div class="poster-shell w-full max-w-[1100px] mx-auto">
    <div class={`cup-poster fmt-${format} theme-${theme}`} bind:this={posterEl}>
      <header class="cp-head">
        <div class="cp-brand">
          <span class="cp-brand-top">ATLANTASY</span>
          <span class="cp-title">{cup?.name}</span>
        </div>
        <div class="cp-meta">
          <span>{formatLabel(cup?.format)} · Sesong {cup?.season || seasonFor(cup?.createdAt)}</span>
          <span>
            {#if isDone}
              Cupen er ferdigspilt
            {:else if lastPlayedGw}
              Resultater til og med GW {lastPlayedGw}{nextGw ? ` · Neste: GW ${nextGw}` : ""}
            {:else if nextGw}
              Første runde: GW {nextGw}
            {/if}
          </span>
        </div>
      </header>

      <div class="cp-body" bind:this={bodyEl}>
        <div
          class="cp-fit"
          bind:this={fitEl}
          style={`--k:${fitK};`}
        >
          {#if layout === "double"}
            <div class="cp-grid" style={`--n:${columns.length}`}>
              {#each columns as col (col.roundNumber)}
                <div class="cp-colhead" class:cp-current={col.roundNumber === currentRound}>
                  <span class="cp-gw">GW {col.gameweek}</span>
                </div>
              {/each}
            </div>
            {#each [
              { key: "wb", band: winnersBand, title: "Vinnerbrakett", cls: "cp-band-wb" },
              { key: "lb", band: losersBand, title: "Taperbrakett – ett tap til og du er ute", cls: "cp-band-lb" },
              { key: "gf", band: finalBand, title: "Grand Final", cls: "cp-band-gf" },
            ] as sec (sec.key)}
              {#if sec.band.length > 0}
                <div class={`cp-band ${sec.cls}`}>{sec.title}</div>
                <div class="cp-grid" style={`--n:${columns.length}`}>
                  {#each columns as col (col.roundNumber)}
                    <div class="cp-cell">
                      {#each colTitles(sec.band, col) as t}<div class="cp-celltitle">{t}</div>{/each}
                      {#each cell(sec.band, col) as m (m._id)}
                        {@render pcard(m)}
                      {/each}
                    </div>
                  {/each}
                </div>
              {/if}
            {/each}
          {:else}
            {#if layout === "groups" && groupLetters.length > 0}
              <div class="cp-tables" style={`--g:${Math.min(groupLetters.length, 4)}`}>
                {#each groupLetters as letter (letter)}
                  {@const adv = groupLetters.length >= 2 ? 2 : 1}
                  <div class="cp-table">
                    <div class="cp-table-title">
                      <span>{groupLetters.length === 1 ? "Tabell" : `Gruppe ${letter}`}</span>
                      <span>Topp {adv} videre</span>
                    </div>
                    <div class="cp-trow cp-thead">
                      <span>#</span><span class="cp-tname-h">Rom</span><span>K</span><span>V</span><span>U</span><span>T</span><span>P</span>
                    </div>
                    {#each tableFor(letter) as row, i}
                      <div class="cp-trow" class:cp-adv={i < adv}>
                        <span>{i + 1}</span>
                        <span class="cp-tname">
                          <i class="cp-dot" style={`background:${row.room?.accentColor || "#1eb854"}`}></i>
                          <span class="cp-name">{row.room?.name}</span>
                        </span>
                        <span>{row.played}</span><span>{row.won}</span><span>{row.drawn}</span><span>{row.lost}</span>
                        <b>{row.points}</b>
                      </div>
                    {/each}
                  </div>
                {/each}
              </div>
            {/if}
            <div class="cp-grid cp-rounds" style={`--n:${columns.length}`}>
              {#each columns as col (col.roundNumber)}
                <div class="cp-cell cp-cell-center">
                  {@render colHead(col, columnTitle(col))}
                  {#each col.matches as m (m._id)}
                    {@render pcard(m)}
                  {/each}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <footer class="cp-foot">
        {#if isDone && cup?.winnerRoom}
          <span class="cp-champ">
            🏆 Cupmester: <b>{cup.winnerRoom.name}</b>
            {#if cup.runnerUpRoom} · 2. plass: <b>{cup.runnerUpRoom.name}</b>{/if}
            {#if cup.thirdPlaceRoom} · 3. plass: <b>{cup.thirdPlaceRoom.name}</b>{/if}
          </span>
        {:else}
          <span>Hvert oppgjør avgjøres av snittet av de 2 beste spillerne i rommet i gameweeken.</span>
        {/if}
        <span>Skrevet ut {printedOn}</span>
      </footer>
    </div>
  </div>
</div>

<style>
  .poster-shell {
    filter: drop-shadow(0 20px 40px rgba(0, 0, 0, 0.45));
  }

  .cup-poster {
    /* Alle mål under er i cqw, så utseendet er identisk i forhåndsvisning og på papir. */
    container-type: inline-size;
    width: 100%;
    aspect-ratio: 1.4142 / 1;
    display: flex;
    flex-direction: column;
    padding: 2.2% 2.6%;
    background: var(--bg);
    color: var(--fg);
    border-radius: 4px;
    font-family: "Inter", sans-serif;
    position: relative;
    overflow: hidden;
  }
  .theme-light {
    --bg: #ffffff;
    --fg: #111827;
    --muted: #6b7280;
    --line: #d1d5db;
    --card: #f8fafc;
    --accent: #15803d;
    --gold: #b45309;
    --lose: #b91c1c;
    --win-bg: #dcfce7;
    --cur: #0369a1;
    --cur-bg: #e0f2fe;
  }
  .theme-dark {
    --bg: #12151a;
    --fg: #eef1f5;
    --muted: #9aa5b4;
    --line: rgba(255, 255, 255, 0.16);
    --card: rgba(255, 255, 255, 0.05);
    --accent: #9fe88d;
    --gold: #f4c152;
    --lose: #fb6f84;
    --win-bg: rgba(159, 232, 141, 0.16);
    --cur: #70e1f8;
    --cur-bg: rgba(112, 225, 248, 0.12);
  }

  .cp-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 2cqw;
    padding-bottom: 1cqw;
    border-bottom: 0.2cqw solid var(--accent);
    margin-bottom: 1.2cqw;
  }
  .cp-brand {
    display: flex;
    flex-direction: column;
    line-height: 1;
    min-width: 0;
  }
  .cp-brand-top {
    font: 400 1px/1 "Bebas Neue", Impact, sans-serif;
    font-size: 1.5cqw;
    letter-spacing: 0.2em;
    color: var(--accent);
  }
  .cp-title {
    font: 400 1px/0.95 "Bebas Neue", Impact, sans-serif;
    font-size: 4.4cqw;
    letter-spacing: 0.02em;
  }
  .cp-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    text-align: right;
    gap: 0.3cqw;
    font: 600 1px/1.2 "JetBrains Mono", monospace;
    font-size: 1.05cqw;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--muted);
  }

  .cp-body {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
  .cp-fit {
    --u: calc(1cqw * var(--k, 1));
    display: flex;
    flex-direction: column;
    gap: calc(1 * var(--u));
  }

  .cp-grid {
    display: grid;
    grid-template-columns: repeat(var(--n), minmax(0, 1fr));
    gap: calc(1 * var(--u));
    align-items: start;
  }
  .cp-rounds {
    align-items: stretch;
  }
  .cp-cell {
    display: flex;
    flex-direction: column;
    gap: calc(0.6 * var(--u));
    min-width: 0;
  }
  .cp-cell-center {
    justify-content: space-around;
  }
  .cp-celltitle {
    font: 700 1px/1 "Inter", sans-serif;
    font-size: calc(0.85 * var(--u));
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .cp-colhead {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: calc(0.6 * var(--u));
    padding: calc(0.5 * var(--u)) calc(0.8 * var(--u));
    border: calc(0.1 * var(--u)) solid var(--line);
    border-radius: calc(0.6 * var(--u));
    font-size: calc(1.05 * var(--u));
    font-weight: 800;
    color: var(--accent);
  }
  .cp-colhead.cp-current {
    border-color: var(--cur);
    background: var(--cur-bg);
  }
  .cp-colhead-title {
    min-width: 0;
    line-height: 1.15;
  }
  .cp-gw {
    font: 700 1px/1 "JetBrains Mono", monospace;
    font-size: calc(1 * var(--u));
    color: var(--gold);
    white-space: nowrap;
  }

  .cp-band {
    align-self: flex-start;
    padding: calc(0.4 * var(--u)) calc(1 * var(--u));
    border-radius: calc(0.5 * var(--u));
    font-size: calc(1.05 * var(--u));
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--accent);
    border: calc(0.1 * var(--u)) solid currentColor;
  }
  .cp-band-lb {
    color: var(--lose);
  }
  .cp-band-gf {
    color: var(--gold);
  }

  .cp-card {
    border: calc(0.1 * var(--u)) solid var(--line);
    background: var(--card);
    border-radius: calc(0.6 * var(--u));
    padding: calc(0.5 * var(--u)) calc(0.6 * var(--u)) calc(0.4 * var(--u));
    min-width: 0;
  }
  .cp-card.cp-current {
    border-color: var(--cur);
    border-width: calc(0.2 * var(--u));
  }
  .cp-card.cp-final {
    border-color: var(--gold);
    border-width: calc(0.2 * var(--u));
  }
  .cp-card-label {
    display: flex;
    justify-content: space-between;
    gap: calc(0.4 * var(--u));
    font-size: calc(0.72 * var(--u));
    color: var(--muted);
    font-weight: 600;
    margin-bottom: calc(0.2 * var(--u));
  }
  .cp-side {
    display: flex;
    align-items: center;
    gap: calc(0.5 * var(--u));
    padding: calc(0.28 * var(--u)) calc(0.4 * var(--u));
    border-radius: calc(0.35 * var(--u));
    font-size: calc(1 * var(--u));
    font-weight: 600;
    line-height: 1.15;
  }
  .cp-side.cp-win {
    background: var(--win-bg);
    font-weight: 800;
  }
  .cp-side.cp-lose {
    color: var(--muted);
    font-weight: 500;
  }
  .cp-dot {
    width: calc(0.8 * var(--u));
    height: calc(0.8 * var(--u));
    border-radius: 50%;
    flex: none;
    border: calc(0.08 * var(--u)) solid rgba(0, 0, 0, 0.25);
  }
  .cp-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .cp-hint {
    font-style: italic;
    font-weight: 400;
    color: var(--muted);
    font-size: calc(0.85 * var(--u));
  }
  .cp-score {
    font: 700 1px/1 "JetBrains Mono", monospace;
    font-size: calc(0.95 * var(--u));
    flex: none;
  }
  .cp-ll {
    font-style: normal;
    font-size: calc(0.65 * var(--u));
    font-weight: 800;
    color: var(--gold);
    border: calc(0.08 * var(--u)) solid var(--gold);
    border-radius: calc(0.3 * var(--u));
    padding: 0 calc(0.3 * var(--u));
  }

  .cp-tables {
    display: grid;
    grid-template-columns: repeat(var(--g), minmax(0, 1fr));
    gap: calc(1.2 * var(--u));
  }
  .cp-table {
    border: calc(0.1 * var(--u)) solid var(--line);
    border-radius: calc(0.7 * var(--u));
    padding: calc(0.7 * var(--u)) calc(0.9 * var(--u));
    background: var(--card);
  }
  .cp-table-title {
    display: flex;
    justify-content: space-between;
    font-size: calc(1.1 * var(--u));
    font-weight: 800;
    color: var(--accent);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: calc(0.4 * var(--u));
  }
  .cp-table-title span:last-child {
    color: var(--muted);
    font-weight: 600;
    text-transform: none;
    font-size: calc(0.85 * var(--u));
  }
  .cp-trow {
    display: grid;
    grid-template-columns: calc(1.6 * var(--u)) minmax(0, 1fr) repeat(4, calc(2 * var(--u))) calc(2.4 * var(--u));
    align-items: center;
    gap: calc(0.3 * var(--u));
    padding: calc(0.3 * var(--u)) calc(0.3 * var(--u));
    font-size: calc(1 * var(--u));
    border-top: calc(0.07 * var(--u)) solid var(--line);
    text-align: center;
  }
  .cp-trow.cp-thead {
    font-size: calc(0.8 * var(--u));
    color: var(--muted);
    font-weight: 700;
    border-top: 0;
  }
  .cp-trow.cp-adv {
    background: var(--win-bg);
    font-weight: 700;
  }
  .cp-tname-h {
    text-align: left;
  }
  .cp-tname {
    display: flex;
    align-items: center;
    gap: calc(0.5 * var(--u));
    min-width: 0;
    text-align: left;
  }
  .cp-trow b {
    color: var(--gold);
  }

  .cp-foot {
    display: flex;
    justify-content: space-between;
    gap: 2cqw;
    margin-top: 1cqw;
    padding-top: 0.7cqw;
    border-top: 0.1cqw solid var(--line);
    font-size: 0.9cqw;
    color: var(--muted);
  }
  .cp-champ {
    color: var(--fg);
    font-size: 1.2cqw;
    font-weight: 600;
  }
  .cp-champ b {
    color: var(--gold);
  }

  /* Viser kun plakaten i faktisk papirstørrelse. #poster-print-root er en klone rett under <body>
     (se printPoster()), og alt annet skjules av regelen i RoomPosterExport. */
  @media print {
    :global(#poster-print-root .cup-poster) {
      width: 420mm !important;
      height: 297mm !important;
      aspect-ratio: unset !important;
      border-radius: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    :global(#poster-print-root .cup-poster.fmt-a4) {
      width: 297mm !important;
      height: 210mm !important;
    }
  }
</style>
