<script lang="ts">
  import {
    Trophy,
    KeyRound,
    AlertCircle,
    ArrowRight,
    Users,
    Lock,
    Sparkles,
  } from "lucide-svelte";

  let {
    rooms = [],
    fplTeams = [],
    users = [],
    onComplete = (_userId: string, _userData: any) => {},
    onLoginOrRegister = async (_data: any): Promise<{ userId: string; role: string; isNew?: boolean }> => {
      return { userId: "", role: "user" };
    },
  }: {
    rooms?: any[];
    fplTeams?: any[];
    users?: any[];
    onComplete?: (userId: string, userData: any) => void;
    onLoginOrRegister?: (data: any) => Promise<{ userId: string; role: string; isNew?: boolean }>;
  } = $props();

  let mode = $state<"register" | "login">("register");
  let username = $state("");
  let password = $state("");
  let inviteCode = $state("");
  let selectedFplEntryId = $state<number | null>(null);
  let selectedRoomId = $state("");
  let customRoomNickname = $state("");
  let errorMessage = $state("");
  let isSubmitting = $state(false);

  // Filtrer ut lag som allerede er registrert av en eksisterende bruker
  let availableFplTeams = $derived(
    fplTeams.filter((team) => !users.some((u) => u.fplEntryId === team.entryId))
  );

  // Finn ut hvilket rom som er valgt for å sjekke om det er første person
  let selectedRoom = $derived(rooms.find((r) => r._id === selectedRoomId));
  let isFirstInRoom = $derived(
    selectedRoom ? (!selectedRoom.teams || selectedRoom.teams.length === 0 || !selectedRoom.name.includes(" - ")) : false
  );

  // Finn valgt FPL-lag
  let selectedTeamObj = $derived(
    fplTeams.find((t) => t.entryId === selectedFplEntryId)
  );

  async function handleSubmit() {
    if (!username.trim() || !password.trim()) {
      errorMessage = "Vennligst oppgi både brukernavn og passord.";
      return;
    }

    if (mode === "register" && !selectedRoomId && rooms.length > 0) {
      selectedRoomId = rooms[0]._id;
    }

    isSubmitting = true;
    errorMessage = "";

    try {
      const res = await onLoginOrRegister({
        username: username.trim(),
        password: password.trim(),
        inviteCode: mode === "register" ? (inviteCode.trim().toUpperCase() || undefined) : undefined,
        fplEntryId: selectedFplEntryId ?? undefined,
        fplTeamName: selectedTeamObj?.teamName || undefined,
        fplManagerName: selectedTeamObj?.managerName || username.trim(),
        preferredRoomId: selectedRoomId || undefined,
        customRoomNickname: customRoomNickname.trim() || undefined,
      });

      if (res && res.userId) {
        onComplete(res.userId, {
          username: username.trim(),
          role: res.role || "user",
          roomId: selectedRoomId,
          fplTeamName: selectedTeamObj?.teamName,
        });
      }
    } catch (err: any) {
      errorMessage = err.message || "Noe gikk galt under innlogging eller registrering.";
    } finally {
      isSubmitting = false;
    }
  }
</script>

<div
  class="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none overflow-y-auto"
