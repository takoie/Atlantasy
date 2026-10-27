<script lang="ts">
  import { ArrowUp, ArrowDown, Loader2, RefreshCw, Sparkles } from "lucide-svelte";
  import {
    CHIP_LABELS,
    POSITION_NAMES,
    armband,
    type SquadLoadState,
    type SquadPlayer,
  } from "./squadTypes";

  let {
    pitch = [],
    bench = [],
    state = "loading",
    selectedId = null,
    gameweek = null,
    squadPoints = null,
    activeChip = null,
    onSelect = () => {},
    onRetry = () => {},
  }: {
    pitch?: SquadPlayer[];
    bench?: SquadPlayer[];
    state?: SquadLoadState;
    selectedId?: number | null;
    gameweek?: number | null;
    squadPoints?: number | null;
    activeChip?: string | null;
    onSelect?: (player: SquadPlayer) => void;
    onRetry?: () => void;
  } = $props();

  const rows: Array<{ pos: SquadPlayer["pos"]; bg: string; fg: string }> = [
    { pos: "GKP", bg: "#F4C152", fg: "#16380c" },
    { pos: "DEF", bg: "#38bdf8", fg: "#082f49" },
    { pos: "MID", bg: "#9FE88D", fg: "#14532d" },
    { pos: "FWD", bg: "#FB6F84", fg: "#4c0519" },
  ];

  const badgeClass = {
    captain: "bg-[#F4C152] text-[#3b2a00]",
    triple: "bg-[#A78BFA] text-[#1e1245]",
    vice: "bg-[#E2E8F0] text-[#1e293b]",
    out: "bg-[#64748b] text-white/80",
  } as const;

  const chipLabel = $derived(activeChip ? (CHIP_LABELS[activeChip] ?? activeChip) : null);
  const slotLabel = (p: SquadPlayer) => (p.subOrder === 1 ? "Keeper" : `${p.subOrder! - 1}. bytte`);
</script>

