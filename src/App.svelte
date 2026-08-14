<script lang="ts">
  import TitleBar from "$lib/components/TitleBar.svelte";
  import NavigationSidebar from "$lib/components/NavigationSidebar.svelte";
  import WallOfFameBanner from "$lib/components/WallOfFameBanner.svelte";
  import Leaderboard from "$lib/components/Leaderboard.svelte";
  import ChatPanel from "$lib/components/ChatPanel.svelte";
  import RoomDetailModal from "$lib/components/RoomDetailModal.svelte";
  import AdminModal from "$lib/components/AdminModal.svelte";
  import RegisterModal from "$lib/components/RegisterModal.svelte";

  import { useQuery, useMutation } from "$lib/convex.svelte";
  import { api } from "../convex/_generated/api";
  import { Trophy } from "lucide-svelte";
  import { onMount } from "svelte";

  // Reaktiv Convex Queries
  const roomsQuery = useQuery(api.rooms.listRooms);
  const leaderboardQuery = useQuery(api.rooms.getLeaderboard, () => ({
    sortBy: activeSort,
  }));
  const settingsQuery = useQuery(api.admin.getSettings);
  const pinnedAnnQuery = useQuery(api.admin.getPinnedAnnouncement);
  const inviteCodesQuery = useQuery(api.admin.listInviteCodes);
  const usersQuery = useQuery(api.auth.listUsers);

  // Chat Query
  const chatQuery = useQuery(api.chat.getMessages, () => ({
    channel: activeChatChannel,
    roomId: activeChatChannel === "room" ? (activeRoomId as any) : undefined,
  }));

  // Reaktiv State med Svelte 5 Runes
  let activeView = $state("leaderboard"); // "leaderboard" | "wall_of_fame"
  let activeSort = $state("live");         // "live" | "season"
  let selectedRoomId = $state<string | null>(null);
  let activeChatChannel = $state("banter"); // "banter" | "room"
  let activeUserId = $state<string | null>(null);
  let isSyncing = $state(false);

  // Modals state
  let isRoomModalOpen = $state(false);
  let modalRoom = $state<any>(null);
  let isAdminModalOpen = $state(false);
  let isRegisterModalOpen = $state(false);

  // Convex Mutations
  const sendMessageMutation = useMutation(api.chat.sendMessage);
  const deleteMessageMutation = useMutation(api.chat.deleteMessage);
  const updateSettingsMutation = useMutation(api.admin.updateSettings);
  const createInviteMutation = useMutation(api.admin.createInviteCode);
  const declareWinnerMutation = useMutation(api.admin.declareMonthlyWinner);
  const seedDataMutation = useMutation(api.fpl.seedDefaultData);
  const registerMutation = useMutation(api.auth.registerWithInvite);

  // Utledet data med fallback
  let rooms = $derived(roomsQuery.data ?? []);
  let leaderboard = $derived(leaderboardQuery.data ?? []);
  let settings = $derived(settingsQuery.data ?? null);
  let pinnedAnnouncement = $derived(pinnedAnnQuery.data ?? null);
  let inviteCodes = $derived(inviteCodesQuery.data ?? []);
  let users = $derived(usersQuery.data ?? []);
  let messages = $derived(chatQuery.data ?? []);

  let isConvexConnected = $derived(
    !roomsQuery.error && roomsQuery.data !== undefined
  );

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

  // Nåværende aktivt rom
  let activeRoomId = $derived(
    selectedRoomId || (currentUser?.roomId ?? rooms[0]?._id)
  );
  let currentRoom = $derived(rooms.find((r) => r._id === activeRoomId) || rooms[0]);

  onMount(async () => {
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
</script>

<main
  class="flex flex-col h-screen w-screen bg-[#070a12] text-slate-100 overflow-hidden font-sans select-none"
>
  <!-- Frameless Custom Titlebar (Tauri v2 + Drag Region + Window Controls) -->
  <TitleBar
    currentGw={settings?.currentGameweek ?? 26}
    {isConvexConnected}
    {isSyncing}
    onOpenAdmin={() => (isAdminModalOpen = true)}
    onRefreshFpl={handleRefreshFpl}
  />

  <!-- 3-Kolonners Desktop Layout optimalisert for 1080p -->
  <div class="flex-1 flex overflow-hidden">
    <!-- Venstre Kolonne: Navigasjon & Rom 1–12 (~260px) -->
    <NavigationSidebar
      {rooms}
      {selectedRoomId}
      {activeView}
      {currentUser}
      {users}
      onSelectView={(view) => {
        activeView = view;
        selectedRoomId = null;
      }}
      onSelectRoom={(roomId) => {
        selectedRoomId = roomId;
        activeView = "leaderboard";
      }}
      onOpenAdmin={() => (isAdminModalOpen = true)}
      onOpenRegister={() => (isRegisterModalOpen = true)}
      onSwitchUser={(userId) => (activeUserId = userId)}
    />

    <!-- Midtre Kolonne: Hovedvisning (Ledertavle / Wall of Fame) (~900–1100px) -->
    <section class="flex-1 flex flex-col min-w-0 p-4 space-y-3 overflow-hidden bg-[#090d16]/70">
      <!-- Skrytevegg / Pinned Vinner-Banner øverst -->
      {#if pinnedAnnouncement}
        <WallOfFameBanner
          announcement={pinnedAnnouncement}
          onSelectRoom={(rId) => {
            selectedRoomId = rId;
            activeView = "leaderboard";
          }}
        />
      {/if}

      <!-- Hovedvisning: Enten Ledertavle eller Full Wall of Fame -->
      {#if activeView === "leaderboard"}
        <Leaderboard
          {leaderboard}
          {selectedRoomId}
          currentGw={settings?.currentGameweek ?? 26}
          deductHits={settings?.deductTransferHits ?? true}
          sortBy={activeSort}
          onSelectSort={(s: string) => (activeSort = s)}
          onOpenRoomModal={handleOpenRoomModal}
        />
      {:else}
        <!-- Dedikert Wall of Fame Side -->
        <div class="flex-1 overflow-y-auto space-y-4 pr-1">
          <div class="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Trophy class="w-5 h-5 text-amber-400" />
            <div>
              <h2 class="text-base font-bold text-white">Månedens Vinnere & Heder</h2>
              <p class="text-xs text-slate-400">Offisiell hedersplass for de skarpeste FPL-rommene</p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Januar Vinner -->
            <div class="p-4 rounded-xl bg-gradient-to-br from-amber-950/30 to-slate-900 border border-amber-500/40 space-y-3 shadow-lg">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold uppercase tracking-wider text-amber-300">
                  Januar 2025
                </span>
                <span class="text-xl">🏆</span>
              </div>
              <h3 class="text-lg font-black text-white">Rom 1 - The Devs</h3>
              <p class="text-xs text-slate-300 leading-relaxed">
                Vant med et spektakulært snitt på <strong class="text-amber-300">76.0 poeng</strong>. Stian Taknes og Magnus Carlsen dro lasset!
              </p>
              <div class="text-[11px] text-amber-400 font-medium">
                Vinnende romsnitt: 76.0 pts
              </div>
            </div>

            <!-- Desember Vinner -->
            <div class="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Desember 2024
                </span>
                <span class="text-xl">🥈</span>
              </div>
              <h3 class="text-lg font-black text-white">Rom 6 - Data Wizards</h3>
              <p class="text-xs text-slate-300 leading-relaxed">
                Knuste motstanden i juleprogrammet med sitt dype prediksjonsoppsett.
              </p>
              <div class="text-[11px] text-fpl-cyan font-medium">
                Vinnende romsnitt: 72.5 pts
              </div>
            </div>
          </div>
        </div>
      {/if}
    </section>

    <!-- Høyre Kolonne: Sanntids-Chat (Banter & Mitt Rom) (~360–400px) -->
    <ChatPanel
      {messages}
      {currentUser}
      {currentRoom}
      activeChannel={activeChatChannel}
      onSelectChannel={(ch) => (activeChatChannel = ch)}
      onSendMessage={handleSendMessage}
      onDeleteMessage={(msgId) => {
        if (currentUser) {
          deleteMessageMutation.mutate({
            messageId: msgId as any,
            userId: currentUser._id,
          });
        }
      }}
    />
  </div>

  <!-- Modaler -->
  <RoomDetailModal
    room={modalRoom}
    isOpen={isRoomModalOpen}
    deductHits={settings?.deductTransferHits ?? true}
    onClose={() => (isRoomModalOpen = false)}
  />

  <AdminModal
    isOpen={isAdminModalOpen}
    {settings}
    {rooms}
    {inviteCodes}
    onClose={() => (isAdminModalOpen = false)}
    onUpdateSettings={(s) => updateSettingsMutation.mutate(s)}
    onCreateInviteCode={(c) => createInviteMutation.mutate(c)}
    onDeclareWinner={(w) => declareWinnerMutation.mutate(w)}
    onSeedData={() => seedDataMutation.mutate({})}
  />

  <RegisterModal
    isOpen={isRegisterModalOpen}
    {rooms}
    onClose={() => (isRegisterModalOpen = false)}
    onRegister={async (data) => {
      try {
        const res = await registerMutation.mutate(data);
        activeUserId = res.userId;
        isRegisterModalOpen = false;
        alert("Registrering fullført! Velkommen til ligaen.");
      } catch (err: any) {
        alert(err.message || "Kunne ikke fullføre registreringen.");
      }
    }}
  />
</main>
