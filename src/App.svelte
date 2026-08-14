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

  import { useQuery, useMutation } from "$lib/convex.svelte";
  import { api } from "../convex/_generated/api";
  import { Trophy, ArrowLeft } from "lucide-svelte";
  import { onMount } from "svelte";

  // Reaktiv Convex Queries
  const roomsQuery = useQuery(api.rooms.listRooms);
  const leaderboardQuery = useQuery(api.rooms.getLeaderboard, () => ({
    sortBy: activeSort,
  }));
  const individualLeaderboardQuery = useQuery(api.rooms.getIndividualLeaderboard, () => ({
    sortBy: activeSort,
  }));
  const funStatsQuery = useQuery(api.rooms.getLeagueFunStats);
  const settingsQuery = useQuery(api.admin.getSettings);
  const pinnedAnnQuery = useQuery(api.admin.getPinnedAnnouncement);
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

  // Convex Mutations
  const sendMessageMutation = useMutation(api.chat.sendMessage);
  const updateSettingsMutation = useMutation(api.admin.updateSettings);
  const createInviteMutation = useMutation(api.admin.createInviteCode);
  const declareWinnerMutation = useMutation(api.admin.declareMonthlyWinner);
  const seedDataMutation = useMutation(api.fpl.seedDefaultData);
  const registerMutation = useMutation(api.auth.registerWithInvite);
  const loginOrRegisterMutation = useMutation(api.auth.loginOrRegister);
  const setUserRoleMutation = useMutation(api.auth.setUserRole);
  const batchAssignMutation = useMutation(api.rooms.batchSaveRoomAssignments);
  const updateRoomMutation = useMutation(api.rooms.updateRoom);
  const startNewSeasonMutation = useMutation(api.admin.startNewSeason);
  const createArticleMutation = useMutation(api.articles.createArticle);
  const likeArticleMutation = useMutation(api.articles.likeArticle);
  const deleteArticleMutation = useMutation(api.articles.deleteArticle);

  // Utledet data med fallback
  let rooms = $derived(roomsQuery.data ?? []);
  let leaderboard = $derived(leaderboardQuery.data ?? []);
  let individualPlayers = $derived(individualLeaderboardQuery.data ?? []);
  let funStats = $derived(funStatsQuery.data ?? null);
  let settings = $derived(settingsQuery.data ?? null);
  let pinnedAnnouncement = $derived(pinnedAnnQuery.data ?? null);
  let inviteCodes = $derived(inviteCodesQuery.data ?? []);
  let users = $derived(usersQuery.data ?? []);
  let articles = $derived(articlesQuery.data ?? []);
  let fplTeams = $derived(allTeamsQuery.data ?? []);

  // Nåværende aktiv bruker
  let currentUser = $derived(
    users.find((u) => u._id === activeUserId) ||
      users[0] || {
        _id: "guest",
        username: "Stian (Admin)",
        role: "admin",
        avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=StianAdmin",
        fplTeamName: "Tactical Masterclass",
      }
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

  let isConvexConnected = $derived(
    !roomsQuery.error && roomsQuery.data !== undefined
  );

  onMount(async () => {
    // Sjekk om brukeren allerede har fullført onboarding / lagret profil
    const savedUserId = localStorage.getItem("atlantasy_current_user_id");
    const hasOnboarded = localStorage.getItem("atlantasy_has_onboarded");

    if (savedUserId) {
      activeUserId = savedUserId;
      showOnboarding = false;
    } else if (!hasOnboarded) {
      showOnboarding = true;
    }

    // Initialiser standarddata hvis databasen er tom
    setTimeout(async () => {
      if (roomsQuery.data && roomsQuery.data.length === 0) {
        try {
          await seedDataMutation.mutate({});
        } catch {
          // Ignorer hvis allerede seeder
        }
      }
    }, 1500);
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

  async function handleSendMessage(content: string, channel: string, roomId?: string) {
    if (!currentUser) return;
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
    setTimeout(() => {
      isSyncing = false;
    }, 1200);
  }

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
      });
    } catch (err) {
      console.error("Kunne ikke oppdatere romnavn:", err);
    }
  }
