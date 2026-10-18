<script lang="ts">
  import { Search, ArrowUp, ArrowDown, Info } from "lucide-svelte";
  import PlayerDetail from "./PlayerDetail.svelte";
  import {
    POSITION_LABELS,
    formatPrice,
    overUnder,
    pointsPerMillion,
  } from "../../../../convex/playerMath";

  let {
    players = [],
    clubs = [],
  }: {
    players?: any[];
    clubs?: { clubId: number; name: string; shortName: string }[];
  } = $props();

  type Row = any & { overUnder: number; ppm: number };
  type Column = {
    key: string;
    label: string;
    title: string;
    get: (p: Row) => number;
    fmt: (n: number) => string;
  };

  const sign = (n: number, d = 2) => (n > 0 ? "+" : "") + n.toFixed(d);

  const columns: Column[] = [
    { key: "cost", label: "Pris", title: "Nåværende pris", get: (p) => p.cost, fmt: (n) => formatPrice(n) },
    { key: "selectedBy", label: "Eid %", title: "Eierandel blant alle FPL-managere", get: (p) => p.selectedBy, fmt: (n) => n.toFixed(1) },
    { key: "totalPoints", label: "Poeng", title: "Totale poeng", get: (p) => p.totalPoints, fmt: (n) => String(n) },
    { key: "form", label: "Form", title: "Snitt poeng siste 30 dager", get: (p) => p.form, fmt: (n) => n.toFixed(1) },
    { key: "xgPer90", label: "xG/90", title: "Forventede mål per 90 minutter", get: (p) => p.xgPer90, fmt: (n) => n.toFixed(2) },
    { key: "xaPer90", label: "xA/90", title: "Forventede assist per 90 minutter", get: (p) => p.xaPer90, fmt: (n) => n.toFixed(2) },
    { key: "xgiPer90", label: "xGI/90", title: "Forventede mål + assist per 90 minutter", get: (p) => p.xgiPer90, fmt: (n) => n.toFixed(2) },
    { key: "xgi", label: "xGI", title: "Forventede mål + assist totalt", get: (p) => p.xgi, fmt: (n) => n.toFixed(2) },
    { key: "overUnder", label: "Over/under", title: "Faktiske mål + assist minus xGI. Positivt = scorer mer enn sjansene tilsier, negativt = uflaks.", get: (p) => p.overUnder, fmt: (n) => sign(n) },
    { key: "ppm", label: "P/£m", title: "Poeng per million", get: (p) => p.ppm, fmt: (n) => n.toFixed(1) },
    { key: "defConPer90", label: "DC/90", title: "Defensive contribution per 90 minutter", get: (p) => p.defConPer90, fmt: (n) => n.toFixed(1) },
    { key: "ict", label: "ICT", title: "ICT-indeks (innflytelse, kreativitet, trussel)", get: (p) => p.ict, fmt: (n) => n.toFixed(1) },
  ];

  const presets = [
    { id: "xgi", label: "Beste xGI/90", sort: "xgiPer90", dir: -1, minutes: 450 },
    { id: "unlucky", label: "Uflaks (kjøpskandidater)", sort: "overUnder", dir: 1, minutes: 450 },
    { id: "lucky", label: "Overprestasjon (regresjonsfare)", sort: "overUnder", dir: -1, minutes: 450 },
    { id: "ppm", label: "Mest poeng per million", sort: "ppm", dir: -1, minutes: 450 },
    { id: "defcon", label: "Defensive contribution", sort: "defConPer90", dir: -1, minutes: 450 },
  ];

  const PAGE = 50;

  let search = $state("");
  let position = $state(0);
  let clubId = $state(0);
  let maxPrice = $state(0); // tidels millioner, 0 = ingen grense
  let minMinutes = $state(90);
  let onlyAvailable = $state(false);
  let sortKey = $state("totalPoints");
  let sortDir = $state<1 | -1>(-1);
  let visible = $state(PAGE);
  let selectedId = $state<number | null>(null);

  let clubMap = $derived(new Map(clubs.map((c) => [c.clubId, c])));
  let sortedClubs = $derived([...clubs].sort((a, b) => a.name.localeCompare(b.name, "nb")));
  const clubShort = (id: number) => clubMap.get(id)?.shortName ?? "";

  let rows = $derived<Row[]>(
    players.map((p) => ({
      ...p,
      overUnder: overUnder(p),
      ppm: pointsPerMillion(p.totalPoints, p.cost),
    }))
  );

  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  let filtered = $derived.by(() => {
    const q = norm(search.trim());
    const col = columns.find((c) => c.key === sortKey) ?? columns[2];
    return rows
      .filter(
        (p) =>
          (position === 0 || p.position === position) &&
          (clubId === 0 || p.clubId === clubId) &&
          (maxPrice === 0 || p.cost <= maxPrice) &&
          p.minutes >= minMinutes &&
          (!onlyAvailable || p.status === "a") &&
          (q === "" || norm(p.webName).includes(q) || norm(p.fullName).includes(q))
      )
      .sort((a, b) => (col.get(a) - col.get(b)) * sortDir || b.totalPoints - a.totalPoints);
  });

  let shown = $derived(filtered.slice(0, visible));
  let selected = $derived(rows.find((p) => p.elementId === selectedId) ?? null);

  // Tilbake til første side når filtre eller sortering endres.
  $effect(() => {
    search; position; clubId; maxPrice; minMinutes; onlyAvailable; sortKey; sortDir;
    visible = PAGE;
  });

  function setSort(key: string) {
    if (sortKey === key) {
      sortDir = sortDir === 1 ? -1 : 1;
    } else {
      sortKey = key;
      sortDir = -1;
    }
  }

  function applyPreset(p: (typeof presets)[number]) {
    sortKey = p.sort;
    sortDir = p.dir as 1 | -1;
    minMinutes = p.minutes;
  }

  const statusDot: Record<string, string> = {
    a: "bg-[#9FE88D]",
    d: "bg-[#F4C152]",
    i: "bg-[#FB6F84]",
    s: "bg-[#FB6F84]",
    u: "bg-[#FB6F84]",
    n: "bg-[#AEB9CC]",
  };

  const priceOptions = Array.from({ length: 24 }, (_, i) => 40 + i * 5); // 4.0 .. 15.5
