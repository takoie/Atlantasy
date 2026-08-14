<script lang="ts">
  import {
    Info,
    AlertCircle,
    MessageSquare,
    Trash2,
    Shield,
    Clock,
    Filter,
    Inbox,
    Loader2
  } from "lucide-svelte";
  import { useMutation } from "$lib/convex.svelte";
  import { api } from "../../../convex/_generated/api";
  import type { Id } from "../../../convex/_generated/dataModel";

  interface Melding {
    _id: Id<"meldinger">;
    tittel?: string;
    innhold: string;
    type: string;
    opprettetDato: number;
    erAdminMelding: boolean;
  }

  let {
    meldinger = [],
    isLoading = false,
  }: {
    meldinger?: Melding[];
    isLoading?: boolean;
  } = $props();

  let filterType = $state<string>("alle");
  let kunAdmin = $state(false);
  let sokeTekst = $state("");

  const slettMutation = useMutation(api.meldinger.slettMelding);

  // Svelte 5 Runes: $derived for reaktiv filtrering
  let filtrerteMeldinger = $derived(
    meldinger.filter((m) => {
      const matcherType = filterType === "alle" || m.type === filterType;
      const matcherAdmin = !kunAdmin || m.erAdminMelding;
      const matcherSok =
        !sokeTekst.trim() ||
        m.innhold.toLowerCase().includes(sokeTekst.toLowerCase()) ||
        (m.tittel && m.tittel.toLowerCase().includes(sokeTekst.toLowerCase()));
      return matcherType && matcherAdmin && matcherSok;
    })
  );

  async function handleSlett(id: Id<"meldinger">) {
    try {
      await slettMutation.mutate({ id });
    } catch (e) {
      console.error("Feil ved sletting av melding:", e);
    }
  }

  function formaterDato(timestamp: number) {
    return new Intl.DateTimeFormat("no-NO", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      day: "2-digit",
      month: "short",
    }).format(new Date(timestamp));
  }
</script>

<div class="flex flex-col h-full bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden backdrop-blur">
  <!-- Topp-kontroller & Filterlinje -->
  <div class="p-4 border-b border-slate-800 bg-slate-900/60 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
    <div class="flex items-center gap-2">
      <Filter class="w-4 h-4 text-slate-400" />
      <span class="text-xs font-semibold text-slate-200">Sanntidsstrøm</span>
      <span class="px-2 py-0.5 rounded-full text-[11px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
        {filtrerteMeldinger.length} / {meldinger.length}
      </span>
    </div>

    <!-- Filter chips -->
    <div class="flex flex-wrap items-center gap-2 w-full sm:w-auto">
      <input
        type="text"
        placeholder="Søk i meldinger..."
        bind:value={sokeTekst}
        class="bg-slate-950/70 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full sm:w-36"
      />

      <select
        bind:value={filterType}
        class="bg-slate-950/70 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
      >
        <option value="alle">Alle typer</option>
        <option value="info">Info</option>
        <option value="varsel">Varsel</option>
        <option value="chat">Chat</option>
      </select>

      <button
        onclick={() => (kunAdmin = !kunAdmin)}
        class="px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 {kunAdmin
          ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200'
          : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200'}"
      >
        <Shield class="w-3 h-3" />
        <span>Admin</span>
      </button>
    </div>
  </div>

  <!-- Meldingsliste -->
  <div class="flex-1 overflow-y-auto p-4 space-y-3">
    {#if isLoading}
      <div class="flex flex-col items-center justify-center h-48 text-slate-400 gap-3">
        <Loader2 class="w-6 h-6 animate-spin text-indigo-400" />
        <span class="text-xs">Laster meldinger fra Convex...</span>
      </div>
    {:else if filtrerteMeldinger.length === 0}
      <div class="flex flex-col items-center justify-center h-56 text-slate-500 gap-3 border border-dashed border-slate-800 rounded-xl p-8 text-center">
        <div class="w-12 h-12 rounded-full bg-slate-800/40 flex items-center justify-center">
          <Inbox class="w-6 h-6 text-slate-500" />
        </div>
        <div>
          <p class="text-sm font-medium text-slate-300">Ingen meldinger funnet</p>
          <p class="text-xs text-slate-500 mt-1">Bruk panelet til venstre for å publisere en melding.</p>
        </div>
      </div>
    {:else}
      {#each filtrerteMeldinger as melding (melding._id)}
        <div
          class="group relative bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 rounded-xl p-4 transition-all duration-200 hover:shadow-lg hover:shadow-indigo-950/20"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-start gap-3">
              <!-- Type Icon -->
              <div class="mt-0.5">
                {#if melding.type === "info"}
                  <div class="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <Info class="w-4 h-4" />
                  </div>
                {:else if melding.type === "varsel"}
                  <div class="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <AlertCircle class="w-4 h-4" />
                  </div>
                {:else}
                  <div class="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <MessageSquare class="w-4 h-4" />
                  </div>
                {/if}
              </div>

              <!-- Content -->
              <div class="space-y-1">
                <div class="flex items-center gap-2 flex-wrap">
                  {#if melding.tittel}
                    <h3 class="text-xs font-semibold text-white tracking-wide">
                      {melding.tittel}
                    </h3>
                  {/if}

                  <span
                    class="text-[10px] font-medium uppercase px-2 py-0.5 rounded-full {melding.type === 'info'
                      ? 'bg-blue-950 text-blue-300 border border-blue-800/50'
                      : melding.type === 'varsel'
                      ? 'bg-amber-950 text-amber-300 border border-amber-800/50'
                      : 'bg-emerald-950 text-emerald-300 border border-emerald-800/50'}"
                  >
                    {melding.type}
                  </span>

                  {#if melding.erAdminMelding}
                    <span class="inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/50">
                      <Shield class="w-2.5 h-2.5" />
                      Admin
                    </span>
                  {/if}
                </div>

                <p class="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap select-text">
                  {melding.innhold}
                </p>
              </div>
            </div>

            <!-- Handlinger & Tidsstempel -->
            <div class="flex items-center gap-2 shrink-0">
              <div class="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                <Clock class="w-3 h-3" />
                <span>{formaterDato(melding.opprettetDato)}</span>
              </div>

              <!-- Sletteknapp -->
              <button
                onclick={() => handleSlett(melding._id)}
                title="Slett melding"
                class="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition-all"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>
