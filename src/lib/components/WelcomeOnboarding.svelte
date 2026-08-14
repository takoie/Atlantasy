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
    onComplete = (_userId: string, _userData: any) => {},
    onAdminBypass = () => {},
    onLoginOrRegister = async (_data: any): Promise<{ userId: string; role: string; isNew?: boolean }> => {
      return { userId: "", role: "user" };
    },
  }: {
    rooms?: any[];
    fplTeams?: any[];
    onComplete?: (userId: string, userData: any) => void;
    onAdminBypass?: () => void;
    onLoginOrRegister?: (data: any) => Promise<{ userId: string; role: string; isNew?: boolean }>;
  } = $props();

  let mode = $state<"register" | "login">("register");
  let username = $state("");
  let password = $state("");
  let inviteCode = $state("ATLANTIS-2025");
  let selectedFplEntryId = $state<number | null>(null);
  let selectedRoomId = $state("");
  let customRoomNickname = $state("");
  let errorMessage = $state("");
  let isSubmitting = $state(false);

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
        inviteCode: mode === "register" ? inviteCode.trim().toUpperCase() : undefined,
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
  class="fixed inset-0 z-50 bg-[#0f172a] flex items-center justify-center p-4 select-none overflow-y-auto"
>
  <div
    class="relative w-full max-w-lg bg-slate-900 border border-slate-750 rounded-2xl shadow-soft p-6 md:p-8 space-y-5 my-auto"
  >
    <!-- Logo & Tittel -->
    <div class="text-center space-y-1.5">
      <div
        class="inline-flex w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 items-center justify-center text-slate-950 font-black shadow-sm mb-1"
      >
        <Trophy class="w-6 h-6 text-slate-950" />
      </div>
      <h1 class="text-2xl font-black text-white tracking-wide">
        Velkommen til <span class="text-emerald-400">Atlantasy</span>
      </h1>
      <p class="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
        Den interne FPL-bedriftsligaen. Velg ditt lag og rom for å bli med.
      </p>
    </div>

    <!-- Modusvelger (Ny spiller / Logg inn) -->
    <div class="grid grid-cols-2 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-semibold">
      <button
        onclick={() => {
          mode = "register";
          errorMessage = "";
        }}
        class={`py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
          mode === "register"
            ? "bg-emerald-500 text-slate-950 font-bold shadow-sm"
            : "text-slate-400 hover:text-white"
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
            ? "bg-emerald-500 text-slate-950 font-bold shadow-sm"
            : "text-slate-400 hover:text-white"
        }`}
      >
        <span>Logg inn</span>
      </button>
    </div>

    <!-- Feilmelding -->
    {#if errorMessage}
      <div
        class="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-2"
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
          <label for="onboard-username" class="block font-semibold text-slate-300 mb-1">Ditt navn eller brukernavn *</label>
          <input
            id="onboard-username"
            type="text"
            bind:value={username}
            placeholder="f.eks. Ola Nordmann"
            class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div>
          <label for="onboard-password" class="block font-semibold text-slate-300 mb-1 flex items-center gap-1">
            <Lock class="w-3 h-3 text-slate-400" />
            <span>Passord *</span>
          </label>
          <input
            id="onboard-password"
            type="password"
            bind:value={password}
            onkeydown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Valgfritt passord"
            class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {#if mode === "register"}
        <!-- 2. Invitasjonskode -->
        <div>
          <label for="onboard-invite" class="block font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
            <KeyRound class="w-3.5 h-3.5 text-emerald-400" />
            <span>Invitasjonskode</span>
          </label>
          <input
            id="onboard-invite"
            type="text"
            bind:value={inviteCode}
            placeholder="f.eks. ATLANTIS-2025"
            class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono uppercase focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <!-- 3. Velg FPL-lag fra listen -->
        <div>
          <label for="onboard-fpl-team" class="block font-semibold text-slate-300 mb-1">
            Hvilket lag er ditt i FPL-ligaen?
          </label>
          <select
            id="onboard-fpl-team"
            bind:value={selectedFplEntryId}
            class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-emerald-500 focus:outline-none"
          >
            <option value={null}>Velg ditt lag fra FPL-listen...</option>
            {#each fplTeams as team (team.entryId)}
              <option value={team.entryId}>
                {team.teamName} ({team.managerName})
              </option>
            {/each}
          </select>
        </div>

        <!-- 4. Velg Rom A1–A12 -->
        <div>
          <label for="onboard-room" class="block font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
            <Users class="w-3.5 h-3.5 text-emerald-400" />
            <span>Velg ditt rom (A1–A12)</span>
          </label>
          <select
            id="onboard-room"
            bind:value={selectedRoomId}
            class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-emerald-500 focus:outline-none"
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
          <div class="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-1.5 animate-in fade-in duration-150">
            <div class="flex items-center gap-1.5 text-emerald-400 font-bold">
              <Sparkles class="w-3.5 h-3.5" />
              <span>Du er første person i dette rommet!</span>
            </div>
            <p class="text-[11px] text-slate-300">
              Bestem et kallenavn for rommet (f.eks. "The Devs" for A1):
            </p>
            <div class="flex items-center gap-2">
              <span class="font-mono font-bold text-emerald-400 text-sm">
                A{selectedRoom?.roomNumber || 1} -
              </span>
              <input
                type="text"
                bind:value={customRoomNickname}
                placeholder="f.eks. The Masterminds"
                class="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-emerald-500/40 text-white text-xs focus:border-emerald-400 focus:outline-none"
              />
            </div>
          </div>
        {/if}
      {/if}

      <!-- Innsendingsknapp -->
      <button
        onclick={handleSubmit}
        disabled={isSubmitting}
        class="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-2 mt-4"
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

      <!-- Admin bypass -->
      <div class="text-center pt-2">
        <button
          type="button"
          onclick={onAdminBypass}
          class="text-[11px] text-slate-500 hover:text-slate-300 underline transition-colors"
        >
          Administrator? Gå direkte til adminpanelet
        </button>
      </div>
    </div>
  </div>
</div>
