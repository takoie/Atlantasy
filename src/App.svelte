<script lang="ts">
  import TitleBar from "$lib/components/TitleBar.svelte";
  import WallOfFameBanner from "$lib/components/WallOfFameBanner.svelte";
  import Leaderboard from "$lib/components/Leaderboard.svelte";
  import IndividualLeaderboard from "$lib/components/IndividualLeaderboard.svelte";
  import LeagueStatsPanel from "$lib/components/LeagueStatsPanel.svelte";
  import ChatDrawer from "$lib/components/ChatDrawer.svelte";
  import RoomDetailModal from "$lib/components/RoomDetailModal.svelte";
  import AdminModal from "$lib/components/AdminModal.svelte";
  import RegisterModal from "$lib/components/RegisterModal.svelte";
  import WelcomeOnboarding from "$lib/components/WelcomeOnboarding.svelte";
  import NewsSection from "$lib/components/NewsSection.svelte";
  import TeamProfileModal from "$lib/components/TeamProfileModal.svelte";
  import CupView from "$lib/components/CupView.svelte";
  import Sidebar from "$lib/components/Sidebar.svelte";
  import UpdateModal from "$lib/components/UpdateModal.svelte";
  import LicensesModal from "$lib/components/LicensesModal.svelte";
  import ClaimFplTeamModal from "$lib/components/ClaimFplTeamModal.svelte";

  import { useQuery, useMutation, useAction } from "$lib/convex.svelte";
  import { api } from "../convex/_generated/api";
  import { Trophy, ArrowLeft, Crown, Sparkles, Flame, Award } from "lucide-svelte";
  import { onMount } from "svelte";

  // Reaktiv Convex Queries
  const roomsQuery = useQuery(api.rooms.listRooms);
  const leaderboardQuery = useQuery(api.rooms.getLeaderboard, () => ({
    sortBy: activeSort,
  }));
  const individualLeaderboardQuery = useQuery(api.rooms.getIndividualLeaderboard, () => ({
    sortBy: activeSort,
  }));
  let insightsTimeframe = $state<"round" | "month" | "season">("round");
  const funStatsQuery = useQuery(api.rooms.getLeagueFunStats, () => ({
    timeframe: insightsTimeframe,
  }));
  const settingsQuery = useQuery(api.admin.getSettings);
  const monthWinnersQuery = useQuery(api.admin.getMonthWinners);
  const inviteCodesQuery = useQuery(api.admin.listInviteCodes);
  const usersQuery = useQuery(api.auth.listUsers);
  const articlesQuery = useQuery(api.articles.listArticles);
  const allTeamsQuery = useQuery(api.rooms.getAllFplTeams);

  // Reaktiv State med Svelte 5 Runes
  let activeView = $state("leaderboard"); // "leaderboard" | "wall_of_fame" | "news"
  let activeSort = $state("live");         // "live" | "month" | "season"
  let selectedRoomId = $state<string | null>(null);
  let activeChatChannel = $state("banter"); // "banter" | "room"
  let activeUserId = $state<string | null>(null);
  let isSyncing = $state(false);
  let isChatOpen = $state(false);
  let showOnboarding = $state(false);

  // Modals state
  let isRoomModalOpen = $state(false);
  let modalRoom = $state<any>(null);
  let isAdminModalOpen = $state(false);
  let isRegisterModalOpen = $state(false);
  let selectedProfileEntryId = $state<number | null>(null);
  let isUpdateModalOpen = $state(false);
  let updateModalRef = $state<any>(null);
  let isLicensesModalOpen = $state(false);
  let isClaimTeamModalOpen = $state(false);

  // Convex Mutations
  const sendMessageMutation = useMutation(api.chat.sendMessage);
  const updateSettingsMutation = useMutation(api.admin.updateSettings);
  const createInviteMutation = useMutation(api.admin.createInviteCode);
  const declareWinnerMutation = useMutation(api.admin.declareMonthlyWinner);
  const unpinAnnouncementMutation = useMutation(api.admin.unpinAnnouncement);
  const seedDataMutation = useMutation(api.fpl.seedDefaultData);
  const registerMutation = useMutation(api.auth.registerWithInvite);
  const loginOrRegisterMutation = useMutation(api.auth.loginOrRegister);
  const validateStep1Mutation = useMutation(api.auth.validateRegistrationStep1);
  const claimMyFplTeamMutation = useMutation(api.auth.claimMyFplTeam);
  const adminLinkUserTeamMutation = useMutation(api.admin.adminLinkUserTeam);
  const setUserRoleMutation = useMutation(api.auth.setUserRole);
  const batchAssignMutation = useMutation(api.rooms.batchSaveRoomAssignments);
  const clearAllAssignmentsMutation = useMutation(api.rooms.clearAllRoomAssignments);
  const updateRoomMutation = useMutation(api.rooms.updateRoom);
  const createRoomMutation = useMutation(api.rooms.createRoom);
  const deleteRoomMutation = useMutation(api.rooms.deleteRoom);
  const updateTeamNameMutation = useMutation(api.rooms.updateTeamName);
  const startNewSeasonMutation = useMutation(api.admin.startNewSeason);
  const createArticleMutation = useMutation(api.articles.createArticle);
  const updateArticleMutation = useMutation(api.articles.updateArticle);
  const toggleArchiveArticleMutation = useMutation(api.articles.toggleArchiveArticle);
  const togglePinArticleMutation = useMutation(api.articles.togglePinArticle);
  const likeArticleMutation = useMutation(api.articles.likeArticle);
  const deleteArticleMutation = useMutation(api.articles.deleteArticle);
  const wipePreseededMutation = useMutation(api.admin.wipeAllPreseededData);
  const deleteAllUsersMutation = useMutation(api.admin.deleteAllUsers);
  const deleteUserMutation = useMutation(api.admin.deleteUser);
  const deleteInviteMutation = useMutation(api.admin.deleteInviteCode);

  // Convex Actions for Live FPL API Integration
  const syncLiveFplAction = useAction(api.fpl.syncLiveFplData);
  const fetchFplLeagueAction = useAction(api.fpl.fetchFplLeagueStandings);
  const fetchDeadlineAction = useAction(api.fpl.fetchNextDeadline);

  let nextDeadlineInfo = $state<{
    gameweek: number;
    name: string;
    deadlineTime: string;
    deadlineEpoch: number;
  } | null>(null);

  // Utledet data med fallback
  let rooms = $derived(roomsQuery.data ?? []);
  let leaderboard = $derived(leaderboardQuery.data ?? []);
  let individualPlayers = $derived(individualLeaderboardQuery.data ?? []);
  let funStats = $derived(funStatsQuery.data ?? null);
  let settings = $derived(settingsQuery.data ?? null);
  let monthWinners = $derived(monthWinnersQuery.data ?? null);
  let roomWinner = $derived(monthWinners?.roomWinner ?? null);
  let soloWinner = $derived(monthWinners?.soloWinner ?? null);
  let winnerHistory = $derived(monthWinners?.history ?? []);
  let inviteCodes = $derived(inviteCodesQuery.data ?? []);
  let users = $derived(usersQuery.data ?? []);
  let articles = $derived(articlesQuery.data ?? []);
  let fplTeams = $derived(allTeamsQuery.data ?? []);

  // Nåværende aktiv bruker (eller null hvis utlogget)
  let currentUser = $derived(
    activeUserId ? (users.find((u) => u._id === activeUserId) || null) : null
  );

  // Chat Query reaktiv på aktivt rom
  let activeRoomId = $derived(
    selectedRoomId || (currentUser?.roomId ?? rooms[0]?._id)
  );
  let currentRoom = $derived(rooms.find((r) => r._id === activeRoomId) || rooms[0]);

  const chatQuery = useQuery(api.chat.getMessages, () => ({
    channel: activeChatChannel,
    roomId: activeChatChannel === "room" ? (activeRoomId as any) : undefined,
  }));
  let messages = $derived(chatQuery.data ?? []);

  // Tidsstempel for når brukeren sist åpnet chatten (hentes fra localStorage)
  let lastVisitedChatTime = $state<number>(Date.now());

  const unreadChatQuery = useQuery(api.chat.getUnreadCount, () => ({
    since: lastVisitedChatTime,
    roomId: (currentUser?.roomId ?? undefined) as any,
  }));

  let unreadChatCount = $derived(
    activeView === "chat" || isChatOpen ? 0 : (unreadChatQuery.data ?? 0)
  );

  // Nullstill uleste meldinger når brukeren går inn på chat-modulen
  $effect(() => {
    if (activeView === "chat" || isChatOpen) {
      const now = Date.now();
      lastVisitedChatTime = now;
      localStorage.setItem("atlantasy_last_visited_chat", String(now));
    }
  });

  let isConvexConnected = $derived(
    !roomsQuery.error && roomsQuery.data !== undefined
  );

  onMount(async () => {
    // Hent tidsstempel for sist besøkte chat
    const savedChatTime = localStorage.getItem("atlantasy_last_visited_chat");
    if (savedChatTime) {
      lastVisitedChatTime = parseInt(savedChatTime, 10);
    } else {
      const now = Date.now();
      lastVisitedChatTime = now;
      localStorage.setItem("atlantasy_last_visited_chat", String(now));
    }

    // Sjekk om brukeren allerede har fullført onboarding / lagret profil
    const savedUserId = localStorage.getItem("atlantasy_current_user_id");
    if (savedUserId) {
      activeUserId = savedUserId;
      showOnboarding = false;
    } else {
      showOnboarding = true;
    }

    // Hent offisiell neste FPL-frist
    try {
      const dl = await fetchDeadlineAction.execute({});
      if (dl) {
        nextDeadlineInfo = dl;
      }
    } catch (err) {
      console.warn("Kunne ikke hente deadline fra FPL API:", err);
    }
  });

  // Handlers
  function handleOnboardingComplete(userId: string, _userData: any) {
    activeUserId = userId;
    localStorage.setItem("atlantasy_current_user_id", userId);
    localStorage.setItem("atlantasy_has_onboarded", "true");
    showOnboarding = false;
  }

  function handleAdminBypass() {
    localStorage.setItem("atlantasy_has_onboarded", "true");
    showOnboarding = false;
    isAdminModalOpen = true;
  }

  function handleLogout() {
    activeUserId = null;
    localStorage.removeItem("atlantasy_current_user_id");
    localStorage.removeItem("atlantasy_has_onboarded");
    showOnboarding = true;
  }

  async function handleSendMessage(content: string, channel: string, roomId?: string) {
    if (!content.trim() || !currentUser) return;
    try {
      await sendMessageMutation.mutate({
        senderId: currentUser._id,
        senderName: currentUser.username,
        senderRole: currentUser.role,
        senderAvatar: currentUser.avatar,
        channel,
        roomId: (roomId as any) || undefined,
        content,
      });
    } catch (err) {
      console.error("Kunne ikke sende melding:", err);
    }
  }

  async function handleRefreshFpl() {
    isSyncing = true;
    try {
      const res = await syncLiveFplAction.execute({});
      if (res && res.success) {
        console.log(`FPL synkronisert for GW ${res.gameweek}: ${res.syncedCount} lag.`);
      }
    } catch (err) {
      console.warn("FPL Live Sync feilet (bruker eksisterende data):", err);
    } finally {
      isSyncing = false;
    }
  }

  // Automatisk periodisk FPL-synkronisering KUN når en bruker er aktiv i appen
  $effect(() => {
    if (!currentUser) return;

    const syncIntervalMinutes = settings?.syncIntervalMinutes ?? 10;
    const isAutoSyncEnabled = settings?.autoSyncEnabled ?? true;

    if (!isAutoSyncEnabled) return;

    const intervalMs = syncIntervalMinutes * 60 * 1000;
    const lastSync = settings?.lastSyncedAt ?? 0;

    // Sjekk ved oppstart dersom dataene er eldre enn intervallet
    if (Date.now() - lastSync > intervalMs && !isSyncing) {
      handleRefreshFpl();
    }

    // Sjekk hvert 60. sekund om det er på tide med en ny bakgrunnssynkronisering
    const intervalId = setInterval(() => {
      const currentLastSync = settings?.lastSyncedAt ?? 0;
      if (Date.now() - currentLastSync >= intervalMs && !isSyncing) {
        handleRefreshFpl();
      }
    }, 60 * 1000);

    return () => {
      clearInterval(intervalId);
    };
  });

  function handleOpenRoomModal(room: any) {
    modalRoom = room;
    isRoomModalOpen = true;
  }

  function handleOpenProfile(entryId: number) {
    selectedProfileEntryId = entryId;
  }

  async function handleUpdateRoomName(roomId: string, newName: string) {
    try {
      await updateRoomMutation.mutate({
        roomId: roomId as any,
        name: newName,
        userId: currentUser?._id as any,
      });
    } catch (err: any) {
      alert(err.message || "Kunne ikke oppdatere romnavn.");
    }
  }
