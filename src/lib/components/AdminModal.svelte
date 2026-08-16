<script lang="ts">
  import {
    X,
    Shield,
    KeyRound,
    ToggleLeft,
    ToggleRight,
    Trophy,
    Plus,
    UserPlus,
    Save,
    Check,
    Download,
    Users,
    RotateCcw,
    Trash2,
    Search,
    Edit2,
    Pencil,
    Sparkles,
    Lock,
    AlertTriangle,
    Layers,
    GripVertical,
    Swords,
    Calendar,
    Flame,
    RefreshCw,
    CheckCircle2,
    Shirt,
    Unlink,
    Crown,
    MessageSquareX,
    Brush,
    Award,
  } from "lucide-svelte";
  import { useQuery, useMutation } from "$lib/convex.svelte";
  import { api } from "../../../convex/_generated/api";
  import { formatConvexError } from "$lib/utils/formatError";

  let {
    isOpen = false,
    currentUser = null,
    settings = null,
    rooms = [],
    inviteCodes = [],
    users = [],
    fplTeams = [],
    monthWinnersData = null,
    onClose = () => {},
    onUpdateSettings = (_newSettings: any) => {},
    onCreateInviteCode = (_params: any) => {},
    onDeclareWinner = (_params: any) => {},
    onUnpinWinner = (_announcementId: string) => {},
    onBatchSaveAssignments = (
      _assignments: any[],
      _clearUnassigned?: boolean,
    ) => {},
    onClearAllAssignments = () => {},
    onCreateRoom = (_params: any) => {},
    onDeleteRoom = (_roomId: string) => {},
    onUpdateRoomName = (_roomId: string, _newName: string) => {},
    onUpdateTeamName = (_entryId: number, _newName: string) => {},
    onStartNewSeason = (_params: any) => {},
    onSetUserRole = (_userId: string, _role: string) => {},
    onFetchFplLeague = async (_leagueId: number): Promise<any> => null,
    onLinkUserTeam = async (
      _targetUserId: string,
      _fplEntryId?: number,
    ): Promise<any> => null,
    onWipeAllPreseededData = () => {},
    onDeleteAllUsers = () => {},
    onDeleteUser = (_userId: string) => {},
    onDeleteInviteCode = (_codeId: string) => {},
    onCreateManualUser = async (_params: any): Promise<any> => null,
    onClearChat = async (_scope: string, _roomId?: string): Promise<any> => null,
    onSetWinnerOverrides = async (_params: any): Promise<any> => null,
    onResetWinnerOverrides = async (_params: any): Promise<any> => null,
  }: {
    isOpen?: boolean;
    currentUser?: any;
    settings?: any;
    rooms?: any[];
    inviteCodes?: any[];
    users?: any[];
    fplTeams?: any[];
    monthWinnersData?: any;
    onClose?: () => void;
    onUpdateSettings?: (newSettings: any) => void;
    onCreateInviteCode?: (params: any) => void;
    onDeclareWinner?: (params: any) => void;
    onUnpinWinner?: (announcementId: string) => void;
    onBatchSaveAssignments?: (
      assignments: any[],
      clearUnassigned?: boolean,
    ) => void;
    onClearAllAssignments?: () => void;
    onCreateRoom?: (params: any) => void;
    onDeleteRoom?: (roomId: string) => void;
    onUpdateRoomName?: (roomId: string, newName: string) => void;
    onUpdateTeamName?: (entryId: number, newName: string) => void;
    onStartNewSeason?: (params: any) => void;
    onSetUserRole?: (userId: string, role: string) => void;
    onFetchFplLeague?: (leagueId: number) => Promise<any>;
    onLinkUserTeam?: (
      targetUserId: string,
      fplEntryId?: number,
    ) => Promise<any>;
    onWipeAllPreseededData?: () => void;
    onDeleteAllUsers?: () => void;
    onDeleteUser?: (userId: string) => void;
    onDeleteInviteCode?: (codeId: string) => void;
    onCreateManualUser?: (params: any) => Promise<any>;
    onClearChat?: (scope: string, roomId?: string) => Promise<any>;
    onSetWinnerOverrides?: (overrides: any) => Promise<any>;
    onResetWinnerOverrides?: (params: any) => Promise<any>;
  } = $props();

  let adminPasswordInput = $state("");
  let manualUnlocked = $state(false);
  let authError = $state("");
  let isAuthenticating = $state(false);
  let isAuthenticated = $derived(currentUser?.role === "admin" || manualUnlocked);
  let isSyncingLeague = $state(false);
  let isSavingUserLink = $state(false);
  let linkingUserModal = $state<{
    show: boolean;
    user: any;
    selectedEntryId: number | null;
  }>({
    show: false,
    user: null,
    selectedEntryId: null,
  });
  let activeTab = $state("matching"); // "matching" | "settings" | "winner" | "users" | "invites"

  // Innstillinger form-state
  let leagueId = $state(464734);
  let leagueName = $state("Atlantis Bedriftsliga");
  let currentGameweek = $state(1);
  let deductTransferHits = $state(true);
  let showManualGwOverride = $state(false);

  // Ny sesong form-state
  let newSeasonName = $state("2025/2026");
  let resetPointsCheckbox = $state(true);

  // Vinnerkåring state
  let winnerCategory = $state<"room" | "individual">("room");
  let selectedWinnerRoomId = $state("");
  let winnerManagerName = $state("");
  let winnerTeamName = $state("");
  let winningMonthName = $state("August");
  let winningScore = $state(76.0);
  let customWinnerMessage = $state("");

  // Kårings- & Vinnerstatus Query (live fra backend)
  const winnersStatusQuery = useQuery(api.admin.getRoundAndRoomWinnersStatus);
  let winnersStatus = $derived(winnersStatusQuery.data ?? null);

  // Overstyring form state
  let overrideWinnerEntryId = $state<number | null>(null);
  let overrideWinnerScoreInput = $state<number | string>("");
  let overrideRoomId = $state<string>("");
  let overrideRoomScoreInput = $state<number | string>("");
  let isSavingOverrides = $state(false);

  // Synkroniser lokale felter når data lastes inn
  $effect(() => {
    if (winnersStatus) {
      if (winnersStatus.isRoundWinnerOverridden && overrideWinnerEntryId === null) {
        overrideWinnerEntryId = winnersStatus.activeRoundWinner?.entryId || null;
        overrideWinnerScoreInput = winnersStatus.activeRoundWinner?.points ?? "";
      }
      if (winnersStatus.isTopRoomOverridden && !overrideRoomId) {
        overrideRoomId = winnersStatus.activeTopRoom?.roomId || "";
        overrideRoomScoreInput = winnersStatus.activeTopRoom?.score ?? "";
      }
    }
  });

  async function handleSaveRoundWinnerOverride() {
    if (!overrideWinnerEntryId) {
      alert("Vennligst velg en manager/spiller å overstyre som rundevinner.");
      return;
    }
    const candidate = winnersStatus?.allTeamsCandidates?.find((t: any) => t.entryId === overrideWinnerEntryId);
    isSavingOverrides = true;
    try {
      await onSetWinnerOverrides({
        overrideRoundWinnerEntryId: overrideWinnerEntryId,
        overrideRoundWinnerName: candidate?.managerName,
        overrideRoundWinnerTeamName: candidate?.teamName,
        overrideRoundWinnerScore: overrideWinnerScoreInput !== "" ? Number(overrideWinnerScoreInput) : candidate?.points,
      });
      showSuccess(`Overstyrte rundevinner til ${candidate?.managerName || "valgt spiller"}!`);
    } catch (err: any) {
      alert(formatConvexError(err, "Kunne ikke lagre overstyring."));
    } finally {
      isSavingOverrides = false;
    }
  }

  async function handleResetRoundWinnerOverride() {
    isSavingOverrides = true;
    try {
      await onResetWinnerOverrides({ resetRoundWinner: true, resetTopRoom: false });
      overrideWinnerEntryId = null;
      overrideWinnerScoreInput = "";
      showSuccess("Rundevinner er tilbakestilt til automatisk beregning!");
    } catch (err: any) {
      alert(formatConvexError(err, "Kunne ikke tilbakestille overstyring."));
    } finally {
      isSavingOverrides = false;
    }
  }

  async function handleSaveTopRoomOverride() {
    if (!overrideRoomId) {
      alert("Vennligst velg et rom å overstyre som lederrom.");
      return;
    }
    const candidate = winnersStatus?.allRoomsCandidates?.find((r: any) => r.roomId === overrideRoomId);
    isSavingOverrides = true;
    try {
      await onSetWinnerOverrides({
        overrideTopRoomId: overrideRoomId,
        overrideTopRoomScore: overrideRoomScoreInput !== "" ? Number(overrideRoomScoreInput) : candidate?.score,
      });
      showSuccess(`Overstyrte lederrom til ${candidate?.name || "valgt rom"}!`);
    } catch (err: any) {
      alert(formatConvexError(err, "Kunne ikke lagre overstyring."));
    } finally {
      isSavingOverrides = false;
    }
  }

  async function handleResetTopRoomOverride() {
    isSavingOverrides = true;
    try {
      await onResetWinnerOverrides({ resetRoundWinner: false, resetTopRoom: true });
      overrideRoomId = "";
      overrideRoomScoreInput = "";
      showSuccess("Lederrom er tilbakestilt til automatisk beregning!");
    } catch (err: any) {
      alert(formatConvexError(err, "Kunne ikke tilbakestille overstyring."));
    } finally {
      isSavingOverrides = false;
    }
  }

  function promptClearChat(scope: "all" | "banter" | "room") {
    const title =
      scope === "banter"
        ? "Tøm Felleskanal (Banter)?"
        : scope === "room"
          ? "Tøm alle Rom-chatter?"
          : "Tøm ALL chat?";
    const desc =
      scope === "banter"
        ? "Dette vil permanent slette alle meldinger i den felles Banter-kanalen."
        : scope === "room"
          ? "Dette vil permanent slette alle meldinger i alle interne rom-chatter."
          : "Dette vil slette ALLE meldinger i felleskanal og alle rom-chatter.";

    confirmDialog = {
      show: true,
      title,
      message: `${desc} Denne handlingen kan ikke angres.`,
      confirmText: "Ja, slett meldinger",
      onConfirm: async () => {
        try {
          const res = await onClearChat(scope);
          confirmDialog.show = false;
          showSuccess(
            `Slettet ${res?.deletedCount ?? 0} meldinger (${scope === "banter" ? "felleskanal" : scope === "room" ? "romchatter" : "all chat"}).`,
          );
        } catch (err: any) {
          alert(formatConvexError(err, "Kunne ikke slette meldinger."));
        }
      },
    };
  }

  // Invitasjonskode state
  let newCodeCustom = $state("");
  let newCodeValidDays = $state(7);
  let newCodeRole = $state("user");
  let successMessage = $state("");

  // Opprett manuell bruker state
  let showCreateUserModal = $state(false);
  let newUsername = $state("");
  let newPassword = $state("");
  let newRole = $state("user");
  let newRoomId = $state("");
  let newFplEntryId = $state<number | null>(null);
  let isCreatingUser = $state(false);
  let createUserError = $state("");

  // Opprett nytt rom state
  let showCreateRoomModal = $state(false);
  let newRoomName = $state("");
  let newRoomAccent = $state("#1eb854");

  // Rediger romnavn state
  let editingRoomId = $state<string | null>(null);
  let editingRoomNewName = $state("");

  // Rediger lagnavn state
  let editingTeamEntryId = $state<number | null>(null);
  let editingTeamNewName = $state("");

  // Egendefinert bekreftelses-dialog (Custom Themed Dialog)
  let confirmDialog = $state<{
    show: boolean;
    title: string;
    message: string;
    confirmText: string;
    onConfirm: () => void;
  }>({
    show: false,
    title: "",
    message: "",
    confirmText: "Bekreft",
    onConfirm: () => {},
  });

  const loginOrRegisterMutation = useMutation(api.auth.loginOrRegister);
  const createManualUserMutation = useMutation(api.admin.createManualUser);
  const activeCupQuery = useQuery(api.cups.getActiveCup);
  let activeCup = $derived(activeCupQuery.data ?? null);
  const createCupMutation = useMutation(api.cups.createCupWithBracket);
  const updateCupSettingsMutation = useMutation(api.cups.updateCupSettings);
  const updateMatchMutation = useMutation(api.cups.updateMatch);
  const calculateCupScoresMutation = useMutation(
    api.cups.calculateCupRoundScores,
  );
  const deleteCupMutation = useMutation(api.cups.deleteCup);

  let newCupName = $state("Atlantasy Vintercup 2025/2026");
  let newCupStartGw = $state(20);
  let newCupFormat = $state<
    | "lucky_loser_12"
    | "double_elimination_12"
    | "top8_single"
    | "group_stage_12"
  >("lucky_loser_12");
  let newCupSeedMethod = $state<"leaderboard" | "manual" | "random">(
    "leaderboard",
  );
  let isCreatingCup = $state(false);
  let isCalculatingCupRound = $state(false);
  let selectedMatchForEdit = $state<any>(null);
  let editMatchRoom1Id = $state("");
  let editMatchRoom2Id = $state("");
  let editMatchWinnerId = $state("");
  let editMatchScore1 = $state<number | undefined>(undefined);
  let editMatchScore2 = $state<number | undefined>(undefined);

  // FPL Import & Drag-and-Drop Matching State
  let isFetchingFpl = $state(false);
  let fplImportLeagueId = $state(464734);
  let searchPoolQuery = $state("");
  // Reaktiv global drag-state
  let activeDragTeam = $state<any>(null);
  let activeDragSourceRoomId = $state<string | null>(null);
  let dragHoverTarget = $state<string | null>(null);

  // Lokal mapping av lag til rom: roomId -> Array av lag
  let roomAssignments = $state<Record<string, any[]>>({});
  let unassignedPool = $state<any[]>([]);
  let wasModalOpen = false;

  $effect(() => {
    if (settings) {
      leagueId = settings.leagueId || 464734;
      leagueName = settings.leagueName || "Atlanten";
      currentGameweek = settings.currentGameweek || 1;
      deductTransferHits = settings.deductTransferHits ?? true;
      fplImportLeagueId = settings.leagueId || 464734;
    }
  });

  // Synkroniser rom og lag KUN når modalen faktisk åpnes (unngå å overskrive pågående drag-and-drop)
  $effect(() => {
    if (isOpen && !wasModalOpen) {
      wasModalOpen = true;
      if (rooms && rooms.length > 0) {
        const newMap: Record<string, any[]> = {};
        for (const r of rooms) {
          newMap[r._id] = r.teams ? [...r.teams] : [];
        }
        roomAssignments = newMap;
      }

      // Hvis databasen har ufordelte lag (fplTeams uten roomId), legg dem i unassignedPool
      if (fplTeams && fplTeams.length > 0) {
        const unassignedInDb = fplTeams.filter((t) => !t.roomId);
        if (unassignedInDb.length > 0) {
          unassignedPool = unassignedInDb;
        }
      }
    } else if (!isOpen) {
      wasModalOpen = false;
    }
  });

  async function handleAuth() {
    if (!adminPasswordInput) {
      authError = "Vennligst skriv inn passordet ditt.";
      return;
    }
    if (!currentUser) {
      authError = "Ingen aktiv bruker funnet. Vennligst logg inn først.";
      return;
    }
    isAuthenticating = true;
    authError = "";
    try {
      const res = await loginOrRegisterMutation.mutate({
        username: currentUser.username,
        password: adminPasswordInput,
      });
      if (res.role === "admin") {
        manualUnlocked = true;
      } else {
        authError = "Denne brukeren har ikke administrator-rettigheter.";
      }
    } catch (err: any) {
      authError = err.message || "Feil passord.";
    } finally {
      isAuthenticating = false;
    }
  }

  async function handleCreateManualUser() {
    if (!newUsername.trim() || newUsername.trim().length < 2) {
      createUserError = "Brukernavn må være minst 2 tegn.";
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      createUserError = "Passord må være minst 4 tegn.";
      return;
    }

    isCreatingUser = true;
    createUserError = "";
    try {
      if (onCreateManualUser) {
        await onCreateManualUser({
          username: newUsername.trim(),
          password: newPassword.trim(),
          role: newRole,
          roomId: newRoomId ? (newRoomId as any) : undefined,
          fplEntryId: newFplEntryId || undefined,
        });
      } else {
        await createManualUserMutation.mutate({
          adminUserId: currentUser?._id,
          username: newUsername.trim(),
          password: newPassword.trim(),
          role: newRole,
          roomId: newRoomId ? (newRoomId as any) : undefined,
          fplEntryId: newFplEntryId || undefined,
        });
      }

      showSuccess(`Bruker "${newUsername.trim()}" ble opprettet!`);
      showCreateUserModal = false;
      newUsername = "";
      newPassword = "";
      newRole = "user";
      newRoomId = "";
      newFplEntryId = null;
    } catch (err: any) {
      createUserError = err.message || "Kunne ikke opprette bruker.";
    } finally {
      isCreatingUser = false;
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

  // Hjelpefunksjon for å finne alle lag som allerede er tildelt et rom
  function getAssignedEntryIds(): Set<number> {
    const assigned = new Set<number>();

    // 1. Fra lokal roomAssignments
    for (const rId in roomAssignments) {
      for (const t of roomAssignments[rId] || []) {
        if (t?.entryId) assigned.add(Number(t.entryId));
      }
    }

    // 2. Fra rommene i databasen (props rooms)
    for (const r of rooms || []) {
      for (const t of r.teams || []) {
        if (t?.entryId) assigned.add(Number(t.entryId));
      }
    }

    // 3. Fra fplTeams i databasen som har roomId
    for (const t of fplTeams || []) {
      if (t?.roomId && t?.entryId) {
        assigned.add(Number(t.entryId));
      }
    }

    return assigned;
  }

  async function handleFetchFplLeague() {
    if (!fplImportLeagueId) {
      alert("Vennligst oppgi en gyldig FPL Classic League ID.");
      return;
    }

    isFetchingFpl = true;
    try {
      // Sørg for at lokal roomAssignments har alle eksisterende lag i rommene
      const currentMap: Record<string, any[]> = { ...roomAssignments };
      for (const r of rooms || []) {
        if (!currentMap[r._id] || currentMap[r._id].length === 0) {
          if (r.teams && r.teams.length > 0) {
            currentMap[r._id] = [...r.teams];
          } else if (!currentMap[r._id]) {
            currentMap[r._id] = [];
          }
        }
      }
      roomAssignments = currentMap;

      const res = await onFetchFplLeague(Number(fplImportLeagueId));

      if (res && res.standings && Array.isArray(res.standings)) {
        // Finn alle lag som allerede er tildelt et rom (lokalt eller i DB)
        const assignedIds = getAssignedEntryIds();

        // Kun lag som IKKE allerede er tildelt noe rom legges i ufordelt pool
        const newUnassigned = res.standings.filter(
          (item: any) => !assignedIds.has(Number(item.entryId)),
        );

        unassignedPool = newUnassigned;

        const assignedCount = assignedIds.size;
        if (newUnassigned.length > 0) {
          showSuccess(
            `Hentet ${res.standings.length} lag fra FPL. ${assignedCount} lag beholdt i rommene, ${newUnassigned.length} nye lag lagt i spillerpoolen!`,
          );
        } else {
          showSuccess(
            `Alle ${res.standings.length} lag er allerede fordelt i rommene. Ingen nye lag å legge i spillerpoolen.`,
          );
        }
        return;
      }

      showSuccess(
        res?.error
          ? `FPL API: ${res.error}`
          : "FPL ligaen har ingen nye påmeldte lag for øyeblikket.",
      );
    } catch (err: any) {
      showSuccess("Kunne ikke hente FPL liga: " + formatConvexError(err));
    } finally {
      isFetchingFpl = false;
    }
  }

  // --- Custom Pointer & Mouse Drag-and-Drop System ---
  let isPointerDragging = $state(false);
  let pointerDragTeam = $state<any>(null);
  let pointerDragSourceRoomId = $state<string | null>(null);
  let pointerPos = $state({ x: 0, y: 0 });
  let hoveredTargetId = $state<string | null>(null);

  // Click-to-Select & Click-to-Place Mode
  let selectedPlayerForMove = $state<{
    team: any;
    sourceRoomId: string | null;
  } | null>(null);

  function startPointerDrag(
    team: any,
    sourceRoomId: string | null,
    e: PointerEvent,
  ) {
    if (e.button !== 0) return; // Kun venstre museklikk
    if (editingTeamEntryId === team.entryId) return; // Ikke dra under navneredigering

    e.preventDefault();

    pointerDragTeam = team;
    pointerDragSourceRoomId = sourceRoomId;
    pointerPos = { x: e.clientX, y: e.clientY };
    isPointerDragging = true;
    hoveredTargetId = null;

    window.addEventListener("pointermove", onWindowPointerMove, {
      passive: false,
    });
    window.addEventListener("pointerup", onWindowPointerUp);
    window.addEventListener("pointercancel", onWindowPointerUp);
  }

  function onWindowPointerMove(e: PointerEvent) {
    if (!isPointerDragging) return;
    pointerPos = { x: e.clientX, y: e.clientY };

    // Finn elementet under markøren
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const roomEl = el?.closest("[data-drop-room-id]");
    if (roomEl) {
      hoveredTargetId = roomEl.getAttribute("data-drop-room-id");
    } else {
      const poolEl = el?.closest("[data-drop-pool]");
      if (poolEl) {
        hoveredTargetId = "pool";
      } else {
        hoveredTargetId = null;
      }
    }
  }

  function onWindowPointerUp(e: PointerEvent) {
    if (!isPointerDragging) return;

    window.removeEventListener("pointermove", onWindowPointerMove);
    window.removeEventListener("pointerup", onWindowPointerUp);
    window.removeEventListener("pointercancel", onWindowPointerUp);

    const el = document.elementFromPoint(e.clientX, e.clientY);
    const roomEl = el?.closest("[data-drop-room-id]");
    const targetRoomId = roomEl?.getAttribute("data-drop-room-id");
    const poolEl = el?.closest("[data-drop-pool]");

    if (pointerDragTeam) {
      if (targetRoomId) {
        assignTeamLocally(
          pointerDragTeam,
          pointerDragSourceRoomId,
          targetRoomId,
        );
        const roomName =
          rooms.find((r) => r._id === targetRoomId)?.name || "rommet";
        showSuccess(`Flyttet ${pointerDragTeam.managerName} til ${roomName}!`);
      } else if (poolEl && pointerDragSourceRoomId) {
        removeTeamFromRoomLocally(pointerDragTeam, pointerDragSourceRoomId);
        showSuccess(
          `Flyttet ${pointerDragTeam.managerName} tilbake til spillerpoolen!`,
        );
      }
    }

    isPointerDragging = false;
    pointerDragTeam = null;
    pointerDragSourceRoomId = null;
    hoveredTargetId = null;
  }

  function toggleSelectPlayerForMove(
    team: any,
    sourceRoomId: string | null,
    e?: MouseEvent,
  ) {
    if (e) e.stopPropagation();
    if (selectedPlayerForMove?.team?.entryId === team.entryId) {
      selectedPlayerForMove = null;
    } else {
      selectedPlayerForMove = { team, sourceRoomId };
    }
  }

  function handleRoomClickToPlace(roomId: string) {
    if (selectedPlayerForMove) {
      assignTeamLocally(
        selectedPlayerForMove.team,
        selectedPlayerForMove.sourceRoomId,
        roomId,
      );
      const roomName = rooms.find((r) => r._id === roomId)?.name || "rommet";
      showSuccess(
        `Plasserte ${selectedPlayerForMove.team.managerName} i ${roomName}!`,
      );
      selectedPlayerForMove = null;
    }
  }

  function handlePoolClickToPlace() {
    if (selectedPlayerForMove && selectedPlayerForMove.sourceRoomId) {
      removeTeamFromRoomLocally(
        selectedPlayerForMove.team,
        selectedPlayerForMove.sourceRoomId,
      );
      showSuccess(
        `Flyttet ${selectedPlayerForMove.team.managerName} tilbake til spillerpoolen!`,
      );
      selectedPlayerForMove = null;
    }
  }

  // --- HTML5 Native Fallback Drag and Drop Handlers ---
  function onDragStartHandler(
    team: any,
    sourceRoomId: string | null,
    e: DragEvent,
  ) {
    activeDragTeam = team;
    activeDragSourceRoomId = sourceRoomId;

    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      const payload = JSON.stringify({
        entryId: team.entryId,
        teamName: team.teamName,
        managerName: team.managerName,
        sourceRoomId,
      });
      e.dataTransfer.setData("text/plain", payload);
      e.dataTransfer.setData("application/json", payload);
    }
  }

  function onDragEndHandler() {
    activeDragTeam = null;
    activeDragSourceRoomId = null;
    dragHoverTarget = null;
  }

  function onDragOverHandler(targetId: string, e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "move";
    }
    dragHoverTarget = targetId;
  }

  function onDragLeaveHandler(e: DragEvent) {
    e.preventDefault();
    if (e.currentTarget === e.target) {
      dragHoverTarget = null;
    }
  }

  function onDropOnRoomHandler(targetRoomId: string, e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragHoverTarget = null;

    let team = activeDragTeam;
    let sourceRoomId = activeDragSourceRoomId;

    if (!team && e.dataTransfer) {
      try {
        const raw =
          e.dataTransfer.getData("application/json") ||
          e.dataTransfer.getData("text/plain");
        if (raw) {
          const parsed = JSON.parse(raw);
          team = unassignedPool.find((t) => t.entryId === parsed.entryId);
          if (!team) {
            for (const rId in roomAssignments) {
              const found = (roomAssignments[rId] || []).find(
                (t) => t.entryId === parsed.entryId,
              );
              if (found) {
                team = found;
                break;
              }
            }
          }
          if (parsed.sourceRoomId !== undefined) {
            sourceRoomId = parsed.sourceRoomId;
          }
        }
      } catch {}
    }

    if (team) {
      assignTeamLocally(team, sourceRoomId, targetRoomId);
    }

    activeDragTeam = null;
    activeDragSourceRoomId = null;
  }

  function onDropOnPoolHandler(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragHoverTarget = null;

    let team = activeDragTeam;
    let sourceRoomId = activeDragSourceRoomId;

    if (!team && e.dataTransfer) {
      try {
        const raw =
          e.dataTransfer.getData("application/json") ||
          e.dataTransfer.getData("text/plain");
        if (raw) {
          const parsed = JSON.parse(raw);
          for (const rId in roomAssignments) {
            const found = (roomAssignments[rId] || []).find(
              (t) => t.entryId === parsed.entryId,
            );
            if (found) {
              team = found;
              sourceRoomId = rId;
              break;
            }
          }
        }
      } catch {}
    }

    if (team && sourceRoomId) {
      removeTeamFromRoomLocally(team, sourceRoomId);
    }

    activeDragTeam = null;
    activeDragSourceRoomId = null;
  }

  function assignTeamLocally(
    team: any,
    sourceRoomId: string | null,
    targetRoomId: string,
  ) {
    if (sourceRoomId === targetRoomId) return;

    // 1. Fjern fra kilde
    if (sourceRoomId) {
      roomAssignments[sourceRoomId] = (
        roomAssignments[sourceRoomId] || []
      ).filter((t) => t.entryId !== team.entryId);
    } else {
      unassignedPool = unassignedPool.filter((t) => t.entryId !== team.entryId);
    }

    // 2. Legg til i målrom
    const currentTarget = roomAssignments[targetRoomId] || [];
    if (!currentTarget.some((t) => t.entryId === team.entryId)) {
      roomAssignments[targetRoomId] = [...currentTarget, team];
    }

    // Tving reaktiv oppdatering i Svelte 5
    roomAssignments = { ...roomAssignments };
    unassignedPool = [...unassignedPool];
  }

  function removeTeamFromRoomLocally(team: any, sourceRoomId: string) {
    roomAssignments[sourceRoomId] = (
      roomAssignments[sourceRoomId] || []
    ).filter((t) => t.entryId !== team.entryId);

    if (!unassignedPool.some((t) => t.entryId === team.entryId)) {
      unassignedPool = [team, ...unassignedPool];
    }

    roomAssignments = { ...roomAssignments };
    unassignedPool = [...unassignedPool];
  }

  // --- Endre Romnavn ---
  function startEditingRoom(room: any, e?: MouseEvent) {
    if (e) e.stopPropagation();
    editingRoomId = room._id;
    editingRoomNewName = room.name || "";
  }

  function saveEditingRoom(room: any, e?: MouseEvent) {
    if (e) e.stopPropagation();
    if (!editingRoomNewName.trim()) return;
    const newName = editingRoomNewName.trim();
    room.name = newName;
    onUpdateRoomName(room._id, newName);
    editingRoomId = null;
    showSuccess(`Romnavn oppdatert til "${newName}"!`);
  }

  function cancelEditingRoom(e?: MouseEvent) {
    if (e) e.stopPropagation();
    editingRoomId = null;
  }

  // --- Endre Lagnavn ---
  function startEditingTeam(team: any, e?: MouseEvent) {
    if (e) e.stopPropagation();
    editingTeamEntryId = team.entryId;
    editingTeamNewName = team.teamName || "";
  }

  function saveEditingTeam(team: any, e?: MouseEvent) {
    if (e) e.stopPropagation();
    if (!editingTeamNewName.trim()) return;
    const newName = editingTeamNewName.trim();
    team.teamName = newName;

    // Oppdater i databasen
    onUpdateTeamName(team.entryId, newName);

    // Oppdater i lokale assignments og pool
    for (const rId in roomAssignments) {
      roomAssignments[rId] = roomAssignments[rId].map((t) =>
        t.entryId === team.entryId ? { ...t, teamName: newName } : t,
      );
    }
    unassignedPool = unassignedPool.map((t) =>
      t.entryId === team.entryId ? { ...t, teamName: newName } : t,
    );
    roomAssignments = { ...roomAssignments };

    editingTeamEntryId = null;
    showSuccess(`Lagnavn oppdatert til "${newName}"!`);
  }

  function cancelEditingTeam(e?: MouseEvent) {
    if (e) e.stopPropagation();
    editingTeamEntryId = null;
  }

  // --- Opprett & Slett Rom ---
  function handleCreateRoomSubmit() {
    if (!newRoomName.trim()) {
      alert("Vennligst oppgi et romnavn.");
      return;
    }
    onCreateRoom({
      name: newRoomName.trim(),
      accentColor: newRoomAccent,
    });
    newRoomName = "";
    showCreateRoomModal = false;
    showSuccess("Nytt rom opprettet!");
  }

  function promptDeleteRoom(room: any) {
    confirmDialog = {
      show: true,
      title: `Slett ${room.name}?`,
      message: `Er du sikker på at du vil slette dette rommet? Alle lag i rommet vil bli frigjort tilbake til spillerpoolen.`,
      confirmText: "Ja, slett rom",
      onConfirm: () => {
        const teamsToFree = roomAssignments[room._id] || [];
        unassignedPool = [...unassignedPool, ...teamsToFree];
        onDeleteRoom(room._id);
        delete roomAssignments[room._id];
        roomAssignments = { ...roomAssignments };
        confirmDialog.show = false;
        showSuccess(`Slettet ${room.name}.`);
      },
    };
  }

  function promptClearAllRooms() {
    confirmDialog = {
      show: true,
      title: "Tøm alle rom?",
      message:
        "Alle lag i rommene flyttes tilbake til spillerpoolen for en ren start.",
      confirmText: "Ja, tøm alle",
      onConfirm: () => {
        const allAssigned: any[] = [];
        for (const rId in roomAssignments) {
          for (const t of roomAssignments[rId]) {
            allAssigned.push(t);
          }
          roomAssignments[rId] = [];
        }
        unassignedPool = [...unassignedPool, ...allAssigned];
        roomAssignments = { ...roomAssignments };
        confirmDialog.show = false;
        showSuccess(
          "Alle rom er tømt. Trykk 'Lagre Rom-fordeling' for å lagre til databasen.",
        );
      },
    };
  }

  function handleAutoDistribute() {
    if (unassignedPool.length === 0) {
      showSuccess("Ingen ufordelte spillere i poolen å fordele.");
      return;
    }
    if (rooms.length === 0) return;

    const poolCopy = [...unassignedPool];
    const newMap: Record<string, any[]> = { ...roomAssignments };

    poolCopy.forEach((team) => {
      let minRoomId = rooms[0]._id;
      let minCount = (newMap[minRoomId] || []).length;

      for (const r of rooms) {
        const count = (newMap[r._id] || []).length;
        if (count < minCount) {
          minCount = count;
          minRoomId = r._id;
        }
      }

      newMap[minRoomId] = [...(newMap[minRoomId] || []), team];
    });

    roomAssignments = newMap;
    unassignedPool = [];
    showSuccess("Autofordelte alle spillere jevnt over rommene!");
  }

  function handleSaveAllRoomAssignments() {
    const assignmentsToSave: any[] = [];
    for (const roomId in roomAssignments) {
      const teamsInRoom = roomAssignments[roomId] || [];
      for (const t of teamsInRoom) {
        assignmentsToSave.push({
          entryId: t.entryId,
          teamName: t.teamName,
          managerName: t.managerName,
          roomId: roomId as any,
          totalPoints: t.totalPoints ?? t.total ?? 0,
          currentGwPoints: t.currentGwPoints ?? t.pts ?? 0,
          currentGwTransfersCost: t.currentGwTransfersCost ?? t.hits ?? 0,
        });
      }
    }

    onBatchSaveAssignments(assignmentsToSave, true);
    showSuccess(
      `Lagret ${assignmentsToSave.length} spillere permanent fordelt over rommene!`,
    );
  }

  function autoSuggestWinner(type: "room" | "individual" = winnerCategory) {
    const monthNames = [
      "Januar",
      "Februar",
      "Mars",
      "April",
      "Mai",
      "Juni",
      "Juli",
      "August",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];
    winningMonthName = monthNames[new Date().getMonth()] || "August";

    if (type === "room") {
      // Finn rommet med høyest gjennomsnittlig poengsum
      const sortedRooms = [...rooms].sort((a, b) => {
        const aAvg =
          a.calculatedAverage ??
          (a.teams && a.teams.length > 0 ? a.totalPoints / a.teams.length : 0);
        const bAvg =
          b.calculatedAverage ??
          (b.teams && b.teams.length > 0 ? b.totalPoints / b.teams.length : 0);
        return bAvg - aAvg;
      });

      const topRoom = sortedRooms[0];
      if (topRoom) {
        selectedWinnerRoomId = topRoom._id;
        const avg =
          topRoom.calculatedAverage ??
          (topRoom.teams && topRoom.teams.length > 0
            ? Math.round((topRoom.totalPoints / topRoom.teams.length) * 10) / 10
            : 0);
        winningScore = avg;
        customWinnerMessage = `Gratulerer til ${topRoom.name} som månedens beste FPL-rom med et snitt på ${avg} poeng!`;
        showSuccess(`Foreslo ledende rom: ${topRoom.name} (${avg}p snitt)`);
      } else {
        showSuccess("Ingen rom registrert ennå.");
      }
    } else {
      // Finn spilleren med høyest poengsum
      const allPlayers: any[] = [];
      for (const r of rooms) {
        if (r.teams) {
          for (const t of r.teams) {
            allPlayers.push({ ...t, roomName: r.name });
          }
        }
      }
      for (const t of unassignedPool) {
        allPlayers.push({ ...t, roomName: "Ufordelt" });
      }

      const sortedPlayers = allPlayers.sort(
        (a, b) =>
          (b.totalPoints ?? b.currentGwPoints ?? 0) -
          (a.totalPoints ?? a.currentGwPoints ?? 0),
      );
      const topPlayer = sortedPlayers[0];
      if (topPlayer) {
        winnerManagerName = topPlayer.managerName || "";
        winnerTeamName = topPlayer.teamName || "";
        winningScore = topPlayer.totalPoints ?? topPlayer.currentGwPoints ?? 0;
        customWinnerMessage = `Gratulerer til ${topPlayer.managerName} (${topPlayer.teamName || "FPL-lag"}) som månedens solovinner med ${winningScore} poeng!`;
        showSuccess(
          `Foreslo ledende spiller: ${topPlayer.managerName} (${winningScore}p)`,
        );
      } else {
        showSuccess("Ingen spillere registrert ennå.");
      }
    }
  }

  function handleCreateInviteSubmit() {
    onCreateInviteCode({
      customCode: newCodeCustom.trim() || undefined,
      validDays: Number(newCodeValidDays),
      role: newCodeRole,
    });
    newCodeCustom = "";
    showSuccess("Ny invitasjonskode generert!");
  }

  function handleWinnerSubmit() {
    if (winnerCategory === "room" && !selectedWinnerRoomId) {
      alert("Vennligst velg et vinnerrom!");
      return;
    }
    if (winnerCategory === "individual" && !winnerManagerName.trim()) {
      alert("Vennligst oppgi managers navn for den individuelle vinneren!");
      return;
    }

    onDeclareWinner({
      monthKey: winningMonthName.toLowerCase(),
      monthName: winningMonthName,
      winnerType: winnerCategory,
      winningRoomId:
        winnerCategory === "room" ? (selectedWinnerRoomId as any) : undefined,
      winnerName:
        winnerCategory === "room"
          ? rooms.find((r) => r._id === selectedWinnerRoomId)?.name ||
            "Vinnerrom"
          : winnerManagerName.trim(),
      winnerTeamName:
        winnerCategory === "individual" ? winnerTeamName.trim() : undefined,
      winningScore: Number(winningScore),
      content:
        customWinnerMessage.trim() ||
        (winnerCategory === "room"
          ? `Gratulerer til ${rooms.find((r) => r._id === selectedWinnerRoomId)?.name} som månedens beste FPL-rom!`
          : `Gratulerer til ${winnerManagerName.trim()} som månedens individuelle ener!`),
    });

    showSuccess(
      `Kåret månedens ${winnerCategory === "room" ? "romvinner" : "solovinner"} for ${winningMonthName}!`,
    );
  }

  // --- Cup / Sluttspill Handlers ---
  async function handleCreateCupSubmit() {
    if (!newCupName.trim()) {
      alert("Vennligst oppgi et navn på cupen.");
      return;
    }
    isCreatingCup = true;
    try {
      await createCupMutation.mutate({
        adminUserId: currentUser?._id,
        name: newCupName.trim(),
        startGameweek: Number(newCupStartGw),
        format: newCupFormat,
        seedMethod: newCupSeedMethod,
      });
      showSuccess(`Cup "${newCupName.trim()}" opprettet!`);
    } catch (err: any) {
      alert(formatConvexError(err, "Kunne ikke opprette cup."));
    } finally {
      isCreatingCup = false;
    }
  }

  async function handleCalculateCupRound(cupId: string, roundNumber: number) {
    isCalculatingCupRound = true;
    try {
      const res = await calculateCupScoresMutation.mutate({
        adminUserId: currentUser?._id,
        cupId: cupId as any,
        roundNumber,
      });
      showSuccess(
        `Oppdaterte ${res.updatedMatchesCount} kamper for runde ${roundNumber}!`,
      );
    } catch (err: any) {
      alert(formatConvexError(err, "Kunne ikke beregne runderesultater."));
    } finally {
      isCalculatingCupRound = false;
    }
  }

  function startEditingMatch(match: any) {
    selectedMatchForEdit = match;
    editMatchRoom1Id = match.room1Id || "";
    editMatchRoom2Id = match.room2Id || "";
    editMatchWinnerId = match.winnerRoomId || "";
    editMatchScore1 = match.room1Score;
    editMatchScore2 = match.room2Score;
  }

  async function handleSaveEditMatch() {
    if (!selectedMatchForEdit) return;
    try {
      await updateMatchMutation.mutate({
        adminUserId: currentUser?._id,
        matchId: selectedMatchForEdit._id,
        room1Id: editMatchRoom1Id ? (editMatchRoom1Id as any) : undefined,
        room2Id: editMatchRoom2Id ? (editMatchRoom2Id as any) : undefined,
        winnerRoomId: editMatchWinnerId
          ? (editMatchWinnerId as any)
          : undefined,
        room1Score:
          editMatchScore1 !== undefined && editMatchScore1 !== null
            ? Number(editMatchScore1)
            : undefined,
        room2Score:
          editMatchScore2 !== undefined && editMatchScore2 !== null
            ? Number(editMatchScore2)
            : undefined,
      });
      selectedMatchForEdit = null;
      showSuccess("Kampoppsett oppdatert!");
    } catch (err: any) {
      alert(formatConvexError(err, "Kunne ikke oppdatere kamp."));
    }
  }

  function promptDeleteCup(cupId: string) {
    confirmDialog = {
      show: true,
      title: "Slett og nullstill Cup?",
      message:
        "Dette vil slette hele turneringen, alle genererte kamper og bracket-strukturen.",
      confirmText: "Ja, slett cup",
      onConfirm: async () => {
        try {
          await deleteCupMutation.mutate({
            adminUserId: currentUser?._id,
            cupId: cupId as any,
          });
          confirmDialog.show = false;
          showSuccess("Cupen ble slettet.");
        } catch (err: any) {
          alert(formatConvexError(err, "Kunne ikke slette cup."));
        }
      },
    };
  }

  function showSuccess(msg: string) {
    successMessage = msg;
    setTimeout(() => {
      successMessage = "";
    }, 4000);
  }

  let filteredPool = $derived(
    unassignedPool.filter(
      (t) =>
        t.managerName?.toLowerCase().includes(searchPoolQuery.toLowerCase()) ||
        t.teamName?.toLowerCase().includes(searchPoolQuery.toLowerCase()) ||
        String(t.entryId).includes(searchPoolQuery),
    ),
  );
