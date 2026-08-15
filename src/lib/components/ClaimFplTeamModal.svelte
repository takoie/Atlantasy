<script lang="ts">
  import { X, Shirt, CheckCircle2, AlertTriangle, Search, Lock, RefreshCw } from "lucide-svelte";
  import { formatConvexError } from "$lib/utils/formatError";

  let {
    isOpen = false,
    currentUser = null,
    fplTeams = [],
    users = [],
    onClose = () => {},
    onClaim = async (_entryId?: any) => {},
    onRefreshFpl = async () => {},
  }: {
    isOpen: boolean;
    currentUser?: any;
    fplTeams?: any[];
    users?: any[];
    onClose: () => void;
    onClaim: (entryId: number) => Promise<any>;
    onRefreshFpl?: () => Promise<any>;
  } = $props();

  let selectedEntryId = $state<number | null>(null);
  let searchQuery = $state("");
  let isSubmitting = $state(false);
  let isSyncing = $state(false);
  let errorMessage = $state("");
  let showConfirmPrompt = $state(false);

  // Filtrer kun lag som ikke allerede er eid av en annen bruker
  let availableTeams = $derived(
    fplTeams
      .filter((t) => !users.some((u) => u.fplEntryId === t.entryId && u._id !== currentUser?._id))
      .filter((t) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        const tName = (t.teamName || "").toLowerCase();
        const mName = (t.managerName || "").toLowerCase();
        const entryStr = String(t.entryId || "");
        return tName.includes(q) || mName.includes(q) || entryStr.includes(q);
      })
  );

  let selectedTeamObj = $derived(
    fplTeams.find((t) => t.entryId === selectedEntryId)
  );

  async function handleConfirmClaim() {
    if (!selectedEntryId) {
      errorMessage = "Vennligst velg et FPL-lag fra listen.";
      return;
    }

    isSubmitting = true;
    errorMessage = "";

    try {
      await onClaim(selectedEntryId);
      showConfirmPrompt = false;
      onClose();
    } catch (err: any) {
      errorMessage = formatConvexError(err, "Kunne ikke koble FPL-laget.");
    } finally {
      isSubmitting = false;
    }
  }

  async function handleRefresh() {
    isSyncing = true;
    errorMessage = "";
    try {
      await onRefreshFpl();
    } catch (err: any) {
      errorMessage = formatConvexError(err, "Kunne ikke hente lag fra FPL.");
    } finally {
      isSyncing = false;
    }
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
    <div class="relative w-full max-w-md bg-[#242B35] border border-[#384252] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 px-5 border-b border-[#384252] bg-[#191E24]">
        <div class="flex items-center gap-2.5">
          <div class="p-2 rounded-xl bg-[#70E1F8]/10 text-[#70E1F8] border border-[#70E1F8]/30">
            <Shirt class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-white">Koble ditt FPL-lag</h3>
            <p class="text-[11px] text-[#94A3B8]">Velg laget ditt i Fantasy Premier League</p>
          </div>
        </div>
        <button
          onclick={onClose}
          class="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#2A303C] transition-colors"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Innhold -->
      <div class="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
        <!-- Advarselsbanner om låsing -->
        <div class="p-3 rounded-xl bg-[#F4C152]/10 border border-[#F4C152]/30 text-xs text-[#F4C152] flex items-start gap-2.5">
          <Lock class="w-4 h-4 shrink-0 mt-0.5" />
          <p class="text-[11px] leading-relaxed text-[#E2E8F0]">
            <strong class="text-[#F4C152]">Viktig:</strong> Når du kobler til laget ditt, <span class="underline">låses</span> valget til din konto. Kun administrator kan endre eller frakoble laget ditt i ettertid.
          </p>
        </div>

        {#if errorMessage}
          <div class="p-3 rounded-xl bg-[#FB6F84]/15 border border-[#FB6F84]/40 text-[#FB6F84] text-xs font-semibold flex items-center gap-2">
            <AlertTriangle class="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        {/if}

        <!-- Søkefelt og Oppdateringsknapp -->
        <div class="flex items-center gap-2">
          <div class="relative flex-1">
            <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              bind:value={searchQuery}
              placeholder="Søk etter lagnavn, manager eller entry ID..."
              class="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#191E24] border border-[#384252] text-xs text-white placeholder-[#94A3B8] focus:border-[#9FE88D] focus:outline-none"
            />
          </div>
          <button
            type="button"
            disabled={isSyncing}
            onclick={handleRefresh}
            title="Synkroniser og oppdater laglisten direkte fra FPL"
            class="p-2.5 rounded-xl bg-[#191E24] hover:bg-[#2A303C] border border-[#384252] hover:border-[#70E1F8]/50 text-[#70E1F8] transition-colors shrink-0"
          >
            <RefreshCw class={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
          </button>
        </div>

        <!-- Lagliste -->
        <div class="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
          {#if availableTeams.length === 0}
            <div class="p-4 rounded-xl bg-[#191E24] border border-[#384252] text-center space-y-3">
              <p class="text-xs text-[#94A3B8]">
                {fplTeams.length === 0 ? "Ingen lag er synkronisert fra FPL ennå." : "Ingen ledige lag matcher søket ditt."}
              </p>
              <button
                type="button"
                disabled={isSyncing}
                onclick={handleRefresh}
                class="px-3.5 py-2 rounded-xl bg-[#70E1F8]/15 hover:bg-[#70E1F8]/25 text-[#70E1F8] border border-[#70E1F8]/40 text-xs font-bold transition-colors inline-flex items-center gap-1.5"
              >
                <RefreshCw class={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                <span>{isSyncing ? "Synker fra FPL..." : "Synk lag fra FPL nå"}</span>
              </button>
            </div>
          {:else}
            {#each availableTeams as team (team.entryId)}
              {@const isSelected = selectedEntryId === team.entryId}
              <button
                type="button"
                onclick={() => (selectedEntryId = team.entryId)}
                class={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                  isSelected
                    ? "bg-[#9FE88D]/15 border-[#9FE88D] text-white shadow-sm"
                    : "bg-[#191E24] border-[#384252] text-[#94A3B8] hover:border-[#94A3B8]/60 hover:text-white"
                }`}
              >
                <div>
                  <span class={`text-xs font-bold block ${isSelected ? "text-[#9FE88D]" : "text-white"}`}>
                    {team.teamName}
                  </span>
                  <span class="text-[11px] text-[#94A3B8]">
                    Manager: {team.managerName}
                  </span>
                </div>
                {#if isSelected}
                  <CheckCircle2 class="w-4 h-4 text-[#9FE88D]" />
                {/if}
              </button>
            {/each}
          {/if}
        </div>
      </div>

      <!-- Footer -->
      <div class="p-4 border-t border-[#384252] bg-[#191E24] flex items-center justify-between gap-3">
        <button
          type="button"
          onclick={onClose}
          class="px-4 py-2 rounded-xl bg-[#2A303C] hover:bg-[#384252] text-xs font-semibold text-[#94A3B8] hover:text-white transition-colors"
        >
          Avbryt
        </button>

        <button
          type="button"
          disabled={!selectedEntryId || isSubmitting}
          onclick={() => {
            if (!showConfirmPrompt) {
              showConfirmPrompt = true;
            } else {
              handleConfirmClaim();
            }
          }}
          class="px-5 py-2.5 rounded-xl bg-[#9FE88D] hover:bg-[#8ce078] disabled:opacity-50 text-[#16380c] font-bold text-xs transition-colors shadow-md flex items-center gap-1.5"
        >
          {#if isSubmitting}
            <span>Låser lag...</span>
          {:else if showConfirmPrompt}
            <span>Er du sikker? Klikk for å låse</span>
          {:else}
            <Lock class="w-3.5 h-3.5" />
            <span>Koble {selectedTeamObj?.teamName || "lag"}</span>
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}
