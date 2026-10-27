<script lang="ts">
  import { TrendingUp, TrendingDown, History, Info } from "lucide-svelte";
  import { POSITION_LABELS, formatPrice, priceDirection } from "../../../../convex/playerMath";

  let {
    players = [],
    movers = [],
    clubs = [],
    changes = [],
  }: {
    /** Hele katalogen: brukes til prisendring siden sesongstart. */
    players?: any[];
    /** Overføringstellere og prisprognoser for de relevante spillerne (fpl_price_movers). */
    movers?: any[];
    clubs?: { clubId: number; name: string; shortName: string }[];
    changes?: any[];
  } = $props();

  let clubMap = $derived(new Map(clubs.map((c) => [c.clubId, c.shortName])));
  const club = (id: number) => clubMap.get(id) ?? "";

  const LIST_SIZE = 12;

  // Prognose for i natt, sortert etter hvor sikker den er og hvor nær grensen (±100 %) spilleren er.
  let risers = $derived(
    movers
      .filter((p) => priceDirection(p) === "rise")
      .sort(
        (a, b) =>
          (b.priceProjections.find((x: any) => x.offset === 0)?.likelihood ?? 0) -
            (a.priceProjections.find((x: any) => x.offset === 0)?.likelihood ?? 0) ||
          b.priceChangePercent - a.priceChangePercent
      )
      .slice(0, LIST_SIZE)
  );
  let fallers = $derived(
    movers
      .filter((p) => priceDirection(p) === "fall")
      .sort(
        (a, b) =>
          (a.priceProjections.find((x: any) => x.offset === 0)?.likelihood ?? 0) -
            (b.priceProjections.find((x: any) => x.offset === 0)?.likelihood ?? 0) ||
          a.priceChangePercent - b.priceChangePercent
      )
      .slice(0, LIST_SIZE)
  );

  // Størst prisendring siden sesongstart (cost_change_start, tidels millioner).
  let seasonUp = $derived(
    [...players].filter((p) => p.costChangeStart > 0).sort((a, b) => b.costChangeStart - a.costChangeStart).slice(0, 8)
  );
  let seasonDown = $derived(
    [...players].filter((p) => p.costChangeStart < 0).sort((a, b) => a.costChangeStart - b.costChangeStart).slice(0, 8)
  );

  // Mest overførte inn og ut denne runden.
  let mostIn = $derived([...movers].sort((a, b) => b.transfersInEvent - a.transfersInEvent).slice(0, 8));
  let mostOut = $derived([...movers].sort((a, b) => b.transfersOutEvent - a.transfersOutEvent).slice(0, 8));

  const compact = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(n >= 100_000 ? 0 : 1)}k` : String(n);

  const likelihoodLabel = (l: number) => {
    const a = Math.abs(l);
    return a >= 5 ? "Sikkert" : a >= 4 ? "Svært sannsynlig" : "Sannsynlig";
  };

  const offsetLabel = ["I natt", "I morgen", "Om 2 dager"];

  function barPct(p: any): number {
    return Math.min(100, Math.abs(p.priceChangePercent));
  }

  function dayLabel(ts: number): string {
    return new Date(ts).toLocaleDateString("nb-NO", { weekday: "long", day: "numeric", month: "long" });
  }

  let changeGroups = $derived.by(() => {
    const groups: { day: string; items: any[] }[] = [];
    for (const c of changes) {
      const day = dayLabel(c.at);
      const last = groups[groups.length - 1];
      if (last && last.day === day) last.items.push(c);
      else groups.push({ day, items: [c] });
    }
    return groups;
  });
</script>

{#snippet predictionList(title: string, items: any[], rising: boolean)}
  <section class="rounded-2xl bg-white/[0.04] border border-white/10 p-3 space-y-2 min-w-0">
    <h4 class={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${rising ? "text-[#9FE88D]" : "text-[#FB6F84]"}`}>
      {#if rising}<TrendingUp class="w-4 h-4" />{:else}<TrendingDown class="w-4 h-4" />{/if}
      {title}
    </h4>

    {#if items.length === 0}
      <p class="text-xs text-[#AEB9CC] py-3">Ingen spillere er prognosert {rising ? "til å stige" : "til å falle"} i natt.</p>
    {:else}
      <ul class="space-y-1.5">
        {#each items as p (p.elementId)}
          {@const tonight = p.priceProjections.find((x: any) => x.offset === 0)}
          <li class="p-2 rounded-lg bg-black/20 border border-white/[0.06] space-y-1.5">
            <div class="flex items-center justify-between gap-2">
              <div class="min-w-0">
                <span class="font-bold text-sm text-white">{p.webName}</span>
                <span class="text-[10px] text-[#AEB9CC] ml-1">{club(p.clubId)} · {POSITION_LABELS[p.position]}</span>
              </div>
              <div class="shrink-0 text-right">
                <span class="font-mono text-xs font-bold text-white">{formatPrice(p.cost)}</span>
                <span class={`block text-[10px] font-bold ${rising ? "text-[#9FE88D]" : "text-[#FB6F84]"}`}>
                  {tonight ? likelihoodLabel(tonight.likelihood) : ""}
                </span>
              </div>
            </div>

            <div class="h-1.5 rounded-full bg-white/10 overflow-hidden" title={`${p.priceChangePercent.toFixed(1)} % av terskelen`}>
              <div class={`h-full rounded-full ${rising ? "bg-[#9FE88D]" : "bg-[#FB6F84]"}`} style={`width: ${barPct(p)}%`}></div>
            </div>

            <div class="flex items-center justify-between gap-2 text-[10px] text-[#AEB9CC]">
              <span>Inn {compact(p.transfersInEvent)} · Ut {compact(p.transfersOutEvent)}</span>
              <span class="flex items-center gap-1">
                {#each p.priceProjections as proj (proj.offset)}
                  <span
                    class={`px-1 rounded font-mono ${
                      proj.likelihood >= 3
                        ? "bg-[#9FE88D]/20 text-[#9FE88D]"
                        : proj.likelihood <= -3
                          ? "bg-[#FB6F84]/20 text-[#FB6F84]"
                          : "bg-white/10"
                    }`}
                    title={`${offsetLabel[proj.offset] ?? `+${proj.offset}`}: ${proj.percent.toFixed(0)} %`}
                  >
                    {proj.percent.toFixed(0)}%
                  </span>
                {/each}
              </span>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
{/snippet}

{#snippet miniList(title: string, items: any[], valueOf: (p: any) => string, tone: string)}
  <section class="rounded-2xl bg-white/[0.04] border border-white/10 p-3 space-y-2 min-w-0">
    <h4 class={`text-[11px] font-bold uppercase tracking-wider ${tone}`}>{title}</h4>
    {#if items.length === 0}
      <p class="text-xs text-[#AEB9CC]">Ingen data.</p>
    {:else}
      <ul class="space-y-1">
        {#each items as p (p.elementId)}
          <li class="flex items-center justify-between gap-2 text-xs">
            <span class="truncate"><span class="font-bold text-white">{p.webName}</span> <span class="text-[10px] text-[#AEB9CC]">{club(p.clubId)}</span></span>
            <span class="font-mono font-bold text-[#E2E8F0] shrink-0">{valueOf(p)}</span>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
{/snippet}

<div class="h-full min-h-0 overflow-y-auto custom-scrollbar pr-1 space-y-4">
  {#if players.length === 0}
    <div class="p-8 text-center text-[#AEB9CC] flex flex-col items-center gap-2">
      <Info class="w-6 h-6" />
      <p class="text-sm font-bold text-white">Ingen prisdata ennå</p>
      <p class="text-xs">Henter spillerkatalogen fra FPL – dette tar noen sekunder.</p>
    </div>
  {:else}
    <div class="grid gap-3 lg:grid-cols-2">
      {@render predictionList("Prognosert å stige i natt", risers, true)}
      {@render predictionList("Prognosert å falle i natt", fallers, false)}
    </div>

    <p class="text-[10px] text-[#AEB9CC]">
      Prognosene er FPLs egne estimater. Linjen viser hvor langt spilleren er mot terskelen på 100 %.
      De tre merkene viser prosent i natt, i morgen og om to dager.
    </p>

    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {@render miniList("Størst stigning i sesongen", seasonUp, (p) => `+£${(p.costChangeStart / 10).toFixed(1)}m`, "text-[#9FE88D]")}
      {@render miniList("Størst fall i sesongen", seasonDown, (p) => `−£${(Math.abs(p.costChangeStart) / 10).toFixed(1)}m`, "text-[#FB6F84]")}
      {@render miniList("Mest overført inn (runden)", mostIn, (p) => compact(p.transfersInEvent), "text-[#70E1F8]")}
      {@render miniList("Mest overført ut (runden)", mostOut, (p) => compact(p.transfersOutEvent), "text-[#F4C152]")}
    </div>

    <section class="rounded-2xl bg-white/[0.04] border border-white/10 p-3 space-y-2">
      <h4 class="text-xs font-bold uppercase tracking-wider text-[#70E1F8] flex items-center gap-1.5">
        <History class="w-4 h-4" /> Siste prisendringer
      </h4>
      {#if changeGroups.length === 0}
        <p class="text-xs text-[#AEB9CC]">
          Ingen prisendringer er registrert ennå. Loggen bygges opp fra første synk og fylles på etter hver prisendring.
        </p>
      {:else}
        <div class="space-y-3">
          {#each changeGroups as g (g.day)}
            <div>
              <p class="text-[10px] font-bold uppercase tracking-wider text-[#AEB9CC] mb-1 first-letter:uppercase">{g.day}</p>
              <div class="flex flex-wrap gap-1.5">
                {#each g.items as c (c.elementId + "-" + c.at)}
                  <span
                    class={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs border ${
                      c.newCost > c.oldCost
                        ? "bg-[#9FE88D]/10 border-[#9FE88D]/30 text-[#9FE88D]"
                        : "bg-[#FB6F84]/10 border-[#FB6F84]/30 text-[#FB6F84]"
                    }`}
                  >
                    {#if c.newCost > c.oldCost}<TrendingUp class="w-3 h-3" />{:else}<TrendingDown class="w-3 h-3" />{/if}
                    <span class="font-bold text-white">{c.webName}</span>
                    <span class="font-mono">{formatPrice(c.oldCost)} → {formatPrice(c.newCost)}</span>
                  </span>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </section>
  {/if}
</div>
