<script lang="ts">
  import { Send, ShieldAlert, Sparkles, AlertCircle, Info, MessageSquare } from "lucide-svelte";
  import { useMutation } from "$lib/convex.svelte";
  import { api } from "../../../convex/_generated/api";

  let tittel = $state("");
  let innhold = $state("");
  let type = $state<"info" | "varsel" | "chat">("info");
  let erAdminMelding = $state(false);
  let statusMelding = $state<{ text: string; error?: boolean } | null>(null);

  // Svelte 5 derived state
  let canSubmit = $derived(innhold.trim().length > 0);

  const sendMutation = useMutation(api.meldinger.sendMelding);

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      await sendMutation.mutate({
        tittel: tittel.trim() ? tittel.trim() : undefined,
        innhold: innhold.trim(),
        type,
        erAdminMelding,
      });

      // Nullstill input
      tittel = "";
      innhold = "";
      statusMelding = { text: "Melding publisert til sanntidsdatabase!" };
      setTimeout(() => {
        statusMelding = null;
      }, 3000);
    } catch (err: any) {
      statusMelding = {
        text: `Feil ved sending: ${err?.message || "Ukjent feil"}`,
        error: true,
      };
    }
  }
</script>

<div class="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-xl backdrop-blur">
  <div class="flex items-center justify-between mb-4">
    <div class="flex items-center gap-2">
      <div class="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
        <Sparkles class="w-4 h-4" />
      </div>
      <h2 class="text-sm font-semibold text-white">Opprett ny melding / testdata</h2>
    </div>
    <span class="text-[11px] text-slate-400 font-mono">Convex Mutation</span>
  </div>

  <form onsubmit={handleSubmit} class="space-y-4">
    <!-- Type velger -->
    <div>
      <label class="block text-xs font-medium text-slate-300 mb-1.5">Meldingstype</label>
      <div class="grid grid-cols-3 gap-2">
        <button
          type="button"
          onclick={() => (type = "info")}
          class="flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium border transition-all {type === 'info'
            ? 'bg-blue-500/20 border-blue-500/50 text-blue-300 shadow-sm shadow-blue-500/20'
            : 'bg-slate-800/40 border-slate-700/50 text-slate-400 hover:bg-slate-800 hover:text-slate-200'}"
        >
          <Info class="w-3.5 h-3.5 text-blue-400" />
          <span>Info</span>
        </button>

        <button
          type="button"
          onclick={() => (type = "varsel")}
          class="flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium border transition-all {type === 'varsel'
            ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-sm shadow-amber-500/20'
            : 'bg-slate-800/40 border-slate-700/50 text-slate-400 hover:bg-slate-800 hover:text-slate-200'}"
        >
          <AlertCircle class="w-3.5 h-3.5 text-amber-400" />
          <span>Varsel</span>
        </button>

        <button
          type="button"
          onclick={() => (type = "chat")}
          class="flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium border transition-all {type === 'chat'
            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-sm shadow-emerald-500/20'
            : 'bg-slate-800/40 border-slate-700/50 text-slate-400 hover:bg-slate-800 hover:text-slate-200'}"
        >
          <MessageSquare class="w-3.5 h-3.5 text-emerald-400" />
          <span>Chat</span>
        </button>
      </div>
    </div>

    <!-- Tittel input -->
    <div>
      <label for="tittel" class="block text-xs font-medium text-slate-300 mb-1">
        Tittel <span class="text-slate-500 font-normal">(valgfritt)</span>
      </label>
      <input
        id="tittel"
        type="text"
        bind:value={tittel}
        placeholder="F.eks. Systemoppdatering fullført"
        class="w-full bg-slate-950/70 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
      />
    </div>

    <!-- Innhold textarea -->
    <div>
      <label for="innhold" class="block text-xs font-medium text-slate-300 mb-1">
        Innhold <span class="text-rose-400">*</span>
      </label>
      <textarea
        id="innhold"
        bind:value={innhold}
        rows="3"
        placeholder="Skriv meldingsteksten her..."
        class="w-full bg-slate-950/70 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all resize-none"
      ></textarea>
    </div>

    <!-- Admin toggle checkbox -->
    <div class="flex items-center justify-between pt-1">
      <label class="flex items-center gap-2 cursor-pointer group">
        <input
          type="checkbox"
          bind:checked={erAdminMelding}
          class="w-4 h-4 rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-indigo-500/40 focus:ring-offset-0 transition"
        />
        <span class="text-xs text-slate-300 group-hover:text-white transition-colors flex items-center gap-1.5">
          <ShieldAlert class="w-3.5 h-3.5 {erAdminMelding ? 'text-indigo-400' : 'text-slate-500'}" />
          Merk som admin-melding
        </span>
      </label>

      <!-- Send knapp -->
      <button
        type="submit"
        disabled={!canSubmit || sendMutation.isPending}
        class="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98]"
      >
        <Send class="w-3.5 h-3.5" />
        <span>{sendMutation.isPending ? "Sender..." : "Send melding"}</span>
      </button>
    </div>

    {#if statusMelding}
      <div
        class="p-2.5 rounded-lg text-xs {statusMelding.error
          ? 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
          : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'}"
      >
        {statusMelding.text}
      </div>
    {/if}
  </form>
</div>