</script>

<main
  class="flex flex-col h-screen w-screen bg-[#070a12] text-slate-100 overflow-hidden font-sans select-none"
>
  <!-- Velkomstside for førstegangsbrukere -->
  {#if showOnboarding}
    <WelcomeOnboarding
      {rooms}
      {fplTeams}
      onComplete={handleOnboardingComplete}
      onAdminBypass={handleAdminBypass}
      onLoginOrRegister={(data) => loginOrRegisterMutation.mutate(data)}
    />
  {/if}

  <!-- Frameless Custom Titlebar -->
  <TitleBar
    currentGw={settings?.currentGameweek ?? 26}
    {isConvexConnected}
    {isSyncing}
    {activeView}
    {currentUser}
    onOpenAdmin={() => (isAdminModalOpen = true)}
    onRefreshFpl={handleRefreshFpl}
    onToggleChat={() => (isChatOpen = !isChatOpen)}
    onToggleWallOfFame={() => {
      activeView = activeView === "wall_of_fame" ? "leaderboard" : "wall_of_fame";
      selectedRoomId = null;
    }}
    onToggleNews={() => {
      activeView = activeView === "news" ? "leaderboard" : "news";
      selectedRoomId = null;
    }}
    onOpenRegister={() => (isRegisterModalOpen = true)}
  />

  <!-- Hovedinnhold (Ren, dynamisk full-bredde visning) -->
  <div class="flex-1 flex flex-col p-3.5 space-y-3 overflow-hidden bg-[#070a12]">
    <!-- Skrytevegg / Pinned Vinner-Banner øverst -->
    {#if pinnedAnnouncement && activeView === "leaderboard"}
      <WallOfFameBanner
        announcement={pinnedAnnouncement}
        onSelectRoom={(rId) => {
          selectedRoomId = rId;
          activeView = "leaderboard";
        }}
      />
    {/if}

    <!-- 1. Hovedvisning: Parallelle Ledertavler (Rom + Individuell) & Liga-stats -->
    {#if activeView === "leaderboard"}
      <!-- Parallelle Ledertavler: Rom vs. Individuell -->
      <div class="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3.5 min-h-0 overflow-hidden">
        <!-- Venstre: Offisiell Rom-ledertavle (A1–A12) (7 av 12 kolonner) -->
        <div class="lg:col-span-7 flex flex-col min-h-0 overflow-hidden bg-slate-900/40 rounded-2xl border border-slate-800/80 p-3.5 backdrop-blur-md">
          <Leaderboard
            {leaderboard}
            {selectedRoomId}
            currentGw={settings?.currentGameweek ?? 26}
            deductHits={settings?.deductTransferHits ?? true}
            sortBy={activeSort}
            onSelectSort={(s: string) => (activeSort = s)}
            onOpenRoomModal={handleOpenRoomModal}
            onOpenProfile={handleOpenProfile}
          />
        </div>

        <!-- Høyre: Individuell Ledertavle (Alle spillere) (5 av 12 kolonner) -->
        <div class="lg:col-span-5 flex flex-col min-h-0 overflow-hidden">
          <IndividualLeaderboard
            players={individualPlayers}
            currentGw={settings?.currentGameweek ?? 26}
            deductHits={settings?.deductTransferHits ?? true}
            sortBy={activeSort}
            onSelectSort={(s: string) => (activeSort = s)}
            onOpenProfile={handleOpenProfile}
          />
        </div>
      </div>

      <!-- Innsiktsmoduler: Benkepoeng, Topp 10 Eierskap & Rundens Klatrere -->
      <LeagueStatsPanel {funStats} onOpenProfile={handleOpenProfile} />

    {:else if activeView === "news"}
      <!-- 2. Avisen & Nyheter Modul -->
      <NewsSection
        {articles}
        {currentUser}
        onBack={() => (activeView = "leaderboard")}
        onCreateArticle={(data) => {
          createArticleMutation.mutate(data);
        }}
        onLikeArticle={(id) => likeArticleMutation.mutate({ articleId: id as any })}
        onDeleteArticle={(id) => deleteArticleMutation.mutate({ articleId: id as any })}
      />
    {:else}
      <!-- 3. Dedikert Wall of Fame Side -->
      <div class="flex-1 overflow-y-auto space-y-4 pr-1">
        <div class="flex items-center justify-between pb-3 border-b border-slate-800">
          <div class="flex items-center gap-2.5">
            <div class="p-2 rounded-lg bg-amber-500/20 text-amber-300">
              <Trophy class="w-5 h-5" />
            </div>
            <div>
              <h2 class="text-base font-bold text-white">Månedens Vinnere & Wall of Fame</h2>
              <p class="text-xs text-slate-400">Hedersplass for de skarpeste FPL-rommene gjennom sesongen</p>
            </div>
          </div>

          <button
            onclick={() => (activeView = "leaderboard")}
            class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft class="w-3.5 h-3.5" />
            <span>Tilbake til Ledertavle</span>
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <!-- Januar Vinner -->
          <div class="p-4 rounded-xl bg-gradient-to-br from-amber-950/30 to-slate-900 border border-amber-500/40 space-y-3 shadow-lg">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider text-amber-300">
                Januar 2025
              </span>
              <span class="text-2xl">🏆</span>
            </div>
            <h3 class="text-lg font-black text-white">A1 - The Devs</h3>
            <p class="text-xs text-slate-300 leading-relaxed">
              Vant med et spektakulært snitt på <strong class="text-amber-300">76.0 poeng</strong>. Stian Taknes og Magnus Carlsen dro lasset!
            </p>
            <div class="text-[11px] text-amber-400 font-mono font-bold">
              Vinnende romsnitt: 76.0 pts
            </div>
          </div>

          <!-- Desember Vinner -->
          <div class="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider text-slate-400">
                Desember 2024
              </span>
              <span class="text-2xl">🥈</span>
            </div>
            <h3 class="text-lg font-black text-white">A6 - Data Wizards</h3>
            <p class="text-xs text-slate-300 leading-relaxed">
              Knuste motstanden i juleprogrammet med sitt dype prediksjonsoppsett.
            </p>
            <div class="text-[11px] text-fpl-cyan font-mono font-bold">
              Vinnende romsnitt: 72.5 pts
            </div>
          </div>
        </div>
      </div>
    {/if}
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
    deductHits={settings?.deductTransferHits ?? true}
    onClose={() => (isRoomModalOpen = false)}
    onUpdateRoomName={handleUpdateRoomName}
    onOpenProfile={handleOpenProfile}
  />

  <!-- FPL Lag- & Manager Profilside Modal -->
  <TeamProfileModal
    entryId={selectedProfileEntryId}
    isOpen={selectedProfileEntryId !== null}
    onClose={() => (selectedProfileEntryId = null)}
  />

  <AdminModal
    isOpen={isAdminModalOpen}
    {settings}
    {rooms}
    {inviteCodes}
    {users}
    onClose={() => (isAdminModalOpen = false)}
    onUpdateSettings={(s) => updateSettingsMutation.mutate(s)}
    onCreateInviteCode={(c) => createInviteMutation.mutate(c)}
    onDeclareWinner={(w) => declareWinnerMutation.mutate(w)}
    onSeedData={() => seedDataMutation.mutate({})}
    onBatchSaveAssignments={(assignments) => batchAssignMutation.mutate({ assignments })}
    onStartNewSeason={(params) => startNewSeasonMutation.mutate(params)}
    onSetUserRole={(uId, role) => setUserRoleMutation.mutate({ userId: uId as any, role })}
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
</main>
