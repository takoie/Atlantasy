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
    Bold,
    Italic,
    Strikethrough,
    Code,
    Quote,
    List,
    Link2,
    Image as ImageIcon,
    Smile,
    Zap,
    Paperclip,
    Search,
    ExternalLink,
    Maximize2,
    Film,
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
    onSendMessage = (_content: string, _channel: string, _roomId?: string, _imageUrl?: string) => {},
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
    onSendMessage?: (content: string, channel: string, roomId?: string, imageUrl?: string) => void;
    onDeleteMessage?: (messageId: string) => void;
    onEditMessage?: (messageId: string, newContent: string) => void;
  } = $props();

  let messageInput = $state("");
  let chatContainer: HTMLElement | null = $state(null);
  let fileInputEl: HTMLInputElement | null = $state(null);
  let inputEl: HTMLInputElement | HTMLTextAreaElement | null = $state(null);

  // Redigering & Sletting state
  let editingMessageId = $state<string | null>(null);
  let editingContent = $state("");
  let deletingMessageId = $state<string | null>(null);

  // Utvidet Chat Funksjonalitet: Drawer & Verktøylinje
  let activeToolTab = $state<"format" | "emoji" | "gif" | "image" | null>(null);
  let attachedImage = $state<string | null>(null);
  let attachedImageName = $state<string>("");
  let lightboxImageUrl = $state<string | null>(null);
  let emojiSearch = $state("");

  // GIF Søk & Velger State (Discord-style)
  let gifSearch = $state("");
  let isSearchingGifs = $state(false);
  let gifResults = $state<any[]>([]);
  let gifDebounceTimer: any = null;

  async function searchGifs(query: string) {
    const q = query.trim();
    isSearchingGifs = true;
    try {
      const endpoint = q
        ? `https://api.giphy.com/v1/gifs/search?api_key=sXpGFDGZs0Dv1mmNFvYaGUvYwKX0PWIh&q=${encodeURIComponent(q)}&limit=48&rating=pg-13`
        : `https://api.giphy.com/v1/gifs/trending?api_key=sXpGFDGZs0Dv1mmNFvYaGUvYwKX0PWIh&limit=48&rating=pg-13`;

      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
          gifResults = data.data
            .map((g: any) => ({
              id: g.id,
              title: g.title || "GIF",
              url: g.images?.fixed_height?.url || g.images?.original?.url,
              preview: g.images?.fixed_height_small?.url || g.images?.preview_gif?.url || g.images?.fixed_height?.url,
            }))
            .filter((g: any) => !!g.url);
          return;
        }
      }
      gifResults = [];
    } catch (e) {
      console.warn("Kunne ikke hente GIFs:", e);
      gifResults = [];
    } finally {
      isSearchingGifs = false;
    }
  }

  function handleGifSearchInput() {
    clearTimeout(gifDebounceTimer);
    gifDebounceTimer = setTimeout(() => {
      searchGifs(gifSearch);
    }, 280);
  }

  function selectGif(gifUrl: string) {
    const roomId = activeChannel === "room" ? currentRoom?._id : undefined;
    const text = messageInput.trim();
    messageInput = "";
    removeAttachedImage();
    activeToolTab = null;

    // Send GIF til chat
    onSendMessage(text, activeChannel, roomId, gifUrl);
    // scrollToBottom(true); // Assuming this helper exists
  };

  // Kategoriserte emojier og ikoner
  const emojiCategories = [
    {
      name: "FPL og kamp",
      emojis: [
        "⚽", "🏆", "👑", "🤖", "🥅", "🎯", "🔥", "🧤", "⚡", "🥇", "🥈", "🥉",
        "🏟️", "👟", "🟥", "🟨", "🪄", "💣", "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "🇳🇴", "🌟", "🛡️",
      ],
    },
    {
      name: "Reaksjoner og banter",
      emojis: [
        "😂", "😭", "🤦‍♂️", "🚀", "🍿", "🤡", "👀", "💀", "😱", "🥶", "🥵", "🥳",
        "🤷‍♂️", "😴", "🤮", "🤯", "🤝", "👏", "💯", "👍", "👎", "💪", "👊",
      ],
    },
    {
      name: "Følelser",
      emojis: [
        "😎", "🤑", "🤠", "😤", "😈", "👻", "🧠", "🤫", "🧐", "🤩", "😬", "🥶",
        "🦾", "🥂", "🍻", "🍕", "☕", "🎉", "💤", "💎", "💰",
      ],
    },
  ];

  let filteredEmojis = $derived(
    emojiSearch.trim()
      ? emojiCategories
          .flatMap((c) => c.emojis)
          .filter((e) => e.includes(emojiSearch.trim()))
      : null
  );

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

    // Er avsenderen i vinnerrommet?
    const isTopRoom = !!(
      topRoomId && (senderUser?.roomId === topRoomId || msg.roomId === topRoomId)
    );

    // Er avsenderen sesongleder i Alle mot alle?
    const isTopSolo = !!(
      (topSoloEntryId && senderUser?.fplEntryId === topSoloEntryId) ||
      (topSoloManagerName &&
        senderUser?.username &&
        senderUser.username.toLowerCase() === topSoloManagerName.toLowerCase())
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

  // Sikker og pen formatering av markdown i meldinger
  function renderFormattedContent(rawText: string) {
    if (!rawText) return "";

    // 1. HTML Escaping for sikkerhet
    let escaped = rawText
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // 2. Kodeblokker / inline kode (`kode`)
    escaped = escaped.replace(
      /`([^`]+)`/g,
      `<code class="px-1.5 py-0.5 rounded bg-[#191E24] text-[#9FE88D] font-mono text-[11px] border border-[#384252]">$1</code>`
    );

    // 3. Fet tekst (**tekst**)
    escaped = escaped.replace(/\*\*([^*]+)\*\*/g, `<strong class="font-bold text-white">$1</strong>`);

    // 4. Kursiv tekst (*tekst* eller _tekst_)
    escaped = escaped.replace(/\*([^*]+)\*/g, `<em class="italic text-[#E2E8F0]">$1</em>`);
    escaped = escaped.replace(/_([^_]+)_/g, `<em class="italic text-[#E2E8F0]">$1</em>`);

    // 5. Gjennomstreking (~~tekst~~)
    escaped = escaped.replace(/~~([^~]+)~~/g, `<del class="line-through opacity-70">$1</del>`);

    // 6. Sitatlinjer (> sitat)
    escaped = escaped.replace(
      /(?:^|\n)&gt;\s*([^\n]+)/g,
      `<blockquote class="border-l-2 border-[#9FE88D] pl-2.5 py-0.5 my-1 text-[#94A3B8] italic bg-[#191E24]/50 rounded-r-lg">$1</blockquote>`
    );

    // 7. Punktlister (- punkt eller * punkt)
    escaped = escaped.replace(
      /(?:^|\n)[-*]\s+([^\n]+)/g,
      `<div class="flex items-start gap-1.5 my-0.5"><span class="text-[#9FE88D] shrink-0">•</span><span>$1</span></div>`
    );

    // 8. Hyperlenker ([tittel](url) eller rene http/https-lenker)
    escaped = escaped.replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      `<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[#70E1F8] underline hover:text-[#9FE88D] font-semibold break-all inline-flex items-center gap-0.5">$1</a>`
    );
    escaped = escaped.replace(
      /(^|[^"'])(https?:\/\/[^\s<]+)/g,
      `$1<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[#70E1F8] underline hover:text-[#9FE88D] break-all">$2</a>`
    );

    // 9. Linjeskift
    escaped = escaped.replace(/\n/g, "<br />");

    return escaped;
  }

  // Paste handler for utklippstavle (Ctrl+V)
  function handlePaste(e: ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf("image") !== -1) {
        e.preventDefault();
        const blob = item.getAsFile();
        if (!blob) continue;

        if (blob.size > 3.5 * 1024 * 1024) {
          alert("Bildet fra utklippstavlen er for stort (maks 3.5 MB).");
          return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          attachedImage = event.target?.result as string;
          attachedImageName = `skjermbilde_${new Date().toLocaleTimeString().replace(/:/g, "-")}.png`;
          activeToolTab = "image";
        };
        reader.readAsDataURL(blob);
        break;
      }
    }
  }

  function handleFileInputChange(e: Event) {
    const target = e.target as HTMLInputElement;
    if (!target.files || target.files.length === 0) return;
    const file = target.files[0];

    if (file.size > 3.5 * 1024 * 1024) {
      alert("Bildet er for stort. Maksimal filstørrelse er 3.5 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      attachedImage = event.target?.result as string;
      attachedImageName = file.name;
    };
    reader.readAsDataURL(file);
  }

  function removeAttachedImage() {
    attachedImage = null;
    attachedImageName = "";
    if (fileInputEl) fileInputEl.value = "";
  }

  function applyFormatting(prefix: string, suffix: string = prefix, placeholder: string = "tekst") {
    if (!inputEl) {
      messageInput += `${prefix}${placeholder}${suffix}`;
      return;
    }

    const start = inputEl.selectionStart || 0;
    const end = inputEl.selectionEnd || 0;
    const selected = messageInput.substring(start, end);
    const replacement = selected ? `${prefix}${selected}${suffix}` : `${prefix}${placeholder}${suffix}`;

    messageInput = messageInput.substring(0, start) + replacement + messageInput.substring(end);

    tick().then(() => {
      if (inputEl) {
        inputEl.focus();
        const newPos = selected ? start + replacement.length : start + prefix.length + placeholder.length;
        inputEl.setSelectionRange(newPos, newPos);
      }
    });
  }

  function scrollToBottom(smooth = false) {
    tick().then(() => {
      if (chatContainer) {
        chatContainer.scrollTo({
          top: chatContainer.scrollHeight,
          behavior: smooth ? "smooth" : "auto",
        });
      }
      setTimeout(() => {
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
      }, 50);
      setTimeout(() => {
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
      }, 200);
    });
  }

  async function handleSend() {
    if (!messageInput.trim() && !attachedImage) return;
    const text = messageInput.trim();
    const img = attachedImage || undefined;

    messageInput = "";
    removeAttachedImage();
    activeToolTab = null;

    const roomId = activeChannel === "room" ? currentRoom?._id : undefined;
    onSendMessage(text, activeChannel, roomId, img);
    scrollToBottom(true);
  }

  function insertEmoji(emoji: string) {
    messageInput += emoji;
    if (inputEl) {
      inputEl.focus();
    }
  }

  function toggleToolTab(tab: "format" | "emoji" | "gif" | "image") {
    if (activeToolTab === tab) {
      activeToolTab = null;
    } else {
      activeToolTab = tab;
      if (tab === "gif" && gifResults.length === 0) {
        searchGifs("");
      }
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
      if (activeToolTab) {
        activeToolTab = null;
      } else if (lightboxImageUrl) {
        lightboxImageUrl = null;
      } else {
        onClose();
      }
    }
  }

  function formatTime(timestamp: number) {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  $effect(() => {
    // Sporer endringer i meldinger, aktiv kanal og om chatten åpnes
    const _len = messages?.length || 0;
    const _ch = activeChannel;
    const _open = isOpen;
    const _full = isFullPage;

    if (chatContainer && !editingMessageId) {
      scrollToBottom(false);
    }
  });
</script>

<!-- Skjult filvelger for bildeopplasting -->
<input
  bind:this={fileInputEl}
  type="file"
  accept="image/png,image/jpeg,image/webp,image/gif"
  onchange={handleFileInputChange}
  class="hidden"
/>

<!-- Lightbox Modal for Fullskjerm Bildevisning -->
{#if lightboxImageUrl}
  <div
    class="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-150"
    role="dialog"
    aria-modal="true"
  >
    <button
      type="button"
      onclick={() => (lightboxImageUrl = null)}
      class="absolute top-4 right-4 p-2.5 rounded-full bg-[#191E24]/80 text-white hover:bg-[#384252] transition-colors z-10 border border-[#384252]"
      title="Lukk bilde (Esc)"
    >
      <X class="w-5 h-5" />
    </button>

    <div class="relative max-w-4xl max-h-[85vh] flex flex-col items-center">
      <img
        src={lightboxImageUrl}
        alt="Fullskjerm forhåndsvisning"
        class="max-w-full max-h-[80vh] rounded-2xl object-contain shadow-2xl border border-[#384252]"
      />
      <div class="mt-3 flex items-center gap-3">
        <a
          href={lightboxImageUrl}
          download="atlantasy-chat-image.png"
          class="px-4 py-2 rounded-xl bg-[#242B35] hover:bg-[#384252] text-white text-xs font-bold transition-colors border border-[#384252] flex items-center gap-2"
        >
          <ExternalLink class="w-3.5 h-3.5" />
          <span>Åpne / Last ned original</span>
        </a>
      </div>
    </div>
  </div>
{/if}

<!-- Meldingsboble Snippet -->
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
          title="Sesongleder i alle mot alle"
        >
          👑
        </span>
      {:else if isTopRoom}
        <span
          class="absolute -top-1.5 -right-1 text-xs filter drop-shadow select-none"
          title="Medlem av #1-rommet"
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
            title="Leder av alle mot alle"
          >
            👑 Sesongleder
          </span>
        {:else if isTopRoom}
          <span
            class="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.2 rounded bg-[#1eb854]/20 text-[#70E1F8] border border-[#1eb854]/50 font-bold shadow-[0_0_8px_rgba(30,184,84,0.3)]"
            title="Medlem av regjerende #1-rom"
          >
            🏆 #1-rom
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
            <!-- Tekstinnhold med rik formatering -->
            {#if msg.content}
              <div class="space-y-1">
                {@html renderFormattedContent(msg.content)}
              </div>
            {/if}

            <!-- Vedlagt bilde -->
            {#if msg.imageUrl}
              <div class="mt-2 relative group/img overflow-hidden rounded-xl border border-[#384252] max-w-sm max-h-64 bg-black/40">
                <button
                  type="button"
                  onclick={() => (lightboxImageUrl = msg.imageUrl)}
                  class="block w-full text-left relative"
                  title="Klikk for å se bildet i fullskjerm"
                >
                  <img
                    src={msg.imageUrl}
                    alt="Vedlagt bilde"
                    class="w-full h-auto max-h-60 object-contain hover:scale-[1.02] transition-transform duration-200 cursor-zoom-in"
                    loading="lazy"
                  />
                  <div class="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                    <span class="px-2.5 py-1 rounded-lg bg-black/75 text-white text-[11px] font-semibold flex items-center gap-1.5 shadow-md">
                      <Maximize2 class="w-3 h-3" />
                      <span>Fullskjerm</span>
                    </span>
                  </div>
                </button>
              </div>
            {/if}
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

<!-- Verktøyskuff (Drawer over inputfeltet) Snippet -->
{#snippet chatToolbarAndDrawer()}
  <!-- Bilde-forhåndsvisning dersom bilde er limt inn / valgt -->
  {#if attachedImage}
    <div class="p-2.5 rounded-xl bg-[#191E24] border border-[#9FE88D]/50 flex items-center justify-between gap-3 animate-in fade-in zoom-in-95 duration-100 shadow-md">
      <div class="flex items-center gap-2.5 min-w-0">
        <img
          src={attachedImage}
          alt="Forhåndsvisning"
          class="w-12 h-12 rounded-lg object-cover bg-black/40 border border-[#384252] shrink-0"
        />
        <div class="min-w-0">
          <div class="text-xs font-bold text-white flex items-center gap-1.5 truncate">
            <ImageIcon class="w-3.5 h-3.5 text-[#9FE88D] shrink-0" />
            <span class="truncate">{attachedImageName || "Vedlagt bilde"}</span>
          </div>
          <p class="text-[11px] text-[#9FE88D]">Klar til sending med meldingen</p>
        </div>
      </div>

      <button
        type="button"
        onclick={removeAttachedImage}
        class="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#FB6F84] hover:bg-[#242B35] transition-colors shrink-0"
        title="Fjern bilde"
      >
        <X class="w-4 h-4" />
      </button>
    </div>
  {/if}

  <!-- Utvidbar Skuff (Drawer Panel) -->
  {#if activeToolTab}
    <div
      class="p-3 rounded-2xl bg-[#191E24] border border-[#384252] shadow-xl space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-150 select-none"
    >
      <!-- Skuff Header med fane-tittel og Lukk-knapp -->
      <div class="flex items-center justify-between pb-2 border-b border-[#2A303C]">
        <div class="flex items-center gap-2 text-xs font-bold text-white">
          {#if activeToolTab === "format"}
            <span class="flex items-center gap-1.5 text-[#9FE88D]">
              <Bold class="w-3.5 h-3.5" />
              <span>Tekstformatering</span>
            </span>
          {:else if activeToolTab === "emoji"}
            <span class="flex items-center gap-1.5 text-[#F4C152]">
              <Smile class="w-3.5 h-3.5" />
              <span>Ikoner & Emojis</span>
            </span>
          {:else if activeToolTab === "gif"}
            <span class="flex items-center gap-1.5 text-[#70E1F8]">
              <Film class="w-3.5 h-3.5" />
              <span>GIFs & Reaksjoner</span>
            </span>
          {:else if activeToolTab === "image"}
            <span class="flex items-center gap-1.5 text-[#9FE88D]">
              <ImageIcon class="w-3.5 h-3.5" />
              <span>Bilder & Skjermbilde</span>
            </span>
          {/if}
        </div>

        <button
          type="button"
          onclick={() => (activeToolTab = null)}
          class="p-1 rounded-md text-[#94A3B8] hover:text-white hover:bg-[#2A303C] transition-colors"
          title="Lukk verktøyskuff"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>

      <!-- Tab 1: Tekstformatering -->
      {#if activeToolTab === "format"}
        <div class="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            type="button"
            onclick={() => applyFormatting("**", "**", "fet tekst")}
            class="px-2.5 py-1.5 rounded-lg bg-[#242B35] hover:bg-[#2A303C] text-white font-bold border border-[#384252] hover:border-[#9FE88D] transition-colors flex items-center gap-1"
            title="Fet skrift (**tekst**)"
          >
            <Bold class="w-3.5 h-3.5 text-[#9FE88D]" />
            <span>Fet</span>
          </button>

          <button
            type="button"
            onclick={() => applyFormatting("*", "*", "kursiv tekst")}
            class="px-2.5 py-1.5 rounded-lg bg-[#242B35] hover:bg-[#2A303C] text-white italic border border-[#384252] hover:border-[#9FE88D] transition-colors flex items-center gap-1"
            title="Kursiv (*tekst*)"
          >
            <Italic class="w-3.5 h-3.5 text-[#9FE88D]" />
            <span>Kursiv</span>
          </button>

          <button
            type="button"
            onclick={() => applyFormatting("~~", "~~", "gjennomstreket")}
            class="px-2.5 py-1.5 rounded-lg bg-[#242B35] hover:bg-[#2A303C] text-white line-through border border-[#384252] hover:border-[#9FE88D] transition-colors flex items-center gap-1"
            title="Gjennomstreking (~~tekst~~)"
          >
            <Strikethrough class="w-3.5 h-3.5 text-[#9FE88D]" />
            <span>Strek</span>
          </button>

          <button
            type="button"
            onclick={() => applyFormatting("`", "`", "kode/statistikk")}
            class="px-2.5 py-1.5 rounded-lg bg-[#242B35] hover:bg-[#2A303C] text-white font-mono text-[11px] border border-[#384252] hover:border-[#9FE88D] transition-colors flex items-center gap-1"
            title="Inline kode (`statistikk`)"
          >
            <Code class="w-3.5 h-3.5 text-[#9FE88D]" />
            <span>Kode</span>
          </button>

          <button
            type="button"
            onclick={() => applyFormatting("> ", "", "sitat her")}
            class="px-2.5 py-1.5 rounded-lg bg-[#242B35] hover:bg-[#2A303C] text-white border border-[#384252] hover:border-[#9FE88D] transition-colors flex items-center gap-1"
            title="Sitatblokk (> sitat)"
          >
            <Quote class="w-3.5 h-3.5 text-[#9FE88D]" />
            <span>Sitat</span>
          </button>

          <button
            type="button"
            onclick={() => applyFormatting("- ", "", "punkt")}
            class="px-2.5 py-1.5 rounded-lg bg-[#242B35] hover:bg-[#2A303C] text-white border border-[#384252] hover:border-[#9FE88D] transition-colors flex items-center gap-1"
            title="Punktliste (- punkt)"
          >
            <List class="w-3.5 h-3.5 text-[#9FE88D]" />
            <span>Liste</span>
          </button>

          <button
            type="button"
            onclick={() => applyFormatting("[lenketekst](", ")", "https://")}
            class="px-2.5 py-1.5 rounded-lg bg-[#242B35] hover:bg-[#2A303C] text-white border border-[#384252] hover:border-[#9FE88D] transition-colors flex items-center gap-1"
            title="Lenke ([tittel](url))"
          >
            <Link2 class="w-3.5 h-3.5 text-[#9FE88D]" />
            <span>Lenke</span>
          </button>
        </div>
      {/if}

      <!-- Tab 2: Ikoner & Emojis -->
      {#if activeToolTab === "emoji"}
        <div class="space-y-2.5">
          <!-- Søkefelt -->
          <div class="relative">
            <Search class="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              bind:value={emojiSearch}
              placeholder="Søk i emojier..."
              class="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-[#242B35] border border-[#384252] text-white placeholder-[#94A3B8] focus:border-[#F4C152] focus:outline-none"
            />
          </div>

          <!-- Emoji Galleri -->
          <div class="max-h-36 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {#if filteredEmojis}
              <div class="grid grid-cols-8 sm:grid-cols-10 gap-1 text-lg">
                {#each filteredEmojis as emoji}
                  <button
                    type="button"
                    onclick={() => insertEmoji(emoji)}
                    class="p-1.5 rounded-lg hover:bg-[#242B35] hover:scale-125 transition-all text-center"
                  >
                    {emoji}
                  </button>
                {/each}
              </div>
            {:else}
              {#each emojiCategories as cat}
                <div class="space-y-1">
                  <div class="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">
                    {cat.name}
                  </div>
                  <div class="grid grid-cols-8 sm:grid-cols-11 gap-1 text-lg">
                    {#each cat.emojis as emoji}
                      <button
                        type="button"
                        onclick={() => insertEmoji(emoji)}
                        class="p-1 rounded-lg hover:bg-[#242B35] hover:scale-125 transition-all text-center"
                      >
                        {emoji}
                      </button>
                    {/each}
                  </div>
                </div>
              {/each}
            {/if}
          </div>
        </div>
      {/if}

      <!-- Tab 3: GIF Velger (Discord-stil) -->
      {#if activeToolTab === "gif"}
        <div class="space-y-2.5">
          <!-- Søkefelt for GIFs -->
          <div class="relative flex items-center">
            <Search class="w-3.5 h-3.5 absolute left-3 text-[#94A3B8]" />
            <input
              type="text"
              bind:value={gifSearch}
              oninput={handleGifSearchInput}
              placeholder="Søk etter GIFs (f.eks. haaland, scoring, feiring, meme, shock, ronaldo)..."
              class="w-full pl-8 pr-8 py-1.5 text-xs rounded-xl bg-[#242B35] border border-[#384252] text-white placeholder-[#94A3B8] focus:border-[#70E1F8] focus:outline-none"
            />
            {#if gifSearch}
              <button
                type="button"
                onclick={() => {
                  gifSearch = "";
                  searchGifs("");
                }}
                class="absolute right-2.5 p-0.5 rounded-md text-[#94A3B8] hover:text-white"
              >
                <X class="w-3.5 h-3.5" />
              </button>
            {/if}
          </div>

          <!-- GIF Galleri Resultater -->
          <div class="max-h-56 overflow-y-auto pr-1 custom-scrollbar">
            {#if isSearchingGifs}
              <div class="py-8 text-center text-xs text-[#94A3B8] flex items-center justify-center gap-2">
                <Film class="w-4 h-4 text-[#70E1F8] animate-spin" />
                <span>Henter GIFs...</span>
              </div>
            {:else if gifResults.length === 0}
              <div class="py-8 text-center text-xs text-[#94A3B8]">
                Ingen GIFs funnet for "{gifSearch}". Prøv et annet søkeord.
              </div>
            {:else}
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {#each gifResults as gif (gif.id || gif.url)}
                  <button
                    type="button"
                    onclick={() => selectGif(gif.url)}
                    class="group relative rounded-xl overflow-hidden bg-[#242B35] border border-[#384252] hover:border-[#70E1F8] transition-all aspect-video flex items-center justify-center shadow-sm hover:shadow-md"
                    title={`Send: ${gif.title || "GIF"}`}
                  >
                    <img
                      src={gif.preview || gif.url}
                      alt={gif.title || "GIF"}
                      loading="lazy"
                      class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span class="px-2 py-1 rounded-md bg-[#70E1F8] text-[#16380c] font-black text-[10px] shadow-sm uppercase tracking-wide">
                        Send GIF
                      </span>
                    </div>
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      {/if}

      <!-- Tab 4: Bilde & Utklippstavle -->
      {#if activeToolTab === "image"}
        <div class="space-y-2.5">
          <div class="p-3 rounded-xl bg-[#242B35] border border-dashed border-[#384252] text-center space-y-2">
            <div class="flex items-center justify-center gap-2 text-[#9FE88D]">
              <ImageIcon class="w-5 h-5" />
              <Paperclip class="w-4 h-4 text-[#70E1F8]" />
            </div>
            <p class="text-xs font-semibold text-white">
              Lim inn direkte med <kbd class="px-1.5 py-0.5 rounded bg-[#191E24] border border-[#384252] font-mono text-[10px]">Ctrl + V</kbd>
            </p>
            <p class="text-[11px] text-[#94A3B8]">
              Du kan ta et skjermbilde med Snipping Tool og lime det rett inn i chatten!
            </p>
            <button
              type="button"
              onclick={() => fileInputEl?.click()}
              class="px-4 py-1.5 rounded-lg bg-[#191E24] hover:bg-[#2A303C] text-xs font-bold text-[#E2E8F0] border border-[#384252] hover:border-[#9FE88D] transition-colors inline-flex items-center gap-1.5"
            >
              <ImageIcon class="w-3.5 h-3.5 text-[#9FE88D]" />
              <span>Eller velg bildefil fra PC</span>
            </button>
          </div>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Kompakt Hurtiglinje over inputfeltet -->
  <div class="flex items-center justify-start gap-1 px-1">
    <!-- Hurtigknapper for Verktøyskuff -->
    <div class="flex items-center gap-1.5">
      <button
        type="button"
        onclick={() => toggleToolTab("format")}
        class={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
          activeToolTab === "format"
            ? "bg-[#9FE88D]/20 text-[#9FE88D] border-[#9FE88D]/50 shadow-sm"
            : "bg-[#242B35] text-[#94A3B8] border-[#384252] hover:text-white hover:border-[#4B5563]"
        }`}
        title="Formater tekst (Fet, Kursiv, Kode, Sitat)"
      >
        <Bold class="w-3.5 h-3.5" />
        <span class="text-xs">Format</span>
      </button>

      <button
        type="button"
        onclick={() => toggleToolTab("emoji")}
        class={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
          activeToolTab === "emoji"
            ? "bg-[#F4C152]/20 text-[#F4C152] border-[#F4C152]/50 shadow-sm"
            : "bg-[#242B35] text-[#94A3B8] border-[#384252] hover:text-white hover:border-[#4B5563]"
        }`}
        title="Ikoner & Emojis"
      >
        <Smile class="w-3.5 h-3.5" />
        <span class="text-xs">Emojis</span>
      </button>

      <button
        type="button"
        onclick={() => toggleToolTab("gif")}
        class={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
          activeToolTab === "gif"
            ? "bg-[#70E1F8]/20 text-[#70E1F8] border-[#70E1F8]/50 shadow-sm"
            : "bg-[#242B35] text-[#94A3B8] border-[#384252] hover:text-white hover:border-[#4B5563]"
        }`}
        title="Søk og send GIFs (Discord-stil)"
      >
        <Film class="w-3.5 h-3.5" />
        <span class="text-xs">GIF</span>
      </button>

      <button
        type="button"
        onclick={() => toggleToolTab("image")}
        class={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
          activeToolTab === "image" || attachedImage
            ? "bg-[#9FE88D]/20 text-[#9FE88D] border-[#9FE88D]/50 shadow-sm"
            : "bg-[#242B35] text-[#94A3B8] border-[#384252] hover:text-white hover:border-[#4B5563]"
        }`}
        title="Bilde / Skjermbilde fra utklippstavle"
      >
        <ImageIcon class="w-3.5 h-3.5" />
        <span class="text-xs">Bilde</span>
      </button>
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
            Diskuter runden, del skjermbilder og gi oppløftende kommentarer
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
            Start diskusjonen! Send en melding, formater tekst eller lim inn et skjermbilde nedenfor.
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
      {@render chatToolbarAndDrawer()}

      <div class="flex items-center gap-2">
        <input
          bind:this={inputEl}
          type="text"
          bind:value={messageInput}
          onkeydown={handleKeydown}
          onpaste={handlePaste}
          placeholder={activeChannel === "room"
            ? `Skriv til ${currentRoom?.name || "rommet"}... (Ctrl+V for skjermbilde)`
            : "Skriv melding til alle... (Ctrl+V for skjermbilde)"}
          class="flex-1 px-4 py-2.5 text-xs sm:text-sm rounded-xl bg-[#242B35] border border-[#384252] text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#9FE88D] transition-colors"
        />
        <button
          onclick={handleSend}
          disabled={!messageInput.trim() && !attachedImage}
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

    <div class="p-3 border-t border-[#384252] bg-[#191E24] space-y-2.5 shrink-0">
      {@render chatToolbarAndDrawer()}

      <div class="flex items-center gap-2">
        <input
          bind:this={inputEl}
          type="text"
          bind:value={messageInput}
          onkeydown={handleKeydown}
          onpaste={handlePaste}
          placeholder={activeChannel === "room"
            ? `Skriv til ${currentRoom?.name || "rommet"}...`
            : "Skriv melding til alle..."}
          class="flex-1 px-3.5 py-2 text-xs rounded-xl bg-[#242B35] border border-[#384252] text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#9FE88D] transition-colors"
        />
        <button
          onclick={handleSend}
          disabled={!messageInput.trim() && !attachedImage}
          class="p-2.5 rounded-xl bg-[#9FE88D] text-[#16380c] font-bold hover:bg-[#8ce078] disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm shrink-0"
        >
          <Send class="w-4 h-4" />
        </button>
      </div>
    </div>
  </aside>
{/if}
