<script lang="ts">
  import { X, KeyRound, AlertCircle } from "lucide-svelte";

  let {
    isOpen = false,
    rooms = [],
    onClose = () => {},
    onRegister = (_data: any) => {},
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
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 text-[#E2E8F0] font-sans">
    <div
      class="w-full max-w-md bg-[#2A303C] border border-[#384252] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-150"
    >
      <!-- Header -->
      <div class="p-4 border-b border-[#384252] bg-[#191E24] flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="p-2 rounded-lg bg-[#9FE88D]/15 border border-[#9FE88D]/30 text-[#9FE88D]">
            <KeyRound class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-sm font-bold text-white">Bli med i Atlantasy</h2>
            <p class="text-xs text-[#94A3B8]">Registrer deg med invitasjonskode</p>
          </div>
        </div>

        <button
          onclick={onClose}
          class="p-1.5 rounded-lg bg-[#242B35] hover:bg-[#384252] text-[#94A3B8] hover:text-white transition-colors"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Form -->
      <div class="p-5 overflow-y-auto space-y-3.5 flex-1 custom-scrollbar">
        {#if error}
          <div class="p-3 rounded-lg bg-[#FB6F84]/15 border border-[#FB6F84]/40 text-[#FB6F84] text-xs font-semibold flex items-center gap-2">
            <AlertCircle class="w-4 h-4" />
            <span>{error}</span>
          </div>
        {/if}

        <div>
          <label for="reg-code" class="block text-xs font-bold text-white mb-1">Invitasjonskode *</label>
          <input
            id="reg-code"
            type="text"
            bind:value={inviteCode}
            placeholder="f.eks. ATL-2025"
            class="w-full px-3 py-2 text-xs rounded-xl bg-[#191E24] border border-[#384252] text-white uppercase focus:border-[#9FE88D] focus:outline-none font-mono"
          />
        </div>

        <div>
          <label for="reg-user" class="block text-xs font-bold text-white mb-1">Brukernavn *</label>
          <input
            id="reg-user"
            type="text"
            bind:value={username}
            placeholder="f.eks. Ola Nordmann"
            class="w-full px-3 py-2 text-xs rounded-xl bg-[#191E24] border border-[#384252] text-white focus:border-[#9FE88D] focus:outline-none"
          />
        </div>

        <div>
          <label for="reg-email" class="block text-xs font-bold text-white mb-1">E-postadresse *</label>
          <input
            id="reg-email"
            type="email"
            bind:value={email}
            placeholder="ola@bedrift.no"
            class="w-full px-3 py-2 text-xs rounded-xl bg-[#191E24] border border-[#384252] text-white focus:border-[#9FE88D] focus:outline-none"
          />
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label for="reg-team" class="block text-xs font-bold text-white mb-1">FPL-lagnavn</label>
            <input
              id="reg-team"
              type="text"
              bind:value={fplTeamName}
              placeholder="f.eks. Haaland XI"
              class="w-full px-3 py-2 text-xs rounded-xl bg-[#191E24] border border-[#384252] text-white focus:border-[#9FE88D] focus:outline-none"
            />
          </div>

          <div>
            <label for="reg-manager" class="block text-xs font-bold text-white mb-1">FPL-manager</label>
            <input
              id="reg-manager"
              type="text"
              bind:value={fplManagerName}
              placeholder="Ola N."
              class="w-full px-3 py-2 text-xs rounded-xl bg-[#191E24] border border-[#384252] text-white focus:border-[#9FE88D] focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label for="reg-room" class="block text-xs font-bold text-white mb-1">Ønsket rom</label>
          <select
            id="reg-room"
            bind:value={preferredRoomId}
            class="w-full px-3 py-2 text-xs rounded-xl bg-[#191E24] border border-[#384252] text-white focus:border-[#9FE88D] focus:outline-none"
          >
            <option value="">Ingen preferanse / fordeles av admin</option>
            {#each rooms as room}
              <option value={room._id}>{room.name}</option>
            {/each}
          </select>
        </div>

        <button
          onclick={handleSubmit}
          class="w-full py-2.5 rounded-xl bg-[#9FE88D] hover:bg-[#8ce078] text-[#16380c] font-bold text-xs transition-colors shadow-md mt-2"
        >
          Fullfør Registrering
        </button>
      </div>
    </div>
  </div>
{/if}
