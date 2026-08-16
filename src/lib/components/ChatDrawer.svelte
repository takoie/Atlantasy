<script lang="ts">
  import {
    Send,
    MessageSquare,
    Lock,
    Users,
    X,
    Sparkles,
    Trophy,
    Crown,
    Pencil,
    Trash2,
    Check,
  } from "lucide-svelte";
  import { tick } from "svelte";

  let {
    isOpen = false,
    isFullPage = false,
    messages = [],
    currentUser = null,
    currentRoom = null,
    users = [],
    rooms = [],
    leaderboard = [],
    monthWinners = null,
    individualPlayers = [],
    activeChannel = "banter", // "banter" | "room"
    onClose = () => {},
    onSelectChannel = (_channel: string) => {},
    onSendMessage = (_content: string, _channel: string, _roomId?: string) => {},
    onDeleteMessage = (_messageId: string) => {},
    onEditMessage = (_messageId: string, _newContent: string) => {},
  }: {
    isOpen?: boolean;
    isFullPage?: boolean;
    messages?: any[];
    currentUser?: any;
    currentRoom?: any;
    users?: any[];
    rooms?: any[];
    leaderboard?: any[];
    monthWinners?: any;
    individualPlayers?: any[];
    activeChannel?: string;
    onClose?: () => void;
    onSelectChannel?: (channel: string) => void;
    onSendMessage?: (content: string, channel: string, roomId?: string) => void;
    onDeleteMessage?: (messageId: string) => void;
    onEditMessage?: (messageId: string, newContent: string) => void;
  } = $props();

  let messageInput = $state("");
  let chatContainer: HTMLElement | null = $state(null);

  // Redigering & Sletting state
  let editingMessageId = $state<string | null>(null);
  let editingContent = $state("");
  let deletingMessageId = $state<string | null>(null);

  // Finn regjerende topp-rom (#1 rom)
  let topRoomId = $derived(
    monthWinners?.roomWinner?.roomId ||
      (leaderboard && leaderboard.length > 0 ? leaderboard[0]?._id : null)
  );

  // Finn allaround leder i "Alle mot alle" (sesongens #1)
  let topSoloEntryId = $derived(
    individualPlayers && individualPlayers.length > 0
      ? individualPlayers[0]?.entryId
      : monthWinners?.soloWinner?.entryId || null
  );

  let topSoloManagerName = $derived(
    individualPlayers && individualPlayers.length > 0
      ? individualPlayers[0]?.player_name
      : monthWinners?.soloWinner?.managerName || null
  );

  function getSenderStatus(msg: any) {
    const isOwn = !!(
      (currentUser?._id && msg.senderId === currentUser._id) ||
      (currentUser?.username && msg.senderName === currentUser.username)
    );

    const senderUser = users.find(
      (u) => u._id === msg.senderId || u.username === msg.senderName
    );

    const isAdmin = msg.senderRole === "admin" || senderUser?.role === "admin";
    const currentIsAdmin = currentUser?.role === "admin";

    const canEdit = isOwn || currentIsAdmin;
    const canDelete = isOwn || currentIsAdmin;

    // Er avsenderen i vinnerrommet? (Inkluderer admin-støtte for testing)
    const isTopRoom = !!(
      (topRoomId && (senderUser?.roomId === topRoomId || msg.roomId === topRoomId)) ||
      (isAdmin && !senderUser?.roomId)
    );

    // Er avsenderen sesongleder i Alle mot alle? (Inkluderer admin-støtte for testing)
    const isTopSolo = !!(
      (topSoloEntryId && senderUser?.fplEntryId === topSoloEntryId) ||
      (topSoloManagerName &&
        senderUser?.username &&
        senderUser.username.toLowerCase() === topSoloManagerName.toLowerCase()) ||
      (isAdmin && senderUser?.role === "admin")
    );

    return {
      isOwn,
      isAdmin,
      canEdit,
      canDelete,
      isTopRoom,
      isTopSolo,
      senderUser,
    };
  }

  async function handleSend() {
    if (!messageInput.trim()) return;
    const text = messageInput.trim();
    messageInput = "";

    const roomId = activeChannel === "room" ? currentRoom?._id : undefined;
    onSendMessage(text, activeChannel, roomId);

    await tick();
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }

  function startEdit(msg: any) {
    editingMessageId = msg._id;
    editingContent = msg.content;
    deletingMessageId = null;
  }

  function cancelEdit() {
    editingMessageId = null;
    editingContent = "";
  }

  function saveEdit(msgId: string) {
    if (!editingContent.trim()) return;
    onEditMessage(msgId, editingContent.trim());
    editingMessageId = null;
    editingContent = "";
  }

  function confirmDelete(msgId: string) {
    onDeleteMessage(msgId);
    deletingMessageId = null;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    } else if (event.key === "Escape" && !isFullPage) {
      onClose();
    }
  }

  function insertEmoji(emoji: string) {
    messageInput += emoji;
  }

  function formatTime(timestamp: number) {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  $effect(() => {
    if (messages && chatContainer && !editingMessageId) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  });
</script>

{#snippet messageBubble(msg: any, isDrawer: boolean = false)}
  {@const status = getSenderStatus(msg)}
  {@const isOwn = status.isOwn}
  {@const isTopSolo = status.isTopSolo}
  {@const isTopRoom = status.isTopRoom}
  {@const isAdmin = status.isAdmin}
  {@const canEdit = status.canEdit}
  {@const canDelete = status.canDelete}
  {@const isEditing = editingMessageId === msg._id}
  {@const isDeleting = deletingMessageId === msg._id}

  <div
    class="relative flex items-start gap-2.5 sm:gap-3 w-full group flex-row"
  >
    <!-- Avatar med status-glow -->
    <div class="relative shrink-0 mt-0.5">
      <img
        src={msg.senderAvatar ||
          `https://api.dicebear.com/7.x/bottts/svg?seed=${msg.senderName}`}
        alt="Avatar"
        class={`rounded-xl bg-[#191E24] border object-cover transition-all duration-200 ${
          isDrawer ? "w-7 h-7" : "w-8 h-8"
        } ${
          isTopSolo
            ? "border-[#F4C152] ring-2 ring-[#F4C152]/50 shadow-[0_0_12px_rgba(244,193,82,0.45)]"
            : isTopRoom
              ? "border-[#1eb854] ring-2 ring-[#1eb854]/50 shadow-[0_0_12px_rgba(30,184,84,0.4)]"
              : isOwn
                ? "border-[#9FE88D]/60 ring-1 ring-[#9FE88D]/30"
                : "border-[#384252]"
        }`}
      />
      {#if isTopSolo}
        <span
          class="absolute -top-1.5 -right-1 text-xs filter drop-shadow select-none animate-bounce"
          title="Sesongleder i Alle mot alle"
        >
          👑
        </span>
      {:else if isTopRoom}
        <span
          class="absolute -top-1.5 -right-1 text-xs filter drop-shadow select-none"
          title="Medlem av #1 Rommet"
        >
          🏆
        </span>
      {/if}
    </div>

    <!-- Meldingsinnhold -->
    <div
      class="relative flex flex-col min-w-0 max-w-[84%] sm:max-w-[76%] items-start"
    >
      <!-- Avsender Header -->
      <div
        class="flex items-center gap-1.5 mb-1 px-1 flex-wrap flex-row"
      >
        <span class="text-xs font-bold text-white truncate">
          {msg.senderName}
        </span>

        {#if isOwn}
          <span
            class="text-[9px] px-1.5 py-0.2 rounded bg-[#9FE88D]/20 text-[#9FE88D] border border-[#9FE88D]/40 font-bold uppercase tracking-wider"
          >
            Deg
          </span>
        {/if}

        {#if isAdmin && !isOwn}
          <span
            class="text-[9px] px-1.5 py-0.2 rounded bg-[#9FE88D]/15 text-[#9FE88D] border border-[#9FE88D]/30 font-bold uppercase"
          >
            Admin
          </span>
        {/if}

        {#if isTopSolo}
          <span
            class="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.2 rounded bg-[#F4C152]/20 text-[#F4C152] border border-[#F4C152]/50 font-bold shadow-[0_0_8px_rgba(244,193,82,0.3)]"
            title="Leder av Alle mot alle"
          >
            👑 Sesongleder
          </span>
        {:else if isTopRoom}
          <span
            class="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.2 rounded bg-[#1eb854]/20 text-[#70E1F8] border border-[#1eb854]/50 font-bold shadow-[0_0_8px_rgba(30,184,84,0.3)]"
            title="Medlem av regjerende #1 Rom"
          >
            🏆 #1 Rom
          </span>
        {/if}

        <span class="text-[10px] text-[#94A3B8] shrink-0">
          {formatTime(msg.createdAt)}
        </span>

        {#if msg.editedAt}
          <span class="text-[9px] text-[#94A3B8]/80 italic">
            (redigert)
          </span>
        {/if}
      </div>

      <!-- Tekstboble eller Redigeringsmodus -->
      <div class="relative w-full">
        {#if isEditing}
          <!-- Redigeringsskjema -->
          <div
            class="p-3 rounded-2xl bg-[#191E24] border border-[#9FE88D]/60 shadow-xl space-y-2.5 w-full min-w-[240px] sm:min-w-[320px] animate-in fade-in zoom-in-95 duration-100"
          >
            <div class="flex items-center justify-between text-[11px] text-[#9FE88D] font-bold">
              <span>Redigerer melding</span>
              <span class="text-[10px] text-[#94A3B8]">Enter = lagre, Esc = avbryt</span>
            </div>
            <textarea
              bind:value={editingContent}
              onkeydown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  saveEdit(msg._id);
                } else if (e.key === "Escape") {
                  cancelEdit();
                }
              }}
              rows="2"
              class="w-full px-3 py-2 text-xs sm:text-sm rounded-xl bg-[#242B35] border border-[#384252] text-white focus:outline-none focus:border-[#9FE88D] resize-none custom-scrollbar"
              placeholder="Skriv inn oppdatert tekst..."
            ></textarea>
            <div class="flex items-center justify-end gap-2">
              <button
                onclick={cancelEdit}
                class="px-3 py-1 rounded-lg text-xs text-[#94A3B8] hover:text-white hover:bg-[#384252] transition-colors"
              >
                Avbryt
              </button>
              <button
                onclick={() => saveEdit(msg._id)}
                disabled={!editingContent.trim()}
                class="px-3.5 py-1 rounded-lg text-xs bg-[#9FE88D] hover:bg-[#8ce078] text-[#16380c] font-bold transition-all shadow-sm disabled:opacity-40 flex items-center gap-1.5"
              >
                <Check class="w-3.5 h-3.5" />
                <span>Lagre</span>
              </button>
            </div>
          </div>
        {:else if isDeleting}
          <!-- Slettingsbekreftelse -->
          <div
            class="p-3 rounded-2xl bg-[#FB6F84]/15 border border-[#FB6F84]/40 shadow-xl space-y-2 w-full min-w-[200px] animate-in fade-in zoom-in-95 duration-100"
          >
            <p class="text-xs font-semibold text-[#FB6F84]">
              Vil du slette denne meldingen?
            </p>
            <div class="flex items-center justify-end gap-2">
              <button
                onclick={() => (deletingMessageId = null)}
                class="px-2.5 py-1 rounded-lg text-xs text-[#94A3B8] hover:text-white hover:bg-[#384252] transition-colors"
              >
                Avbryt
              </button>
              <button
                onclick={() => confirmDelete(msg._id)}
                class="px-3 py-1 rounded-lg text-xs bg-[#FB6F84] hover:bg-[#e65b71] text-white font-bold transition-all shadow-sm flex items-center gap-1"
              >
                <Trash2 class="w-3.5 h-3.5" />
                <span>Slett</span>
              </button>
            </div>
          </div>
        {:else}
          <!-- Normal Tekstboble -->
          <div
            class={`p-3 rounded-2xl rounded-tl-xs text-xs sm:text-sm leading-relaxed break-words transition-all duration-200 shadow-sm ${
              msg.type === "announcement"
                ? "bg-[#F4C152]/15 border border-[#F4C152]/40 text-[#F4C152] shadow-md"
                : isTopSolo
                  ? "border border-[#F4C152]/80 text-[#FFFBEB] shadow-[0_0_18px_rgba(244,193,82,0.35)] ring-1 ring-[#F4C152]/40 bg-gradient-to-r from-[#F4C152]/20 via-[#242B35] to-[#242B35]"
                  : isTopRoom
                    ? "border border-[#1eb854]/80 text-[#F0FDF4] shadow-[0_0_16px_rgba(30,184,84,0.35)] ring-1 ring-[#1eb854]/40 bg-gradient-to-r from-[#1eb854]/20 via-[#242B35] to-[#242B35]"
                    : isOwn
                      ? "bg-[#9FE88D]/15 border border-[#9FE88D]/35 text-[#F0FDF4]"
                      : "bg-[#242B35] border border-[#384252] text-[#E2E8F0]"
            }`}
          >
            {msg.content}
          </div>

          <!-- Hurtighandlinger (Hover Toolbar: Rediger & Slett) -->
          {#if canEdit || canDelete}
            <div
              class="absolute top-1 -right-16 sm:-right-20 opacity-0 group-hover:opacity-100 transition-all duration-150 flex items-center gap-1 p-1 bg-[#191E24]/95 border border-[#384252] rounded-xl shadow-lg backdrop-blur-sm z-10"
            >
              {#if canEdit}
                <button
                  onclick={() => startEdit(msg)}
                  class="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#9FE88D] hover:bg-[#242B35] transition-colors"
                  title="Rediger melding"
                >
                  <Pencil class="w-3.5 h-3.5" />
                </button>
              {/if}

              {#if canDelete}
                <button
                  onclick={() => (deletingMessageId = msg._id)}
                  class="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#FB6F84] hover:bg-[#242B35] transition-colors"
                  title="Slett melding"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              {/if}
            </div>
          {/if}
        {/if}
      </div>
    </div>
  </div>
{/snippet}

{#if isFullPage}
  <!-- FULLSKJERM / SIDEVISNING (DaisyUI Dim Theme) -->
  <div
    class="flex-1 flex flex-col h-full bg-[#2A303C] rounded-2xl border border-[#384252] shadow-sm overflow-hidden text-[#E2E8F0] font-sans"
  >
    <!-- Header -->
    <div
      class="p-4 border-b border-[#384252] bg-[#191E24] flex flex-wrap items-center justify-between gap-3 shrink-0"
    >
      <div class="flex items-center gap-3">
        <div
          class="p-2 rounded-xl bg-[#9FE88D]/15 border border-[#9FE88D]/30 text-[#9FE88D]"
        >
          <MessageSquare class="w-5 h-5" />
        </div>
        <div>
          <h2 class="text-base font-bold text-white flex items-center gap-2">
            Banter
          </h2>
          <p class="text-xs text-[#94A3B8]">
            Diskuter runden, trekk fram egne prestasjoner og gi oppløftende
            kommentarer til de som trenger det
          </p>
        </div>
      </div>

      <!-- Kanalvelger Faner -->
      <div
        class="flex items-center gap-1.5 p-1 bg-[#242B35] rounded-xl border border-[#384252] text-xs"
      >
        <button
          onclick={() => onSelectChannel("banter")}
          class={`py-1.5 px-4 rounded-lg font-bold transition-colors flex items-center justify-center gap-1.5 ${
            activeChannel === "banter"
              ? "bg-[#9FE88D] text-[#16380c] shadow-sm"
              : "text-[#94A3B8] hover:text-white"
          }`}
        >
          <Users class="w-3.5 h-3.5" />
          <span>Banter</span>
        </button>

        <button
          onclick={() => onSelectChannel("room")}
          class={`py-1.5 px-4 rounded-lg font-bold transition-colors flex items-center justify-center gap-1.5 ${
            activeChannel === "room"
              ? "bg-[#9FE88D] text-[#16380c] shadow-sm"
              : "text-[#94A3B8] hover:text-white"
          }`}
        >
          <Lock class="w-3.5 h-3.5" />
          <span class="truncate">{currentRoom?.name || "Mitt Rom"}</span>
        </button>
      </div>
    </div>

    <!-- Meldingsstrøm -->
    <div
      bind:this={chatContainer}
      class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar"
    >
      {#if messages.length === 0}
        <div
          class="h-full flex flex-col items-center justify-center text-center p-8 space-y-2 text-[#94A3B8]"
        >
          <div
            class="w-12 h-12 rounded-2xl bg-[#242B35] border border-[#384252] flex items-center justify-center text-[#9FE88D] mb-1"
          >
            <MessageSquare class="w-6 h-6" />
          </div>
          <p class="text-sm font-bold text-white">
            Ingen meldinger i denne kanalen enda
          </p>
          <p class="text-xs text-[#94A3B8] max-w-sm">
            Start diskusjonen før seriestart! Send en melding til {activeChannel ===
            "room"
              ? currentRoom?.name || "rommet"
              : "hele ligaen"} nedenfor.
          </p>
        </div>
      {/if}

      {#each messages as msg (msg._id)}
        {@render messageBubble(msg, false)}
      {/each}
    </div>

    <!-- Input Seksjon -->
    <div
      class="p-3.5 sm:p-4 border-t border-[#384252] bg-[#191E24] space-y-2.5 shrink-0"
    >
      <div class="flex items-center gap-2.5 px-1">
        {#each ["🔥", "🏆", "😂", "🚀", "👑", "👀", "⚽", "👏"] as emoji}
          <button
            onclick={() => insertEmoji(emoji)}
            class="text-base hover:scale-125 transition-transform"
          >
            {emoji}
          </button>
        {/each}
      </div>

      <div class="flex items-center gap-2">
        <input
          type="text"
          bind:value={messageInput}
          onkeydown={handleKeydown}
          placeholder={activeChannel === "room"
            ? `Skriv til ${currentRoom?.name || "rommet"}...`
            : "Skriv melding til alle..."}
          class="flex-1 px-4 py-2.5 text-xs sm:text-sm rounded-xl bg-[#242B35] border border-[#384252] text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#9FE88D] transition-colors"
        />
        <button
          onclick={handleSend}
          disabled={!messageInput.trim()}
          class="p-2.5 sm:px-5 sm:py-2.5 rounded-xl bg-[#9FE88D] text-[#16380c] font-bold hover:bg-[#8ce078] disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm shrink-0 flex items-center gap-2"
        >
          <Send class="w-4 h-4" />
          <span class="hidden sm:inline text-xs">Send</span>
        </button>
      </div>
    </div>
  </div>
{:else if isOpen}
  <!-- Slide-over Drawer Mode -->
  <button
    type="button"
    aria-label="Lukk chat"
    onclick={onClose}
    class="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 transition-opacity duration-200 cursor-default border-0"
  ></button>

  <aside
    class="fixed top-0 right-0 h-full w-full max-w-md bg-[#2A303C] border-l border-[#384252] shadow-2xl z-50 flex flex-col justify-between select-none animate-in slide-in-from-right duration-200 text-[#E2E8F0] font-sans"
  >
    <div
      class="p-4 border-b border-[#384252] bg-[#191E24] flex items-center justify-between shrink-0"
    >
      <div class="flex items-center gap-2.5">
        <div
          class="p-2 rounded-lg bg-[#9FE88D]/15 border border-[#9FE88D]/30 text-[#9FE88D]"
        >
          <MessageSquare class="w-4 h-4" />
        </div>
        <div>
          <h2 class="text-sm font-bold text-white flex items-center gap-2">
            Banter
          </h2>
          <p class="text-[11px] text-[#94A3B8]">
            Diskuter runden og hets kollegaene dine
          </p>
        </div>
      </div>

      <button
        onclick={onClose}
        class="p-1.5 rounded-lg bg-[#242B35] hover:bg-[#384252] text-[#94A3B8] hover:text-white transition-colors"
      >
        <X class="w-4 h-4" />
      </button>
    </div>

    <div class="p-3 border-b border-[#384252] bg-[#191E24] shrink-0">
      <div
        class="grid grid-cols-2 gap-1.5 p-1 bg-[#242B35] rounded-lg border border-[#384252] text-xs"
      >
        <button
          onclick={() => onSelectChannel("banter")}
          class={`py-1.5 px-3 rounded-md font-bold transition-colors flex items-center justify-center gap-1.5 ${
            activeChannel === "banter"
              ? "bg-[#9FE88D] text-[#16380c] shadow-sm"
              : "text-[#94A3B8] hover:text-white"
          }`}
        >
          <Users class="w-3.5 h-3.5" />
          <span>Banter</span>
        </button>

        <button
          onclick={() => onSelectChannel("room")}
          class={`py-1.5 px-3 rounded-md font-bold transition-colors flex items-center justify-center gap-1.5 ${
            activeChannel === "room"
              ? "bg-[#9FE88D] text-[#16380c] shadow-sm"
              : "text-[#94A3B8] hover:text-white"
          }`}
        >
          <Lock class="w-3.5 h-3.5" />
          <span class="truncate">{currentRoom?.name || "Mitt Rom"}</span>
        </button>
      </div>
    </div>

    <div
      bind:this={chatContainer}
      class="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar"
    >
      {#if messages.length === 0}
        <div
          class="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-[#94A3B8]"
        >
          <MessageSquare class="w-8 h-8 opacity-30 text-[#9FE88D]" />
          <p class="text-xs font-semibold text-white">Ingen meldinger enda</p>
          <p class="text-[11px] text-[#94A3B8]">
            Start samtalen ved å sende en melding nedenfor!
          </p>
        </div>
      {/if}

      {#each messages as msg (msg._id)}
        {@render messageBubble(msg, true)}
      {/each}
    </div>

    <div class="p-3 border-t border-[#384252] bg-[#191E24] space-y-2 shrink-0">
      <div class="flex items-center gap-2 px-1">
        {#each ["🔥", "🏆", "😂", "🚀", "👑", "👀", "⚽", "👏"] as emoji}
          <button
            onclick={() => insertEmoji(emoji)}
            class="text-sm hover:scale-125 transition-transform"
          >
            {emoji}
          </button>
        {/each}
      </div>

      <div class="flex items-center gap-2">
        <input
          type="text"
          bind:value={messageInput}
          onkeydown={handleKeydown}
          placeholder={activeChannel === "room"
            ? `Skriv til ${currentRoom?.name || "rommet"}...`
            : "Skriv melding til alle..."}
          class="flex-1 px-3.5 py-2 text-xs rounded-xl bg-[#242B35] border border-[#384252] text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#9FE88D] transition-colors"
        />
        <button
          onclick={handleSend}
          disabled={!messageInput.trim()}
          class="p-2.5 rounded-xl bg-[#9FE88D] text-[#16380c] font-bold hover:bg-[#8ce078] disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm shrink-0"
        >
          <Send class="w-4 h-4" />
        </button>
      </div>
    </div>
  </aside>
{/if}