{#snippet marker(p: SquadPlayer)}
  {@const band = armband(p)}
  {#if band}
    <span
      class={`absolute -top-1 -right-1.5 min-w-[22px] h-[22px] px-1 rounded-full grid place-items-center text-[11px] font-black leading-none shadow-md ring-2 ring-[#1d6b32] ${badgeClass[band.kind]}`}
      title={band.kind === "out" ? "Kapteinen spilte ikke" : undefined}
    >
      {band.label}
    </span>
  {/if}
  {#if p.autoSub}
    <span
      class={`absolute -top-1 -left-1.5 size-[22px] rounded-full grid place-items-center shadow-md ring-2 ring-[#1d6b32] ${
        p.autoSub === "in" ? "bg-[#9FE88D] text-[#14532d]" : "bg-[#FB6F84] text-[#4c0519]"
      }`}
      title={p.autoSub === "in" ? "Byttet inn automatisk" : "Byttet ut automatisk"}
    >
      {#if p.autoSub === "in"}<ArrowUp class="size-3.5" strokeWidth={3} />{:else}<ArrowDown class="size-3.5" strokeWidth={3} />{/if}
    </span>
  {/if}
{/snippet}

{#snippet pointsPill(p: SquadPlayer)}
  <span
    class={`inline-flex items-baseline gap-1 rounded-full px-2.5 py-0.5 font-mono font-bold tabular-nums ${
      p.counts ? "bg-black/70 text-[#9FE88D] text-[13px]" : "bg-black/40 text-white/60 text-xs"
    }`}
  >
    {p.points}
    {#if p.counts && p.multiplier > 1}
      <span class="text-[11px] font-semibold text-[#F4C152]">×{p.multiplier}</span>
    {/if}
  </span>
{/snippet}

<div class="space-y-4">
  <!-- Rundeoppsummering -->
  <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
    {#if gameweek}
      <span class="font-bold text-white">Runde {gameweek}</span>
    {/if}
    {#if squadPoints !== null}
      <span class="text-[#AEB9CC]">
        <span class="font-mono font-bold text-[#9FE88D] text-base tabular-nums">{squadPoints}</span> poeng fra laget
      </span>
    {/if}
    {#if chipLabel}
      <span class="inline-flex items-center gap-1.5 rounded-full border border-[#A78BFA]/40 bg-[#A78BFA]/15 px-2.5 py-1 text-xs font-bold text-[#C4B5FD]">
        <Sparkles class="size-3.5" />
        {chipLabel}
      </span>
    {/if}
  </div>

  <!-- Bane -->
  <div
    class="relative overflow-hidden rounded-2xl border border-white/10 shadow-inner px-2 py-6 sm:px-4 sm:py-8"
    style="background-color:#2f8a43;background-image:repeating-linear-gradient(180deg,rgba(255,255,255,0.055) 0px,rgba(255,255,255,0.055) 44px,transparent 44px,transparent 88px);"
  >
    <svg
      class="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 100 130"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <g fill="none" stroke="#ffffff" stroke-opacity="0.4" stroke-width="0.5">
        <rect x="2" y="2" width="96" height="126" />
        <line x1="2" y1="65" x2="98" y2="65" />
        <circle cx="50" cy="65" r="11" />
        <rect x="26" y="2" width="48" height="16" />
        <rect x="40" y="2" width="20" height="6" />
        <rect x="26" y="112" width="48" height="16" />
        <rect x="40" y="122" width="20" height="6" />
      </g>
      <circle cx="50" cy="65" r="0.9" fill="#ffffff" fill-opacity="0.5" />
    </svg>

    {#if state === "loading"}
      <div class="relative z-10 flex min-h-[420px] flex-col items-center justify-center gap-3 text-white/90">
        <Loader2 class="size-7 animate-spin" />
        <p class="text-sm font-semibold">Henter laget fra FPL …</p>
      </div>
    {:else if state === "error"}
      <div class="relative z-10 flex min-h-[420px] flex-col items-center justify-center gap-3 px-4 text-center text-white">
        <p class="text-sm font-semibold">Kunne ikke hente laget fra FPL akkurat nå.</p>
        <button
          type="button"
          onclick={onRetry}
          class="inline-flex items-center gap-2 rounded-xl bg-black/40 px-4 py-2 text-xs font-bold hover:bg-black/55 transition-colors"
        >
          <RefreshCw class="size-4" /> Prøv igjen
        </button>
      </div>
    {:else}
      <div class="relative z-10 flex flex-col gap-7 sm:gap-10">
        {#each rows as row (row.pos)}
          {@const players = pitch.filter((p) => p.pos === row.pos)}
          <div class="grid grid-flow-col auto-cols-fr place-items-start gap-1 sm:gap-2" role="group" aria-label={POSITION_NAMES[row.pos]}>
            {#each players as p (p.id)}
              <button
                type="button"
                onclick={() => onSelect(p)}
                aria-pressed={selectedId === p.id}
                aria-label={`${p.name}, ${p.points} poeng. Vis detaljer`}
                class={`group flex w-full max-w-[112px] min-w-0 justify-self-center flex-col items-center gap-1.5 rounded-2xl px-0.5 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                  selectedId === p.id ? "bg-black/30" : "hover:bg-black/20"
                }`}
              >
                <span class="relative">
                  <span
                    class="grid size-12 sm:size-14 place-items-center rounded-full ring-2 ring-white/70 shadow-lg transition-transform group-hover:scale-105"
                    style={`background-color:${row.bg}`}
                  >
                    {#if p.crest}
                      <img
                        src={p.crest}
                        alt=""
                        class="size-8 sm:size-9 object-contain drop-shadow"
                        loading="lazy"
                        onerror={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
                      />
                    {:else}
                      <span class="text-xs font-black" style={`color:${row.fg}`}>{p.name.slice(0, 3).toUpperCase()}</span>
                    {/if}
                  </span>
                  {@render marker(p)}
                </span>
                <span class="max-w-full truncate rounded-full bg-black/60 px-2 py-0.5 text-xs sm:text-[13px] font-bold text-white">
                  {p.name}
                </span>
                {@render pointsPill(p)}
                {#if p.opponent}
                  <span class="max-w-full truncate text-[11px] font-semibold text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
                    {p.opponent}
                  </span>
                {/if}
              </button>
            {/each}
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Forklaring -->
  {#if state === "ready"}
    <ul class="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-[#AEB9CC]" aria-label="Forklaring">
      <li class="flex items-center gap-1.5"><span class="grid size-5 place-items-center rounded-full bg-[#F4C152] text-[10px] font-black text-[#3b2a00]">C</span>Kaptein (2×)</li>
      <li class="flex items-center gap-1.5"><span class="grid size-5 place-items-center rounded-full bg-[#A78BFA] text-[9px] font-black text-[#1e1245]">TC</span>Triple Captain (3×)</li>
      <li class="flex items-center gap-1.5"><span class="grid size-5 place-items-center rounded-full bg-[#E2E8F0] text-[10px] font-black text-[#1e293b]">V</span>Visekaptein</li>
      <li class="flex items-center gap-1.5"><span class="grid size-5 place-items-center rounded-full bg-[#9FE88D] text-[#14532d]"><ArrowUp class="size-3" strokeWidth={3} /></span><span class="grid size-5 place-items-center rounded-full bg-[#FB6F84] text-[#4c0519]"><ArrowDown class="size-3" strokeWidth={3} /></span>Automatisk bytte</li>
    </ul>

    <!-- Benk -->
    <section class="rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5" aria-labelledby="bench-title">
      <h3 id="bench-title" class="mb-3 text-sm font-bold text-white">Benk</h3>
      {#if bench.length === 0}
        <p class="text-xs italic text-[#AEB9CC]">Ingen spillere på benken</p>
      {:else}
        <div class="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {#each bench as p (p.id)}
            <button
              type="button"
              onclick={() => onSelect(p)}
              aria-pressed={selectedId === p.id}
              aria-label={`${p.name} på benken, ${p.rawPoints} poeng. Vis detaljer`}
              class={`flex min-w-0 flex-col items-center gap-1 rounded-xl border px-2 py-3 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9FE88D] ${
                selectedId === p.id ? "border-[#9FE88D]/60 bg-white/10" : "border-white/10 bg-white/[0.04] hover:bg-white/[0.09]"
              }`}
            >
              <span class="text-[11px] font-bold uppercase tracking-wide text-[#AEB9CC]">{slotLabel(p)}</span>
              <span class="relative my-1">
                <span class={`grid size-11 place-items-center rounded-full bg-white/90 ${p.counts ? "" : "opacity-70"}`}>
                  {#if p.crest}
                    <img src={p.crest} alt="" class="size-7 object-contain" loading="lazy" onerror={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")} />
                  {/if}
                </span>
                {@render marker(p)}
              </span>
              <span class="max-w-full truncate text-[13px] font-semibold text-white">{p.name}</span>
              {#if p.opponent}
                <span class="max-w-full truncate text-[11px] text-[#AEB9CC]">{p.opponent}</span>
              {/if}
              <span class={`font-mono text-sm font-bold tabular-nums ${p.counts ? "text-[#9FE88D]" : "text-[#AEB9CC]"}`}>
                {p.points}<span class="text-[11px] font-normal"> p{p.counts ? "" : " · teller ikke"}</span>
              </span>
            </button>
          {/each}
        </div>
      {/if}
    </section>
  {/if}
</div>
