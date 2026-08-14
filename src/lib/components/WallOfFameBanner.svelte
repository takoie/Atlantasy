<script lang="ts">
  import { Crown, Sparkles, ChevronRight, X, Megaphone, Flame } from "lucide-svelte";

  let {
    announcement,
    onSelectRoom = (_roomId: string) => {},
  }: {
    announcement: any;
    onSelectRoom?: (roomId: string) => void;
  } = $props();

  let isDismissed = $state(false);

  let isIndividual = $derived(
    announcement?.type === "individual_winner" || announcement?.winnerType === "individual"
  );
</script>

{#if announcement && !isDismissed}
  <div
    class="relative overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-purple-950/30 to-slate-900/60 p-3.5 shadow-lg backdrop-blur-md transition-all duration-300 shrink-0"
  >
    <!-- Bakgrunns-glow -->
    <div
      class="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-500/10 blur-2xl"
    ></div>

    <div class="flex items-start justify-between gap-4">
      <div class="flex items-start gap-3">
        <!-- Vinnerikon / Pokal -->
        <div
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20"
        >
          {#if isIndividual}
            <Crown class="h-5 w-5 fill-slate-950 text-slate-950" />
          {:else if announcement.type === "winner_celebration"}
            <Crown class="h-5 w-5 fill-slate-950 text-slate-950" />
          {:else}
            <Megaphone class="h-5 w-5 text-slate-950" />
          {/if}
        </div>

        <div>
          <div class="flex flex-wrap items-center gap-2">
            <span
              class="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300 border border-amber-500/30 flex items-center gap-1"
            >
              <Sparkles class="h-3 w-3" />
              {isIndividual ? "SKRYTEVEGG • INDIVIDUELL VINNER" : "SKRYTEVEGG • VINNERROM"}
            </span>
            <span class="text-xs font-semibold text-amber-200/90">
              {announcement.title}
            </span>
          </div>

          <p class="mt-1 text-xs text-slate-300 leading-relaxed max-w-4xl">
            {announcement.content}
          </p>

          {#if announcement.winningRoom}
            <div class="mt-2 flex items-center gap-3">
              <button
                onclick={() => onSelectRoom(announcement.winningRoom._id)}
                class="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/20 px-2.5 py-1 text-[11px] font-semibold text-amber-300 hover:bg-amber-500/30 transition-colors border border-amber-500/40"
              >
                <Flame class="h-3.5 w-3.5 text-amber-400" />
                <span>Se {announcement.winningRoom.name}</span>
                <ChevronRight class="h-3.5 w-3.5" />
              </button>
            </div>
          {/if}
        </div>
      </div>

      <!-- Lukk / Skjul banner -->
      <button
        onclick={() => (isDismissed = true)}
        title="Skjul banner for nå"
        class="rounded p-1 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 transition-colors shrink-0"
      >
        <X class="h-4 w-4" />
      </button>
    </div>
  </div>
{/if}