</script>

{#if isOpen}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 text-[#E2E8F0] font-sans"
  >
    <!-- Modal Container -->
    <div
      role="dialog"
      aria-modal="true"
      class="w-[96vw] max-w-7xl h-[92vh] bg-[#2A303C] border border-[#384252] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
    >
      <!-- Modal Header -->
      <div
        class="px-5 py-4 border-b border-[#384252] bg-[#191E24] flex items-center justify-between shrink-0"
      >
        <div class="flex items-center gap-3">
          <div
            class="p-2 rounded-xl bg-[#9FE88D]/15 border border-[#9FE88D]/30 text-[#9FE88D]"
          >
            <Shield class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-base font-bold text-white flex items-center gap-2">
              <span>Administrasjonspanel</span>
              <span
                class="text-[10px] px-2 py-0.5 rounded-full bg-[#9FE88D]/15 text-[#9FE88D] border border-[#9FE88D]/30 font-bold uppercase"
              >
                Admin
              </span>
            </h2>
            <p class="text-xs text-[#94A3B8]">
              Administrer FPL-integrasjon, fordel lag i rom og kår månedsvinnere
            </p>
          </div>
        </div>

        <button
          onclick={onClose}
          class="p-2 rounded-xl bg-[#242B35] hover:bg-[#384252] text-[#94A3B8] hover:text-white transition-colors"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Autentisering hvis ikke logget inn som admin -->
      {#if !isAuthenticated}
        <div
          class="flex-1 flex flex-col items-center justify-center p-6 space-y-4"
        >
          <div
            class="w-16 h-16 rounded-2xl bg-[#9FE88D]/10 border border-[#9FE88D]/30 flex items-center justify-center text-[#9FE88D] mb-2 shadow-sm"
          >
            <Lock class="w-8 h-8" />
          </div>

          <div class="text-center space-y-1">
            <h3 class="text-lg font-bold text-white">Administrator-tilgang</h3>
            <p class="text-xs text-[#94A3B8] max-w-sm">
              {#if currentUser}
                Bekreft passordet for <strong>{currentUser.username}</strong> for å åpne administrasjonspanelet.
              {:else}
                Du må være logget inn som administrator for å åpne administrasjonspanelet.
              {/if}
            </p>
          </div>

          {#if authError}
            <div
              class="p-3 rounded-xl bg-[#FB6F84]/15 border border-[#FB6F84]/40 text-[#FB6F84] text-xs font-semibold flex items-center gap-2"
            >
              <AlertTriangle class="w-4 h-4" />
              <span>{authError}</span>
            </div>
          {/if}

          {#if currentUser}
            <form
              onsubmit={(e) => {
                e.preventDefault();
                handleAuth();
              }}
              class="flex items-center gap-2"
            >
              <input
                type="password"
                bind:value={adminPasswordInput}
                placeholder="Ditt passord"
                class="w-56 px-4 py-2.5 rounded-xl bg-[#191E24] border border-[#384252] text-sm text-white focus:border-[#9FE88D] focus:outline-none"
              />
              <button
                type="submit"
                disabled={isAuthenticating}
                class="px-5 py-2.5 rounded-xl bg-[#9FE88D] hover:bg-[#8ce078] text-[#16380c] font-bold text-sm transition-colors shadow-md disabled:opacity-50"
              >
                {isAuthenticating ? "Verifiserer..." : "Lås opp"}
              </button>
            </form>
          {/if}
        </div>
      {:else}
        <!-- Tab Meny (DaisyUI Dim Style) -->
        <div
          class="flex items-center gap-2 px-5 border-b border-[#384252] bg-[#191E24] shrink-0 overflow-x-auto whitespace-nowrap"
        >
          <button
            onclick={() => (activeTab = "matching")}
            class={`px-4 py-3 border-b-2 text-sm font-semibold transition-colors flex items-center gap-2 shrink-0 ${
              activeTab === "matching"
                ? "border-[#9FE88D] text-[#9FE88D] font-bold"
                : "border-transparent text-[#94A3B8] hover:text-white"
            }`}
          >
            <Layers class="w-4 h-4" />
            <span>Lagoppsett</span>
          </button>

          <button
            onclick={() => (activeTab = "settings")}
            class={`px-4 py-3 border-b-2 text-sm font-semibold transition-colors flex items-center gap-2 shrink-0 ${
              activeTab === "settings"
                ? "border-[#9FE88D] text-[#9FE88D] font-bold"
                : "border-transparent text-[#94A3B8] hover:text-white"
            }`}
          >
            <span>⚙️</span>
            <span>Ligainnstillinger</span>
          </button>

          <button
            onclick={() => (activeTab = "winner")}
            class={`px-4 py-3 border-b-2 text-sm font-semibold transition-colors flex items-center gap-2 shrink-0 ${
              activeTab === "winner"
                ? "border-[#F4C152] text-[#F4C152] font-bold"
                : "border-transparent text-[#94A3B8] hover:text-white"
            }`}
          >
            <span>🏆</span>
            <span>Kåringer og vinnere</span>
            {#if winnersStatus?.isRoundWinnerOverridden || winnersStatus?.isTopRoomOverridden}
              <span
                class="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse"
                title="Aktive manuelle overstyringer"
              ></span>
            {/if}
          </button>

          <button
            onclick={() => (activeTab = "users")}
            class={`px-4 py-3 border-b-2 text-sm font-semibold transition-colors flex items-center gap-2 shrink-0 ${
              activeTab === "users"
                ? "border-[#9FE88D] text-[#9FE88D] font-bold"
                : "border-transparent text-[#94A3B8] hover:text-white"
            }`}
          >
            <span>👥</span>
            <span>Brukere ({users.length})</span>
          </button>

          <button
            onclick={() => (activeTab = "invites")}
            class={`px-4 py-3 border-b-2 text-sm font-semibold transition-colors flex items-center gap-2 shrink-0 ${
              activeTab === "invites"
                ? "border-[#9FE88D] text-[#9FE88D] font-bold"
                : "border-transparent text-[#94A3B8] hover:text-white"
            }`}
          >
            <span>🎟️</span>
            <span>Invitasjonskoder</span>
          </button>

          <button
            onclick={() => (activeTab = "chat")}
            class={`px-4 py-3 border-b-2 text-sm font-semibold transition-colors flex items-center gap-2 shrink-0 ${
              activeTab === "chat"
                ? "border-[#FB6F84] text-[#FB6F84] font-bold"
                : "border-transparent text-[#94A3B8] hover:text-white"
            }`}
          >
            <MessageSquareX class="w-4 h-4" />
            <span>Chat</span>
          </button>

          <button
            onclick={() => (activeTab = "cup")}
            class={`px-4 py-3 border-b-2 text-sm font-semibold transition-colors flex items-center gap-2 shrink-0 ${
              activeTab === "cup"
                ? "border-[#F4C152] text-[#F4C152] font-bold"
                : "border-transparent text-[#94A3B8] hover:text-white"
            }`}
          >
            <Swords class="w-4 h-4 text-[#F4C152]" />
            <span>Cup</span>
          </button>
        </div>

        <!-- Suksessvarsel (Dim Toast) -->
        {#if successMessage}
          <div
            class="mx-5 mt-3 p-3 rounded-xl bg-[#9FE88D]/15 border border-[#9FE88D]/40 text-[#9FE88D] text-sm font-semibold flex items-center gap-2.5 shrink-0 shadow-sm animate-in fade-in duration-150"
          >
            <Check class="w-5 h-5 text-[#9FE88D]" />
            <span>{successMessage}</span>
          </div>
        {/if}

        <!-- Tab 1: Vertikale Rom-drawers & Drag-and-Drop Matching -->
        {#if activeTab === "matching"}
          <div
            class="p-4 sm:p-5 space-y-4 overflow-hidden flex-1 flex flex-col min-h-0"
          >
            <!-- FPL Import & Kontrollinje -->
            <div
              class="p-3.5 rounded-xl bg-[#242B35] border border-[#384252] flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-sm"
            >
              <div class="flex flex-wrap items-center gap-3">
                <div>
                  <label
                    for="admin-fpl-league-id"
                    class="text-xs font-bold text-[#94A3B8] block mb-1"
                  >
                    FPL Classic League ID:
                  </label>
                  <div class="flex items-center gap-2">
                    <input
                      id="admin-fpl-league-id"
                      type="number"
                      bind:value={fplImportLeagueId}
                      placeholder="464734"
                      class="px-3.5 py-1.5 rounded-lg bg-[#191E24] border border-[#384252] text-sm text-white focus:border-[#9FE88D] focus:outline-none w-36 font-mono font-bold"
                    />
                    <button
                      onclick={handleFetchFplLeague}
                      disabled={isFetchingFpl}
                      class="px-3.5 py-1.5 rounded-lg bg-[#242B35] hover:bg-[#384252] text-[#E2E8F0] border border-[#384252] text-xs font-bold transition-all flex items-center gap-2"
                    >
                      <Download class="w-3.5 h-3.5 text-[#9FE88D]" />
                      <span>{isFetchingFpl ? "Henter..." : "Hent lag"}</span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Handlingsknapper for matching -->
              <div class="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onclick={() => (showCreateRoomModal = true)}
                  class="px-3.5 py-1.5 rounded-lg bg-[#242B35] hover:bg-[#384252] text-[#E2E8F0] border border-[#384252] text-xs font-bold transition-colors flex items-center gap-1.5"
                  title="Opprett et nytt rom i ligaen"
                >
                  <Plus class="w-3.5 h-3.5 text-[#9FE88D]" />
                  <span>Legg til rom</span>
                </button>

                <button
                  type="button"
                  onclick={promptClearAllRooms}
                  class="px-3 py-1.5 rounded-lg bg-[#361c1c] hover:bg-[#452323] text-[#FB6F84] border border-[#522525] text-xs font-bold transition-colors flex items-center gap-1.5"
                  title="Fjern alle lag fra rommene for en ren start"
                >
                  <Trash2 class="w-3.5 h-3.5 text-[#FB6F84]" />
                  <span>Tøm alle rom</span>
                </button>

                <button
                  type="button"
                  onclick={handleSaveAllRoomAssignments}
                  class="px-4 py-1.5 rounded-lg bg-[#9FE88D] hover:bg-[#8ce078] text-[#16380c] font-bold text-xs transition-all shadow-sm flex items-center gap-2"
                >
                  <Save class="w-4 h-4" />
                  <span>Lagre Rom-fordeling</span>
                </button>
              </div>
            </div>

            <!-- Valgt Spiller Hurtigplassering Banner -->
            {#if selectedPlayerForMove}
              <div
                class="p-3 rounded-xl bg-[#9FE88D]/20 border border-[#9FE88D]/50 text-[#9FE88D] text-xs font-bold flex flex-wrap items-center justify-between gap-2 shrink-0 animate-in fade-in duration-150"
              >
                <div class="flex items-center gap-2">
                  <span class="text-base">👉</span>
                  <span
                    >Valgt for flytting: <strong class="text-white"
                      >{selectedPlayerForMove.team.managerName}</strong
                    >
                    ({selectedPlayerForMove.team.teamName})</span
                  >
                  <span class="text-[#E2E8F0] font-normal"
                    >• Klikk på et rom nedenfor for å plassere</span
                  >
                </div>
                <button
                  type="button"
                  onclick={() => (selectedPlayerForMove = null)}
                  class="px-3 py-1 rounded-lg bg-[#242B35] text-white hover:bg-[#384252] text-xs font-semibold border border-[#384252]"
                >
                  Avbryt
                </button>
              </div>
            {/if}

            <!-- Hoved-arbeidsområde: Venstre Spillerpool + Høyre Vertikale Rom-drawers -->
            <div class="grid grid-cols-12 gap-4 flex-1 min-h-0 overflow-hidden">
              <!-- Venstre: Spillerpool (Drop target for å fjerne fra rom) -->
              <div
                role="button"
                aria-label="Ufordelte spillere"
                data-drop-pool="true"
                onclick={handlePoolClickToPlace}
                onkeydown={(e) =>
                  (e.key === "Enter" || e.key === " ") &&
                  handlePoolClickToPlace()}
                tabindex="0"
                ondragenter={(e) => {
                  e.preventDefault();
                  dragHoverTarget = "pool";
                }}
                ondragover={(e) => onDragOverHandler("pool", e)}
                ondragleave={onDragLeaveHandler}
                ondrop={onDropOnPoolHandler}
                class={`col-span-12 lg:col-span-4 rounded-xl bg-[#242B35] border p-3.5 flex flex-col min-h-0 transition-colors shadow-sm cursor-pointer ${
                  dragHoverTarget === "pool" || hoveredTargetId === "pool"
                    ? "border-[#9FE88D] bg-[#9FE88D]/15 ring-2 ring-[#9FE88D]/40"
                    : selectedPlayerForMove &&
                        selectedPlayerForMove.sourceRoomId
                      ? "border-[#9FE88D]/60 bg-[#9FE88D]/5 ring-1 ring-[#9FE88D]/30"
                      : "border-[#384252]"
                }`}
              >
                <!-- Header med søk -->
                <div
                  class="space-y-2 pb-2.5 border-b border-[#384252] shrink-0"
                  onclick={(e) => e.stopPropagation()}
                  role="presentation"
                >
                  <div class="flex items-center justify-between">
                    <h4
                      class="text-sm font-bold text-white flex items-center gap-2"
                    >
                      <Users class="w-4 h-4 text-[#9FE88D]" />
                      <span>Spillerpool</span>
                    </h4>
                    <span
                      class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#191E24] border border-[#384252] text-[#9FE88D]"
                    >
                      {unassignedPool.length} lag
                    </span>
                  </div>

                  <div class="relative">
                    <Search
                      class="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-2.5"
                    />
                    <input
                      type="text"
                      bind:value={searchPoolQuery}
                      placeholder="Søk etter manager eller lagnavn..."
                      class="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#191E24] border border-[#384252] text-xs text-white placeholder-[#94A3B8] focus:border-[#9FE88D] focus:outline-none"
                    />
                  </div>
                </div>

                <!-- Liste over ufordelte spillere -->
                <div
                  class="flex-1 overflow-y-auto space-y-2 pt-2 pr-1 custom-scrollbar"
                >
                  {#if filteredPool.length === 0}
                    <div
                      class="h-full flex flex-col items-center justify-center text-center p-6 text-[#94A3B8] text-xs"
                    >
                      <Users class="w-8 h-8 text-[#384252] mb-2" />
                      <p class="font-medium">Ingen ufordelte spillere.</p>
                      <p class="text-[11px] text-[#94A3B8]/70 mt-1">
                        Trykk "Hent lag" for å importere påmeldte.
                      </p>
                    </div>
                  {/if}

                  {#each filteredPool as team (team.entryId)}
                    {@const isSelected =
                      selectedPlayerForMove?.team?.entryId === team.entryId}
                    <div
                      role="button"
                      tabindex="0"
                      onpointerdown={(e) => startPointerDrag(team, null, e)}
                      onclick={(e) => toggleSelectPlayerForMove(team, null, e)}
                      onkeydown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleSelectPlayerForMove(team, null);
                        }
                      }}
                      class={`p-2.5 rounded-lg border text-xs transition-all space-y-1.5 shadow-sm group select-none ${
                        isSelected
                          ? "bg-[#9FE88D]/20 border-[#9FE88D] ring-2 ring-[#9FE88D]"
                          : "bg-[#191E24] border-[#384252] hover:border-[#9FE88D]"
                      } ${
                        editingTeamEntryId === team.entryId
                          ? "cursor-default"
                          : "cursor-grab active:cursor-grabbing"
                      }`}
                    >
                      <div class="flex items-start justify-between gap-2">
                        <div class="min-w-0 flex-1">
                          {#if editingTeamEntryId === team.entryId}
                            <div class="flex items-center gap-1 mb-1">
                              <input
                                type="text"
                                draggable="false"
                                bind:value={editingTeamNewName}
                                onkeydown={(e) => {
                                  if (e.key === "Enter") saveEditingTeam(team);
                                  if (e.key === "Escape") cancelEditingTeam();
                                }}
                                class="w-full px-2 py-0.5 rounded bg-[#191E24] border border-[#9FE88D] text-xs text-white focus:outline-none font-semibold"
                              />
                              <button
                                type="button"
                                onclick={(e) => saveEditingTeam(team, e)}
                                class="p-1 rounded bg-[#9FE88D] text-[#16380c] hover:bg-[#8ce078]"
                                title="Lagre lagnavn"
                              >
                                <Check class="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onclick={(e) => cancelEditingTeam(e)}
                                class="p-1 rounded bg-[#242B35] text-[#94A3B8] hover:text-white"
                                title="Avbryt"
                              >
                                <X class="w-3 h-3" />
                              </button>
                            </div>
                          {:else}
                            <div class="flex items-center gap-1.5">
                              <p
                                class="font-bold text-white text-xs truncate group-hover:text-[#9FE88D] transition-colors"
                              >
                                {team.teamName}
                              </p>
                              <button
                                type="button"
                                onclick={(e) => startEditingTeam(team, e)}
                                class="opacity-0 group-hover:opacity-100 p-0.5 text-[#94A3B8] hover:text-white transition-opacity"
                                title="Endre lagnavn"
                              >
                                <Pencil class="w-3 h-3" />
                              </button>
                            </div>
                          {/if}

                          <p class="text-[11px] text-[#94A3B8] truncate">
                            {team.managerName}
                          </p>
                        </div>

                        <div class="flex items-center gap-1 shrink-0">
                          <span
                            class="text-[10px] font-mono text-[#94A3B8] bg-[#191E24] px-1.5 py-0.5 rounded border border-[#384252]"
                          >
                            #{team.entryId}
                          </span>
                          <GripVertical
                            class="w-3.5 h-3.5 text-[#94A3B8]/50 group-hover:text-[#9FE88D]"
                          />
                        </div>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>

              <!-- Høyre: Vertikale Rom-drawers -->
              <div
                class="col-span-12 lg:col-span-8 rounded-xl bg-[#242B35] border border-[#384252] p-3.5 flex flex-col min-h-0 shadow-sm"
              >
                <div
                  class="flex items-center justify-between pb-2.5 border-b border-[#384252] shrink-0"
                >
                  <div class="flex items-center gap-2">
                    <h4
                      class="text-sm font-bold text-white flex items-center gap-1.5"
                    >
                      <Layers class="w-4 h-4 text-[#9FE88D]" />
                      <span>Rom-drawers ({rooms.length} Rom)</span>
                    </h4>
                    <span class="text-xs text-[#94A3B8]"
                      >• Dra, klikk eller velg rom for å fordele</span
                    >
                  </div>
                </div>

                <!-- Grid over Rom-drawers -->
                <div
                  class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 overflow-y-auto pt-2.5 pr-1 flex-1 custom-scrollbar"
                >
                  {#each rooms as room (room._id)}
                    {@const teamsInRoom = roomAssignments[room._id] || []}
                    {@const isHovered =
                      dragHoverTarget === room._id ||
                      hoveredTargetId === room._id}
                    <div
                      role="button"
                      aria-label={`Rom ${room.name}`}
                      data-drop-room-id={room._id}
                      onclick={() => handleRoomClickToPlace(room._id)}
                      onkeydown={(e) =>
                        (e.key === "Enter" || e.key === " ") &&
                        handleRoomClickToPlace(room._id)}
                      tabindex="0"
                      ondragenter={(e) => {
                        e.preventDefault();
                        dragHoverTarget = room._id;
                      }}
                      ondragover={(e) => onDragOverHandler(room._id, e)}
                      ondragleave={onDragLeaveHandler}
                      ondrop={(e) => onDropOnRoomHandler(room._id, e)}
                      class={`rounded-xl bg-[#191E24] border p-3 flex flex-col min-h-[180px] transition-all shadow-sm cursor-pointer select-none ${
                        isHovered
                          ? "border-[#9FE88D] ring-2 ring-[#9FE88D]/40 bg-[#9FE88D]/15"
                          : selectedPlayerForMove
                            ? "border-[#9FE88D]/50 bg-[#9FE88D]/5 hover:bg-[#9FE88D]/10 hover:border-[#9FE88D]"
                            : "border-[#384252] hover:border-[#4b5563]"
                      }`}
                    >
                      <!-- Drawer Header (med inline redigering av romnavn) -->
                      <div
                        class="flex items-center justify-between pb-2 border-b border-[#384252] shrink-0"
                      >
                        <div class="flex items-center gap-2 min-w-0 flex-1">
                          <span
                            class="w-3 h-3 rounded-full shrink-0 shadow-sm"
                            style={`background-color: ${room.accentColor || "#9FE88D"}`}
                          ></span>

                          {#if editingRoomId === room._id}
                            <div class="flex items-center gap-1 flex-1 min-w-0">
                              <input
                                type="text"
                                bind:value={editingRoomNewName}
                                onkeydown={(e) => {
                                  if (e.key === "Enter") saveEditingRoom(room);
                                  if (e.key === "Escape") cancelEditingRoom();
                                }}
                                class="w-full px-1.5 py-0.5 rounded bg-[#191E24] border border-[#9FE88D] text-xs text-white focus:outline-none"
                              />
                              <button
                                type="button"
                                onclick={(e) => saveEditingRoom(room, e)}
                                class="p-0.5 rounded bg-[#9FE88D] text-[#16380c] hover:bg-[#8ce078]"
                              >
                                <Check class="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onclick={(e) => cancelEditingRoom(e)}
                                class="p-0.5 rounded bg-[#242B35] text-[#94A3B8]"
                              >
                                <X class="w-3 h-3" />
                              </button>
                            </div>
                          {:else}
                            <div class="flex items-center gap-1.5 truncate">
                              <span
                                class="font-bold text-xs text-white truncate"
                                >{room.name}</span
                              >
                              <button
                                type="button"
                                onclick={(e) => startEditingRoom(room, e)}
                                class="p-0.5 text-[#94A3B8] hover:text-white transition-colors"
                                title="Endre romnavn"
                              >
                                <Pencil class="w-3 h-3" />
                              </button>
                            </div>
                          {/if}
                        </div>

                        <div class="flex items-center gap-1.5 shrink-0">
                          <span
                            class={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                              teamsInRoom.length >= 2
                                ? "bg-[#9FE88D]/15 text-[#9FE88D] border-[#9FE88D]/30"
                                : "bg-[#191E24] text-[#94A3B8] border-[#384252]"
                            }`}
                          >
                            {teamsInRoom.length} lag
                          </span>

                          <button
                            type="button"
                            onclick={() => promptDeleteRoom(room)}
                            title={`Slett ${room.name}`}
                            class="p-1 rounded text-[#94A3B8] hover:text-[#FB6F84] hover:bg-[#3b2222] transition-colors"
                          >
                            <Trash2 class="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <!-- Drawer Spillere / Drop Zone -->
                      <div
                        class="flex-1 space-y-1.5 pt-2 overflow-y-auto custom-scrollbar min-h-[90px]"
                      >
                        {#if teamsInRoom.length === 0}
                          <div
                            class="h-full flex flex-col items-center justify-center text-xs text-[#94A3B8]/70 border border-dashed border-[#384252] rounded-lg p-3 text-center"
                          >
                            <span
                              >Slipp spillere her eller klikk for å plassere</span
                            >
                          </div>
                        {/if}

                        {#each teamsInRoom as team (team.entryId)}
                          {@const isSelectedTeam =
                            selectedPlayerForMove?.team?.entryId ===
                            team.entryId}
                          <div
                            role="button"
                            tabindex="0"
                            onpointerdown={(e) =>
                              startPointerDrag(team, room._id, e)}
                            onclick={(e) =>
                              toggleSelectPlayerForMove(team, room._id, e)}
                            onkeydown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                toggleSelectPlayerForMove(team, room._id);
                              }
                            }}
                            class={`p-2 rounded-lg border text-xs flex items-center justify-between gap-2 transition-all shadow-sm group select-none ${
                              isSelectedTeam
                                ? "bg-[#9FE88D]/20 border-[#9FE88D] ring-2 ring-[#9FE88D]"
                                : "bg-[#191E24] border-[#384252] hover:border-[#9FE88D]"
                            } ${
                              editingTeamEntryId === team.entryId
                                ? "cursor-default"
                                : "cursor-grab active:cursor-grabbing"
                            }`}
                          >
                            <div class="min-w-0 flex-1">
                              {#if editingTeamEntryId === team.entryId}
                                <div class="flex items-center gap-1">
                                  <input
                                    type="text"
                                    draggable="false"
                                    bind:value={editingTeamNewName}
                                    onkeydown={(e) => {
                                      if (e.key === "Enter")
                                        saveEditingTeam(team);
                                      if (e.key === "Escape")
                                        cancelEditingTeam();
                                    }}
                                    class="w-full px-1.5 py-0.5 rounded bg-[#191E24] border border-[#9FE88D] text-xs text-white focus:outline-none font-semibold"
                                  />
                                  <button
                                    type="button"
                                    onclick={(e) => saveEditingTeam(team, e)}
                                    class="p-0.5 rounded bg-[#9FE88D] text-[#16380c] hover:bg-[#8ce078]"
                                    title="Lagre"
                                  >
                                    <Check class="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onclick={(e) => cancelEditingTeam(e)}
                                    class="p-0.5 rounded bg-[#242B35] text-[#94A3B8]"
                                    title="Avbryt"
                                  >
                                    <X class="w-3 h-3" />
                                  </button>
                                </div>
                              {:else}
                                <div class="flex items-center gap-1">
                                  <span
                                    class="font-bold text-white block truncate text-xs"
                                    >{team.teamName}</span
                                  >
                                  <button
                                    type="button"
                                    onclick={(e) => startEditingTeam(team, e)}
                                    class="opacity-0 group-hover:opacity-100 p-0.5 text-[#94A3B8] hover:text-white transition-opacity"
                                    title="Endre lagnavn"
                                  >
                                    <Pencil class="w-3 h-3" />
                                  </button>
                                </div>
                              {/if}
                              <p class="text-[11px] text-[#94A3B8] truncate">
                                {team.managerName}
                              </p>
                            </div>

                            <div
                              class="flex items-center gap-1.5 shrink-0"
                              onclick={(e) => e.stopPropagation()}
                              role="presentation"
                            >
                              <GripVertical
                                class="w-3.5 h-3.5 text-[#94A3B8]/40 group-hover:text-[#9FE88D]"
                              />
                              <button
                                type="button"
                                onclick={() =>
                                  removeTeamFromRoomLocally(team, room._id)}
                                title="Flytt tilbake til spillerpool"
                                class="p-1 rounded text-[#94A3B8] hover:text-[#FB6F84] hover:bg-[#3b2222] transition-colors"
                              >
                                <X class="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        {/each}

                        <!-- Dedicated Drop-Target Zone in Drawer -->
                        <div
                          role="region"
                          aria-label={`Slipp lag i ${room.name}`}
                          ondragover={(e) => onDragOverHandler(room._id, e)}
                          ondrop={(e) => onDropOnRoomHandler(room._id, e)}
                          class={`mt-1.5 py-2 px-2.5 rounded-lg border-2 border-dashed text-center text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                            isHovered
                              ? "border-[#9FE88D] bg-[#9FE88D]/20 text-[#9FE88D] ring-2 ring-[#9FE88D]/40"
                              : "border-[#384252] text-[#94A3B8]/70 hover:border-[#4b5563] hover:text-[#E2E8F0]"
                          }`}
                        >
                          <Plus class="w-3 h-3 text-[#9FE88D]" />
                          <span>Slipp lag her for å legge til</span>
                        </div>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            </div>
          </div>
        {/if}

        <!-- Tab 2: Ligainnstillinger -->
        {#if activeTab === "settings"}
          <div
            class="p-6 space-y-5 overflow-y-auto flex-1 max-w-3xl custom-scrollbar"
          >
            <!-- Direkte FPL-synkronisering av lag og tabell -->
            <div
              class="p-4 rounded-xl bg-[#242B35] border border-[#70E1F8]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
            >
              <div>
                <h4
                  class="text-xs font-bold text-white flex items-center gap-1.5"
                >
                  <RefreshCw class="w-4 h-4 text-[#70E1F8]" />
                  <span>Hent inn & synkroniser alle lag fra FPL</span>
                </h4>
                <p class="text-[11px] text-[#94A3B8] mt-0.5">
                  Henter alle registrerte lag i Classic League #{leagueId} fra det
                  offisielle FPL API-et og oppdaterer laglisten.
                </p>
              </div>
              <button
                type="button"
                disabled={isSyncingLeague}
                onclick={async () => {
                  isSyncingLeague = true;
                  try {
                    const res = await onFetchFplLeague(leagueId);
                    showSuccess(
                      `Synkroniserte ${res?.teamCount ?? "alle"} lag fra FPL Classic League #${leagueId}!`,
                    );
                  } catch (err: any) {
                    showError(
                      err.message || "Kunne ikke hente lag fra FPL API.",
                    );
                  } finally {
                    isSyncingLeague = false;
                  }
                }}
                class="px-4 py-2.5 rounded-xl bg-[#70E1F8] hover:bg-[#5cd4ec] disabled:opacity-50 text-[#0f2933] font-bold text-xs transition-colors shadow-sm flex items-center justify-center gap-2 shrink-0"
              >
                <RefreshCw
                  class={`w-4 h-4 ${isSyncingLeague ? "animate-spin" : ""}`}
                />
                <span
                  >{isSyncingLeague
                    ? "Henter fra FPL..."
                    : "Synk FPL-lag nå"}</span
                >
              </button>
            </div>

            <div class="space-y-4">
              <div>
                <label
                  for="admin-sett-league-id"
                  class="block text-xs font-bold text-white mb-1"
                >
                  FPL Classic League ID
                </label>
                <input
                  id="admin-sett-league-id"
                  type="number"
                  bind:value={leagueId}
                  class="w-full px-3.5 py-2 rounded-xl bg-[#191E24] border border-[#384252] text-white text-xs focus:border-[#9FE88D] focus:outline-none"
                />
              </div>

              <div>
                <label
                  for="admin-sett-league-name"
                  class="block text-xs font-bold text-white mb-1"
                >
                  Liganavn
                </label>
                <input
                  id="admin-sett-league-name"
                  type="text"
                  bind:value={leagueName}
                  class="w-full px-3.5 py-2 rounded-xl bg-[#191E24] border border-[#384252] text-white text-xs focus:border-[#9FE88D] focus:outline-none"
                />
              </div>

              <!-- Gjeldende gameweek (Automatisk styrt fra FPL) -->
              <div class="p-4 rounded-xl bg-[#242B35] border border-[#384252] space-y-2.5">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-white block">
                    Gjeldende gameweek
                  </span>
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#9FE88D]/15 text-[#9FE88D] text-[11px] font-bold border border-[#9FE88D]/30">
                    <span class="w-1.5 h-1.5 rounded-full bg-[#9FE88D] animate-pulse"></span>
                    <span>Følger FPL automatisk</span>
                  </span>
                </div>

                <div class="flex items-center justify-between p-3 rounded-xl bg-[#191E24] border border-[#384252]">
                  <div>
                    <div class="text-sm sm:text-base font-black text-white font-mono flex items-center gap-2">
                      <span class="text-[#9FE88D]">GW {currentGameweek}</span>
                      {#if currentGameweek === 1}
                        <span class="text-[11px] font-normal text-[#F4C152] font-sans">(sesongstart om en uke)</span>
                      {/if}
                    </div>
                    <p class="text-[11px] text-[#94A3B8] mt-0.5">
                      Følger inneværende runde automatisk. Du trenger ikke å endre denne manuelt.
                    </p>
                  </div>

                  <button
                    type="button"
                    onclick={() => (showManualGwOverride = !showManualGwOverride)}
                    class="text-[11px] text-[#94A3B8] hover:text-white underline font-semibold px-2 py-1 shrink-0"
                  >
                    {showManualGwOverride ? "Skjul overstyring" : "Overstyr"}
                  </button>
                </div>

                {#if showManualGwOverride}
                  <div class="pt-2 border-t border-[#384252]/60 space-y-1.5 animate-in fade-in duration-150">
                    <label for="admin-sett-gw" class="block text-[11px] font-bold text-[#F4C152]">
                      Manuell overstyring av gameweek (kun ved spesielle behov):
                    </label>
                    <input
                      id="admin-sett-gw"
                      type="number"
                      min="1"
                      max="38"
                      bind:value={currentGameweek}
                      class="w-full px-3.5 py-2 rounded-xl bg-[#191E24] border border-[#F4C152]/40 text-white text-xs focus:border-[#F4C152] focus:outline-none font-mono"
                    />
                  </div>
                {/if}
              </div>

              <!-- Trekk fra transfer hits switch -->
              <div
                class="p-4 rounded-xl bg-[#242B35] border border-[#384252] flex items-center justify-between"
              >
                <div>
                  <h4 class="text-xs font-bold text-white">
                    Trekk fra transfer hits i rom-score
                  </h4>
                  <p class="text-[11px] text-[#94A3B8]">
                    Når aktivert, trekkes -4p per ekstra overgang fra hver
                    spillers score før romsnittet beregnes.
                  </p>
                </div>

                <button
                  type="button"
                  onclick={() => (deductTransferHits = !deductTransferHits)}
                  class="text-2xl transition-colors"
                >
                  {#if deductTransferHits}
                    <ToggleRight class="w-8 h-8 text-[#9FE88D]" />
                  {:else}
                    <ToggleLeft class="w-8 h-8 text-[#94A3B8]" />
                  {/if}
                </button>
              </div>

              <div class="pt-2">
                <button
                  onclick={handleSaveSettings}
                  class="px-5 py-2.5 rounded-xl bg-[#9FE88D] hover:bg-[#8ce078] text-[#16380c] font-bold text-xs transition-colors shadow-md flex items-center gap-2"
                >
                  <Save class="w-4 h-4" />
                  <span>Lagre innstillinger</span>
                </button>
              </div>

              <!-- Chat-administrasjon og rensing -->
              <div
                class="mt-8 pt-6 border-t border-[#384252] space-y-4"
              >
                <div class="flex items-center gap-2">
                  <div
                    class="p-2 rounded-lg bg-[#FB6F84]/15 text-[#FB6F84] border border-[#FB6F84]/30"
                  >
                    <MessageSquareX class="w-4 h-4" />
                  </div>
                  <div>
                    <h4 class="text-xs font-bold text-white uppercase tracking-wider">
                      Chat-administrasjon og rensing
                    </h4>
                    <p class="text-[11px] text-[#94A3B8]">
                      Slett meldinger i banter felleskanal, rom-chatter eller tøm hele chathistorikken.
                    </p>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <!-- Tøm Banter -->
                  <div
                    class="p-3.5 rounded-xl bg-[#191E24] border border-[#384252] flex flex-col justify-between gap-3"
                  >
                    <div>
                      <span class="text-xs font-bold text-white block">Felleskanal (banter)</span>
                      <p class="text-[10px] text-[#94A3B8] mt-0.5 leading-relaxed">
                        Sletter alle meldinger og GIF-er i felleskanalen for alle brukere.
                      </p>
                    </div>
                    <button
                      type="button"
                      onclick={() => promptClearChat("banter")}
                      class="w-full py-2 px-3 rounded-lg bg-[#FB6F84]/10 hover:bg-[#FB6F84]/20 text-[#FB6F84] border border-[#FB6F84]/30 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Brush class="w-3.5 h-3.5" />
                      <span>Tøm banter</span>
                    </button>
                  </div>

                  <!-- Tøm Romchatter -->
                  <div
                    class="p-3.5 rounded-xl bg-[#191E24] border border-[#384252] flex flex-col justify-between gap-3"
                  >
                    <div>
                      <span class="text-xs font-bold text-white block">Interne rom-chatter</span>
                      <p class="text-[10px] text-[#94A3B8] mt-0.5 leading-relaxed">
                        Sletter meldinger i alle de 12 interne romchattene.
                      </p>
                    </div>
                    <button
                      type="button"
                      onclick={() => promptClearChat("room")}
                      class="w-full py-2 px-3 rounded-lg bg-[#FB6F84]/10 hover:bg-[#FB6F84]/20 text-[#FB6F84] border border-[#FB6F84]/30 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Brush class="w-3.5 h-3.5" />
                      <span>Tøm rom-chatter</span>
                    </button>
                  </div>

                  <!-- Tøm Alt -->
                  <div
                    class="p-3.5 rounded-xl bg-[#191E24] border border-[#FB6F84]/40 flex flex-col justify-between gap-3"
                  >
                    <div>
                      <span class="text-xs font-bold text-[#FB6F84] block">Tøm all chat</span>
                      <p class="text-[10px] text-[#94A3B8] mt-0.5 leading-relaxed">
                        Nullstiller all chat-historikk fullstendig i hele databasen.
                      </p>
                    </div>
                    <button
                      type="button"
                      onclick={() => promptClearChat("all")}
                      class="w-full py-2 px-3 rounded-lg bg-[#FB6F84] hover:bg-[#fa546d] text-[#2c090e] text-xs font-bold transition-colors shadow-md flex items-center justify-center gap-1.5"
                    >
                      <Trash2 class="w-3.5 h-3.5" />
                      <span>Tøm all chat</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        {/if}

        <!-- Tab 3: Kåringer, rundevinnere og skrytevegg -->
        {#if activeTab === "winner"}
          <div
            class="p-6 space-y-6 overflow-y-auto flex-1 max-w-3xl custom-scrollbar"
          >
            <!-- 1. LIVE RUNDEVINNER (GAMEWEEK) -->
            <div
              class="p-5 rounded-2xl bg-gradient-to-br from-[#F59E0B]/15 via-[#242B35] to-[#191E24] border border-[#F59E0B]/40 space-y-4 shadow-md"
            >
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#384252]">
                <div class="flex items-center gap-2.5">
                  <div
                    class="p-2 rounded-xl bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40"
                  >
                    <Crown class="w-5 h-5" />
                  </div>
                  <div>
                    <h3 class="text-sm font-bold text-white flex items-center gap-2">
                      <span>Rundevinner – gameweek {winnersStatus?.currentGameweek || 1}</span>
                      {#if winnersStatus?.isRoundWinnerOverridden}
                        <span class="px-2 py-0.5 rounded-full bg-[#F59E0B]/25 text-[#F59E0B] border border-[#F59E0B]/40 text-[10px] font-bold uppercase tracking-wider">
                          Manuelt overstyrt
                        </span>
                      {:else}
                        <span class="px-2 py-0.5 rounded-full bg-[#9FE88D]/20 text-[#9FE88D] border border-[#9FE88D]/40 text-[10px] font-bold uppercase tracking-wider">
                          Automatisk beregnet
                        </span>
                      {/if}
                    </h3>
                    <p class="text-[11px] text-[#94A3B8]">
                      Nåværende leder/vinner av runden basert på FPL-poeng {winnersStatus?.deductTransferHits ? "(fratrukket transfer hits)" : ""}.
                    </p>
                  </div>
                </div>

                {#if winnersStatus?.isRoundWinnerOverridden}
                  <button
                    type="button"
                    disabled={isSavingOverrides}
                    onclick={handleResetRoundWinnerOverride}
                    class="px-3 py-1.5 rounded-lg bg-[#361c1c] text-[#FB6F84] hover:bg-[#452323] border border-[#FB6F84]/30 text-xs font-bold transition-colors flex items-center gap-1 self-start sm:self-auto"
                  >
                    <RotateCcw class="w-3.5 h-3.5" />
                    <span>Nullstill overstyring</span>
                  </button>
                {/if}
              </div>

              <!-- Vinner-kort med egen fremhevet farge -->
              {#if winnersStatus?.activeRoundWinner}
                <div
                  class="p-4 rounded-xl bg-[#191E24]/90 border-2 border-[#F59E0B] shadow-[0_0_20px_rgba(245,158,11,0.15)] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div class="flex items-center gap-3">
                    <img
                      src={winnersStatus.activeRoundWinner.userAvatar ||
                        `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(winnersStatus.activeRoundWinner.managerName)}`}
                      alt="Avatar"
                      class="w-12 h-12 rounded-xl bg-[#242B35] border-2 border-[#F59E0B] object-cover shrink-0"
                    />
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="text-xs font-bold uppercase tracking-wider text-[#F59E0B]">
                          Gjeldende rundevinner
                        </span>
                        <span class="text-[10px] px-1.5 py-0.5 rounded bg-[#384252] text-[#E2E8F0] font-semibold">
                          {winnersStatus.activeRoundWinner.roomName}
                        </span>
                      </div>
                      <h4 class="text-base font-extrabold text-white">
                        {winnersStatus.activeRoundWinner.managerName}
                      </h4>
                      <p class="text-xs text-[#94A3B8]">
                        {winnersStatus.activeRoundWinner.teamName}
                      </p>
                    </div>
                  </div>

                  <div class="flex sm:flex-col items-baseline sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-[#384252]/50">
                    <div class="text-2xl font-black text-[#F59E0B]">
                      {winnersStatus.activeRoundWinner.points}<span class="text-sm font-bold ml-0.5 text-white/80">p</span>
                    </div>
                    <span class="text-[10px] text-[#94A3B8]">
                      {#if winnersStatus.activeRoundWinner.hits > 0}
                        ({winnersStatus.activeRoundWinner.grossPoints}p brutto – {winnersStatus.activeRoundWinner.hits}p hits)
                      {:else}
                        (0 transfer hits)
                      {/if}
                    </span>
                  </div>
                </div>
              {:else}
                <div class="p-4 rounded-xl bg-[#191E24] border border-[#384252] text-xs text-[#94A3B8] text-center">
                  Ingen lag funnet for å beregne rundevinner. Synkroniser lag i ligainnstillinger.
                </div>
              {/if}

              <!-- Overstyrings-kontroller for rundevinner -->
              <div class="pt-2 border-t border-[#384252]/60 space-y-2">
                <span class="text-[11px] font-bold text-[#E2E8F0] uppercase tracking-wider block">
                  Overstyr rundevinner (hvis automatisk beregning må korrigeres):
                </span>
                <div class="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div class="sm:col-span-7">
                    <select
                      bind:value={overrideWinnerEntryId}
                      class="w-full px-3 py-2 rounded-xl bg-[#191E24] border border-[#384252] text-white text-xs focus:border-[#F59E0B] focus:outline-none"
                    >
                      <option value={null}>-- Velg manager eller lag --</option>
                      {#each winnersStatus?.allTeamsCandidates || [] as team}
                        <option value={team.entryId}>
                          {team.managerName} – {team.teamName} ({team.points}p, {team.roomName})
                        </option>
                      {/each}
                    </select>
                  </div>
                  <div class="sm:col-span-2">
                    <input
                      type="number"
                      bind:value={overrideWinnerScoreInput}
                      placeholder="Poeng"
                      class="w-full px-3 py-2 rounded-xl bg-[#191E24] border border-[#384252] text-white text-xs focus:border-[#F59E0B] focus:outline-none"
                    />
                  </div>
                  <div class="sm:col-span-3">
                    <button
                      type="button"
                      disabled={isSavingOverrides || !overrideWinnerEntryId}
                      onclick={handleSaveRoundWinnerOverride}
                      class="w-full py-2 px-3 rounded-xl bg-[#F59E0B] hover:bg-[#d97706] disabled:opacity-50 text-[#1f1300] font-bold text-xs transition-colors shadow-sm flex items-center justify-center gap-1"
                    >
                      <Save class="w-3.5 h-3.5" />
                      <span>{isSavingOverrides ? "Lagrer..." : "Lagre overstyring"}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- 2. LIVE LEDENDE ROM (ROMLEDER) -->
            <div
              class="p-5 rounded-2xl bg-gradient-to-br from-[#10B981]/15 via-[#242B35] to-[#191E24] border border-[#10B981]/40 space-y-4 shadow-md"
            >
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#384252]">
                <div class="flex items-center gap-2.5">
                  <div
                    class="p-2 rounded-xl bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40"
                  >
                    <Trophy class="w-5 h-5" />
                  </div>
                  <div>
                    <h3 class="text-sm font-bold text-white flex items-center gap-2">
                      <span>Ledende rom – gameweek {winnersStatus?.currentGameweek || 1}</span>
                      {#if winnersStatus?.isTopRoomOverridden}
                        <span class="px-2 py-0.5 rounded-full bg-[#10B981]/25 text-[#10B981] border border-[#10B981]/40 text-[10px] font-bold uppercase tracking-wider">
                          Manuelt overstyrt
                        </span>
                      {:else}
                        <span class="px-2 py-0.5 rounded-full bg-[#9FE88D]/20 text-[#9FE88D] border border-[#9FE88D]/40 text-[10px] font-bold uppercase tracking-wider">
                          Automatisk beregnet
                        </span>
                      {/if}
                    </h3>
                    <p class="text-[11px] text-[#94A3B8]">
                      Nåværende lederrom basert på snittet av de to beste spillernes nettoscore.
                    </p>
                  </div>
                </div>

                {#if winnersStatus?.isTopRoomOverridden}
                  <button
                    type="button"
                    disabled={isSavingOverrides}
                    onclick={handleResetTopRoomOverride}
                    class="px-3 py-1.5 rounded-lg bg-[#361c1c] text-[#FB6F84] hover:bg-[#452323] border border-[#FB6F84]/30 text-xs font-bold transition-colors flex items-center gap-1 self-start sm:self-auto"
                  >
                    <RotateCcw class="w-3.5 h-3.5" />
                    <span>Nullstill overstyring</span>
                  </button>
                {/if}
              </div>

              <!-- Romleder Kort -->
              {#if winnersStatus?.activeTopRoom}
                <div
                  class="p-4 rounded-xl bg-[#191E24]/90 border-2 border-[#10B981] shadow-[0_0_20px_rgba(16,185,129,0.15)] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div class="flex items-center gap-3">
                    <div
                      class="w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm border-2 border-[#10B981] text-white shadow-sm shrink-0"
                      style={`background-color: ${winnersStatus.activeTopRoom.accentColor || "#1eb854"}`}
                    >
                      {winnersStatus.activeTopRoom.roomNumber ? `A${winnersStatus.activeTopRoom.roomNumber}` : "🏆"}
                    </div>
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="text-xs font-bold uppercase tracking-wider text-[#10B981]">
                          Ledende rom (#1)
                        </span>
                      </div>
                      <h4 class="text-base font-extrabold text-white">
                        {winnersStatus.activeTopRoom.name}
                      </h4>
                      <p class="text-xs text-[#94A3B8]">
                        {#if winnersStatus.activeTopRoom.topPlayers && winnersStatus.activeTopRoom.topPlayers.length > 0}
                          Toppspillere: {winnersStatus.activeTopRoom.topPlayers.map((p: any) => `${p.managerName} (${p.points}p)`).join(", ")}
                        {:else}
                          Ingen spillere registrert ennå
                        {/if}
                      </p>
                    </div>
                  </div>

                  <div class="flex sm:flex-col items-baseline sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-[#384252]/50">
                    <div class="text-2xl font-black text-[#10B981]">
                      {winnersStatus.activeTopRoom.score}<span class="text-sm font-bold ml-0.5 text-white/80">p</span>
                    </div>
                    <span class="text-[10px] text-[#94A3B8]">
                      (Romsnitt topp 2)
                    </span>
                  </div>
                </div>
              {:else}
                <div class="p-4 rounded-xl bg-[#191E24] border border-[#384252] text-xs text-[#94A3B8] text-center">
                  Ingen romdata tilgjengelig for gjeldende runde.
                </div>
              {/if}

              <!-- Overstyrings-kontroller for lederrom -->
              <div class="pt-2 border-t border-[#384252]/60 space-y-2">
                <span class="text-[11px] font-bold text-[#E2E8F0] uppercase tracking-wider block">
                  Overstyr ledende rom (hvis automatisk beregning må korrigeres):
                </span>
                <div class="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div class="sm:col-span-7">
                    <select
                      bind:value={overrideRoomId}
                      class="w-full px-3 py-2 rounded-xl bg-[#191E24] border border-[#384252] text-white text-xs focus:border-[#10B981] focus:outline-none"
                    >
                      <option value="">-- Velg ledende rom --</option>
                      {#each winnersStatus?.allRoomsCandidates || [] as room}
                        <option value={room.roomId}>
                          {room.name} ({room.score}p snitt)
                        </option>
                      {/each}
                    </select>
                  </div>
                  <div class="sm:col-span-2">
                    <input
                      type="number"
                      step="0.5"
                      bind:value={overrideRoomScoreInput}
                      placeholder="Snitt"
                      class="w-full px-3 py-2 rounded-xl bg-[#191E24] border border-[#384252] text-white text-xs focus:border-[#10B981] focus:outline-none"
                    />
                  </div>
                  <div class="sm:col-span-3">
                    <button
                      type="button"
                      disabled={isSavingOverrides || !overrideRoomId}
                      onclick={handleSaveTopRoomOverride}
                      class="w-full py-2 px-3 rounded-xl bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 text-[#022c22] font-bold text-xs transition-colors shadow-sm flex items-center justify-center gap-1"
                    >
                      <Save class="w-3.5 h-3.5" />
                      <span>{isSavingOverrides ? "Lagrer..." : "Lagre overstyring"}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- 3. MÅNEDSKÅRING & SKRYTEVEGG (WALL OF FAME) -->
            <div class="pt-2 border-t border-[#384252] space-y-4">
              <div class="flex items-center gap-2">
                <div class="p-2 rounded-xl bg-[#F4C152]/15 text-[#F4C152] border border-[#F4C152]/30">
                  <Award class="w-5 h-5" />
                </div>
                <div>
                  <h3 class="text-sm font-bold text-white">
                    Månedskåring og skrytevegg
                  </h3>
                  <p class="text-[11px] text-[#94A3B8]">
                    Publiser offisielle månedsvinnere med heder og ære til skryteveggen.
                  </p>
                </div>
              </div>

              <!-- Aktiv Skrytevegg Status -->
              {#if monthWinnersData?.roomWinner || monthWinnersData?.soloWinner}
                <div
                  class="p-4 rounded-xl bg-[#242B35] border border-[#F4C152]/40 space-y-3"
                >
                  <div class="flex items-center justify-between">
                    <h4
                      class="text-xs font-bold uppercase tracking-wider text-[#F4C152] flex items-center gap-1.5"
                    >
                      <Trophy class="w-4 h-4" />
                      <span>Nåværende aktive vinnere på skryteveggen</span>
                    </h4>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {#if monthWinnersData?.roomWinner}
                      <div
                        class="p-3 rounded-lg bg-[#191E24] border border-[#384252] flex items-center justify-between"
                      >
                        <div>
                          <span
                            class="text-[10px] text-[#F4C152] font-bold uppercase block"
                            >Månedens romvinner</span
                          >
                          <strong class="text-white text-sm"
                            >{monthWinnersData.roomWinner.winningRoom?.name ||
                              monthWinnersData.roomWinner.winnerName}</strong
                          >
                          <span class="text-[#94A3B8] block text-[11px]"
                            >({monthWinnersData.roomWinner.winningScore}p snitt)</span
                          >
                        </div>
                        <button
                          onclick={() =>
                            onUnpinWinner(monthWinnersData.roomWinner._id)}
                          class="p-1.5 rounded-lg bg-[#361c1c] text-[#FB6F84] hover:bg-[#452323] text-xs font-semibold"
                          title="Fjern fra skrytevegg"
                        >
                          Fjern
                        </button>
                      </div>
                    {/if}

                    {#if monthWinnersData?.soloWinner}
                      <div
                        class="p-3 rounded-lg bg-[#191E24] border border-[#384252] flex items-center justify-between"
                      >
                        <div>
                          <span
                            class="text-[10px] text-[#9FE88D] font-bold uppercase block"
                            >Månedens solovinner</span
                          >
                          <strong class="text-white text-sm"
                            >{monthWinnersData.soloWinner.winnerName}</strong
                          >
                          <span class="text-[#94A3B8] block text-[11px]"
                            >({monthWinnersData.soloWinner.winningScore}p score)</span
                          >
                        </div>
                        <button
                          onclick={() =>
                            onUnpinWinner(monthWinnersData.soloWinner._id)}
                          class="p-1.5 rounded-lg bg-[#361c1c] text-[#FB6F84] hover:bg-[#452323] text-xs font-semibold"
                          title="Fjern fra skrytevegg"
                        >
                          Fjern
                        </button>
                      </div>
                    {/if}
                  </div>
                </div>
              {/if}

              <!-- Kår Vinner Skjema -->
              <div class="space-y-4">
                <div class="flex items-center justify-between">
                  <h3
                    class="text-sm font-bold text-white flex items-center gap-2"
                  >
                    <Sparkles class="w-4 h-4 text-[#F4C152]" />
                    <span>Kår månedens romvinner eller solovinner</span>
                  </h3>
                  <button
                    type="button"
                    onclick={() => autoSuggestWinner(winnerCategory)}
                    class="px-3 py-1.5 rounded-lg bg-[#F4C152]/15 text-[#F4C152] hover:bg-[#F4C152]/25 border border-[#F4C152]/40 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                    title="Hent inn beste rom eller individuelle spiller automatisk fra databasen"
                  >
                    <Sparkles class="w-3.5 h-3.5" />
                    <span>Autoforeslå leder</span>
                  </button>
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onclick={() => {
                      winnerCategory = "room";
                      autoSuggestWinner("room");
                    }}
                    class={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      winnerCategory === "room"
                        ? "bg-[#F4C152]/15 border-[#F4C152] text-[#F4C152]"
                        : "bg-[#191E24] border-[#384252] text-[#94A3B8]"
                    }`}
                  >
                    <span>🏆</span>
                    <span>Månedens romvinner</span>
                  </button>

                  <button
                    type="button"
                    onclick={() => {
                      winnerCategory = "individual";
                      autoSuggestWinner("individual");
                    }}
                    class={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      winnerCategory === "individual"
                        ? "bg-[#9FE88D]/15 border-[#9FE88D] text-[#9FE88D]"
                        : "bg-[#191E24] border-[#384252] text-[#94A3B8]"
                    }`}
                  >
                    <span>👑</span>
                    <span>Månedens solovinner</span>
                  </button>
                </div>

                {#if winnerCategory === "room"}
                  <div>
                    <label
                      for="admin-win-room"
                      class="block text-xs font-bold text-white mb-1"
                      >Velg vinnerrom</label
                    >
                    <select
                      id="admin-win-room"
                      bind:value={selectedWinnerRoomId}
                      class="w-full px-3.5 py-2 rounded-xl bg-[#191E24] border border-[#384252] text-white text-xs focus:border-[#9FE88D] focus:outline-none"
                    >
                      <option value="">Velg vinnerrom...</option>
                      {#each rooms as r}
                        <option value={r._id}
                          >{r.name} (Snitt: {r.calculatedAverage ??
                            (r.teams && r.teams.length > 0
                              ? Math.round(
                                  (r.totalPoints / r.teams.length) * 10,
                                ) / 10
                              : 0)}p)</option
                        >
                      {/each}
                    </select>
                  </div>
                {:else}
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        for="admin-win-mgr"
                        class="block text-xs font-bold text-white mb-1"
                        >Managers navn</label
                      >
                      <input
                        id="admin-win-mgr"
                        type="text"
                        bind:value={winnerManagerName}
                        placeholder="f.eks. Trond Hjelle"
                        class="w-full px-3.5 py-2 rounded-xl bg-[#191E24] border border-[#384252] text-white text-xs focus:border-[#9FE88D] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label
                        for="admin-win-team"
                        class="block text-xs font-bold text-white mb-1"
                        >Lagnavn (valgfritt)</label
                      >
                      <input
                        id="admin-win-team"
                        type="text"
                        bind:value={winnerTeamName}
                        placeholder="f.eks. Hjelle FC"
                        class="w-full px-3.5 py-2 rounded-xl bg-[#191E24] border border-[#384252] text-white text-xs focus:border-[#9FE88D] focus:outline-none"
                      />
                    </div>
                  </div>
                {/if}

                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      for="admin-win-month"
                      class="block text-xs font-bold text-white mb-1">Måned</label
                    >
                    <select
                      id="admin-win-month"
                      bind:value={winningMonthName}
                      class="w-full px-3.5 py-2 rounded-xl bg-[#191E24] border border-[#384252] text-white text-xs focus:border-[#9FE88D] focus:outline-none"
                    >
                      {#each ["August", "September", "Oktober", "November", "Desember", "Januar", "Februar", "Mars", "April", "Mai"] as m}
                        <option value={m}>{m}</option>
                      {/each}
                    </select>
                  </div>

                  <div>
                    <label
                      for="admin-win-score"
                      class="block text-xs font-bold text-white mb-1"
                      >Vinnende poengscore / snitt</label
                    >
                    <input
                      id="admin-win-score"
                      type="number"
                      step="0.1"
                      bind:value={winningScore}
                      class="w-full px-3.5 py-2 rounded-xl bg-[#191E24] border border-[#384252] text-white text-xs focus:border-[#9FE88D] focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label
                    for="admin-win-msg"
                    class="block text-xs font-bold text-white mb-1"
                    >Hyllest / melding (valgfritt)</label
                  >
                  <textarea
                    id="admin-win-msg"
                    rows="3"
                    bind:value={customWinnerMessage}
                    placeholder="Skriv en personlig gratulasjon som vises på skryteveggen..."
                    class="w-full px-3.5 py-2 rounded-xl bg-[#191E24] border border-[#384252] text-white text-xs focus:border-[#9FE88D] focus:outline-none"
                  ></textarea>
                </div>

                <button
                  onclick={handleWinnerSubmit}
                  class="px-5 py-2.5 rounded-xl bg-[#F4C152] hover:bg-[#e4b344] text-black font-bold text-xs transition-colors shadow-md"
                >
                  Kår vinner og publiser på skrytevegg
                </button>
              </div>
            </div>
          </div>
        {/if}

        <!-- Tab 4: Brukere & Admins -->
        {#if activeTab === "users"}
          <div class="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
            <div
              class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#384252]"
            >
              <div>
                <h3 class="text-sm font-bold text-white">
                  Registrerte brukere ({users.length})
                </h3>
                <p class="text-xs text-[#94A3B8]">
                  Oversikt over registrerte spillere og admin-roller
                </p>
              </div>

              <div class="flex items-center gap-2">
                <button
                  type="button"
                  onclick={() => {
                    createUserError = "";
                    newUsername = "";
                    newPassword = "";
                    newRole = "user";
                    newRoomId = "";
                    newFplEntryId = null;
                    showCreateUserModal = true;
                  }}
                  class="px-3.5 py-1.5 rounded-lg bg-[#9FE88D] hover:bg-[#8ce078] text-[#16380c] font-bold text-xs transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <UserPlus class="w-3.5 h-3.5" />
                  <span>Opprett manuell bruker</span>
                </button>

                {#if users.length > 0}
                  <button
                    type="button"
                    onclick={() => {
                      confirmDialog = {
                        show: true,
                        title: "Slett alle brukere?",
                        message:
                          "Dette vil slette alle registrerte brukerkontoer slik at du kan teste onboarding og registrering fra bunnen av.",
                        confirmText: "Ja, slett alle brukere",
                        onConfirm: () => {
                          onDeleteAllUsers();
                          showSuccess("Alle brukere er slettet fra databasen.");
                        },
                      };
                    }}
                    class="px-3 py-1.5 rounded-lg bg-[#3b2222] hover:bg-[#4a2b2b] text-[#FB6F84] border border-[#5c2e2e] text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                    <span>Slett alle</span>
                  </button>
                {/if}
              </div>
            </div>

            {#if users.length === 0}
              <div
                class="p-8 rounded-xl bg-[#242B35] border border-[#384252] text-center space-y-2"
              >
                <Users class="w-8 h-8 text-[#94A3B8] mx-auto opacity-50" />
                <p class="text-sm font-bold text-white">
                  Ingen registrerte brukere
                </p>
                <p class="text-xs text-[#94A3B8]">
                  Brukere opprettes når nye spillere logger inn eller fullfører
                  onboarding.
                </p>
              </div>
            {/if}

            <div class="space-y-2">
              {#each users as u}
                <div
                  class="p-3 rounded-xl bg-[#242B35] border border-[#384252] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                >
                  <div class="flex items-center gap-3 min-w-0">
                    <img
                      src={u.avatar ||
                        "https://api.dicebear.com/7.x/bottts/svg?seed=" +
                          u.username}
                      alt=""
                      class="w-8 h-8 rounded-full bg-[#191E24] shrink-0"
                    />
                    <div class="min-w-0">
                      <div class="flex items-center gap-2">
                        <span class="font-bold text-white block truncate"
                          >{u.username}</span
                        >
                        <span
                          class={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                            u.role === "admin"
                              ? "bg-[#9FE88D]/15 text-[#9FE88D] border border-[#9FE88D]/30"
                              : "bg-[#191E24] text-[#94A3B8]"
                          }`}
                        >
                          {u.role}
                        </span>
                      </div>
                      <div
                        class="text-[11px] text-[#94A3B8] flex items-center gap-1.5 mt-0.5 truncate"
                      >
                        <Shirt class="w-3 h-3 text-[#70E1F8] shrink-0" />
                        {#if u.fplTeamName}
                          <span class="text-[#E2E8F0] font-semibold"
                            >{u.fplTeamName}</span
                          >
                          <span class="text-[#94A3B8]"
                            >({u.fplManagerName || "Manager"})</span
                          >
                        {:else}
                          <span class="text-[#F4C152] font-semibold italic"
                            >Ikke tilknyttet FPL-lag</span
                          >
                        {/if}
                      </div>
                    </div>
                  </div>
                  <div class="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onclick={() => {
                        linkingUserModal = {
                          show: true,
                          user: u,
                          selectedEntryId: u.fplEntryId ?? null,
                        };
                      }}
                      class="px-2.5 py-1 rounded-lg bg-[#191E24] hover:bg-[#2A303C] text-[11px] text-[#70E1F8] hover:text-white border border-[#384252] flex items-center gap-1 font-semibold transition-colors"
                      title="Koble eller endre FPL-lag for denne brukeren"
                    >
                      <Shirt class="w-3 h-3" />
                      <span>{u.fplEntryId ? "Endre lag" : "Koble lag"}</span>
                    </button>
                    {#if u.fplEntryId}
                      <button
                        type="button"
                        onclick={() => {
                          confirmDialog = {
                            show: true,
                            title: `Fjerne FPL-lag for ${u.username}?`,
                            message: `Brukeren vil ikke lenger være koblet til FPL-laget "${u.fplTeamName || "FPL-lag"}". Laget blir frigjort og tilgjengelig for andre.`,
                            confirmText: "Fjern kobling",
                            onConfirm: async () => {
                              try {
                                await onLinkUserTeam(u._id, undefined);
                                showSuccess(`Fjernet FPL-kobling for ${u.username}.`);
                              } catch (err: any) {
                                showError(err.message || "Kunne ikke fjerne FPL-kobling.");
                              }
                            },
                          };
                        }}
                        class="px-2.5 py-1 rounded-lg bg-[#FB6F84]/10 hover:bg-[#FB6F84]/20 text-[11px] text-[#FB6F84] border border-[#FB6F84]/30 flex items-center gap-1 font-semibold transition-colors"
                        title="Fjern kobling mellom denne brukeren og FPL-laget"
                      >
                        <Unlink class="w-3 h-3" />
                        <span>Fjern lag</span>
                      </button>
                    {/if}
                    <button
                      onclick={() =>
                        onSetUserRole(
                          u._id,
                          u.role === "admin" ? "user" : "admin",
                        )}
                      class="px-2.5 py-1 rounded-lg bg-[#242B35] hover:bg-[#384252] text-[11px] text-[#E2E8F0] border border-[#384252]"
                    >
                      {u.role === "admin"
                        ? "Gjør til bruker"
                        : "Gjør til admin"}
                    </button>
                    <button
                      onclick={() => {
                        confirmDialog = {
                          show: true,
                          title: `Slett bruker ${u.username}?`,
                          message: "Brukerkontoen vil bli permanent fjernet.",
                          confirmText: "Slett bruker",
                          onConfirm: () => {
                            onDeleteUser(u._id);
                            showSuccess(`Bruker ${u.username} slettet.`);
                          },
                        };
                      }}
                      title="Slett bruker"
                      class="p-1 rounded-lg text-[#94A3B8] hover:text-[#FB6F84] hover:bg-[#361c1c] transition-colors"
                    >
                      <Trash2 class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Tab 5: Invitasjonskoder -->
        {#if activeTab === "invites"}
          <div
            class="p-6 space-y-5 overflow-y-auto flex-1 max-w-2xl custom-scrollbar"
          >
            <div
              class="p-4 rounded-xl bg-[#242B35] border border-[#384252] space-y-3 shadow-sm"
            >
              <h3
                class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5"
              >
                <span>🎟️</span>
                <span>Generer Ny Invitasjonskode</span>
              </h3>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  bind:value={newCodeCustom}
                  placeholder="Valgfri kode (f.eks. OPPSTART)"
                  class="px-3.5 py-2 rounded-xl bg-[#191E24] border border-[#384252] text-white text-xs focus:border-[#9FE88D] focus:outline-none uppercase font-mono font-bold"
                />
                <select
                  bind:value={newCodeRole}
                  class="px-3.5 py-2 rounded-xl bg-[#191E24] border border-[#384252] text-white text-xs focus:border-[#9FE88D] focus:outline-none"
                >
                  <option value="user">Bruker-tilgang</option>
                  <option value="admin">Admin-tilgang</option>
                </select>
                <select
                  bind:value={newCodeValidDays}
                  class="px-3.5 py-2 rounded-xl bg-[#191E24] border border-[#384252] text-white text-xs focus:border-[#9FE88D] focus:outline-none"
                >
                  <option value={1}>Gyldig i 1 dag</option>
                  <option value={3}>Gyldig i 3 dager</option>
                  <option value={7}>Gyldig i 7 dager (1 uke)</option>
                  <option value={14}>Gyldig i 14 dager (2 uker)</option>
                  <option value={30}>Gyldig i 30 dager (1 mnd)</option>
                  <option value={90}>Gyldig i 90 dager (3 mnd)</option>
                  <option value={365}>Gyldig i 1 år</option>
                  <option value={9999}>Ubegrenset (uten utløp)</option>
                </select>
              </div>
              <div class="flex justify-end pt-1">
                <button
                  onclick={handleCreateInviteSubmit}
                  class="px-4 py-2 rounded-xl bg-[#9FE88D] hover:bg-[#8ce078] text-[#16380c] font-bold text-xs transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <Plus class="w-3.5 h-3.5" />
                  <span>Opprett Invitasjonskode</span>
                </button>
              </div>
            </div>

            <div class="space-y-2">
              <h4 class="text-xs font-bold text-[#94A3B8] uppercase">
                Aktive Koder ({inviteCodes.length})
              </h4>
              {#if inviteCodes.length === 0}
                <div
                  class="p-4 rounded-xl bg-[#242B35] border border-[#384252] text-center text-xs text-[#94A3B8]"
                >
                  Ingen aktive invitasjonskoder opprettet ennå.
                </div>
              {:else}
                {#each inviteCodes as inv}
                  <div
                    class="p-3 rounded-xl bg-[#242B35] border border-[#384252] flex items-center justify-between text-xs font-mono"
                  >
                    <div>
                      <span class="font-bold text-[#9FE88D] text-sm block"
                        >{inv.code}</span
                      >
                      <span class="text-[#94A3B8] text-[11px] font-sans">
                        Rolle: <strong class="text-white">{inv.role}</strong> •
                        Brukt: {inv.usedCount ?? inv.usesCount ?? 0} ganger
                      </span>
                    </div>
                    <div class="flex items-center gap-3">
                      <div
                        class="text-right font-sans text-[11px] text-[#94A3B8]"
                      >
                        {#if inv.expiresAt}
                          {@const daysLeft = Math.ceil(
                            (inv.expiresAt - Date.now()) /
                              (1000 * 60 * 60 * 24),
                          )}
                          {#if daysLeft > 365}
                            <span class="text-[#9FE88D] font-bold"
                              >Ubegrenset</span
                            >
                          {:else if daysLeft > 0}
                            <span class="text-[#F4C152] font-semibold"
                              >{daysLeft}
                              {daysLeft === 1 ? "dag" : "dager"} igjen</span
                            >
                          {:else}
                            <span class="text-[#FB6F84] font-bold">Utløpt</span>
                          {/if}
                        {/if}
                      </div>
                      <button
                        onclick={() => {
                          confirmDialog = {
                            show: true,
                            title: `Slett invitasjonskode ${inv.code}?`,
                            message:
                              "Koden vil bli slettet og kan ikke lenger benyttes ved innlogging eller registrering.",
                            confirmText: "Slett kode",
                            onConfirm: () => {
                              onDeleteInviteCode(inv._id);
                              confirmDialog.show = false;
                              showSuccess(
                                `Invitasjonskode ${inv.code} ble slettet.`,
                              );
                            },
                          };
                        }}
                        title="Slett invitasjonskode"
                        class="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#FB6F84] hover:bg-[#361c1c] transition-colors"
                      >
                        <Trash2 class="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                {/each}
              {/if}
            </div>
          </div>

          <!-- Tab 5: Chat-administrasjon og rensing -->
        {:else if activeTab === "chat"}
          <div
            class="p-6 space-y-6 overflow-y-auto flex-1 max-w-3xl custom-scrollbar"
          >
            <div
              class="p-5 rounded-2xl bg-[#242B35] border border-[#FB6F84]/30 space-y-5 shadow-lg"
            >
              <div class="flex items-center gap-3 pb-3 border-b border-[#384252]">
                <div
                  class="p-2.5 rounded-xl bg-[#FB6F84]/15 text-[#FB6F84] border border-[#FB6F84]/30"
                >
                  <MessageSquareX class="w-6 h-6" />
                </div>
                <div>
                  <h3 class="text-base font-bold text-white">
                    Chat-administrasjon og rensing
                  </h3>
                  <p class="text-xs text-[#94A3B8]">
                    Her kan du slette eller tømme samtalehistorikk i felleskanalen, romchattene eller hele systemet.
                  </p>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <!-- 1. Tøm Banter -->
                <div
                  class="p-4 rounded-xl bg-[#191E24] border border-[#384252] flex flex-col justify-between gap-4"
                >
                  <div>
                    <div class="flex items-center gap-1.5 text-white font-bold text-sm mb-1">
                      <span>💬</span>
                      <span>Felleskanal (banter)</span>
                    </div>
                    <p class="text-xs text-[#94A3B8] leading-relaxed">
                      Sletter alle meldinger, reaksjoner og GIF-er som er sendt i den åpne banter-kanalen.
                    </p>
                  </div>
                  <button
                    type="button"
                    onclick={() => promptClearChat("banter")}
                    class="w-full py-2.5 px-3 rounded-xl bg-[#FB6F84]/10 hover:bg-[#FB6F84]/20 text-[#FB6F84] border border-[#FB6F84]/30 text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Brush class="w-4 h-4" />
                    <span>Tøm banter</span>
                  </button>
                </div>

                <!-- 2. Tøm Rom-chatter -->
                <div
                  class="p-4 rounded-xl bg-[#191E24] border border-[#384252] flex flex-col justify-between gap-4"
                >
                  <div>
                    <div class="flex items-center gap-1.5 text-white font-bold text-sm mb-1">
                      <span>🏠</span>
                      <span>Interne rom-chatter</span>
                    </div>
                    <p class="text-xs text-[#94A3B8] leading-relaxed">
                      Sletter alle meldinger i de 12 interne romchattene (Rom A1 til A12).
                    </p>
                  </div>
                  <button
                    type="button"
                    onclick={() => promptClearChat("room")}
                    class="w-full py-2.5 px-3 rounded-xl bg-[#FB6F84]/10 hover:bg-[#FB6F84]/20 text-[#FB6F84] border border-[#FB6F84]/30 text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Brush class="w-4 h-4" />
                    <span>Tøm rom-chatter</span>
                  </button>
                </div>

                <!-- 3. Tøm Alt -->
                <div
                  class="p-4 rounded-xl bg-[#191E24] border border-[#FB6F84]/40 flex flex-col justify-between gap-4"
                >
                  <div>
                    <div class="flex items-center gap-1.5 text-[#FB6F84] font-bold text-sm mb-1">
                      <span>💣</span>
                      <span>Tøm all chat</span>
                    </div>
                    <p class="text-xs text-[#94A3B8] leading-relaxed">
                      Permanent sletting av all chat-historikk i hele databasen (både felles og alle rom).
                    </p>
                  </div>
                  <button
                    type="button"
                    onclick={() => promptClearChat("all")}
                    class="w-full py-2.5 px-3 rounded-xl bg-[#FB6F84] hover:bg-[#fa546d] text-[#2c090e] text-xs font-bold transition-colors shadow-md flex items-center justify-center gap-2"
                  >
                    <Trash2 class="w-4 h-4" />
                    <span>Tøm all chat</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Tab 6: Cup & Sluttspill Styring (Double Elimination) -->
        {:else if activeTab === "cup"}
          <div
            class="p-4 sm:p-5 space-y-5 overflow-y-auto flex-1 custom-scrollbar"
          >
            {#if !activeCup}
              <!-- Ingen aktiv cup: Opprettelsesskjema -->
              <div
                class="max-w-2xl mx-auto p-6 rounded-2xl bg-[#242B35] border border-[#384252] space-y-5 shadow-lg"
              >
                <div
                  class="flex items-center gap-3 pb-3 border-b border-[#384252]"
                >
                  <div
                    class="p-2.5 rounded-xl bg-[#F4C152]/15 text-[#F4C152] border border-[#F4C152]/30"
                  >
                    <Swords class="w-6 h-6" />
                  </div>
                  <div>
                    <h3 class="text-base font-bold text-white">
                      Opprett Ny Cup & Sluttspill
                    </h3>
                    <p class="text-xs text-[#94A3B8]">
                      Genererer et komplett Double Elimination turneringsformat
                      (Winners & Losers bracket)
                    </p>
                  </div>
                </div>

                <div class="space-y-4 text-xs">
                  <div>
                    <label
                      for="admin-cup-name"
                      class="block font-bold text-white mb-1.5"
                    >
                      Navn på Cup / Turnering:
                    </label>
                    <input
                      id="admin-cup-name"
                      type="text"
                      bind:value={newCupName}
                      placeholder="f.eks. Atlantasy Vintercup 2025/2026"
                      class="w-full px-3.5 py-2.5 rounded-xl bg-[#191E24] border border-[#384252] text-white focus:border-[#F4C152] focus:outline-none text-sm"
                    />
                  </div>

                  <!-- Valg av Turneringsmodell -->
                  <div>
                    <label
                      for="admin-cup-format"
                      class="block font-bold text-white mb-1.5"
                    >
                      Velg Turneringsmodell:
                    </label>
                    <select
                      id="admin-cup-format"
                      bind:value={newCupFormat}
                      class="w-full px-3.5 py-2.5 rounded-xl bg-[#191E24] border border-[#F4C152]/60 text-white focus:border-[#F4C152] focus:outline-none font-semibold"
                    >
                      <option value="lucky_loser_12">
                        🌟 12 Lag: Alle spiller i R1 (6 kamper) + 2 Lucky Losers
                        til Kvartfinale (4 runder)
                      </option>
                      <option value="double_elimination_12">
                        ⚔️ 12 Lag: Standard Double Elimination med Topp 4 Byes
                        (Challonge-stil, 7 runder)
                      </option>
                      <option value="top8_single">
                        🏆 Topp 8: Rent Sluttspill (Kvartfinaler, Semifinaler,
                        Finale - 3 runder)
                      </option>
                      <option value="group_stage_12">
                        🌐 12 Lag: Gruppespill (2 puljer à 6) + Sluttspill (5
                        runder)
                      </option>
                    </select>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        for="admin-cup-start-gw"
                        class="block font-bold text-white mb-1.5"
                      >
                        Start-Gameweek (Første runde):
                      </label>
                      <input
                        id="admin-cup-start-gw"
                        type="number"
                        min="1"
                        max="38"
                        bind:value={newCupStartGw}
                        class="w-full px-3.5 py-2.5 rounded-xl bg-[#191E24] border border-[#384252] text-white focus:border-[#F4C152] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label
                        for="admin-cup-seeding"
                        class="block font-bold text-white mb-1.5"
                      >
                        Seeding-metode for Rommene:
                      </label>
                      <select
                        id="admin-cup-seeding"
                        bind:value={newCupSeedMethod}
                        class="w-full px-3.5 py-2.5 rounded-xl bg-[#191E24] border border-[#384252] text-white focus:border-[#F4C152] focus:outline-none"
                      >
                        <option value="leaderboard"
                          >Basert på tabell & romsnitt (Anbefalt)</option
                        >
                        <option value="manual"
                          >Standard romrekkefølge (A1 - A12)</option
                        >
                        <option value="random">Helt tilfeldig trekning</option>
                      </select>
                    </div>
                  </div>

                  <!-- Format og runder forhåndsvisning -->
                  <div
                    class="p-3.5 rounded-xl bg-[#191E24] border border-[#384252] space-y-2"
                  >
                    {#if newCupFormat === "lucky_loser_12"}
                      <span
                        class="text-xs font-bold text-[#9FE88D] uppercase tracking-wider block flex items-center gap-1.5"
                      >
                        <Sparkles class="w-3.5 h-3.5" />
                        <span
                          >12 Lag: 6 Kamper i R1 + 2 Lucky Losers (4 Runder)</span
                        >
                      </span>
                      <ul class="space-y-1 text-xs text-[#94A3B8]">
                        <li>
                          • <strong>Runde 1 (GW {newCupStartGw}):</strong> Alle 12
                          lag i ilden (6 kamper). Ingen har fri.
                        </li>
                        <li>
                          • <strong
                            >Kvartfinaler (GW {newCupStartGw + 1}):</strong
                          > De 6 vinnerne + de 2 taperne med høyest romsnitt («Lucky
                          Losers») avanserer til 4 kvartfinaler.
                        </li>
                        <li>
                          • <strong
                            >Semifinaler (GW {newCupStartGw + 2}):</strong
                          > 4 lag kjemper om finaleplass.
                        </li>
                        <li>
                          • <strong>Storfinale (GW {newCupStartGw + 3}):</strong
                          > De 2 beste rommene kjemper om trofeet!
                        </li>
                      </ul>
                    {:else if newCupFormat === "double_elimination_12"}
                      <span
                        class="text-xs font-bold text-[#F4C152] uppercase tracking-wider block flex items-center gap-1.5"
                      >
                        <Swords class="w-3.5 h-3.5" />
                        <span
                          >Challonge Standard Double Elimination (7 Runder)</span
                        >
                      </span>
                      <ul class="space-y-1 text-xs text-[#94A3B8]">
                        <li>
                          • <strong>Topp 4 Byes:</strong> Seeds 1–4 belønnes med
                          frirunde i GW {newCupStartGw}.
                        </li>
                        <li>
                          • <strong>Innledende runde:</strong> Seeds 5–12
                          spiller 4 kamper i GW {newCupStartGw}.
                        </li>
                        <li>
                          • <strong>Taperbrakett:</strong> Taperne faller ned i Losers
                          Bracket og får en ekstra sjanse.
                        </li>
                        <li>
                          • <strong
                            >Grand Final (GW {newCupStartGw + 6}):</strong
                          > Vinner WB mot Vinner LB!
                        </li>
                      </ul>
                    {:else if newCupFormat === "top8_single"}
                      <span
                        class="text-xs font-bold text-[#70E1F8] uppercase tracking-wider block flex items-center gap-1.5"
                      >
                        <Trophy class="w-3.5 h-3.5" />
                        <span>Topp 8 Sluttspill (3 Runder)</span>
                      </span>
                      <ul class="space-y-1 text-xs text-[#94A3B8]">
                        <li>
                          • <strong>Kvartfinaler (GW {newCupStartGw}):</strong> Kun
                          de 8 beste rommene deltar (4 kamper).
                        </li>
                        <li>
                          • <strong
                            >Semifinaler (GW {newCupStartGw + 1}):</strong
                          > De 4 vinnerne.
                        </li>
                        <li>
                          • <strong>Storfinale (GW {newCupStartGw + 2}):</strong
                          > Titteloppgjør!
                        </li>
                      </ul>
                    {:else if newCupFormat === "group_stage_12"}
                      <span
                        class="text-xs font-bold text-[#F4C152] uppercase tracking-wider block flex items-center gap-1.5"
                      >
                        <Crown class="w-3.5 h-3.5" />
                        <span
                          >Gruppespill (2 puljer à 6) + Sluttspill (5 Runder)</span
                        >
                      </span>
                      <ul class="space-y-1 text-xs text-[#94A3B8]">
                        <li>
                          • <strong
                            >Gruppespill (GW {newCupStartGw}–{newCupStartGw +
                              2}):</strong
                          > Gruppe A og B spiller innledende kamper for puljepoeng.
                        </li>
                        <li>
                          • <strong
                            >Semifinaler (GW {newCupStartGw + 3}):</strong
                          > Nr 1 i Gruppe A møter Nr 2 i Gruppe B, og Nr 1 i Gruppe
                          B møter Nr 2 i Gruppe A.
                        </li>
                        <li>
                          • <strong>Storfinale (GW {newCupStartGw + 4}):</strong
                          > Vinnerne av semifinalene møtes til finale.
                        </li>
                      </ul>
                    {/if}
                  </div>

                  <button
                    onclick={handleCreateCupSubmit}
                    disabled={isCreatingCup}
                    class="w-full py-3 rounded-xl bg-[#9FE88D] hover:bg-[#8ee07b] text-[#16380c] font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <Swords
                      class={`w-4 h-4 ${isCreatingCup ? "animate-spin" : ""}`}
                    />
                    <span
                      >{isCreatingCup
                        ? "Genererer cup..."
                        : "Generer og Start Turnering"}</span
                    >
                  </button>
                </div>
              </div>
            {:else}
              <!-- Aktiv Cup Kontrollpanel -->
              <div class="space-y-4">
                <!-- Cup Oversikt Header -->
                <div
                  class="p-4 rounded-2xl bg-[#242B35] border border-[#384252] flex flex-wrap items-center justify-between gap-3 shadow-sm"
                >
                  <div class="flex items-center gap-3">
                    <div
                      class="p-2.5 rounded-xl bg-[#F4C152]/15 text-[#F4C152] border border-[#F4C152]/30"
                    >
                      <Trophy class="w-5 h-5" />
                    </div>
                    <div>
                      <div class="flex items-center gap-2">
                        <h3 class="text-base font-bold text-white">
                          {activeCup.name}
                        </h3>
                        <span
                          class="text-xs font-bold px-2 py-0.5 rounded-full bg-[#9FE88D]/15 text-[#9FE88D] border border-[#9FE88D]/30"
                        >
                          {activeCup.status === "completed"
                            ? "Fullført"
                            : "Aktiv"}
                        </span>
                      </div>
                      <p class="text-xs text-[#94A3B8]">
                        Aktiv runde: <strong class="text-white"
                          >Runde {activeCup.currentRound}</strong
                        >
                        av {activeCup.totalRounds} • Format: Double Elimination
                      </p>
                    </div>
                  </div>

                  <div class="flex items-center gap-2">
                    <button
                      onclick={() =>
                        handleCalculateCupRound(
                          activeCup._id,
                          activeCup.currentRound,
                        )}
                      disabled={isCalculatingCupRound}
                      class="px-4 py-2 rounded-xl bg-[#9FE88D] hover:bg-[#8ee07b] text-[#16380c] text-xs font-bold transition-all shadow-md flex items-center gap-2"
                    >
                      <RefreshCw
                        class={`w-4 h-4 ${isCalculatingCupRound ? "animate-spin" : ""}`}
                      />
                      <span
                        >{isCalculatingCupRound
                          ? "Beregner..."
                          : `Beregn Runde ${activeCup.currentRound}`}</span
                      >
                    </button>

                    <button
                      onclick={() => promptDeleteCup(activeCup._id)}
                      class="px-3 py-2 rounded-xl bg-[#FB6F84]/15 hover:bg-[#FB6F84]/25 text-[#FB6F84] border border-[#FB6F84]/30 text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                      <Trash2 class="w-3.5 h-3.5" />
                      <span>Slett Cup</span>
                    </button>
                  </div>
                </div>

                <!-- Redigeringsmodal / Boks for valgt kamp -->
                {#if selectedMatchForEdit}
                  <div
                    class="p-4 rounded-2xl bg-[#191E24] border border-[#F4C152]/40 space-y-3 shadow-md"
                  >
                    <div
                      class="flex items-center justify-between pb-2 border-b border-[#384252]"
                    >
                      <div class="flex items-center gap-2">
                        <Shield class="w-4 h-4 text-[#F4C152]" />
                        <h4 class="text-xs font-bold uppercase text-white">
                          Rediger Kamp: {selectedMatchForEdit.roundTitle} (GW {selectedMatchForEdit.gameweek})
                        </h4>
                      </div>
                      <button
                        onclick={() => (selectedMatchForEdit = null)}
                        class="text-[#94A3B8] hover:text-white"
                      >
                        <X class="w-4 h-4" />
                      </button>
                    </div>

                    <div
                      class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs"
                    >
                      <div>
                        <label
                          for="edit-match-r1"
                          class="block font-bold text-white mb-1">Rom 1:</label
                        >
                        <select
                          id="edit-match-r1"
                          bind:value={editMatchRoom1Id}
                          class="w-full px-3 py-2 rounded-xl bg-[#242B35] border border-[#384252] text-white focus:border-[#9FE88D] focus:outline-none"
                        >
                          <option value="">-- Ingen / Avventer --</option>
                          {#each rooms as r}
                            <option value={r._id}>{r.name}</option>
                          {/each}
                        </select>
                      </div>

                      <div>
                        <label
                          for="edit-match-r2"
                          class="block font-bold text-white mb-1">Rom 2:</label
                        >
                        <select
                          id="edit-match-r2"
                          bind:value={editMatchRoom2Id}
                          class="w-full px-3 py-2 rounded-xl bg-[#242B35] border border-[#384252] text-white focus:border-[#9FE88D] focus:outline-none"
                        >
                          <option value="">-- Ingen / Avventer --</option>
                          {#each rooms as r}
                            <option value={r._id}>{r.name}</option>
                          {/each}
                        </select>
                      </div>

                      <div>
                        <label
                          for="edit-match-winner"
                          class="block font-bold text-[#F4C152] mb-1"
                          >Sett Vinner:</label
                        >
                        <select
                          id="edit-match-winner"
                          bind:value={editMatchWinnerId}
                          class="w-full px-3 py-2 rounded-xl bg-[#242B35] border border-[#F4C152]/50 text-white focus:border-[#F4C152] focus:outline-none"
                        >
                          <option value="">-- Ingen vinner kåret ennå --</option
                          >
                          {#if editMatchRoom1Id}
                            <option value={editMatchRoom1Id}>
                              {rooms.find((r) => r._id === editMatchRoom1Id)
                                ?.name || "Rom 1"} (Vinner)
                            </option>
                          {/if}
                          {#if editMatchRoom2Id}
                            <option value={editMatchRoom2Id}>
                              {rooms.find((r) => r._id === editMatchRoom2Id)
                                ?.name || "Rom 2"} (Vinner)
                            </option>
                          {/if}
                        </select>
                      </div>

                      <div>
                        <label
                          for="edit-match-score1"
                          class="block font-bold text-white mb-1"
                          >Score Rom 1 (Snitt):</label
                        >
                        <input
                          id="edit-match-score1"
                          type="number"
                          step="0.1"
                          bind:value={editMatchScore1}
                          placeholder="f.eks. 68.5"
                          class="w-full px-3 py-2 rounded-xl bg-[#242B35] border border-[#384252] text-white focus:border-[#9FE88D] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label
                          for="edit-match-score2"
                          class="block font-bold text-white mb-1"
                          >Score Rom 2 (Snitt):</label
                        >
                        <input
                          id="edit-match-score2"
                          type="number"
                          step="0.1"
                          bind:value={editMatchScore2}
                          placeholder="f.eks. 72.0"
                          class="w-full px-3 py-2 rounded-xl bg-[#242B35] border border-[#384252] text-white focus:border-[#9FE88D] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div
                      class="flex items-center justify-end gap-2 pt-2 border-t border-[#384252]"
                    >
                      <button
                        onclick={() => (selectedMatchForEdit = null)}
                        class="px-3 py-1.5 rounded-xl bg-[#242B35] text-[#94A3B8] hover:text-white text-xs border border-[#384252]"
                      >
                        Avbryt
                      </button>
                      <button
                        onclick={handleSaveEditMatch}
                        class="px-4 py-1.5 rounded-xl bg-[#9FE88D] hover:bg-[#8ee07b] text-[#16380c] font-bold text-xs transition-colors"
                      >
                        Lagre Kampendringer
                      </button>
                    </div>
                  </div>
                {/if}

                <!-- Liste over alle kamper i cupen -->
                <div class="space-y-2">
                  <div class="flex items-center justify-between">
                    <h4
                      class="text-xs font-bold text-[#94A3B8] uppercase tracking-wider"
                    >
                      Alle Kamper i Cupen ({activeCup.matches?.length || 0})
                    </h4>
                    <span class="text-[11px] text-[#94A3B8]">
                      Trykk "Rediger" for manuell overstyring
                    </span>
                  </div>

                  <div
                    class="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto custom-scrollbar pr-1"
                  >
                    {#each activeCup.matches || [] as match}
                      <div
                        class="p-3 rounded-xl bg-[#242B35] border border-[#384252] space-y-2 text-xs"
                      >
                        <div
                          class="flex items-center justify-between pb-1.5 border-b border-[#384252]/60"
                        >
                          <span class="font-bold text-white text-[11px]">
                            {match.roundTitle} (Runde {match.roundNumber})
                          </span>
                          <div class="flex items-center gap-2">
                            <span
                              class="font-mono text-[10px] text-[#F4C152] bg-[#191E24] px-1.5 py-0.5 rounded border border-[#384252]"
                            >
                              GW {match.gameweek}
                            </span>
                            <span
                              class={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                match.status === "completed"
                                  ? "text-[#9FE88D] bg-[#9FE88D]/15"
                                  : "text-[#94A3B8] bg-[#191E24]"
                              }`}
                            >
                              {match.status === "completed"
                                ? "Ferdig"
                                : "Kommende"}
                            </span>
                          </div>
                        </div>

                        <div class="flex items-center justify-between">
                          <div class="space-y-1 min-w-0">
                            <div
                              class={`flex items-center gap-1.5 truncate ${match.winnerRoomId && match.room1Id === match.winnerRoomId ? "font-bold text-[#9FE88D]" : "text-white"}`}
                            >
                              <span
                                class="w-2 h-2 rounded-full"
                                style={`background-color: ${match.room1?.accentColor || "#1eb854"}`}
                              ></span>
                              <span>{match.room1?.name || "TBD"}</span>
                              {#if match.room1Score !== undefined}
                                <span
                                  class="font-mono text-[11px] text-[#94A3B8]"
                                  >({match.room1Score}p)</span
                                >
                              {/if}
                            </div>

                            <div
                              class={`flex items-center gap-1.5 truncate ${match.winnerRoomId && match.room2Id === match.winnerRoomId ? "font-bold text-[#9FE88D]" : "text-white"}`}
                            >
                              <span
                                class="w-2 h-2 rounded-full"
                                style={`background-color: ${match.room2?.accentColor || "#38bdf8"}`}
                              ></span>
                              <span>{match.room2?.name || "TBD"}</span>
                              {#if match.room2Score !== undefined}
                                <span
                                  class="font-mono text-[11px] text-[#94A3B8]"
                                  >({match.room2Score}p)</span
                                >
                              {/if}
                            </div>
                          </div>

                          <button
                            onclick={() => startEditingMatch(match)}
                            class="px-2.5 py-1 rounded-lg bg-[#191E24] hover:bg-[#384252] text-[#F4C152] border border-[#384252] text-[11px] font-bold transition-colors shrink-0"
                          >
                            Rediger
                          </button>
                        </div>
                      </div>
                    {/each}
                  </div>
                </div>
              </div>
            {/if}
          </div>
        {/if}
      {/if}
    </div>
  </div>
{/if}

<!-- Modal: Opprett Nytt Rom -->
{#if showCreateRoomModal}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 text-[#E2E8F0]"
  >
    <div
      class="bg-[#2A303C] border border-[#384252] rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl"
    >
      <div
        class="flex items-center justify-between pb-2 border-b border-[#384252]"
      >
        <h3 class="font-bold text-white text-sm">Opprett Nytt Rom</h3>
        <button
          onclick={() => (showCreateRoomModal = false)}
          class="text-[#94A3B8] hover:text-white"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="space-y-3 text-xs">
        <div>
          <label
            for="admin-create-room-name"
            class="block font-bold text-white mb-1">Romnavn</label
          >
          <input
            id="admin-create-room-name"
            type="text"
            bind:value={newRoomName}
            placeholder="f.eks. A13"
            class="w-full px-3 py-2 rounded-xl bg-[#191E24] border border-[#384252] text-white focus:border-[#9FE88D] focus:outline-none"
          />
        </div>

        <div>
          <label
            for="admin-create-room-color"
            class="block font-bold text-white mb-1">Farge</label
          >
          <input
            id="admin-create-room-color"
            type="color"
            bind:value={newRoomAccent}
            class="w-full h-10 rounded-xl bg-[#191E24] border border-[#384252] cursor-pointer"
          />
        </div>
      </div>

      <div
        class="flex items-center justify-end gap-2 pt-2 border-t border-[#384252]"
      >
        <button
          onclick={() => (showCreateRoomModal = false)}
          class="px-4 py-2 rounded-xl bg-[#242B35] text-[#94A3B8] hover:text-white text-xs border border-[#384252]"
        >
          Avbryt
        </button>
        <button
          onclick={handleCreateRoomSubmit}
          class="px-5 py-2 rounded-xl bg-[#9FE88D] hover:bg-[#8ce078] text-[#16380c] font-bold text-xs transition-colors"
        >
          Opprett Rom
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Egendefinert Bekreftelsesdialog (Custom Themed Dialog) -->
{#if confirmDialog.show}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 text-[#E2E8F0]"
  >
    <div
      class="bg-[#2A303C] border border-[#384252] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
    >
      <div class="flex items-center gap-3 text-[#F4C152]">
        <AlertTriangle class="w-6 h-6" />
        <h3 class="font-bold text-white text-base">{confirmDialog.title}</h3>
      </div>

      <p class="text-xs text-[#94A3B8] leading-relaxed">
        {confirmDialog.message}
      </p>

      <div
        class="flex items-center justify-end gap-2.5 pt-2 border-t border-[#384252]"
      >
        <button
          onclick={() => (confirmDialog.show = false)}
          class="px-4 py-2 rounded-xl bg-[#242B35] text-[#94A3B8] hover:text-white text-xs font-semibold border border-[#384252]"
        >
          Avbryt
        </button>
        <button
          onclick={() => {
            const fn = confirmDialog.onConfirm;
            confirmDialog.show = false;
            if (fn) fn();
          }}
          class="px-5 py-2 rounded-xl bg-[#FB6F84] hover:bg-[#fa5b73] text-white font-bold text-xs transition-colors"
        >
          {confirmDialog.confirmText}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Flytende Drag-avatar ved Pointer Dragging -->
{#if isPointerDragging && pointerDragTeam}
  <div
    class="fixed z-[99999] pointer-events-none px-4 py-2.5 rounded-xl bg-[#242B35] border-2 border-[#9FE88D] text-white text-xs font-bold shadow-2xl flex items-center gap-2 transform -translate-x-1/2 -translate-y-1/2 select-none ring-4 ring-[#9FE88D]/20 animate-in zoom-in-95"
    style={`left: ${pointerPos.x}px; top: ${pointerPos.y}px;`}
  >
    <span class="w-2.5 h-2.5 rounded-full bg-[#9FE88D] animate-pulse"></span>
    <span class="truncate">{pointerDragTeam.managerName}</span>
    <span class="text-[11px] text-[#94A3B8] font-normal"
      >({pointerDragTeam.teamName})</span
    >
  </div>
{/if}

<!-- Koble Bruker til FPL-lag Modal (Admin) -->
{#if linkingUserModal.show && linkingUserModal.user}
  <div
    class="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none"
  >
    <div
      class="relative w-full max-w-md bg-[#242B35] border border-[#384252] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
    >
      <div
        class="flex items-center justify-between p-4 px-5 border-b border-[#384252] bg-[#191E24]"
      >
        <div class="flex items-center gap-2.5">
          <div
            class="p-2 rounded-xl bg-[#70E1F8]/10 text-[#70E1F8] border border-[#70E1F8]/30"
          >
            <Shirt class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-white">
              Koble lag for {linkingUserModal.user.username}
            </h3>
            <p class="text-[11px] text-[#94A3B8]">
              Administrator overstyring av FPL-lag
            </p>
          </div>
        </div>
        <button
          onclick={() => (linkingUserModal.show = false)}
          class="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#2A303C] transition-colors"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
        <div>
          <label
            for="admin-select-user-team"
            class="block text-xs font-bold text-white mb-1.5"
          >
            Velg FPL-lag fra ligaen:
          </label>
          <select
            id="admin-select-user-team"
            bind:value={linkingUserModal.selectedEntryId}
            class="w-full px-3.5 py-2.5 rounded-xl bg-[#191E24] border border-[#384252] text-white focus:border-[#9FE88D] focus:outline-none text-xs"
          >
            <option value={null}
              >-- Ingen lag tilknyttet (Fjern tilknytning) --</option
            >
            {#each fplTeams as team (team.entryId)}
              {@const isTakenByOther = users.some(
                (u) =>
                  u.fplEntryId === team.entryId &&
                  u._id !== linkingUserModal.user?._id,
              )}
              <option value={team.entryId}>
                {team.teamName} ({team.managerName}){isTakenByOther
                  ? " [Tilknyttet annen bruker]"
                  : ""}
              </option>
            {/each}
          </select>
        </div>

        <p class="text-[11px] text-[#94A3B8] leading-relaxed">
          Dersom du velger et lag som allerede er knyttet til en annen bruker,
          vil laget bli flyttet til <strong class="text-white"
            >{linkingUserModal.user.username}</strong
          >.
        </p>
      </div>

      <div
        class="p-4 border-t border-[#384252] bg-[#191E24] flex items-center justify-between gap-3 flex-wrap"
      >
        <div class="flex items-center gap-2">
          <button
            type="button"
            onclick={() => (linkingUserModal.show = false)}
            class="px-4 py-2 rounded-xl bg-[#2A303C] hover:bg-[#384252] text-xs font-semibold text-[#94A3B8] hover:text-white transition-colors"
          >
            Avbryt
          </button>

          {#if linkingUserModal.user.fplEntryId}
            <button
              type="button"
              disabled={isSavingUserLink}
              onclick={async () => {
                isSavingUserLink = true;
                try {
                  await onLinkUserTeam(linkingUserModal.user._id, undefined);
                  showSuccess(
                    `Fjernet FPL-kobling for ${linkingUserModal.user.username}`,
                  );
                  linkingUserModal.show = false;
                } catch (err: any) {
                  showError(err.message || "Kunne ikke fjerne FPL-kobling.");
                } finally {
                  isSavingUserLink = false;
                }
              }}
              class="px-3.5 py-2 rounded-xl bg-[#FB6F84]/15 hover:bg-[#FB6F84]/25 text-[#FB6F84] border border-[#FB6F84]/30 text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <Unlink class="w-3.5 h-3.5" />
              <span>Fjern kobling</span>
            </button>
          {/if}
        </div>

        <button
          type="button"
          disabled={isSavingUserLink}
          onclick={async () => {
            isSavingUserLink = true;
            try {
              await onLinkUserTeam(
                linkingUserModal.user._id,
                linkingUserModal.selectedEntryId ?? undefined,
              );
              showSuccess(
                `Oppdaterte lagtilknytning for ${linkingUserModal.user.username}`,
              );
              linkingUserModal.show = false;
            } catch (err: any) {
              showError(err.message || "Kunne ikke oppdatere lagtilknytning.");
            } finally {
              isSavingUserLink = false;
            }
          }}
          class="px-5 py-2.5 rounded-xl bg-[#9FE88D] hover:bg-[#8ce078] disabled:opacity-50 text-[#16380c] font-bold text-xs transition-colors shadow-md flex items-center gap-1.5"
        >
          <CheckCircle2 class="w-3.5 h-3.5" />
          <span>{isSavingUserLink ? "Lagrer..." : "Lagre tilknytning"}</span>
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Opprett Manuell Bruker Modal (Admin) -->
{#if showCreateUserModal}
  <div
    class="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none"
  >
    <div
      class="relative w-full max-w-lg bg-[#242B35] border border-[#384252] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
    >
      <div
        class="flex items-center justify-between p-4 px-5 border-b border-[#384252] bg-[#191E24]"
      >
        <div class="flex items-center gap-2.5">
          <div
            class="p-2 rounded-xl bg-[#9FE88D]/15 text-[#9FE88D] border border-[#9FE88D]/30"
          >
            <UserPlus class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-white">
              Opprett manuell bruker
            </h3>
            <p class="text-[11px] text-[#94A3B8]">
              Opprett brukerkonto direkte uten invitasjonskode
            </p>
          </div>
        </div>
        <button
          onclick={() => (showCreateUserModal = false)}
          class="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#2A303C] transition-colors"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
        {#if createUserError}
          <div
            class="p-3 rounded-xl bg-[#FB6F84]/15 border border-[#FB6F84]/40 text-[#FB6F84] text-xs font-semibold flex items-center gap-2"
          >
            <AlertTriangle class="w-4 h-4 shrink-0" />
            <span>{createUserError}</span>
          </div>
        {/if}

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label
              for="manual-username"
              class="block text-xs font-bold text-white mb-1.5"
            >
              Brukernavn <span class="text-[#FB6F84]">*</span>
            </label>
            <input
              id="manual-username"
              type="text"
              bind:value={newUsername}
              placeholder="F.eks. ola.nordmann"
              class="w-full px-3.5 py-2.5 rounded-xl bg-[#191E24] border border-[#384252] text-xs sm:text-sm text-white placeholder-[#94A3B8] focus:border-[#9FE88D] focus:outline-none"
            />
          </div>

          <div>
            <label
              for="manual-password"
              class="block text-xs font-bold text-white mb-1.5"
            >
              Passord <span class="text-[#FB6F84]">*</span>
            </label>
            <input
              id="manual-password"
              type="text"
              bind:value={newPassword}
              placeholder="Minst 4 tegn"
              class="w-full px-3.5 py-2.5 rounded-xl bg-[#191E24] border border-[#384252] text-xs sm:text-sm text-white placeholder-[#94A3B8] focus:border-[#9FE88D] focus:outline-none font-mono"
            />
          </div>
        </div>

        <div>
          <label
            for="manual-role-group"
            class="block text-xs font-bold text-white mb-1.5"
          >
            Brukertype / Rolle
          </label>
          <div id="manual-role-group" class="grid grid-cols-2 gap-2">
            <button
              type="button"
              onclick={() => (newRole = "user")}
              class={`p-3 rounded-xl border text-left transition-all ${
                newRole === "user"
                  ? "bg-[#9FE88D]/15 border-[#9FE88D] text-white"
                  : "bg-[#191E24] border-[#384252] text-[#94A3B8] hover:border-[#4B5563]"
              }`}
            >
              <div class="font-bold text-xs">Vanlig spiller</div>
              <div class="text-[10px] opacity-75">Standard ligatilgang</div>
            </button>

            <button
              type="button"
              onclick={() => (newRole = "admin")}
              class={`p-3 rounded-xl border text-left transition-all ${
                newRole === "admin"
                  ? "bg-[#9FE88D]/15 border-[#9FE88D] text-white"
                  : "bg-[#191E24] border-[#384252] text-[#94A3B8] hover:border-[#4B5563]"
              }`}
            >
              <div class="font-bold text-xs text-[#9FE88D]">Administrator</div>
              <div class="text-[10px] opacity-75">Full kontroll over ligaen</div>
            </button>
          </div>
        </div>

        <div>
          <label
            for="manual-room"
            class="block text-xs font-bold text-white mb-1.5"
          >
            Tildel Arbeidsrom:
          </label>
          <select
            id="manual-room"
            bind:value={newRoomId}
            class="w-full px-3.5 py-2.5 rounded-xl bg-[#191E24] border border-[#384252] text-xs sm:text-sm text-white focus:border-[#9FE88D] focus:outline-none"
          >
            <option value="">Ingen (ufordelt / velges senere)</option>
            {#each rooms as r}
              <option value={r._id}>
                Rom {r.roomNumber}: {r.name}
              </option>
            {/each}
          </select>
        </div>

        <div>
          <label
            for="manual-team"
            class="block text-xs font-bold text-white mb-1.5"
          >
            Koble til FPL-lag i ligaen (valgfritt):
          </label>
          <select
            id="manual-team"
            bind:value={newFplEntryId}
            class="w-full px-3.5 py-2.5 rounded-xl bg-[#191E24] border border-[#384252] text-xs sm:text-sm text-white focus:border-[#9FE88D] focus:outline-none"
          >
            <option value={null}>Ingen (kobles opp senere av spilleren)</option>
            {#each fplTeams as t}
              <option value={t.entryId}>
                {t.teamName} ({t.managerName})
              </option>
            {/each}
          </select>
        </div>
      </div>

      <div
        class="p-4 border-t border-[#384252] bg-[#191E24] flex items-center justify-between gap-3"
      >
        <button
          type="button"
          onclick={() => (showCreateUserModal = false)}
          class="px-4 py-2 rounded-xl bg-[#2A303C] hover:bg-[#384252] text-xs font-semibold text-[#94A3B8] hover:text-white transition-colors"
        >
          Avbryt
        </button>

        <button
          type="button"
          disabled={isCreatingUser || !newUsername.trim() || !newPassword}
          onclick={handleCreateManualUser}
          class="px-5 py-2.5 rounded-xl bg-[#9FE88D] hover:bg-[#8ce078] disabled:opacity-50 text-[#16380c] font-bold text-xs transition-colors shadow-md flex items-center gap-1.5"
        >
          <UserPlus class="w-3.5 h-3.5" />
          <span>{isCreatingUser ? "Oppretter..." : "Opprett bruker"}</span>
        </button>
      </div>
    </div>
  </div>
{/if}