</script>

<div class="h-full min-h-0 flex flex-col gap-3">
  <!-- Hurtigvalg -->
  <div class="flex flex-wrap items-center gap-1.5 text-[11px]">
    <span class="text-[#AEB9CC] font-bold uppercase tracking-wider mr-1">Utvalg:</span>
    {#each presets as p (p.id)}
      <button
        type="button"
        onclick={() => applyPreset(p)}
        class="px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.04] text-[#E2E8F0] hover:border-[#70E1F8]/60 hover:text-white transition-colors"
      >
        {p.label}
      </button>
    {/each}
  </div>

  <!-- Filtre -->
  <div class="flex flex-wrap items-center gap-2 text-xs">
    <label class="relative">
      <Search class="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#AEB9CC]" />
      <input
        type="search"
        bind:value={search}
        placeholder="Søk spiller…"
        class="pl-8 pr-3 py-1.5 w-44 rounded-lg bg-black/20 border border-white/10 text-white placeholder:text-[#AEB9CC] focus:outline-none focus:border-[#9FE88D]/60"
      />
    </label>

    <div class="flex items-center gap-1 p-1 rounded-lg bg-black/20 border border-white/10">
      {#each [[0, "Alle"], [1, "GKP"], [2, "DEF"], [3, "MID"], [4, "FWD"]] as [id, label]}
        <button
          type="button"
          onclick={() => (position = id as number)}
          class={`px-2 py-0.5 rounded-md font-semibold transition-colors ${
            position === id ? "bg-[#9FE88D] text-[#16380c]" : "text-[#AEB9CC] hover:text-white"
          }`}
        >
          {label}
        </button>
      {/each}
    </div>

    <select bind:value={clubId} class="py-1.5 px-2 rounded-lg bg-black/30 border border-white/10 text-white" aria-label="Klubb">
      <option value={0}>Alle klubber</option>
      {#each sortedClubs as c (c.clubId)}
        <option value={c.clubId}>{c.name}</option>
      {/each}
    </select>

    <select bind:value={maxPrice} class="py-1.5 px-2 rounded-lg bg-black/30 border border-white/10 text-white" aria-label="Maks pris">
      <option value={0}>Maks pris: ingen</option>
      {#each priceOptions as c}
        <option value={c}>Maks {formatPrice(c)}</option>
      {/each}
    </select>

    <select bind:value={minMinutes} class="py-1.5 px-2 rounded-lg bg-black/30 border border-white/10 text-white" aria-label="Minimum spilte minutter">
      <option value={0}>Alle spillere</option>
      <option value={90}>Minst 90 min</option>
      <option value={450}>Minst 450 min</option>
      <option value={900}>Minst 900 min</option>
    </select>

    <label class="flex items-center gap-1.5 text-[#E2E8F0] cursor-pointer">
      <input type="checkbox" bind:checked={onlyAvailable} class="accent-[#9FE88D]" />
      Bare tilgjengelige
    </label>

    <span class="ml-auto text-[#AEB9CC]">{filtered.length} spillere</span>
  </div>

  <div class={`flex-1 min-h-0 grid gap-3 ${selected ? "lg:grid-cols-[minmax(0,1fr)_22rem]" : "grid-cols-1"}`}>
    <div class="min-h-0 overflow-auto custom-scrollbar rounded-xl border border-white/10 bg-white/[0.03]">
      {#if rows.length === 0}
        <div class="h-full flex flex-col items-center justify-center gap-2 p-8 text-center text-[#AEB9CC]">
          <Info class="w-6 h-6" />
          <p class="text-sm font-bold text-white">Ingen spillerdata ennå</p>
          <p class="text-xs">Henter spillerkatalogen fra FPL – dette tar noen sekunder.</p>
        </div>
      {:else}
        <table class="w-full text-xs border-separate border-spacing-0">
          <thead class="sticky top-0 z-10">
            <tr class="bg-[#141b27] text-[#AEB9CC]">
              <th class="text-left font-bold uppercase tracking-wider text-[10px] px-3 py-2 sticky left-0 bg-[#141b27] z-20">Spiller</th>
              {#each columns as c (c.key)}
                <th class="px-2 py-2 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onclick={() => setSort(c.key)}
                    title={c.title}
                    class={`inline-flex items-center gap-0.5 font-bold uppercase tracking-wider text-[10px] hover:text-white transition-colors ${
                      sortKey === c.key ? "text-[#9FE88D]" : ""
                    }`}
                  >
                    {c.label}
                    {#if sortKey === c.key}
                      {#if sortDir === -1}<ArrowDown class="w-3 h-3" />{:else}<ArrowUp class="w-3 h-3" />{/if}
                    {/if}
                  </button>
                </th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each shown as p (p.elementId)}
              <tr
                onclick={() => (selectedId = p.elementId === selectedId ? null : p.elementId)}
                class={`cursor-pointer transition-colors hover:bg-white/[0.06] ${
                  p.elementId === selectedId ? "bg-[#70E1F8]/10" : ""
                }`}
              >
                <td class="px-3 py-1.5 sticky left-0 bg-[#1a2231] border-b border-white/[0.05] whitespace-nowrap">
                  <div class="flex items-center gap-2">
                    <span class={`w-2 h-2 rounded-full shrink-0 ${statusDot[p.status] ?? "bg-[#AEB9CC]"}`} title={p.news || undefined}></span>
                    <span class="font-bold text-white">{p.webName}</span>
                    <span class="text-[10px] text-[#AEB9CC]">{clubShort(p.clubId)} · {POSITION_LABELS[p.position]}</span>
                  </div>
                </td>
                {#each columns as c (c.key)}
                  {@const val = c.get(p)}
                  <td
                    class={`px-2 py-1.5 text-right font-mono border-b border-white/[0.05] whitespace-nowrap ${
                      c.key === "overUnder"
                        ? val >= 1
                          ? "text-[#F4C152] font-bold"
                          : val <= -1
                            ? "text-[#70E1F8] font-bold"
                            : "text-[#E2E8F0]"
                        : sortKey === c.key
                          ? "text-white font-bold"
                          : "text-[#E2E8F0]"
                    }`}
                  >
                    {c.fmt(val)}
                  </td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>

        {#if filtered.length === 0}
          <p class="p-6 text-center text-xs text-[#AEB9CC]">Ingen spillere matcher filtrene.</p>
        {:else if visible < filtered.length}
          <div class="p-3 text-center">
            <button
              type="button"
              onclick={() => (visible += PAGE)}
              class="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/10 text-xs font-bold text-[#E2E8F0] transition-colors"
            >
              Vis {Math.min(PAGE, filtered.length - visible)} flere
            </button>
          </div>
        {/if}
      {/if}
    </div>

    {#if selected}
      <div class="min-h-0 overflow-auto custom-scrollbar">
        <PlayerDetail
          player={selected}
          clubName={clubMap.get(selected.clubId)?.name ?? ""}
          {clubShort}
          onClose={() => (selectedId = null)}
        />
      </div>
    {/if}
  </div>

  <p class="text-[10px] text-[#AEB9CC] leading-snug">
    <span class="text-[#F4C152] font-bold">Over/under</span> = faktiske mål + assist − xGI.
    Gult (≥ +1) betyr at spilleren scorer mer enn sjansene tilsier og kan regressere.
    <span class="text-[#70E1F8] font-bold">Blått (≤ −1)</span> betyr uflaks og kan ta seg opp.
    Pris, eierandel og xG kommer fra FPL.
  </p>
</div>
