<script lang="ts">
  import {
    X,
    Shield,
    KeyRound,
    ToggleLeft,
    ToggleRight,
    Trophy,
    Plus,
    Save,
    Check,
    Database,
  } from "lucide-svelte";

  let {
    isOpen = false,
    settings = null,
    rooms = [],
    inviteCodes = [],
    onClose = () => {},
    onUpdateSettings = (_newSettings: any) => {},
    onCreateInviteCode = (_params: any) => {},
    onDeclareWinner = (_params: any) => {},
    onSeedData = () => {},
  }: {
    isOpen?: boolean;
    settings?: any;
    rooms?: any[];
    inviteCodes?: any[];
    onClose?: () => void;
    onUpdateSettings?: (newSettings: any) => void;
    onCreateInviteCode?: (params: any) => void;
    onDeclareWinner?: (params: any) => void;
    onSeedData?: () => void;
  } = $props();

  let adminPinInput = $state("");
  let isAuthenticated = $state(false);
  let authError = $state("");
  let activeTab = $state("settings"); // "settings" | "invites" | "winner" | "rooms"

  // Innstillinger form-state
  let leagueId = $state(settings?.leagueId ?? 442981);
  let leagueName = $state(settings?.leagueName ?? "Atlantis Bedriftsliga");
  let currentGameweek = $state(settings?.currentGameweek ?? 26);
  let deductTransferHits = $state(settings?.deductTransferHits ?? true);

  // Vinnerkåring state
  let selectedWinnerRoomId = $state("");
  let winningMonthName = $state("Januar");
  let winningScore = $state(76.0);
  let customWinnerMessage = $state("");

  // Invitasjonskode state
  let newCodeCustom = $state("");
  let newCodeValidDays = $state(7);
  let newCodeRole = $state("user");
  let successMessage = $state("");

  $effect(() => {
    if (settings) {
      leagueId = settings.leagueId;
      leagueName = settings.leagueName;
      currentGameweek = settings.currentGameweek;
      deductTransferHits = settings.deductTransferHits;
    }
  });

  function handleAuth() {
    if (adminPinInput === "1234" || (settings?.adminPin && adminPinInput === settings.adminPin)) {
      isAuthenticated = true;
      authError = "";
    } else {
      authError = "Feil PIN-kode. Prøv 1234.";
    }
  }

  function handleSaveSettings() {
    onUpdateSettings({
      leagueId: Number(leagueId),
      leagueName,
      currentGameweek: Number(currentGameweek),
      deductTransferHits,
    });
    showSuccess("Ligainnstillinger lagret!");
  }

  function handleCreateCode() {
    onCreateInviteCode({
      customCode: newCodeCustom || undefined,
      validDays: Number(newCodeValidDays),
      role: newCodeRole,
    });
    newCodeCustom = "";
    showSuccess("Ny invitasjonskode generert!");
  }

  function handleWinnerSubmit() {
    if (!selectedWinnerRoomId) {
      alert("Vennligst velg et vinnerrom!");
      return;
    }
    onDeclareWinner({
      monthKey: winningMonthName.toLowerCase(),
      monthName: winningMonthName,
      winningRoomId: selectedWinnerRoomId,
      winningScore: Number(winningScore),
      customMessage: customWinnerMessage || undefined,
      authorName: "Stian (Admin)",
    });
    showSuccess("Vinnerrom kåret og publisert til Skrytevegg!");
  }

  function showSuccess(msg: string) {
    successMessage = msg;
    setTimeout(() => {
      successMessage = "";
    }, 3000);
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
    <div
      class="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-150"
    >
      <!-- Modal Header -->
      <div class="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="p-2 rounded-lg bg-indigo-600/20 border border-indigo-500/40 text-indigo-400">
            <Shield class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-sm font-bold text-white flex items-center gap-2">
              Admin Kontrollpanel
              <span class="text-[10px] bg-indigo-950 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-800/60 uppercase">
                Sikkerhet
              </span>
            </h2>
            <p class="text-xs text-slate-400">FPL-innstillinger, romkalkulering og vinnerkåring</p>
          </div>
        </div>

        <button
          onclick={onClose}
          class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Innhold hvis ikke logget inn med PIN -->
      {#if !isAuthenticated}
        <div class="p-8 flex flex-col items-center justify-center text-center space-y-4">
          <div class="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-indigo-400">
            <KeyRound class="w-6 h-6" />
          </div>
          <div>
            <h3 class="text-base font-bold text-white">Oppgi Admin PIN-kode</h3>
            <p class="text-xs text-slate-400 mt-1">Standard PIN for demo: <code class="text-fpl-cyan font-mono font-bold">1234</code></p>
          </div>

          <div class="flex items-center gap-2 w-full max-w-xs">
            <input
              type="password"
              maxlength="8"
              bind:value={adminPinInput}
              onkeydown={(e) => e.key === "Enter" && handleAuth()}
              placeholder="PIN-kode (1234)"
              class="flex-1 px-4 py-2 text-center text-sm tracking-widest font-mono rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-indigo-500 focus:outline-none"
            />
            <button
              onclick={handleAuth}
              class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors"
            >
              Lås opp
            </button>
          </div>

          {#if authError}
            <p class="text-xs text-rose-400 font-medium">{authError}</p>
          {/if}
        </div>
      {:else}
        <!-- Faner -->
        <div class="flex border-b border-slate-800 bg-slate-950/40 px-4 text-xs font-semibold">
          <button
            onclick={() => (activeTab = "settings")}
            class={`px-4 py-3 border-b-2 transition-colors ${
              activeTab === "settings"
                ? "border-fpl-cyan text-fpl-cyan"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Ligainnstillinger & Hits
          </button>
          <button
            onclick={() => (activeTab = "winner")}
            class={`px-4 py-3 border-b-2 transition-colors ${
              activeTab === "winner"
                ? "border-amber-400 text-amber-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Kår Månedsvinner (Skrytevegg)
          </button>
          <button
            onclick={() => (activeTab = "invites")}
            class={`px-4 py-3 border-b-2 transition-colors ${
              activeTab === "invites"
                ? "border-indigo-400 text-indigo-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Invitasjonskoder
          </button>
          <button
            onclick={() => (activeTab = "database")}
            class={`px-4 py-3 border-b-2 transition-colors ${
              activeTab === "database"
                ? "border-purple-400 text-purple-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Seed / Tilbakestill
          </button>
        </div>

        <!-- Melding ved suksess -->
        {#if successMessage}
          <div class="mx-5 mt-4 p-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-medium flex items-center gap-2">
            <Check class="w-4 h-4" />
            <span>{successMessage}</span>
          </div>
        {/if}

        <!-- Tab 1: Ligainnstillinger -->
        {#if activeTab === "settings"}
          <div class="p-5 space-y-4 overflow-y-auto flex-1">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">
                  FPL Classic League ID
                </label>
                <input
                  type="number"
                  bind:value={leagueId}
                  class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:border-fpl-cyan focus:outline-none"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">
                  Gjeldende Gameweek
                </label>
                <input
                  type="number"
                  bind:value={currentGameweek}
                  class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:border-fpl-cyan focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">
                Liganavn
              </label>
              <input
                type="text"
                bind:value={leagueName}
                class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:border-fpl-cyan focus:outline-none"
              />
            </div>

            <!-- Romkalkulering Toggle: Fratrekk av transfer hits -->
            <div class="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
              <div class="pr-4">
                <p class="text-xs font-bold text-white">Trekk fra Transfer Hits (-4 pts)</p>
                <p class="text-[11px] text-slate-400 mt-0.5">
                  Hvis aktivert, trekkes minuspoeng fra managers score før de to beste spillerne og romsnittet beregnes.
                </p>
              </div>
              <button
                onclick={() => (deductTransferHits = !deductTransferHits)}
                class="text-fpl-cyan hover:scale-105 transition-transform shrink-0"
              >
                {#if deductTransferHits}
                  <ToggleRight class="w-8 h-8 text-fpl-cyan" />
                {:else}
                  <ToggleLeft class="w-8 h-8 text-slate-600" />
                {/if}
              </button>
            </div>

            <button
              onclick={handleSaveSettings}
              class="w-full py-2.5 rounded-lg bg-fpl-cyan hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-glow-cyan"
            >
              <Save class="w-4 h-4" />
              <span>Lagre Innstillinger</span>
            </button>
          </div>
        {/if}

        <!-- Tab 2: Kår Månedsvinner -->
        {#if activeTab === "winner"}
          <div class="p-5 space-y-4 overflow-y-auto flex-1">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">
                  Månedens Vinnerrom
                </label>
                <select
                  bind:value={selectedWinnerRoomId}
                  class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:border-amber-400 focus:outline-none"
                >
                  <option value="">Velg rom...</option>
                  {#each rooms as r}
                    <option value={r._id}>{r.name}</option>
                  {/each}
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">
                  Månedsnavn
                </label>
                <input
                  type="text"
                  bind:value={winningMonthName}
                  placeholder="f.eks. Januar, Februar"
                  class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">
                Vinnende Snittscore
              </label>
              <input
                type="number"
                step="0.1"
                bind:value={winningScore}
                class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">
                Tilpasset Kunngjøringstekst (Valgfri)
              </label>
              <textarea
                rows="3"
                bind:value={customWinnerMessage}
                placeholder="Skriv en hyllest til vinnerrommet som vises på Skryteveggen..."
                class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:border-amber-400 focus:outline-none"
              ></textarea>
            </div>

            <button
              onclick={handleWinnerSubmit}
              class="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              <Trophy class="w-4 h-4" />
              <span>Publiser Månedens Vinner til Skrytevegg</span>
            </button>
          </div>
        {/if}

        <!-- Tab 3: Invitasjonskoder -->
        {#if activeTab === "invites"}
          <div class="p-5 space-y-4 overflow-y-auto flex-1">
            <div class="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
              <h4 class="text-xs font-bold text-white flex items-center gap-1.5">
                <Plus class="w-3.5 h-3.5 text-indigo-400" />
                <span>Generer ny invitasjonskode</span>
              </h4>

              <div class="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  bind:value={newCodeCustom}
                  placeholder="Valgfri kode (f.eks. ATL-2025)"
                  class="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white uppercase focus:border-indigo-400 focus:outline-none"
                />
                <select
                  bind:value={newCodeRole}
                  class="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:border-indigo-400 focus:outline-none"
                >
                  <option value="user">Rolle: Bruker</option>
                  <option value="admin">Rolle: Admin</option>
                </select>
              </div>

              <button
                onclick={handleCreateCode}
                class="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
              >
                Opprett Invitasjonskode
              </button>
            </div>

            <!-- Liste over koder -->
            <div class="space-y-2">
              <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Aktive koder ({inviteCodes.length})
              </h4>
              <div class="space-y-1.5 max-h-48 overflow-y-auto">
                {#each inviteCodes as code (code._id)}
                  <div class="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span class="font-mono font-bold text-indigo-300">{code.code}</span>
                      <span class="text-[10px] text-slate-500 ml-2">
                        Brukt: {code.usedCount}/{code.maxUses}
                      </span>
                    </div>
                    <span class={`text-[10px] px-2 py-0.5 rounded font-medium ${
                      code.isExpired ? "bg-rose-950 text-rose-300" : "bg-emerald-950 text-emerald-300"
                    }`}>
                      {code.isExpired ? "Utløpt" : "Aktiv"}
                    </span>
                  </div>
                {/each}
              </div>
            </div>
          </div>
        {/if}

        <!-- Tab 4: Database Seed -->
        {#if activeTab === "database"}
          <div class="p-5 space-y-4 overflow-y-auto flex-1 text-center">
            <div class="w-12 h-12 rounded-full bg-purple-950/60 border border-purple-500/40 text-purple-400 flex items-center justify-center mx-auto">
              <Database class="w-6 h-6" />
            </div>
            <div>
              <h4 class="text-sm font-bold text-white">Seed standard Rom & Testdata</h4>
              <p class="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Oppretter Rom 1–12, realistiske FPL-lag og runderesultater, testmeldinger og vinnerhyllest hvis databasen er tom.
              </p>
            </div>

            <button
              onclick={() => {
                onSeedData();
                showSuccess("Standard testdata er lagt inn!");
              }}
              class="px-6 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-lg"
            >
              Kjør Database Seeding
            </button>
          </div>
        {/if}
      {/if}
    </div>
  </div>
{/if}
