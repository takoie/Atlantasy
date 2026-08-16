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
  let activeToolTab = $state<"format" | "emoji" | "phrases" | "image" | null>(null);
  let attachedImage = $state<string | null>(null);
  let attachedImageName = $state<string>("");
  let lightboxImageUrl = $state<string | null>(null);
  let emojiSearch = $state("");

  // Kategoriserte Emojis & Ikoner
  const emojiCategories = [
    {
      name: "FPL & Kamp",
      emojis: [
        "⚽", "🏆", "👑", "🤖", "🥅", "🎯", "🔥", "🧤", "⚡", "🥇", "🥈", "🥉",
        "🏟️", "👟", "🟥", "🟨", "🪄", "💣", "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "🇳🇴", "🌟", "🛡️",
      ],
    },
    {
      name: "Reaksjoner & Banter",
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

  // Raske FPL / Banter Fraser
  const quickPhrases = [
    { title: "Captain blank 😭", text: "Kapteinen min blanka selvsagt igjen... 😭" },
    { title: "Green arrow! 🚀", text: "Grønne piler og full jubel denne runden! 🚀🔥" },
    { title: "Clean sheet wipeout 🤦‍♂️", text: "Der røyk clean sheet i det 89. minutt... 🤦‍♂️" },
    { title: "Haaland hattrick 🤖", text: "Erling Braut Haaland redder helga som vanlig 🤖⚽⚽⚽" },
    { title: "Hvor er assisten? 🤷‍♂️", text: "Hvor i all verden ble det av den assisten til FPL?! 🤷‍♂️" },
    { title: "Solgte før runden 💀", text: "Jeg solgte han rett før deadline, og nå scorer han hattrick... 💀" },
    { title: "Trippelkaptein 🔥", text: "Trippelkaptein-chipen er fyrt av! Måtte FPL-gudene være med meg 🙏" },
    { title: "Pep Roulette 👨‍🦲", text: "Pep Roulette rammer igjen. Benched! 👨‍🦲🎲" },
    { title: "Bench boost 🧠", text: "Bench boost masterclass! Poengene renner inn fra benken 🧠" },
    { title: "Minuspoeng på hits 📉", text: "-8 på hits var kanskje ikke den beste ideen... 📉" },
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
      (topRoomId && (senderUser?.roomId === topRoomId || msg.roomId === topRoomId)) ||
      (isAdmin && !senderUser?.roomId)
    );

    // Er avsenderen sesongleder i Alle mot alle?
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

  async function handleSend() {
    if (!messageInput.trim() && !attachedImage) return;
    const text = messageInput.trim();
    const img = attachedImage || undefined;

    messageInput = "";
    removeAttachedImage();
    activeToolTab = null;

    const roomId = activeChannel === "room" ? currentRoom?._id : undefined;
    onSendMessage(text, activeChannel, roomId, img);

    await tick();
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }

  function insertEmoji(emoji: string) {
    messageInput += emoji;
    if (inputEl) {
      inputEl.focus();
    }
  }

  function insertPhrase(phraseText: string) {
    messageInput = messageInput ? `${messageInput} ${phraseText}` : phraseText;
    activeToolTab = null;
    if (inputEl) {
      inputEl.focus();
    }
  }

  function toggleToolTab(tab: "format" | "emoji" | "phrases" | "image") {
    if (activeToolTab === tab) {
      activeToolTab = null;
    } else {
      activeToolTab = tab;
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
    if (messages && chatContainer && !editingMessageId) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
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
          {:else if activeToolTab === "phrases"}
            <span class="flex items-center gap-1.5 text-[#70E1F8]">
              <Zap class="w-3.5 h-3.5" />
              <span>Raske Banter Fraser</span>
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

      <!-- Tab 3: Raske Banter Fraser -->
      {#if activeToolTab === "phrases"}
        <div class="max-h-44 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1.5 pr-1 custom-scrollbar">
          {#each quickPhrases as phrase}
            <button
              type="button"
              onclick={() => insertPhrase(phrase.text)}
              class="p-2 text-left rounded-xl bg-[#242B35] hover:bg-[#2A303C] border border-[#384252] hover:border-[#70E1F8] transition-all group/p"
            >
              <div class="text-xs font-bold text-white group-hover/p:text-[#70E1F8] transition-colors">
                {phrase.title}
              </div>
              <div class="text-[11px] text-[#94A3B8] truncate mt-0.5">
                {phrase.text}
              </div>
            </button>
          {/each}
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
  <div class="flex items-center justify-between gap-1 px-1">
    <!-- Hurtigknapper for Verktøyskuff -->
    <div class="flex items-center gap-1">
      <button
        type="button"
        onclick={() => toggleToolTab("format")}
        class={`px-2 py-1 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1 ${
          activeToolTab === "format"
            ? "bg-[#9FE88D]/20 text-[#9FE88D] border-[#9FE88D]/50 shadow-sm"
            : "bg-[#242B35] text-[#94A3B8] border-[#384252] hover:text-white hover:border-[#4B5563]"
        }`}
        title="Formater tekst (Fet, Kursiv, Kode, Sitat)"
      >
        <Bold class="w-3 h-3" />
        <span class="text-[10px] hidden sm:inline">Format</span>
      </button>

      <button
        type="button"
        onclick={() => toggleToolTab("emoji")}
        class={`px-2 py-1 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1 ${
          activeToolTab === "emoji"
            ? "bg-[#F4C152]/20 text-[#F4C152] border-[#F4C152]/50 shadow-sm"
            : "bg-[#242B35] text-[#94A3B8] border-[#384252] hover:text-white hover:border-[#4B5563]"
        }`}
        title="Ikoner & Emojis"
      >
        <Smile class="w-3 h-3" />
        <span class="text-[10px] hidden sm:inline">Emojis</span>
      </button>

      <button
        type="button"
        onclick={() => toggleToolTab("image")}
        class={`px-2 py-1 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1 ${
          activeToolTab === "image" || attachedImage
            ? "bg-[#9FE88D]/20 text-[#9FE88D] border-[#9FE88D]/50 shadow-sm"
            : "bg-[#242B35] text-[#94A3B8] border-[#384252] hover:text-white hover:border-[#4B5563]"
        }`}
        title="Bilde / Skjermbilde fra utklippstavle"
      >
        <ImageIcon class="w-3 h-3" />
        <span class="text-[10px] hidden sm:inline">Bilde</span>
      </button>

      <button
        type="button"
        onclick={() => toggleToolTab("phrases")}
        class={`px-2 py-1 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1 ${
          activeToolTab === "phrases"
            ? "bg-[#70E1F8]/20 text-[#70E1F8] border-[#70E1F8]/50 shadow-sm"
            : "bg-[#242B35] text-[#94A3B8] border-[#384252] hover:text-white hover:border-[#4B5563]"
        }`}
        title="Raske Banter Fraser"
      >
        <Zap class="w-3 h-3" />
        <span class="text-[10px] hidden sm:inline">Fraser</span>
      </button>
    </div>

    <!-- Raske Inline Emojis -->
    <div class="flex items-center gap-1">
      {#each ["🔥", "🏆", "😂", "🚀", "👑", "⚽"] as emoji}
        <button
          type="button"
          onclick={() => insertEmoji(emoji)}
          class="text-sm hover:scale-125 transition-transform px-1 py-0.5 select-none"
        >
          {emoji}
        </button>
      {/each}
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
            Banter & Chat
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
            Banter & Chat
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
