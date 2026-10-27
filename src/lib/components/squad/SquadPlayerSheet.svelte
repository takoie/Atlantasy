<script lang="ts">
  import { AlertTriangle, ArrowDown, ArrowUp, ChevronLeft, X } from "lucide-svelte";
  import PlayerDetail from "../analysis/PlayerDetail.svelte";
  import { formatPrice } from "../../../../convex/playerMath";
  import {
    STAT_LABELS,
    armband,
    multiplierReason,
    type SquadFixture,
    type SquadPlayer,
  } from "./squadTypes";

  let {
    player,
    gameweek = null,
    clubShorts = {},
    onBack = () => {},
  }: {
    player: SquadPlayer;
    gameweek?: number | null;
    clubShorts?: Record<string, string>;
    onBack?: () => void;
  } = $props();

  const band = $derived(armband(player));
  const reason = $derived(multiplierReason(player));
  const clubShort = (id: number) => clubShorts[String(id)] ?? "";

  const signed = (n: number) => (n > 0 ? `+${n}` : String(n));
  const statLabel = (id: string) => STAT_LABELS[id] ?? id.replace(/_/g, " ");
  const valueLabel = (id: string, value: number) => (id === "minutes" ? `${value} min` : `${value}×`);

  function status(f: SquadFixture): string {
    if (f.finished) return `Ferdig ${f.scoreFor ?? 0}–${f.scoreAgainst ?? 0}`;
    if (f.started) return `Pågår ${f.scoreFor ?? 0}–${f.scoreAgainst ?? 0}`;
    if (f.kickoff) {
      return new Date(f.kickoff).toLocaleString("no-NO", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return "Ikke spilt ennå";
  }
</script>

<article class="min-w-0 space-y-5" aria-label={`Detaljer for ${player.name}`}>
  <!-- Topp: tilbake (smal skjerm) / lukk (bred skjerm) -->
  <div class="flex items-center justify-between">
    <button
      type="button"
      onclick={onBack}
      class="inline-flex items-center gap-1 rounded-lg py-1 pr-2 text-xs font-bold text-[#9FE88D] hover:underline lg:hidden"
    >
      <ChevronLeft class="size-4" /> Tilbake til laget
    </button>
    <span class="hidden text-xs font-bold uppercase tracking-wider text-[#AEB9CC] lg:block">Spillerdetaljer</span>
    <button
      type="button"
      onclick={onBack}
      aria-label="Lukk spillerdetaljer"
      class="hidden rounded-lg p-1.5 text-[#AEB9CC] transition-colors hover:bg-white/10 hover:text-white lg:block"
    >
      <X class="size-4" />
    </button>
  </div>

  <!-- Identitet -->
  <header class="flex items-center gap-3.5">
    <span class="grid size-14 shrink-0 place-items-center rounded-full bg-white/90 shadow-md">
      {#if player.crest}
        <img src={player.crest} alt="" class="size-9 object-contain" />
      {/if}
    </span>
    <div class="min-w-0">
      <h3 class="truncate text-lg font-bold text-white">{player.detail?.fullName || player.name}</h3>
      <p class="text-[13px] text-[#AEB9CC]">
        {player.clubName || player.club} · {player.pos}{player.detail ? ` · ${formatPrice(player.detail.cost)}` : ""}
      </p>
    </div>
  </header>

  {#if player.detail?.news}
    <div class="flex items-start gap-2 rounded-xl border border-[#F4C152]/30 bg-[#F4C152]/10 p-3 text-[13px] text-[#F4C152]">
      <AlertTriangle class="mt-0.5 size-4 shrink-0" />
      <span>{player.detail.news}</span>
    </div>
  {/if}

  <!-- Denne runden -->
  <section class="space-y-3" aria-labelledby="sheet-gw-title">
    <h4 id="sheet-gw-title" class="text-sm font-bold text-white">
      {gameweek ? `Runde ${gameweek}` : "Denne runden"}
    </h4>

    <div class="flex flex-wrap items-end gap-x-4 gap-y-1">
      <span class="font-mono text-4xl font-black leading-none tabular-nums text-[#9FE88D]">{player.points}</span>
      <div class="pb-0.5 text-[13px] leading-snug text-[#AEB9CC]">
        {#if player.counts && player.multiplier > 1}
          <span class="font-mono text-white">{player.rawPoints} × {player.multiplier}</span>
        {:else if !player.counts}
          <span class="text-white">Teller ikke i laget</span>
        {:else}
          <span class="text-white">poeng i laget</span>
        {/if}
      </div>
    </div>

    <div class="flex flex-wrap gap-2 text-xs font-bold">
      {#if reason}
        <span class={`rounded-full px-2.5 py-1 ${band?.kind === "triple" ? "bg-[#A78BFA]/20 text-[#C4B5FD]" : "bg-[#F4C152]/20 text-[#F4C152]"}`}>{reason}</span>
      {:else if band?.kind === "vice"}
        <span class="rounded-full bg-white/10 px-2.5 py-1 text-[#E2E8F0]">Visekaptein</span>
      {:else if band?.kind === "out"}
        <span class="rounded-full bg-white/10 px-2.5 py-1 text-[#AEB9CC]">Kaptein · spilte ikke, visekaptein overtok</span>
      {/if}
      {#if player.autoSub === "in"}
        <span class="inline-flex items-center gap-1 rounded-full bg-[#9FE88D]/20 px-2.5 py-1 text-[#9FE88D]"><ArrowUp class="size-3.5" strokeWidth={3} />Byttet inn automatisk</span>
      {:else if player.autoSub === "out"}
        <span class="inline-flex items-center gap-1 rounded-full bg-[#FB6F84]/20 px-2.5 py-1 text-[#FB6F84]"><ArrowDown class="size-3.5" strokeWidth={3} />Byttet ut automatisk</span>
      {/if}
    </div>

    {#if player.fixtures.length === 0}
      <p class="rounded-xl border border-white/10 bg-black/20 p-3 text-[13px] text-[#AEB9CC]">
        {player.club} har ingen kamp denne runden.
      </p>
    {/if}

    {#each player.fixtures as f, i (i)}
      {@const total = f.stats.reduce((s, x) => s + x.points, 0)}
      <div class="overflow-hidden rounded-xl border border-white/10 bg-black/20">
        <div class="flex items-center justify-between gap-3 border-b border-white/10 px-3.5 py-2.5">
          <span class="truncate text-[13px] font-bold text-white">
            mot {f.opponentName || f.opponent} <span class="font-normal text-[#AEB9CC]">({f.isHome ? "hjemme" : "borte"})</span>
          </span>
          <span class="shrink-0 text-xs text-[#AEB9CC]">{status(f)}</span>
        </div>
        {#if f.stats.length > 0}
          <table class="w-full text-[13px]">
            <tbody>
              {#each f.stats as s (s.identifier)}
                <tr class="border-b border-white/5 last:border-0">
                  <td class="px-3.5 py-2 text-[#E2E8F0]">{statLabel(s.identifier)}</td>
                  <td class="px-2 py-2 text-right font-mono tabular-nums text-[#AEB9CC]">{valueLabel(s.identifier, s.value)}</td>
                  <td class={`w-14 px-3.5 py-2 text-right font-mono font-bold tabular-nums ${s.points < 0 ? "text-[#FB6F84]" : s.points > 0 ? "text-[#9FE88D]" : "text-[#AEB9CC]"}`}>{signed(s.points)}</td>
                </tr>
              {/each}
            </tbody>
            {#if f.stats.length > 1}
              <tfoot>
                <tr class="border-t border-white/10 bg-white/[0.04]">
                  <td class="px-3.5 py-2 font-bold text-white" colspan="2">Sum kamp {i + 1}</td>
                  <td class="px-3.5 py-2 text-right font-mono font-bold tabular-nums text-white">{total}</td>
                </tr>
              </tfoot>
            {/if}
          </table>
        {:else}
          <p class="px-3.5 py-3 text-[13px] text-[#AEB9CC]">
            {f.started || f.finished ? "Ingen poeng registrert i denne kampen." : "Ikke spilt ennå."}
          </p>
        {/if}
      </div>
    {/each}
  </section>

  <!-- Sesongen -->
  {#if player.detail}
    <section class="space-y-2" aria-labelledby="sheet-season-title">
      <h4 id="sheet-season-title" class="text-sm font-bold text-white">Sesongen</h4>
      <PlayerDetail
        player={player.detail}
        clubName={player.clubName || player.club}
        {clubShort}
        embedded
      />
    </section>
  {/if}
</article>
