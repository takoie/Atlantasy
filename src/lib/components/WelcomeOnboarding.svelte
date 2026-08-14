<script lang="ts">
  import {
    Trophy,
    KeyRound,
    Shield,
    AlertCircle,
    ArrowRight,
    Users,
  } from "lucide-svelte";

  let {
    rooms = [],
    onComplete = (_userId: string, _userData: any) => {},
    onAdminBypass = () => {},
    onRegisterWithInvite = async (_data: any): Promise<{ userId: string; role: string }> => {
      return { userId: "", role: "user" };
    },
  }: {
    rooms?: any[];
    onComplete?: (userId: string, userData: any) => void;
    onAdminBypass?: () => void;
    onRegisterWithInvite?: (data: any) => Promise<{ userId: string; role: string }>;
  } = $props();

  let inviteCode = $state("ATLANTIS-2025");
  let username = $state("");
  let email = $state("");
  let fplTeamName = $state("");
  let fplManagerName = $state("");
  let fplEntryId = $state("");
  let selectedRoomId = $state("");
  let errorMessage = $state("");
  let isSubmitting = $state(false);

  async function handleRegister() {
    if (!inviteCode.trim() || !username.trim() || !email.trim()) {
      errorMessage = "Vennligst fyll ut invitasjonskode, navn og e-post.";
      return;
    }

    if (!selectedRoomId && rooms.length > 0) {
      selectedRoomId = rooms[0]._id;
    }

    isSubmitting = true;
    errorMessage = "";

    try {
      const res = await onRegisterWithInvite({
        inviteCode: inviteCode.trim().toUpperCase(),
        username: username.trim(),
        email: email.trim(),
        fplTeamName: fplTeamName.trim() || undefined,
        fplManagerName: fplManagerName.trim() || username.trim(),
        fplEntryId: fplEntryId ? Number(fplEntryId) : undefined,
        preferredRoomId: selectedRoomId || undefined,
      });

      if (res && res.userId) {
        onComplete(res.userId, {
          username: username.trim(),
          role: res.role || "user",
          roomId: selectedRoomId,
          fplTeamName: fplTeamName.trim(),
        });
      }
    } catch (err: any) {
      errorMessage = err.message || "Kunne ikke registrere. Sjekk at invitasjonskoden er gyldig.";
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
    class="relative w-full max-w-xl bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-6 md:p-8 backdrop-blur-xl space-y-6 animate-in zoom-in-95 duration-200"
  >
    <!-- Logo & Tittel -->
    <div class="text-center space-y-2">
      <div
        class="inline-flex w-12 h-12 rounded-xl bg-gradient-to-br from-fpl-cyan to-emerald-500 items-center justify-center text-slate-950 font-black shadow-glow-cyan mb-1"
      >
        <Trophy class="w-7 h-7 text-[#070a12]" />
      </div>
      <h1 class="text-2xl font-black text-white tracking-wide">
        Velkommen til <span class="text-fpl-cyan">Atlantasy</span>
      </h1>
      <p class="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
        Den interne FPL Bedriftsligaen. Oppgi invitasjonskoden din og velg rommet ditt (A1–A12) for å bli med i konkurransen.
      </p>
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

    <!-- Registreringsskjema -->
    <div class="space-y-4 text-xs">
      <!-- 1. Invitasjonskode -->
      <div>
        <label for="welcome-code" class="block font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
          <KeyRound class="w-3.5 h-3.5 text-fpl-cyan" />
          <span>Invitasjonskode</span>
        </label>
        <input
          id="welcome-code"
          type="text"
          bind:value={inviteCode}
          placeholder="f.eks. ATLANTIS-2025"
          class="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono text-sm tracking-wider uppercase focus:border-fpl-cyan focus:outline-none"
        />
      </div>

      <!-- 2. Navn & E-post -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label for="welcome-username" class="block font-semibold text-slate-300 mb-1">Ditt Navn / Brukernavn *</label>
          <input
            id="welcome-username"
            type="text"
            bind:value={username}
            placeholder="f.eks. Ola Nordmann"
            class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-fpl-cyan focus:outline-none"
          />
        </div>

        <div>
          <label for="welcome-email" class="block font-semibold text-slate-300 mb-1">E-postadresse *</label>
          <input
            id="welcome-email"
            type="email"
            bind:value={email}
            placeholder="ola@bedrift.no"
            class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-fpl-cyan focus:outline-none"
          />
        </div>
      </div>

      <!-- 3. FPL Laginfo -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label for="welcome-fpl-team" class="block font-semibold text-slate-300 mb-1">FPL Lagnavn (Valgfritt)</label>
          <input
            id="welcome-fpl-team"
            type="text"
            bind:value={fplTeamName}
            placeholder="f.eks. Klopps Disipler"
            class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-fpl-cyan focus:outline-none"
          />
        </div>

        <div>
          <label for="welcome-fpl-id" class="block font-semibold text-slate-300 mb-1">FPL Team / Entry ID</label>
          <input
            id="welcome-fpl-id"
            type="number"
            bind:value={fplEntryId}
            placeholder="f.eks. 123456"
            class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-fpl-cyan focus:outline-none"
          />
        </div>
      </div>

      <!-- 4. Romvelger (A1 - A12) -->
      <div>
        <label for="welcome-room" class="block font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
          <Users class="w-3.5 h-3.5 text-indigo-400" />
          <span>Velg ditt Rom (A1–A12)</span>
        </label>
        <select
          id="welcome-room"
          bind:value={selectedRoomId}
          class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-fpl-cyan focus:outline-none"
        >
          <option value="">Velg rom...</option>
          {#each rooms as r}
            <option value={r._id}>{r.name}</option>
          {/each}
        </select>
      </div>

      <!-- Bli med knapp -->
      <button
        onclick={handleRegister}
        disabled={isSubmitting}
        class="w-full py-3 rounded-xl bg-gradient-to-r from-fpl-cyan to-emerald-400 hover:from-fpl-cyan hover:to-emerald-300 text-slate-950 font-black text-sm tracking-wide transition-all shadow-glow-cyan flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
      >
        <span>{isSubmitting ? "Oppretter profil..." : "Fullfør & Bli med i Ligaen"}</span>
        <ArrowRight class="w-4 h-4" />
      </button>
    </div>

    <!-- Admin hurtiginngang -->
    <div class="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
      <span>Er du ligaadministrator?</span>
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
