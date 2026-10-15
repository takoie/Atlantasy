<script lang="ts">
  import { GripVertical, Shuffle, ListOrdered, Trophy } from "lucide-svelte";
  import { buildCupPlan } from "../../../../convex/cupEngine";
  import { roomAccentColor } from "../../../../convex/roomColors";
  import { shortTitle } from "$lib/utils/cup";
  import { pointerDrag } from "$lib/utils/pointerDnd";
  import { useQuery } from "$lib/convex.svelte";
  import { api } from "../../../../convex/_generated/api";

  let {
    rooms = [],
    format,
    groupCount = 2,
    order = $bindable<string[]>([]),
  }: {
    rooms?: any[];
    format: string;
    groupCount?: number;
    /** Rom-id-er i seed-rekkefølge (indeks 0 = seed 1). Hentes av createCupWithBracket. */
    order?: string[];
  } = $props();

  const leaderboardQuery = useQuery(api.rooms.getLeaderboard, () => ({ sortBy: "season" }));

  let roomById = $derived(new Map(rooms.map((r: any) => [r._id as string, r])));

  // Hold rekkefølgen i synk med rommene: alle rom nøyaktig én gang.
  $effect(() => {
    const ids = rooms.map((r: any) => r._id as string);
    const valid = order.filter((id) => ids.includes(id));
    const missing = ids.filter((id) => !valid.includes(id));
    if (missing.length > 0 || valid.length !== order.length) {
      const byNumber = [...missing].sort(
        (a, b) => (roomById.get(a)?.roomNumber ?? 0) - (roomById.get(b)?.roomNumber ?? 0)
      );
      order = [...valid, ...byNumber];
    }
  });

  type Card = { title: string; sub?: string; seeds: number[] };

  // Plasseringene bracketen faktisk har: hvem som møter hvem i første omgang.
  let cards = $derived.by<Card[]>(() => {
    const n = rooms.length;
    if (n < 2) return [];
    const plan = buildCupPlan(format, n, groupCount);
    if (plan.groupSizes) {
      const byGroup = new Map<string, number[]>();
      for (const m of plan.matches) {
        if (m.bracketType !== "group" || m.group == null) continue;
        const list = byGroup.get(m.group) ?? [];
        for (const s of [m.seed1, m.seed2]) if (s != null && !list.includes(s)) list.push(s);
        byGroup.set(m.group, list);
      }
      return [...byGroup.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([letter, seeds]) => ({
          title: byGroup.size === 1 ? "Serie" : `Gruppe ${letter}`,
          sub: "Alle møter alle",
          seeds: seeds.sort((a, b) => a - b),
        }));
    }
    const out: Card[] = [];
    for (const m of plan.matches) {
      const seeds = [m.seed1, m.seed2].filter((s): s is number => s != null);
      if (seeds.length === 0) continue;
      out.push({
        title: m.isBye ? "Walkover" : `${shortTitle(m.roundTitle)} #${m.matchIndex}`,
        sub: seeds.length === 1 && !m.isBye ? "Venter på vinner av innseeding" : undefined,
        seeds,
      });
    }
    return out;
  });

  let dragSeed = $state<number | null>(null);
  let hoverSeed = $state<number | null>(null);

  function swap(a: number, b: number) {
    if (a === b || !order[a] || !order[b]) return;
    const next = [...order];
    [next[a], next[b]] = [next[b], next[a]];
    order = next;
  }

  function shuffle() {
    const next = [...order];
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    order = next;
  }
  function byTable() {
    const ranked = (leaderboardQuery.data ?? []).map((r: any) => r._id as string);
    const known = ranked.filter((id: string) => roomById.has(id));
    const rest = rooms.map((r: any) => r._id as string).filter((id) => !known.includes(id));
    order = [...known, ...rest];
  }
  function byRoomNumber() {
    order = [...rooms]
      .sort((a: any, b: any) => (a.roomNumber ?? 0) - (b.roomNumber ?? 0))
      .map((r: any) => r._id as string);
  }

  const colorOf = (room: any) => room?.accentColor || roomAccentColor(room?.roomNumber ?? 1);
</script>

<div class="space-y-3">
  <div class="flex flex-wrap items-center justify-between gap-2">
    <p class="text-[11px] text-[#AEB9CC]">
      Dra et rom over et annet for å bytte plass. Tallet er seedingen (1 = best).
    </p>
    <div class="flex flex-wrap gap-1.5">
      <button type="button" onclick={byTable} disabled={!leaderboardQuery.data}
        class="px-2.5 py-1 rounded-lg bg-black/20 hover:bg-white/10 disabled:opacity-50 border border-white/10 text-[11px] font-bold text-[#E2E8F0] flex items-center gap-1.5">
        <Trophy class="w-3 h-3" /> Etter tabell
      </button>
      <button type="button" onclick={byRoomNumber}
        class="px-2.5 py-1 rounded-lg bg-black/20 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-[#E2E8F0] flex items-center gap-1.5">
        <ListOrdered class="w-3 h-3" /> Romnummer
      </button>
      <button type="button" onclick={shuffle}
        class="px-2.5 py-1 rounded-lg bg-black/20 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-[#E2E8F0] flex items-center gap-1.5">
        <Shuffle class="w-3 h-3" /> Stokk om
      </button>
    </div>
  </div>

  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
    {#each cards as card, ci (ci)}
      <div class="p-2.5 rounded-xl bg-black/20 border border-white/10 space-y-1.5">
        <div class="flex items-center justify-between text-[11px]">
          <span class="font-bold text-[#F4C152]">{card.title}</span>
          {#if card.sub}<span class="text-[#AEB9CC]">{card.sub}</span>{/if}
        </div>
        {#each card.seeds as seed (seed)}
          {@const room = roomById.get(order[seed])}
          <div
            role="listitem"
            data-dnd-target={String(seed)}
            use:pointerDrag={{
              id: String(seed),
              onStart: () => (dragSeed = seed),
              onHover: (t) => (hoverSeed = t === null ? null : Number(t)),
              onDrop: (a, b) => swap(Number(a), Number(b)),
              onEnd: () => { dragSeed = null; hoverSeed = null; },
            }}
            class={`flex items-center gap-2 px-2 py-1.5 rounded-lg border cursor-grab active:cursor-grabbing select-none transition-colors ${
              hoverSeed === seed && dragSeed !== seed
                ? "bg-[#9FE88D]/20 border-[#9FE88D]/60"
                : dragSeed === seed
                  ? "opacity-40 border-white/20 bg-white/[0.04]"
                  : "bg-white/[0.05] border-white/10 hover:border-white/30"
            }`}
          >
            <GripVertical class="w-3.5 h-3.5 text-[#AEB9CC] shrink-0" />
            <span class="w-5 text-center text-[10px] font-mono font-bold text-[#F4C152] shrink-0">{seed + 1}</span>
            <span class="w-2.5 h-2.5 rounded-full shrink-0" style={`background-color: ${colorOf(room)}`}></span>
            <span class="text-xs font-semibold text-white truncate">{room?.name ?? "—"}</span>
          </div>
        {/each}
      </div>
    {/each}
  </div>
</div>
