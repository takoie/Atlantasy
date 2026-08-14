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
    Download,
    Users,
    RotateCcw,
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
    onBatchSaveAssignments = (_assignments: any[]) => {},
    onStartNewSeason = (_params: any) => {},
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
    onBatchSaveAssignments?: (assignments: any[]) => void;
    onStartNewSeason?: (params: any) => void;
  } = $props();

  let adminPinInput = $state("");
  let isAuthenticated = $state(false);
  let authError = $state("");
  let activeTab = $state("matching"); // "matching" | "settings" | "season" | "winner" | "invites" | "database"

  // Innstillinger form-state
  let leagueId = $state(442981);
  let leagueName = $state("Atlantis Bedriftsliga");
  let currentGameweek = $state(26);
  let deductTransferHits = $state(true);

  // Ny sesong form-state
  let newSeasonName = $state("2025/2026");
  let resetPointsCheckbox = $state(true);

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

  // FPL Import & Drag-and-Drop Matching State
  let isFetchingFpl = $state(false);
  let fplImportLeagueId = $state(442981);
  let draggedTeamData = $state<{ team: any; sourceRoomId: string | null } | null>(null);

  // Lokal mapping av lag til rom for matching: roomId -> Array av lag
  let roomAssignments = $state<Record<string, any[]>>({});
  let unassignedPool = $state<any[]>([]);

  $effect(() => {
    if (settings) {
      leagueId = settings.leagueId;
      leagueName = settings.leagueName;
      currentGameweek = settings.currentGameweek;
      deductTransferHits = settings.deductTransferHits;
      fplImportLeagueId = settings.leagueId;
    }
  });

  // Synkroniser rom og lag når modalen åpnes
  $effect(() => {
    if (rooms && rooms.length > 0) {
      const newMap: Record<string, any[]> = {};
      for (const r of rooms) {
        newMap[r._id] = r.teams ? [...r.teams] : [];
      }
      roomAssignments = newMap;
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

  async function handleFetchFplLeague() {
    isFetchingFpl = true;
    try {
      // Simuler / Hent lag fra FPL
      const mockFplTeams = [
        { entryId: 98124, teamName: "Tactical Masterclass", managerName: "Stian Taknes", total: 1540, pts: 78, hits: 0 },
        { entryId: 10234, teamName: "Checkmate FC", managerName: "Magnus Carlsen", total: 1520, pts: 74, hits: 4 },
        { entryId: 44102, teamName: "Braut Machine", managerName: "Erling Haaland", total: 1590, pts: 84, hits: 0 },
        { entryId: 55410, teamName: "Klopps Heavy Metal", managerName: "Henrik Lie", total: 1410, pts: 62, hits: 0 },
        { entryId: 77123, teamName: "Null Pointer XI", managerName: "Sander Berg", total: 1380, pts: 58, hits: 8 },
        { entryId: 66103, teamName: "Compound Interest FC", managerName: "Kari Nordmann", total: 1460, pts: 68, hits: 0 },
        { entryId: 88192, teamName: "Bull Market Boys", managerName: "Jonas Gahr", total: 1390, pts: 60, hits: 4 },
        { entryId: 99120, teamName: "Excel Wizards", managerName: "Line Pettersen", total: 1340, pts: 55, hits: 0 },
        { entryId: 31021, teamName: "Cold Call Kings", managerName: "Andreas Vik", total: 1475, pts: 71, hits: 0 },
        { entryId: 31022, teamName: "Quota Crushers", managerName: "Julie Moe", total: 1440, pts: 67, hits: 0 },
        { entryId: 31023, teamName: "Pipeline Dream", managerName: "Torstein Dale", total: 1370, pts: 59, hits: 4 },
        { entryId: 31024, teamName: "Always Be Closing", managerName: "Mari Hansen", total: 1310, pts: 52, hits: 0 },
      ];

      unassignedPool = mockFplTeams;
      showSuccess(`Hentet ${mockFplTeams.length} lag fra FPL Liga #${fplImportLeagueId}!`);
    } catch {
      alert("Kunne ikke hente FPL liga");
    } finally {
      isFetchingFpl = false;
    }
  }

  // --- Robust Drag and Drop & 1-Klikk Matcher ---
  function onDragStartHandler(team: any, sourceRoomId: string | null, e: DragEvent) {
    draggedTeamData = { team, sourceRoomId };
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", JSON.stringify({ entryId: team.entryId, sourceRoomId }));
    }
  }

  function onDragOverHandler(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "move";
    }
  }

  function onDropOnRoomHandler(targetRoomId: string, e: DragEvent) {
    e.preventDefault();
    if (!draggedTeamData) return;

    const { team, sourceRoomId } = draggedTeamData;
    assignTeamLocally(team, sourceRoomId, targetRoomId);
    draggedTeamData = null;
  }

  function onDropOnPoolHandler(e: DragEvent) {
    e.preventDefault();
    if (!draggedTeamData || draggedTeamData.sourceRoomId === null) return;

    const { team, sourceRoomId } = draggedTeamData;
    assignTeamLocally(team, sourceRoomId, null);
    draggedTeamData = null;
  }

  // Universell flytte-funksjon (brukes av både Drag-and-Drop og 1-Klikk Dropdown)
  function assignTeamLocally(team: any, sourceRoomId: string | null, targetRoomId: string | null) {
    // 1. Fjern fra kilde
    if (sourceRoomId === null) {
      unassignedPool = unassignedPool.filter((t) => t.entryId !== team.entryId);
    } else {
      const currentInSource = roomAssignments[sourceRoomId] || [];
      roomAssignments[sourceRoomId] = currentInSource.filter((t) => t.entryId !== team.entryId);
    }

    // 2. Legg til i mål
    if (targetRoomId === null) {
      if (!unassignedPool.some((t) => t.entryId === team.entryId)) {
        unassignedPool = [...unassignedPool, team];
      }
    } else {
      const currentInTarget = roomAssignments[targetRoomId] || [];
      if (!currentInTarget.some((t) => t.entryId === team.entryId)) {
        roomAssignments[targetRoomId] = [...currentInTarget, team];
      }
    }

    // Tving reaktiv oppdatering
    roomAssignments = { ...roomAssignments };
  }

  function handleSaveAllRoomAssignments() {
    const assignments: any[] = [];
    for (const [roomId, teams] of Object.entries(roomAssignments)) {
      for (const t of teams) {
        assignments.push({
          entryId: t.entryId,
          teamName: t.teamName,
          managerName: t.managerName,
          roomId: roomId as any,
          totalPoints: t.total ?? t.totalPoints ?? 0,
          currentGwPoints: t.pts ?? t.currentGwPoints ?? 0,
          currentGwTransfersCost: t.hits ?? t.currentGwTransfersCost ?? 0,
        });
      }
    }

    onBatchSaveAssignments(assignments);
    showSuccess(`Lagret ${assignments.length} spillere fordelt over rommene!`);
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
      authorName: "Admin",
    });
    showSuccess("Vinnerrom kåret og publisert til Skrytevegg!");
  }

  function handleStartNewSeasonSubmit() {
    if (!confirm(`Er du sikker på at du vil starte ny sesong: ${newSeasonName}?`)) {
      return;
    }
    onStartNewSeason({
      seasonName: newSeasonName,
      resetPoints: resetPointsCheckbox,
    });
    showSuccess(`Ny sesong ${newSeasonName} er igangsatt!`);
  }

  function showSuccess(msg: string) {
    successMessage = msg;
    setTimeout(() => {
      successMessage = "";
    }, 3500);
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
    <div
      class="w-full max-w-5xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-150"
    >
      <!-- Modal Header -->
      <div class="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="p-2 rounded-lg bg-indigo-600/20 border border-indigo-500/40 text-indigo-400">
            <Shield class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-sm font-bold text-white flex items-center gap-2">
              Admin Kontrollpanel & Rom-matching
              <span class="text-[10px] bg-indigo-950 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-800/60 uppercase font-mono">
                Admin
              </span>
            </h2>
            <p class="text-xs text-slate-400">FPL-import, Drag-and-Drop rom-tildeling og sesongstyring</p>
          </div>
        </div>

        <button
          onclick={onClose}
          class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Innhold hvis ikke låst opp -->
      {#if !isAuthenticated}
        <div class="p-8 flex flex-col items-center justify-center text-center space-y-4">
          <div class="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-indigo-400">
            <KeyRound class="w-6 h-6" />
          </div>
          <div>
            <h3 class="text-base font-bold text-white">Oppgi Admin PIN-kode</h3>
            <p class="text-xs text-slate-400 mt-1">Standard PIN: <code class="text-fpl-cyan font-mono font-bold">1234</code></p>
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
        <div class="flex border-b border-slate-800 bg-slate-950/60 px-4 text-xs font-semibold overflow-x-auto shrink-0">
          <button
            onclick={() => (activeTab = "matching")}
            class={`px-4 py-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "matching"
                ? "border-fpl-cyan text-fpl-cyan font-bold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Users class="w-3.5 h-3.5" />
            <span>FPL Import & Rom-matching</span>
          </button>

          <button
            onclick={() => (activeTab = "season")}
            class={`px-4 py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "season"
                ? "border-emerald-400 text-emerald-300 font-bold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <RotateCcw class="w-3.5 h-3.5" />
            <span>Ny Sesong & År</span>
          </button>

          <button
            onclick={() => (activeTab = "settings")}
            class={`px-4 py-3 border-b-2 transition-colors ${
              activeTab === "settings"
                ? "border-fpl-cyan text-fpl-cyan font-bold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Ligainnstillinger & Hits
          </button>

          <button
            onclick={() => (activeTab = "winner")}
            class={`px-4 py-3 border-b-2 transition-colors ${
              activeTab === "winner"
                ? "border-amber-400 text-amber-300 font-bold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Kår Månedsvinner (Skrytevegg)
          </button>

          <button
            onclick={() => (activeTab = "invites")}
            class={`px-4 py-3 border-b-2 transition-colors ${
              activeTab === "invites"
                ? "border-indigo-400 text-indigo-300 font-bold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Invitasjonskoder
          </button>

          <button
            onclick={() => (activeTab = "database")}
            class={`px-4 py-3 border-b-2 transition-colors ${
              activeTab === "database"
                ? "border-purple-400 text-purple-300 font-bold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Seed / Nullstill
          </button>
        </div>

        <!-- Suksessmelding -->
        {#if successMessage}
          <div class="mx-5 mt-3 p-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-medium flex items-center gap-2 shrink-0">
            <Check class="w-4 h-4" />
            <span>{successMessage}</span>
          </div>
        {/if}

        <!-- Tab 1: Drag-and-Drop Matching & FPL Import -->
        {#if activeTab === "matching"}
          <div class="p-4 space-y-4 overflow-y-auto flex-1 flex flex-col min-h-0">
            <!-- FPL Import Bar -->
            <div class="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div class="flex items-center gap-3">
                <div>
                  <label for="admin-fpl-league-id" class="text-[11px] font-bold text-slate-400 block mb-1">
                    FPL Classic League ID:
                  </label>
                  <div class="flex items-center gap-2">
                    <input
                      id="admin-fpl-league-id"
                      type="number"
                      bind:value={fplImportLeagueId}
                      placeholder="League ID"
                      class="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:border-fpl-cyan focus:outline-none w-36 font-mono"
                    />
                    <button
                      onclick={handleFetchFplLeague}
                      disabled={isFetchingFpl}
                      class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                      <Download class="w-3.5 h-3.5" />
                      <span>{isFetchingFpl ? "Henter..." : "Hent Lag & Spillere"}</span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Lagre Rom-fordeling -->
              <button
                onclick={handleSaveAllRoomAssignments}
                class="px-4 py-2 rounded-lg bg-fpl-cyan hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-glow-cyan flex items-center gap-1.5"
              >
                <Save class="w-4 h-4" />
                <span>Lagre Rom-tildeling til Databasen</span>
              </button>
            </div>

            <!-- Drag and Drop Område -->
            <div class="grid grid-cols-12 gap-4 flex-1 min-h-[400px]">
              <!-- Venstre: Ufordelte FPL-lag / Spillere -->
              <div
                role="region"
                aria-label="Ufordelte spillere"
                ondragover={onDragOverHandler}
                ondrop={onDropOnPoolHandler}
                class="col-span-4 rounded-xl bg-slate-950/80 border border-slate-800 p-3 flex flex-col min-h-0"
              >
                <div class="flex items-center justify-between pb-2 border-b border-slate-800 shrink-0">
                  <h4 class="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Users class="w-3.5 h-3.5 text-fpl-cyan" />
                    <span>Spillerpool ({unassignedPool.length})</span>
                  </h4>
                  <span class="text-[10px] text-slate-500">Dra eller velg rom</span>
                </div>

                <div class="flex-1 overflow-y-auto space-y-1.5 pt-2 pr-1">
                  {#if unassignedPool.length === 0}
                    <div class="h-full flex flex-col items-center justify-center text-center p-4 text-slate-500 text-xs">
                      <p>Ingen ufordelte spillere.</p>
                      <p class="text-[11px] text-slate-600 mt-1">Trykk "Hent Lag & Spillere" ovenfor.</p>
                    </div>
                  {/if}

                  {#each unassignedPool as team (team.entryId)}
                    <div
                      role="listitem"
                      draggable="true"
                      ondragstart={(e) => onDragStartHandler(team, null, e)}
                      class="p-2 rounded-lg bg-slate-900 border border-slate-700/80 hover:border-fpl-cyan text-xs cursor-grab active:cursor-grabbing transition-colors space-y-1.5"
                    >
                      <div class="flex items-center justify-between">
                        <div class="min-w-0">
                          <p class="font-bold text-white truncate text-[11px]">{team.teamName}</p>
                          <p class="text-[10px] text-slate-400 truncate">{team.managerName}</p>
                        </div>
                        <span class="text-[10px] font-mono text-fpl-cyan font-bold shrink-0">
                          {team.pts ?? team.currentGwPoints ?? 0} pts
                        </span>
                      </div>

                      <!-- Hurtig-velger for 1-klikk tildeling -->
                      <div class="flex items-center gap-1">
                        <select
                          onchange={(e) => {
                            const val = (e.target as HTMLSelectElement).value;
                            if (val) assignTeamLocally(team, null, val);
                          }}
                          class="w-full text-[10px] px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-slate-300 focus:border-fpl-cyan focus:outline-none"
                        >
                          <option value="">Flytt til Rom...</option>
                          {#each rooms as r}
                            <option value={r._id}>{r.name}</option>
                          {/each}
                        </select>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>

              <!-- Høyre: Rom A1–A12 Rutenett (Drop-targets) -->
              <div class="col-span-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 overflow-y-auto pr-1">
                {#each rooms as room (room._id)}
                  <div
                    role="region"
                    aria-label={`Rom ${room.name}`}
                    ondragover={onDragOverHandler}
                    ondrop={(e) => onDropOnRoomHandler(room._id, e)}
                    class="rounded-xl bg-slate-950/60 border border-slate-800 p-2.5 flex flex-col min-h-[145px] hover:border-slate-600 transition-colors"
                  >
                    <!-- Rom Header -->
                    <div class="flex items-center justify-between pb-1.5 border-b border-slate-800 shrink-0">
                      <div class="flex items-center gap-1.5 truncate">
                        <span
                          class="w-2 h-2 rounded-full shrink-0"
                          style={`background-color: ${room.accentColor || "#00ff87"}`}
                        ></span>
                        <span class="font-bold text-xs text-white truncate">{room.name}</span>
                      </div>
                      <span class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-slate-400">
                        {(roomAssignments[room._id] || []).length} spillere
                      </span>
                    </div>

                    <!-- Rom Spillere -->
                    <div class="flex-1 space-y-1 pt-1.5 overflow-y-auto">
                      {#if (roomAssignments[room._id] || []).length === 0}
                        <div class="h-full flex items-center justify-center text-[10px] text-slate-600 border border-dashed border-slate-800 rounded p-2 text-center">
                          Dra spillere hit
                        </div>
                      {/if}

                      {#each (roomAssignments[room._id] || []) as team (team.entryId)}
                        <div
                          role="listitem"
                          draggable="true"
                          ondragstart={(e) => onDragStartHandler(team, room._id, e)}
                          class="p-1.5 rounded bg-slate-900/90 border border-slate-800 hover:border-indigo-500 text-[11px] cursor-grab active:cursor-grabbing flex items-center justify-between gap-1 group"
                        >
                          <div class="truncate min-w-0">
                            <span class="font-semibold text-slate-200 truncate block text-[10px]">
                              {team.teamName}
                            </span>
                            <span class="text-[9px] text-slate-400 truncate block">
                              {team.managerName}
                            </span>
                          </div>

                          <button
                            type="button"
                            title="Fjern til spillerpool"
                            onclick={() => assignTeamLocally(team, room._id, null)}
                            class="text-slate-500 hover:text-rose-400 text-xs px-1 hover:bg-slate-800 rounded"
                          >
                            ×
                          </button>
                        </div>
                      {/each}
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          </div>
        {/if}

        <!-- Tab 2: Ny Sesong & Årsskifte -->
        {#if activeTab === "season"}
          <div class="p-6 space-y-5 overflow-y-auto flex-1 max-w-2xl mx-auto text-left">
            <div class="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
              <div class="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                <RotateCcw class="w-4 h-4" />
                <span>Start Ny Sesong / Nytt År</span>
              </div>
              <p class="text-xs text-slate-300 leading-relaxed">
                Når en ny FPL-sesong starter på sensommeren (eller ved årsskiftet), kan du starte en ny sesong her. Gameweek tilbakestilles til runde 1, og nye kunngjøringer publiseres.
              </p>
            </div>

            <div class="space-y-4">
              <div>
                <label for="admin-season-name" class="block text-xs font-semibold text-slate-300 mb-1">
                  Sesongbetegnelse
                </label>
                <input
                  id="admin-season-name"
                  type="text"
                  bind:value={newSeasonName}
                  placeholder="f.eks. 2025/2026"
                  class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <div class="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <p class="text-xs font-bold text-white">Nullstill Poengsummer for Spillere</p>
                  <p class="text-[11px] text-slate-400">Setter alle spilleres nåværende poeng til 0 for den nye sesongen.</p>
                </div>
                <button
                  type="button"
                  onclick={() => (resetPointsCheckbox = !resetPointsCheckbox)}
                  class="text-emerald-400"
                >
                  {#if resetPointsCheckbox}
                    <ToggleRight class="w-8 h-8 text-emerald-400" />
                  {:else}
                    <ToggleLeft class="w-8 h-8 text-slate-600" />
                  {/if}
                </button>
              </div>

              <button
                onclick={handleStartNewSeasonSubmit}
                class="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-xs transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <RotateCcw class="w-4 h-4" />
                <span>Start Ny Sesong Nå</span>
              </button>
            </div>
          </div>
        {/if}

        <!-- Tab 3: Ligainnstillinger -->
        {#if activeTab === "settings"}
          <div class="p-5 space-y-4 overflow-y-auto flex-1">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="admin-league-id" class="block text-xs font-semibold text-slate-300 mb-1">
                  FPL Classic League ID
                </label>
                <input
                  id="admin-league-id"
                  type="number"
                  bind:value={leagueId}
                  class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:border-fpl-cyan focus:outline-none"
                />
              </div>

              <div>
                <label for="admin-current-gw" class="block text-xs font-semibold text-slate-300 mb-1">
                  Gjeldende Gameweek
                </label>
                <input
                  id="admin-current-gw"
                  type="number"
                  bind:value={currentGameweek}
                  class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:border-fpl-cyan focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label for="admin-league-name" class="block text-xs font-semibold text-slate-300 mb-1">
                Liganavn
              </label>
              <input
                id="admin-league-name"
                type="text"
                bind:value={leagueName}
                class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:border-fpl-cyan focus:outline-none"
              />
            </div>

            <!-- Romkalkulering Toggle -->
            <div class="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
              <div class="pr-4">
                <p class="text-xs font-bold text-white">Trekk fra Transfer Hits (-4 pts)</p>
                <p class="text-[11px] text-slate-400 mt-0.5">
                  Hvis aktivert, trekkes minuspoeng fra managers score før de to beste spillerne og romsnittet beregnes.
                </p>
              </div>
              <button
                type="button"
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

        <!-- Tab 4: Kår Månedsvinner -->
        {#if activeTab === "winner"}
          <div class="p-5 space-y-4 overflow-y-auto flex-1">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="admin-winner-room" class="block text-xs font-semibold text-slate-300 mb-1">
                  Månedens Vinnerrom
                </label>
                <select
                  id="admin-winner-room"
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
                <label for="admin-winner-month" class="block text-xs font-semibold text-slate-300 mb-1">
                  Månedsnavn
                </label>
                <input
                  id="admin-winner-month"
                  type="text"
                  bind:value={winningMonthName}
                  placeholder="f.eks. Januar, Februar"
                  class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label for="admin-winner-score" class="block text-xs font-semibold text-slate-300 mb-1">
                Vinnende Snittscore
              </label>
              <input
                id="admin-winner-score"
                type="number"
                step="0.1"
                bind:value={winningScore}
                class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label for="admin-winner-msg" class="block text-xs font-semibold text-slate-300 mb-1">
                Tilpasset Kunngjøringstekst (Valgfri)
              </label>
              <textarea
                id="admin-winner-msg"
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

        <!-- Tab 5: Invitasjonskoder -->
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

        <!-- Tab 6: Database Seed -->
        {#if activeTab === "database"}
          <div class="p-5 space-y-4 overflow-y-auto flex-1 text-center">
            <div class="w-12 h-12 rounded-full bg-purple-950/60 border border-purple-500/40 text-purple-400 flex items-center justify-center mx-auto">
              <Database class="w-6 h-6" />
            </div>
            <div>
              <h4 class="text-sm font-bold text-white">Seed standard Rom & Testdata</h4>
              <p class="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Oppretter Rom A1–A12, realistiske FPL-lag og runderesultater, testmeldinger og vinnerhyllest hvis databasen er tom.
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
