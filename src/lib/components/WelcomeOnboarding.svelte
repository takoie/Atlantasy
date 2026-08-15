<script lang="ts">
  import {
    Trophy,
    KeyRound,
    AlertCircle,
    ArrowRight,
    ArrowLeft,
    Users,
    Lock,
    Sparkles,
    CheckCircle2,
    Shield,
    User,
    Shirt,
  } from "lucide-svelte";
  import { formatConvexError } from "$lib/utils/formatError";

  let {
    rooms = [],
    fplTeams = [],
    users = [],
    onComplete = (_userId: string, _userData: any) => {},
    onLoginOrRegister = async (_data: any): Promise<{ userId: string; role: string; isNew?: boolean }> => {
      return { userId: "", role: "user" };
    },
    onValidateStep1 = async (_data: any): Promise<{ valid: boolean; role?: string; targetRoomId?: string | null }> => {
      return { valid: true };
    },
  }: {
    rooms?: any[];
    fplTeams?: any[];
    users?: any[];
    onComplete?: (userId: string, userData: any) => void;
    onLoginOrRegister?: (data: any) => Promise<{ userId: string; role: string; isNew?: boolean }>;
    onValidateStep1?: (data: any) => Promise<{ valid: boolean; role?: string; targetRoomId?: string | null }>;
  } = $props();

  let mode = $state<"register" | "login">("register");
  let step = $state<1 | 2>(1);

  // Skjemadata
  let username = $state("");
  let password = $state("");
  let inviteCode = $state("");
  let selectedFplEntryId = $state<number | null>(null);
  let selectedRoomId = $state("");
  let customRoomNickname = $state("");

  let errorMessage = $state("");
  let isSubmitting = $state(false);
  let isValidating = $state(false);
  let validatedTargetRoomId = $state<string | null>(null);

  // Filtrer ut lag som allerede er registrert av en eksisterende bruker (forhindrer stjeling av lag)
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

  // Valider Steg 1 og gå til Steg 2
  async function handleProceedToStep2() {
    errorMessage = "";
    if (!username.trim()) {
      errorMessage = "Vennligst oppgi et brukernavn.";
      return;
    }
    if (!password.trim()) {
      errorMessage = "Vennligst oppgi et passord.";
      return;
    }
    if (!inviteCode.trim()) {
      errorMessage = "Invitasjonskode er påkrevd for å registrere seg. Kontakt administrator for kode.";
      return;
    }

    isValidating = true;
    try {
      const res = await onValidateStep1({
        username: username.trim(),
        password: password.trim(),
        inviteCode: inviteCode.trim().toUpperCase(),
      });

      if (res && res.valid) {
        if (res.targetRoomId) {
          validatedTargetRoomId = res.targetRoomId;
          selectedRoomId = res.targetRoomId;
        } else if (!selectedRoomId && rooms.length > 0) {
          selectedRoomId = rooms[0]._id;
        }
        step = 2;
      }
    } catch (err: any) {
      errorMessage = formatConvexError(err, "Ugyldig invitasjonskode eller brukernavn opptatt.");
    } finally {
      isValidating = false;
    }
  }

  // Fullfør registrering (fra Steg 2) eller ordinær innlogging
  async function handleSubmit() {
    errorMessage = "";

    if (mode === "login") {
      if (!username.trim() || !password.trim()) {
        errorMessage = "Vennligst oppgi både brukernavn og passord.";
        return;
      }
    }

    if (mode === "register") {
      if (!selectedRoomId && rooms.length > 0) {
        selectedRoomId = rooms[0]._id;
      }
    }

    isSubmitting = true;

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
      errorMessage = formatConvexError(err, "Noe gikk galt under innlogging eller registrering.");
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
        Den interne FPL-bedriftsligaen.
      </p>
    </div>

    <!-- Modusvelger (Ny spiller / Logg inn) -->
    <div class="grid grid-cols-2 gap-1 p-1 bg-[#191E24] rounded-xl border border-[#384252] text-xs font-semibold">
      <button
        type="button"
        onclick={() => {
          mode = "register";
          step = 1;
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
        type="button"
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

    <!-- Steg-indikator for Ny Spiller -->
    {#if mode === "register"}
      <div class="flex items-center justify-center gap-3 py-1">
        <div class="flex items-center gap-2">
          <span
            class={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center transition-colors ${
              step === 1
                ? "bg-[#9FE88D] text-[#16380c]"
                : "bg-[#9FE88D]/20 text-[#9FE88D] border border-[#9FE88D]/40"
            }`}
          >
            1
          </span>
          <span class={`text-xs font-semibold ${step === 1 ? "text-white" : "text-[#94A3B8]"}`}>
            Konto & Invitasjon
          </span>
        </div>

        <div class="w-8 h-0.5 bg-[#384252]"></div>

        <div class="flex items-center gap-2">
          <span
            class={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center transition-colors ${
              step === 2
                ? "bg-[#9FE88D] text-[#16380c]"
                : "bg-[#191E24] text-[#94A3B8] border border-[#384252]"
            }`}
          >
            2
          </span>
          <span class={`text-xs font-semibold ${step === 2 ? "text-white" : "text-[#94A3B8]"}`}>
            FPL-lag & Rom
          </span>
        </div>
      </div>
    {/if}

    <!-- Feilmelding -->
    {#if errorMessage}
      <div
        class="p-3 rounded-lg bg-[#FB6F84]/15 border border-[#FB6F84]/30 text-[#FB6F84] text-xs font-medium flex items-center gap-2 animate-in fade-in"
      >
        <AlertCircle class="w-4 h-4 shrink-0" />
        <span>{errorMessage}</span>
      </div>
    {/if}

    <!-- Skjema -->
    <div class="space-y-4 text-xs">
      <!-- MODUS 1: REGISTRERING -->
      {#if mode === "register"}
        {#if step === 1}
          <!-- STEG 1: Brukernavn, Passord & Invitasjonskode -->
          <div class="space-y-3.5 animate-in fade-in duration-150">
            <div>
              <label for="onboard-username" class="block font-semibold text-[#E2E8F0] mb-1">
                Ditt navn eller brukernavn *
              </label>
              <input
                id="onboard-username"
                type="text"
                bind:value={username}
                placeholder="F.eks. Stian"
                class="w-full px-3.5 py-2.5 rounded-xl bg-[#191E24] border border-[#384252] text-white focus:border-[#9FE88D] focus:outline-none"
              />
            </div>

            <div>
              <label for="onboard-password" class="block font-semibold text-[#E2E8F0] mb-1 flex items-center gap-1">
                <Lock class="w-3.5 h-3.5 text-[#94A3B8]" />
                <span>Velg et passord / PIN *</span>
              </label>
              <input
                id="onboard-password"
                type="password"
                bind:value={password}
                placeholder="F.eks. en firesifret PIN eller passord"
                class="w-full px-3.5 py-2.5 rounded-xl bg-[#191E24] border border-[#384252] text-white focus:border-[#9FE88D] focus:outline-none"
              />
            </div>

            <div>
              <label for="onboard-invite" class="block font-semibold text-[#E2E8F0] mb-1 flex items-center justify-between">
                <span class="flex items-center gap-1.5">
                  <KeyRound class="w-3.5 h-3.5 text-[#9FE88D]" />
                  <span>Invitasjonskode *</span>
                </span>
                <span class="text-[11px] text-[#F4C152] font-normal">Påkrevd</span>
              </label>
              <input
                id="onboard-invite"
                type="text"
                bind:value={inviteCode}
                onkeydown={(e) => e.key === "Enter" && handleProceedToStep2()}
                placeholder="F.eks. ATLANTIS-2025 eller din personlige kode"
                class="w-full px-3.5 py-2.5 rounded-xl bg-[#191E24] border border-[#384252] text-white font-mono uppercase focus:border-[#9FE88D] focus:outline-none"
              />
              <p class="text-[11px] text-[#94A3B8] mt-1">
                Du må ha en gyldig kode fra administrator for å opprette konto.
              </p>
            </div>

            <button
              type="button"
              onclick={handleProceedToStep2}
              disabled={isValidating}
              class="w-full py-3 rounded-xl bg-[#9FE88D] hover:bg-[#8ce078] disabled:opacity-50 text-[#16380c] font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2 mt-2"
            >
              <span>{isValidating ? "Validerer kode..." : "Gå videre til lag og rom (Steg 2 av 2)"}</span>
              <ArrowRight class="w-4 h-4" />
            </button>
          </div>

        {:else if step === 2}
          <!-- STEG 2: Velg FPL-lag & Rom -->
          <div class="space-y-3.5 animate-in fade-in duration-150">
            <!-- Godkjent status banner -->
            <div class="p-3 rounded-xl bg-[#9FE88D]/15 border border-[#9FE88D]/30 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <CheckCircle2 class="w-4 h-4 text-[#9FE88D]" />
                <span class="text-xs text-white font-semibold">
                  Kode godkjent for <strong class="text-[#9FE88D]">{username}</strong>
                </span>
              </div>
              <span class="text-[10px] font-mono font-bold text-[#9FE88D] bg-[#191E24] px-2 py-0.5 rounded border border-[#9FE88D]/30">
                {inviteCode.toUpperCase()}
              </span>
            </div>

            <!-- Velg FPL-lag -->
            <div>
              <label for="onboard-fpl-team" class="block font-semibold text-[#E2E8F0] mb-1 flex items-center gap-1.5">
                <Shirt class="w-3.5 h-3.5 text-[#70E1F8]" />
                <span>Velg ditt offisielle FPL-lag:</span>
              </label>
              <select
                id="onboard-fpl-team"
                bind:value={selectedFplEntryId}
                class="w-full px-3.5 py-2.5 rounded-xl bg-[#191E24] border border-[#384252] text-white focus:border-[#9FE88D] focus:outline-none"
              >
                <option value={null}>-- Velg ditt lag fra FPL-listen (valgfritt) --</option>
                {#each availableFplTeams as team (team.entryId)}
                  <option value={team.entryId}>
                    {team.teamName} ({team.managerName})
                  </option>
                {/each}
              </select>
              {#if availableFplTeams.length === 0}
                <p class="text-[11px] text-[#F4C152] mt-1">
                  Alle FPL-lag er allerede registrert av eksisterende brukere.
                </p>
              {/if}
            </div>

            <!-- Velg Rom A1–A12 -->
            <div>
              <label for="onboard-room" class="block font-semibold text-[#E2E8F0] mb-1 flex items-center gap-1.5">
                <Users class="w-3.5 h-3.5 text-[#9FE88D]" />
                <span>Velg ditt rom (A1–A12):</span>
              </label>
              {#if validatedTargetRoomId}
                <div class="p-2.5 rounded-xl bg-[#191E24] border border-[#384252] text-white font-semibold flex items-center justify-between">
                  <span>{rooms.find((r) => r._id === validatedTargetRoomId)?.name || "Tildelt Rom"}</span>
                  <span class="text-[10px] text-[#9FE88D] font-bold">Låst av invitasjonskode</span>
                </div>
              {:else}
                <select
                  id="onboard-room"
                  bind:value={selectedRoomId}
                  class="w-full px-3.5 py-2.5 rounded-xl bg-[#191E24] border border-[#384252] text-white focus:border-[#9FE88D] focus:outline-none"
                >
                  {#each rooms as room}
                    <option value={room._id}>
                      {room.name} ({room.teams?.length || 0} spillere)
                    </option>
                  {/each}
                </select>
              {/if}
            </div>

            <!-- Kallenavn for rom hvis første person -->
            {#if selectedRoomId && isFirstInRoom}
              <div class="p-3.5 rounded-xl bg-[#9FE88D]/10 border border-[#9FE88D]/30 space-y-1.5 animate-in fade-in duration-150">
                <div class="flex items-center gap-1.5 text-[#9FE88D] font-bold">
                  <Sparkles class="w-3.5 h-3.5" />
                  <span>Du er første person i dette rommet!</span>
                </div>
                <p class="text-[11px] text-[#94A3B8]">
                  Bestem et valgfritt navn for rommet (f.eks. «Gutta Krutt»):
                </p>
                <div class="flex items-center gap-2">
                  <span class="font-mono font-bold text-[#9FE88D] text-sm">
                    A{selectedRoom?.roomNumber || 1} -
                  </span>
                  <input
                    type="text"
                    bind:value={customRoomNickname}
                    placeholder="Romnavn"
                    class="flex-1 px-3 py-1.5 rounded-lg bg-[#191E24] border border-[#9FE88D]/40 text-white text-xs focus:border-[#9FE88D] focus:outline-none"
                  />
                </div>
              </div>
            {/if}

            <div class="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onclick={() => (step = 1)}
                class="px-4 py-3 rounded-xl bg-[#191E24] hover:bg-[#242B35] text-[#94A3B8] hover:text-white border border-[#384252] text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft class="w-4 h-4" />
                <span>Tilbake</span>
              </button>

              <button
                type="button"
                onclick={handleSubmit}
                disabled={isSubmitting}
                class="flex-1 py-3 rounded-xl bg-[#9FE88D] hover:bg-[#8ce078] disabled:opacity-50 text-[#16380c] font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2"
              >
                <span>{isSubmitting ? "Oppretter konto..." : "Fullfør registrering"}</span>
                <ArrowRight class="w-4 h-4" />
              </button>
            </div>
          </div>
        {/if}

      <!-- MODUS 2: INNLOGGING -->
      {:else}
        <div class="space-y-3.5 animate-in fade-in duration-150">
          <div>
            <label for="login-username" class="block font-semibold text-[#E2E8F0] mb-1">
              Brukernavn
            </label>
            <input
              id="login-username"
              type="text"
              bind:value={username}
              placeholder="F.eks. Stian eller Admin"
              class="w-full px-3.5 py-2.5 rounded-xl bg-[#191E24] border border-[#384252] text-white focus:border-[#9FE88D] focus:outline-none"
            />
          </div>

          <div>
            <label for="login-password" class="block font-semibold text-[#E2E8F0] mb-1 flex items-center gap-1">
              <Lock class="w-3.5 h-3.5 text-[#94A3B8]" />
              <span>Passord / PIN</span>
            </label>
            <input
              id="login-password"
              type="password"
              bind:value={password}
              onkeydown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Skriv inn ditt passord"
              class="w-full px-3.5 py-2.5 rounded-xl bg-[#191E24] border border-[#384252] text-white focus:border-[#9FE88D] focus:outline-none"
            />
          </div>

          <button
            type="button"
            onclick={handleSubmit}
            disabled={isSubmitting}
            class="w-full py-3 rounded-xl bg-[#9FE88D] hover:bg-[#8ce078] disabled:opacity-50 text-[#16380c] font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2 mt-3"
          >
            <span>{isSubmitting ? "Logger inn..." : "Logg inn"}</span>
            <ArrowRight class="w-4 h-4" />
          </button>
        </div>
      {/if}
    </div>
  </div>
</div>