</script>

<main
  class="flex flex-col h-screen w-screen bg-[#1c2128] text-[#E2E8F0] overflow-hidden font-sans select-none"
>
  <!-- Velkomstside for registrering & Innlogging (Låst uten gjestemodus) -->
  {#if showOnboarding || !activeUserId || !currentUser}
    <WelcomeOnboarding
      {rooms}
      {fplTeams}
      {users}
      onComplete={handleOnboardingComplete}
      onLoginOrRegister={(data) => loginOrRegisterMutation.mutate(data)}
      onValidateStep1={(data) => validateStep1Mutation.mutate(data)}
    />
  {/if}

  <!-- Frameless Custom Titlebar -->
  <TitleBar
    currentGw={settings?.currentGameweek ?? 1}
    {isConvexConnected}
    deadlineEpoch={nextDeadlineInfo?.deadlineEpoch}
    deadlineLabel={nextDeadlineInfo?.name || `GW ${settings?.currentGameweek ?? 1}`}
    {currentUser}
    onLogin={() => (showOnboarding = true)}
    onLogout={handleLogout}
  />

  <!-- Hovedlayout med Venstremeny (Sidebar) og Dedikerte Sider -->
  <div class="flex-1 flex flex-row min-h-0 overflow-hidden">
    <!-- Venstremeny (Sidebar) -->
    <Sidebar
      {activeView}
      currentGw={settings?.currentGameweek ?? 1}
      {isConvexConnected}
      {isSyncing}
      {currentUser}
      {unreadChatCount}
      deadlineEpoch={nextDeadlineInfo?.deadlineEpoch}
      deadlineLabel={nextDeadlineInfo?.name ? (nextDeadlineInfo.name.match(/GW\s*\d+/i)?.[0] || `GW ${settings?.currentGameweek ?? 1}`) : `GW ${settings?.currentGameweek ?? 1}`}
      onSelectView={(view) => {
        activeView = view;
        selectedRoomId = null;
      }}
      onOpenAdmin={() => {
        if (currentUser?.role === "admin") {
          isAdminModalOpen = true;
        }
      }}
      onRefreshFpl={handleRefreshFpl}
      onOpenProfile={(entryId) => {
        const id = entryId ?? currentUser?.fplEntryId;
        if (id) {
          handleOpenProfile(id);
        } else if (currentUser && !currentUser.fplEntryId) {
          isClaimTeamModalOpen = true;
        }
      }}
      onOpenClaimTeam={() => (isClaimTeamModalOpen = true)}
      onCheckForUpdates={() => updateModalRef?.checkForUpdates(true)}
      onOpenLicenses={() => (isLicensesModalOpen = true)}
    />

    <!-- Hovedinnholdsområde for valgt modul/side -->
    <div class="flex-1 flex flex-col p-3.5 sm:p-4 space-y-3 overflow-hidden bg-[#1c2128] min-w-0">
      <!-- 1. Rom-tabell (Leaderboard) -->
      {#if activeView === "leaderboard"}
        {#if roomWinner || soloWinner}
          <WallOfFameBanner
            {roomWinner}
            {soloWinner}
            onSelectRoom={(rId) => {
              selectedRoomId = rId;
              activeView = "leaderboard";
            }}
            onOpenWallOfFame={() => {
              activeView = "wall_of_fame";
              selectedRoomId = null;
            }}
          />
        {/if}

        <Leaderboard
          {leaderboard}
          {selectedRoomId}
          currentGw={settings?.currentGameweek ?? 1}
          deductHits={settings?.deductTransferHits ?? true}
          sortBy={activeSort}
          onSelectSort={(s: string) => (activeSort = s)}
          onOpenRoomModal={handleOpenRoomModal}
          onOpenProfile={handleOpenProfile}
        />

      <!-- 2. Individuell Tabell (Alle FPL-spillere) -->
      {:else if activeView === "individual"}
        <IndividualLeaderboard
          players={individualPlayers}
          currentGw={settings?.currentGameweek ?? 1}
          deductHits={settings?.deductTransferHits ?? true}
          sortBy={activeSort}
          onSelectSort={(s: string) => (activeSort = s)}
          onOpenProfile={handleOpenProfile}
        />

      <!-- 3. Cup & Sluttspill (Double Elimination) -->
      {:else if activeView === "cup"}
        <CupView
          {currentUser}
          onOpenAdmin={() => (isAdminModalOpen = true)}
          onOpenProfile={handleOpenProfile}
        />

      <!-- 4. Ligainnsikt & Høydepunkter (Fullskjerm / Dedikert Side) -->
      {:else if activeView === "insights"}
        <LeagueStatsPanel
          isFullPage={true}
          {funStats}
          timeframe={insightsTimeframe}
          onChangeTimeframe={(t) => (insightsTimeframe = t)}
          onOpenProfile={handleOpenProfile}
        />

      <!-- 4. Sanntids Liga-Chat & Banter (Fullskjerm / Dedikert Side) -->
      {:else if activeView === "chat"}
        <ChatDrawer
          isFullPage={true}
          isOpen={true}
          {messages}
          {currentUser}
          {currentRoom}
          activeChannel={activeChatChannel}
          onSelectChannel={(c) => (activeChatChannel = c)}
          onSendMessage={handleSendMessage}
        />

      <!-- 5. Nyheter & Runderapporter -->
      {:else if activeView === "news"}
        <NewsSection
          {articles}
          {currentUser}
          onBack={() => (activeView = "leaderboard")}
          onCreateArticle={(data) => {
            return createArticleMutation.mutate({
              ...data,
              userId: currentUser?._id,
              authorId: currentUser?._id,
            });
          }}
          onUpdateArticle={(data) => {
            return updateArticleMutation.mutate({
              ...data,
              userId: currentUser?._id,
            });
          }}
          onLikeArticle={(id) => likeArticleMutation.mutate({ articleId: id as any, userId: currentUser?._id || currentUser?.username })}
          onDeleteArticle={(id) => deleteArticleMutation.mutate({ articleId: id as any, userId: currentUser?._id })}
          onToggleArchive={(id) => toggleArchiveArticleMutation.mutate({ articleId: id as any, userId: currentUser?._id })}
          onTogglePin={(id) => togglePinArticleMutation.mutate({ articleId: id as any, userId: currentUser?._id })}
        />

      <!-- 6. Skrytevegg & Hedersvegg (Full Side) -->
      {:else if activeView === "wall_of_fame"}
        <div class="flex-1 overflow-y-auto space-y-5 pr-1 pb-4 custom-scrollbar text-[#E2E8F0]">
          <div class="flex items-center justify-between pb-3 border-b border-[#384252]">
            <div class="flex items-center gap-2.5">
              <div class="p-2 rounded-xl bg-[#F4C152]/15 text-[#F4C152] border border-[#F4C152]/30">
                <Trophy class="w-5 h-5" />
              </div>
              <div>
                <h2 class="text-base font-bold text-white">Månedens Vinnere & Hedersvegg</h2>
                <p class="text-xs text-[#94A3B8]">Offisiell hedersplass for de skarpeste FPL-rommene og solovinnerne</p>
              </div>
            </div>

            <button
              onclick={() => (activeView = "leaderboard")}
              class="px-3.5 py-1.5 rounded-xl bg-[#242B35] hover:bg-[#2A303C] text-xs font-semibold text-[#E2E8F0] border border-[#384252] transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft class="w-3.5 h-3.5" />
              <span>Tilbake til rom-tabell</span>
            </button>
          </div>

          <!-- Aktive Månedsvinnere i Rampelyset -->
          <div class="space-y-2.5">
            <div class="flex items-center gap-2">
              <Sparkles class="w-4 h-4 text-[#F4C152]" />
              <h3 class="text-xs font-bold uppercase tracking-wider text-[#F4C152]">
                Nåværende kårede månedsvinnere
              </h3>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- 🏆 Aktivt Vinnerrom -->
              {#if roomWinner}
                <div class="p-4 rounded-2xl bg-[#2A303C] border border-[#F4C152]/40 space-y-3 shadow-sm relative overflow-hidden">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold uppercase tracking-wider text-[#F4C152] bg-[#F4C152]/15 px-2.5 py-0.5 rounded-md border border-[#F4C152]/30 flex items-center gap-1">
                      <Trophy class="w-3 h-3" />
                      <span>Månedens Vinnerrom • {roomWinner.monthName || "Denne måneden"}</span>
                    </span>
                    <span class="text-2xl">🏆</span>
                  </div>
                  <div>
                    <h4 class="text-lg font-bold text-white">{roomWinner.winningRoom?.name || roomWinner.winnerName || "Vinnerrom"}</h4>
                    <p class="text-xs text-[#E2E8F0] leading-relaxed mt-1">
                      {roomWinner.content}
                    </p>
                  </div>
                  <div class="flex items-center justify-between pt-2 border-t border-[#384252]">
                    <div class="text-xs text-[#F4C152] font-mono font-bold">
                      Vinnende romsnitt: <strong class="text-white">{roomWinner.winningScore} pts</strong>
                    </div>
                    {#if roomWinner.winningRoomId}
                      <button
                        onclick={() => {
                          selectedRoomId = roomWinner.winningRoomId;
                          activeView = "leaderboard";
                        }}
                        class="px-2.5 py-1 rounded-lg bg-[#242B35] text-[#F4C152] hover:bg-[#384252] text-xs font-bold transition-colors border border-[#384252] flex items-center gap-1"
                      >
                        <span>Se rom</span>
                        <Flame class="w-3.5 h-3.5" />
                      </button>
                    {/if}
                  </div>
                </div>
              {:else}
                <div class="p-5 rounded-2xl bg-[#242B35] border border-[#384252] text-center flex flex-col items-center justify-center space-y-1">
                  <Trophy class="w-8 h-8 text-[#94A3B8] mb-1" />
                  <span class="text-xs font-bold text-white">Ingen aktiv romvinner kåret</span>
                  <span class="text-[11px] text-[#94A3B8]">Kår vinnerrom i adminpanelet</span>
                </div>
              {/if}

              <!-- 👑 Aktiv Solovinner -->
              {#if soloWinner}
                <div class="p-4 rounded-2xl bg-[#2A303C] border border-[#9FE88D]/40 space-y-3 shadow-sm relative overflow-hidden">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold uppercase tracking-wider text-[#9FE88D] bg-[#9FE88D]/15 px-2.5 py-0.5 rounded-md border border-[#9FE88D]/30 flex items-center gap-1">
                      <Crown class="w-3 h-3" />
                      <span>Månedens Solovinner • {soloWinner.monthName || "Denne måneden"}</span>
                    </span>
                    <span class="text-2xl">👑</span>
                  </div>
                  <div>
                    <h4 class="text-lg font-bold text-white flex items-center gap-2">
                      <span>{soloWinner.winnerName || "Solovinner"}</span>
                      {#if soloWinner.winnerTeamName}
                        <span class="text-xs text-[#94A3B8] font-normal">({soloWinner.winnerTeamName})</span>
                      {/if}
                    </h4>
                    <p class="text-xs text-[#E2E8F0] leading-relaxed mt-1">
                      {soloWinner.content}
                    </p>
                  </div>
                  <div class="flex items-center justify-between pt-2 border-t border-[#384252]">
                    <div class="text-xs text-[#9FE88D] font-mono font-bold">
                      Månedsscore: <strong class="text-white">{soloWinner.winningScore} pts</strong>
                    </div>
                    {#if soloWinner.winningRoomId}
                      <button
                        onclick={() => {
                          selectedRoomId = soloWinner.winningRoomId;
                          activeView = "leaderboard";
                        }}
                        class="px-2.5 py-1 rounded-lg bg-[#242B35] text-[#9FE88D] hover:bg-[#384252] text-xs font-bold transition-colors border border-[#384252] flex items-center gap-1"
                      >
                        <span>Se rom</span>
                        <Crown class="w-3.5 h-3.5" />
                      </button>
                    {/if}
                  </div>
                </div>
              {:else}
                <div class="p-5 rounded-2xl bg-[#242B35] border border-[#384252] text-center flex flex-col items-center justify-center space-y-1">
                  <Crown class="w-8 h-8 text-[#94A3B8] mb-1" />
                  <span class="text-xs font-bold text-white">Ingen aktiv solovinner kåret</span>
                  <span class="text-[11px] text-[#94A3B8]">Kår solovinner i adminpanelet</span>
                </div>
              {/if}
            </div>
          </div>

          <!-- Månedshistorikk -->
          {#if winnerHistory && winnerHistory.length > 0}
            <div class="space-y-2.5 pt-2">
              <div class="flex items-center gap-2">
                <Award class="w-4 h-4 text-[#F4C152]" />
                <h3 class="text-xs font-bold uppercase tracking-wider text-white">
                  Tidligere måneders vinnere
                </h3>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                {#each winnerHistory as h}
                  <div class="p-3.5 rounded-xl bg-[#242B35] border border-[#384252] flex items-center justify-between">
                    <div>
                      <span class="text-[11px] font-bold text-[#F4C152]">{h.monthName}</span>
                      <p class="text-xs font-bold text-white mt-0.5">{h.winningRoomName || "Rom"}</p>
                    </div>
                    <span class="text-xs font-mono font-bold text-[#9FE88D] bg-[#191E24] px-2 py-0.5 rounded border border-[#384252]">
                      {h.winningScore} pts
                    </span>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>

  <!-- Chat Drawer (Slide-over fra høyre) -->
  <ChatDrawer
    isOpen={isChatOpen}
    {messages}
    {currentUser}
    {currentRoom}
    activeChannel={activeChatChannel}
    onClose={() => (isChatOpen = false)}
    onSelectChannel={(ch: string) => (activeChatChannel = ch)}
    onSendMessage={handleSendMessage}
  />

  <!-- Modaler -->
  <RoomDetailModal
    room={modalRoom}
    isOpen={isRoomModalOpen}
    {currentUser}
    deductHits={settings?.deductTransferHits ?? true}
    onClose={() => (isRoomModalOpen = false)}
    onUpdateRoomName={handleUpdateRoomName}
    onOpenProfile={handleOpenProfile}
  />

  <!-- FPL Lag- & Manager Profilside Modal -->
  <TeamProfileModal
    entryId={selectedProfileEntryId}
    isOpen={selectedProfileEntryId !== null}
    {currentUser}
    onClose={() => (selectedProfileEntryId = null)}
  />

  <AdminModal
    isOpen={isAdminModalOpen && currentUser?.role === "admin"}
    {currentUser}
    {settings}
    {rooms}
    {inviteCodes}
    {users}
    {fplTeams}
    monthWinnersData={monthWinners}
    onClose={() => (isAdminModalOpen = false)}
    onUpdateSettings={(s) => updateSettingsMutation.mutate({ ...s, adminUserId: currentUser?._id })}
    onCreateInviteCode={(c) => createInviteMutation.mutate({ ...c, adminUserId: currentUser?._id })}
    onDeclareWinner={(w) => declareWinnerMutation.mutate({ ...w, adminUserId: currentUser?._id })}
    onUnpinWinner={(id) => unpinAnnouncementMutation.mutate({ announcementId: id as any, adminUserId: currentUser?._id })}
    onBatchSaveAssignments={(assignments, clearUnassigned) => batchAssignMutation.mutate({ assignments, clearUnassigned, adminUserId: currentUser?._id })}
    onClearAllAssignments={() => clearAllAssignmentsMutation.mutate({ adminUserId: currentUser?._id })}
    onCreateRoom={(params) => createRoomMutation.mutate({ ...params, adminUserId: currentUser?._id })}
    onDeleteRoom={(roomId) => deleteRoomMutation.mutate({ roomId: roomId as any, adminUserId: currentUser?._id })}
    onUpdateRoomName={(roomId, newName) => updateRoomMutation.mutate({ roomId: roomId as any, name: newName, adminUserId: currentUser?._id })}
    onUpdateTeamName={(entryId, newTeamName) => updateTeamNameMutation.mutate({ entryId, newTeamName, userId: currentUser?._id })}
    onStartNewSeason={(params) => startNewSeasonMutation.mutate({ ...params, adminUserId: currentUser?._id })}
    onSetUserRole={(uId, role) => setUserRoleMutation.mutate({ userId: uId as any, role, adminUserId: currentUser?._id })}
    onFetchFplLeague={(lId) => fetchFplLeagueAction.execute({ leagueId: lId })}
    onLinkUserTeam={(targetUserId, fplEntryId) => adminLinkUserTeamMutation.mutate({ targetUserId: targetUserId as any, fplEntryId, adminUserId: currentUser?._id })}
    onWipeAllPreseededData={() => wipePreseededMutation.mutate({ adminUserId: currentUser?._id })}
    onDeleteAllUsers={() => deleteAllUsersMutation.mutate({ adminUserId: currentUser?._id })}
    onDeleteUser={(uId) => deleteUserMutation.mutate({ userId: uId as any, adminUserId: currentUser?._id })}
    onDeleteInviteCode={(cId) => deleteInviteMutation.mutate({ codeId: cId as any, adminUserId: currentUser?._id })}
  />

  <RegisterModal
    isOpen={isRegisterModalOpen}
    {rooms}
    onClose={() => (isRegisterModalOpen = false)}
    onRegister={async (data) => {
      try {
        const res = await registerMutation.mutate(data);
        activeUserId = res.userId;
        localStorage.setItem("atlantasy_current_user_id", res.userId);
        localStorage.setItem("atlantasy_has_onboarded", "true");
        isRegisterModalOpen = false;
        alert("Registrering fullført! Velkommen til ligaen.");
      } catch (err: any) {
        alert(err.message || "Kunne ikke fullføre registreringen.");
      }
    }}
  />

  <!-- Automatisk & Manuell Oppdateringsmodal (Tauri v2 + GitHub Releases) -->
  <UpdateModal
    bind:isOpen={isUpdateModalOpen}
    bind:this={updateModalRef}
    currentVersion="0.5.0"
    autoCheck={true}
  />

  <!-- Lisenser Modal -->
  <LicensesModal
    bind:isOpen={isLicensesModalOpen}
  />

  <!-- Koble FPL-lag Modal for vanlig bruker -->
  <ClaimFplTeamModal
    isOpen={isClaimTeamModalOpen}
    {currentUser}
    {fplTeams}
    {users}
    onClose={() => (isClaimTeamModalOpen = false)}
    onRefreshFpl={handleRefreshFpl}
    onClaim={async (entryId) => {
      await claimMyFplTeamMutation.mutate({
        userId: currentUser?._id,
        fplEntryId: entryId,
      });
      alert("FPL-lag tilkoblet og låst til profilen din!");
    }}
  />
</main>