>
  <div
    class="relative w-full max-w-lg bg-[#2A303C] border border-[#384252] rounded-2xl shadow-2xl p-6 md:p-8 space-y-5 my-auto text-[#E2E8F0] font-sans"
  >
    <!-- Logo & Tittel -->
    <div class="text-center space-y-1.5">
      <div
        class="inline-flex w-12 h-12 rounded-xl bg-[#9FE88D] items-center justify-center text-[#16380c] font-black shadow-sm mb-1"
      >
        <Trophy class="w-6 h-6 text-[#16380c]" />
      </div>
      <h1 class="text-2xl font-black text-white tracking-wide">
        Velkommen til <span class="text-[#9FE88D]">Atlantasy</span>
      </h1>
      <p class="text-xs text-[#94A3B8] max-w-sm mx-auto leading-relaxed">
        Den interne FPL-bedriftsligaen. Velg ditt lag og rom for å bli med.
      </p>
    </div>

    <!-- Modusvelger (Ny spiller / Logg inn) -->
    <div class="grid grid-cols-2 gap-1 p-1 bg-[#191E24] rounded-xl border border-[#384252] text-xs font-semibold">
      <button
        onclick={() => {
          mode = "register";
          errorMessage = "";
        }}
        class={`py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
          mode === "register"
            ? "bg-[#9FE88D] text-[#16380c] font-bold shadow-sm"
            : "text-[#94A3B8] hover:text-white"
        }`}
      >
        <span>Ny spiller (registrer)</span>
      </button>

      <button
        onclick={() => {
          mode = "login";
          errorMessage = "";
        }}
        class={`py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
          mode === "login"
            ? "bg-[#9FE88D] text-[#16380c] font-bold shadow-sm"
            : "text-[#94A3B8] hover:text-white"
        }`}
      >
        <span>Logg inn</span>
      </button>
    </div>

    <!-- Feilmelding -->
    {#if errorMessage}
      <div
        class="p-3 rounded-lg bg-[#FB6F84]/15 border border-[#FB6F84]/30 text-[#FB6F84] text-xs font-medium flex items-center gap-2"
      >
        <AlertCircle class="w-4 h-4 shrink-0" />
        <span>{errorMessage}</span>
      </div>
    {/if}

    <!-- Skjema -->
    <div class="space-y-3.5 text-xs">
      <!-- 1. Brukernavn & Passord -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label for="onboard-username" class="block font-semibold text-[#E2E8F0] mb-1">Ditt navn eller brukernavn *</label>
          <input
            id="onboard-username"
            type="text"
            bind:value={username}
            placeholder="F.eks. Stian"
            class="w-full px-3 py-2 rounded-lg bg-[#191E24] border border-[#384252] text-white focus:border-[#9FE88D] focus:outline-none"
          />
        </div>

        <div>
          <label for="onboard-password" class="block font-semibold text-[#E2E8F0] mb-1 flex items-center gap-1">
            <Lock class="w-3 h-3 text-[#94A3B8]" />
            <span>Passord *</span>
          </label>
          <input
            id="onboard-password"
            type="password"
            bind:value={password}
            onkeydown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Noe helt enkelt, en pin eller noe.."
            class="w-full px-3 py-2 rounded-lg bg-[#191E24] border border-[#384252] text-white focus:border-[#9FE88D] focus:outline-none"
          />
        </div>
      </div>

      {#if mode === "register"}
        <!-- 2. Invitasjonskode -->
        <div>
          <label for="onboard-invite" class="block font-semibold text-[#E2E8F0] mb-1 flex items-center gap-1.5">
            <KeyRound class="w-3.5 h-3.5 text-[#9FE88D]" />
            <span>Invitasjonskode</span>
          </label>
          <input
            id="onboard-invite"
            type="text"
            bind:value={inviteCode}
            placeholder="Kode får du av Stian"
            class="w-full px-3 py-2 rounded-lg bg-[#191E24] border border-[#384252] text-white font-mono uppercase focus:border-[#9FE88D] focus:outline-none"
          />
        </div>

        <!-- 3. Velg FPL-lag fra listen -->
        <div>
          <label for="onboard-fpl-team" class="block font-semibold text-[#E2E8F0] mb-1">
            Hvilket lag er ditt i FPL-ligaen?
          </label>
          <select
            id="onboard-fpl-team"
            bind:value={selectedFplEntryId}
            class="w-full px-3 py-2 rounded-lg bg-[#191E24] border border-[#384252] text-white focus:border-[#9FE88D] focus:outline-none"
          >
            <option value={null}>Velg ditt lag fra FPL-listen...</option>
            {#each availableFplTeams as team (team.entryId)}
              <option value={team.entryId}>
                {team.teamName} ({team.managerName})
              </option>
            {/each}
          </select>
        </div>

        <!-- 4. Velg Rom A1–A12 -->
        <div>
          <label for="onboard-room" class="block font-semibold text-[#E2E8F0] mb-1 flex items-center gap-1.5">
            <Users class="w-3.5 h-3.5 text-[#9FE88D]" />
            <span>Velg ditt rom (A1–A12)</span>
          </label>
          <select
            id="onboard-room"
            bind:value={selectedRoomId}
            class="w-full px-3 py-2 rounded-lg bg-[#191E24] border border-[#384252] text-white focus:border-[#9FE88D] focus:outline-none"
          >
            <option value="">Velg rom...</option>
            {#each rooms as room}
              <option value={room._id}>
                {room.name} ({room.teams?.length || 0} spillere)
              </option>
            {/each}
          </select>
        </div>

        <!-- 5. Kallenavn for rom hvis første person -->
        {#if selectedRoomId && isFirstInRoom}
          <div class="p-3.5 rounded-xl bg-[#9FE88D]/10 border border-[#9FE88D]/30 space-y-1.5 animate-in fade-in duration-150">
            <div class="flex items-center gap-1.5 text-[#9FE88D] font-bold">
              <Sparkles class="w-3.5 h-3.5" />
              <span>Du er første person i dette rommet!</span>
            </div>
            <p class="text-[11px] text-[#94A3B8]">
              Bestem et valgfritt navn for rommet:
            </p>
            <div class="flex items-center gap-2">
              <span class="font-mono font-bold text-[#9FE88D] text-sm">
                A{selectedRoom?.roomNumber || 1} -
              </span>
              <input
                type="text"
                bind:value={customRoomNickname}
                placeholder="f.eks. Romnavn"
                class="flex-1 px-3 py-1.5 rounded-lg bg-[#191E24] border border-[#9FE88D]/40 text-white text-xs focus:border-[#9FE88D] focus:outline-none"
              />
            </div>
          </div>
        {/if}
      {/if}

      <!-- Innsendingsknapp -->
      <button
        onclick={handleSubmit}
        disabled={isSubmitting}
        class="w-full py-2.5 rounded-xl bg-[#9FE88D] hover:bg-[#8ce078] disabled:opacity-50 text-[#16380c] font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-2 mt-4"
      >
        <span>
          {#if isSubmitting}
            Vennligst vent...
          {:else if mode === "register"}
            Bli med i ligaen
          {:else}
            Logg inn på kontoen
          {/if}
        </span>
        <ArrowRight class="w-4 h-4" />
      </button>
    </div>
  </div>
</div>
