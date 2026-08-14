<script lang="ts">
  import { X, KeyRound, User, Mail, Shield, Check, AlertCircle } from "lucide-svelte";

  let {
    isOpen = false,
    rooms = [],
    onClose = () => {},
    onRegister = (data: any) => {},
  }: {
    isOpen?: boolean;
    rooms?: any[];
    onClose?: () => void;
    onRegister?: (data: any) => void;
  } = $props();

  let inviteCode = $state("");
  let username = $state("");
  let email = $state("");
  let fplTeamName = $state("");
  let fplManagerName = $state("");
  let fplEntryId = $state("");
  let preferredRoomId = $state("");
  let error = $state("");

  function handleSubmit() {
    if (!inviteCode.trim() || !username.trim() || !email.trim()) {
      error = "Vennligst fyll ut invitasjonskode, brukernavn og e-post.";
      return;
    }

    onRegister({
      inviteCode: inviteCode.trim(),
      username: username.trim(),
      email: email.trim(),
      fplTeamName: fplTeamName.trim() || undefined,
      fplManagerName: fplManagerName.trim() || undefined,
      fplEntryId: fplEntryId ? Number(fplEntryId) : undefined,
      preferredRoomId: preferredRoomId || undefined,
    });
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
    <div
      class="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-150"
    >
      <!-- Header -->
      <div class="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="p-2 rounded-lg bg-indigo-600/20 border border-indigo-500/40 text-indigo-400">
            <KeyRound class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-sm font-bold text-white">Bli med i Atlantasy</h2>
            <p class="text-xs text-slate-400">Registrer deg med invitasjonskode</p>
          </div>
        </div>

        <button
          onclick={onClose}
          class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Form -->
      <div class="p-5 space-y-3.5 overflow-y-auto flex-1 text-xs">
        {#if error}
          <div class="p-2.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 flex items-center gap-2">
            <AlertCircle class="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        {/if}

        <div>
          <label class="block font-semibold text-slate-300 mb-1">
            Invitasjonskode *
          </label>
          <input
            type="text"
            bind:value={inviteCode}
            placeholder="f.eks. ATLANTIS-2025"
            class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white uppercase focus:border-indigo-400 focus:outline-none"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block font-semibold text-slate-300 mb-1">Brukernavn *</label>
            <input
              type="text"
              bind:value={username}
              placeholder="f.eks. OlaN"
              class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-indigo-400 focus:outline-none"
            />
          </div>

          <div>
            <label class="block font-semibold text-slate-300 mb-1">E-post *</label>
            <input
              type="email"
              bind:value={email}
              placeholder="ola@bedrift.no"
              class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-indigo-400 focus:outline-none"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block font-semibold text-slate-300 mb-1">FPL Lagnavn</label>
            <input
              type="text"
              bind:value={fplTeamName}
              placeholder="f.eks. Klopps Disipler"
              class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-indigo-400 focus:outline-none"
            />
          </div>

          <div>
            <label class="block font-semibold text-slate-300 mb-1">FPL Team ID</label>
            <input
              type="number"
              bind:value={fplEntryId}
              placeholder="f.eks. 123456"
              class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-indigo-400 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label class="block font-semibold text-slate-300 mb-1">Ønsket Rom (Valgfritt)</label>
          <select
            bind:value={preferredRoomId}
            class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-indigo-400 focus:outline-none"
          >
            <option value="">Velg rom...</option>
            {#each rooms as r}
              <option value={r._id}>{r.name}</option>
            {/each}
          </select>
        </div>

        <button
          onclick={handleSubmit}
          class="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-lg mt-2"
        >
          Fullfør Registrering
        </button>
      </div>
    </div>
  </div>
{/if}
