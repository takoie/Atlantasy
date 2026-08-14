<script lang="ts">
  import {
    Trophy,
    KeyRound,
    Shield,
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
      errorMessage = err.message || "Noe gikk galt under innlogging/registrering.";
    } finally {
      isSubmitting = false;
    }
  }
</script>

<div
  class="fixed inset-0 z-50 bg-[#070a12] flex items-center justify-center p-4 select-none overflow-y-auto"
>
  <!-- Bakgrunns-effekter -->
  <div
    class="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-fpl-cyan/15 via-purple-600/10 to-transparent blur-3xl"
  ></div>

  <div
    class="relative w-full max-w-lg bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-6 md:p-8 backdrop-blur-xl space-y-5 animate-in zoom-in-95 duration-200 my-auto"
  >
    <!-- Logo & Tittel -->
    <div class="text-center space-y-1.5">
      <div
        class="inline-flex w-12 h-12 rounded-xl bg-gradient-to-br from-fpl-cyan to-emerald-500 items-center justify-center text-slate-950 font-black shadow-glow-cyan mb-1"
      >
        <Trophy class="w-7 h-7 text-[#070a12]" />
      </div>
      <h1 class="text-2xl font-black text-white tracking-wide">
        Velkommen til <span class="text-fpl-cyan">Atlantasy</span>
      </h1>
      <p class="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
        Den interne FPL Bedriftsligaen. Velg ditt lag og rom for å bli med i konkurransen.
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
            ? "bg-fpl-cyan text-slate-950 font-bold shadow-glow-cyan"
            : "text-slate-400 hover:text-white"
        }`}
      >
        <span>Ny Spiller (Registrer)</span>
      </button>

      <button
        onclick={() => {
          mode = "login";
          errorMessage = "";
        }}
        class={`py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
          mode === "login"
            ? "bg-fpl-cyan text-slate-950 font-bold shadow-glow-cyan"
            : "text-slate-400 hover:text-white"
        }`}
      >
        <span>Logg Inn</span>
      </button>
    </div>

    <!-- Feilmelding -->
    {#if errorMessage}
      <div
        class="p-3 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-medium flex items-center gap-2"
      >
        <AlertCircle class="w-4 h-4 shrink-0" />
        <span>{errorMessage}</span>
      </div>
    {/if}

    <!-- Skjema -->
    <div class="space-y-3.5 text-xs">
      <!-- 1. Brukernavn & Passord (Enkel pålogging uten e-post) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label for="onboard-username" class="block font-semibold text-slate-300 mb-1">Ditt Navn / Brukernavn *</label>
          <input
            id="onboard-username"
            type="text"
            bind:value={username}
            placeholder="f.eks. Ola Nordmann"
            class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-fpl-cyan focus:outline-none"
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
            class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-fpl-cyan focus:outline-none"
          />
        </div>
      </div>

      {#if mode === "register"}
        <!-- 2. Invitasjonskode -->
        <div>
          <label for="onboard-invite" class="block font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
            <KeyRound class="w-3.5 h-3.5 text-fpl-cyan" />
            <span>Invitasjonskode</span>
          </label>
          <input
            id="onboard-invite"
            type="text"
            bind:value={inviteCode}
            placeholder="f.eks. ATLANTIS-2025"
            class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono uppercase focus:border-fpl-cyan focus:outline-none"
          />
        </div>

        <!-- 3. Hent inn og velg sitt eget FPL-lag fra listen -->
        <div>
          <label for="onboard-fpl-team" class="block font-semibold text-slate-300 mb-1 flex items-center justify-between">
            <span>Hvilket lag er ditt i FPL-ligaen?</span>
            <span class="text-[10px] text-fpl-cyan">Knyttes automatisk</span>
          </label>
          <select
            id="onboard-fpl-team"
            bind:value={selectedFplEntryId}
            class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-fpl-cyan focus:outline-none"
          >
            <option value={null}>Velg ditt lag fra listen...</option>
            {#each fplTeams as team (team.entryId)}
              <option value={team.entryId}>
                {team.teamName} ({team.managerName}) - {team.totalPoints ?? team.total ?? 0} pts
              </option>
            {/each}
          </select>
        </div>

        <!-- 4. Romvelger (A1 - A12) -->
        <div>
          <label for="onboard-room" class="block font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
            <Users class="w-3.5 h-3.5 text-indigo-400" />
            <span>Velg ditt Rom (A1–A12)</span>
          </label>
          <select
            id="onboard-room"
            bind:value={selectedRoomId}
            class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-fpl-cyan focus:outline-none"
          >
            <option value="">Velg rom...</option>
            {#each rooms as r}
              <option value={r._id}>{r.name}</option>
            {/each}
          </select>
        </div>

        <!-- 5. Første person i rommet får bestemme kallenavn -->
        {#if selectedRoomId && isFirstInRoom}
          <div class="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/40 space-y-1.5 animate-in fade-in">
            <div class="flex items-center gap-1.5 text-indigo-300 font-bold text-[11px]">
              <Sparkles class="w-3.5 h-3.5 text-indigo-400" />
              <span>Du er første person i dette rommet! Bestem kallenavn:</span>
            </div>
            <input
              type="text"
              bind:value={customRoomNickname}
              placeholder="f.eks. The Devs, Wall Street, Goal Diggers..."
              class="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-indigo-500/60 text-white font-medium text-xs focus:outline-none focus:border-indigo-400"
            />
          </div>
        {/if}
      {/if}

      <!-- Hovedknapp -->
      <button
        onclick={handleSubmit}
        disabled={isSubmitting}
        class="w-full py-2.5 rounded-xl bg-gradient-to-r from-fpl-cyan to-emerald-400 hover:from-fpl-cyan hover:to-emerald-300 text-slate-950 font-black text-sm tracking-wide transition-all shadow-glow-cyan flex items-center justify-center gap-2 mt-3 disabled:opacity-50"
      >
        <span>
          {#if isSubmitting}
            Vennligst vent...
          {:else if mode === "register"}
            Fullfør & Start Sesongen
          {:else}
            Logg Inn
          {/if}
        </span>
        <ArrowRight class="w-4 h-4" />
      </button>
    </div>

    <!-- Admin hurtiginngang -->
    <div class="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
      <span>Ligaadministrator?</span>
      <button
        type="button"
        onclick={onAdminBypass}
        class="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
      >
        <Shield class="w-3.5 h-3.5" />
        <span>Lås opp Adminpanel (PIN)</span>
      </button>
    </div>
  </div>
</div>
