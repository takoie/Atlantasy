<script lang="ts">
  import {
    Send,
    MessageSquare,
    Lock,
    Users,
    X,
    Sparkles,
  } from "lucide-svelte";
  import { tick } from "svelte";

  let {
    isOpen = false,
    isFullPage = false,
    messages = [],
    currentUser: _currentUser = null,
    currentRoom = null,
    activeChannel = "banter", // "banter" | "room"
    onClose = () => {},
    onSelectChannel = (_channel: string) => {},
    onSendMessage = (_content: string, _channel: string, _roomId?: string) => {},
  }: {
    isOpen?: boolean;
    isFullPage?: boolean;
    messages?: any[];
    currentUser?: any;
    currentRoom?: any;
    activeChannel?: string;
    onClose?: () => void;
    onSelectChannel?: (channel: string) => void;
    onSendMessage?: (content: string, channel: string, roomId?: string) => void;
  } = $props();

  let messageInput = $state("");
  let chatContainer: HTMLElement | null = $state(null);

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
    if (messages && chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  });
</script>

{#if isFullPage}
  <!-- FULLSKJERM / SIDEVISNING (DaisyUI Dim Theme) -->
  <div class="flex-1 flex flex-col h-full bg-[#2A303C] rounded-2xl border border-[#384252] shadow-sm overflow-hidden text-[#E2E8F0] font-sans">
    <!-- Header -->
    <div class="p-4 border-b border-[#384252] bg-[#191E24] flex flex-wrap items-center justify-between gap-3 shrink-0">
      <div class="flex items-center gap-3">
        <div class="p-2 rounded-xl bg-[#9FE88D]/15 border border-[#9FE88D]/30 text-[#9FE88D]">
          <MessageSquare class="w-5 h-5" />
        </div>
        <div>
          <h2 class="text-base font-bold text-white flex items-center gap-2">
            Sanntids-Chat & Liga-Banter
          </h2>
          <p class="text-xs text-[#94A3B8]">Diskuter runden, del reaksjoner og snakk med romkameratene dine</p>
        </div>
      </div>

      <!-- Kanalvelger Faner -->
      <div class="flex items-center gap-1.5 p-1 bg-[#242B35] rounded-xl border border-[#384252] text-xs">
        <button
          onclick={() => onSelectChannel("banter")}
          class={`py-1.5 px-4 rounded-lg font-bold transition-colors flex items-center justify-center gap-1.5 ${
            activeChannel === "banter"
              ? "bg-[#9FE88D] text-[#16380c] shadow-sm"
              : "text-[#94A3B8] hover:text-white"
          }`}
        >
          <Users class="w-3.5 h-3.5" />
          <span>Felles Banter</span>
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
      class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 custom-scrollbar"
    >
      {#if messages.length === 0}
        <div class="h-full flex flex-col items-center justify-center text-center p-8 space-y-2 text-[#94A3B8]">
          <div class="w-12 h-12 rounded-2xl bg-[#242B35] border border-[#384252] flex items-center justify-center text-[#9FE88D] mb-1">
            <MessageSquare class="w-6 h-6" />
          </div>
          <p class="text-sm font-bold text-white">Ingen meldinger i denne kanalen enda</p>
          <p class="text-xs text-[#94A3B8] max-w-sm">
            Start diskusjonen før seriestart! Send en melding til {activeChannel === "room" ? (currentRoom?.name || "rommet") : "hele ligaen"} nedenfor.
          </p>
        </div>
      {/if}

      {#each messages as msg (msg._id)}
        <div class="flex items-start gap-3 max-w-2xl">
          <img
            src={msg.senderAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${msg.senderName}`}
            alt="Avatar"
            class="w-8 h-8 rounded-xl bg-[#191E24] border border-[#384252] shrink-0 mt-0.5 object-cover"
          />

          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xs font-bold text-white truncate">
                {msg.senderName}
              </span>
              {#if msg.senderRole === "admin"}
                <span class="text-[9px] px-1.5 py-0.2 rounded bg-[#9FE88D]/15 text-[#9FE88D] border border-[#9FE88D]/30 font-bold uppercase">
                  Admin
                </span>
              {/if}
              <span class="text-[10px] text-[#94A3B8]">
                {formatTime(msg.createdAt)}
              </span>
            </div>

            <div
              class={`p-3 rounded-2xl text-xs sm:text-sm leading-relaxed text-[#E2E8F0] break-words shadow-sm ${
                msg.type === "announcement"
                  ? "bg-[#F4C152]/15 border border-[#F4C152]/30 text-[#F4C152]"
                  : "bg-[#242B35] border border-[#384252]"
              }`}
            >
              {msg.content}
            </div>
          </div>
        </div>
      {/each}
    </div>

    <!-- Input Seksjon -->
    <div class="p-3.5 sm:p-4 border-t border-[#384252] bg-[#191E24] space-y-2.5 shrink-0">
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
          placeholder={activeChannel === "room" ? `Skriv til ${currentRoom?.name || "rommet"}...` : "Skriv melding til alle..."}
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
  <div
    onclick={onClose}
    class="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 transition-opacity duration-200"
  ></div>

  <aside
    class="fixed top-0 right-0 h-full w-full max-w-md bg-[#2A303C] border-l border-[#384252] shadow-2xl z-50 flex flex-col justify-between select-none animate-in slide-in-from-right duration-200 text-[#E2E8F0] font-sans"
  >
    <div class="p-4 border-b border-[#384252] bg-[#191E24] flex items-center justify-between shrink-0">
      <div class="flex items-center gap-2.5">
        <div class="p-2 rounded-lg bg-[#9FE88D]/15 border border-[#9FE88D]/30 text-[#9FE88D]">
          <MessageSquare class="w-4 h-4" />
        </div>
        <div>
          <h2 class="text-sm font-bold text-white flex items-center gap-2">
            Sanntids-Chat & Banter
          </h2>
          <p class="text-[11px] text-[#94A3B8]">Diskuter runden og del banter</p>
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
      <div class="grid grid-cols-2 gap-1.5 p-1 bg-[#242B35] rounded-lg border border-[#384252] text-xs">
        <button
          onclick={() => onSelectChannel("banter")}
          class={`py-1.5 px-3 rounded-md font-bold transition-colors flex items-center justify-center gap-1.5 ${
            activeChannel === "banter"
              ? "bg-[#9FE88D] text-[#16380c] shadow-sm"
              : "text-[#94A3B8] hover:text-white"
          }`}
        >
          <Users class="w-3.5 h-3.5" />
          <span>Banter (Felles)</span>
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
      class="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar"
    >
      {#if messages.length === 0}
        <div class="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-[#94A3B8]">
          <MessageSquare class="w-8 h-8 opacity-30 text-[#9FE88D]" />
          <p class="text-xs font-semibold text-white">Ingen meldinger enda</p>
          <p class="text-[11px] text-[#94A3B8]">Start samtalen ved å sende en melding nedenfor!</p>
        </div>
      {/if}

      {#each messages as msg (msg._id)}
        <div class="flex items-start gap-2.5">
          <img
            src={msg.senderAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${msg.senderName}`}
            alt="Avatar"
            class="w-7 h-7 rounded-full bg-[#191E24] border border-[#384252] shrink-0 mt-0.5"
          />

          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-1">
              <div class="flex items-center gap-1.5 truncate">
                <span class="text-xs font-bold text-white truncate">
                  {msg.senderName}
                </span>
                {#if msg.senderRole === "admin"}
                  <span class="text-[9px] px-1.5 py-0.2 rounded bg-[#9FE88D]/15 text-[#9FE88D] border border-[#9FE88D]/30 font-bold uppercase">
                    Admin
                  </span>
                {/if}
              </div>

              <span class="text-[10px] text-[#94A3B8] shrink-0">
                {formatTime(msg.createdAt)}
              </span>
            </div>

            <div
              class={`mt-1 p-2.5 rounded-xl text-xs leading-relaxed text-[#E2E8F0] break-words ${
                msg.type === "announcement"
                  ? "bg-[#F4C152]/15 border border-[#F4C152]/30 text-[#F4C152]"
                  : "bg-[#242B35] border border-[#384252]"
              }`}
            >
              {msg.content}
            </div>
          </div>
        </div>
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
          placeholder={activeChannel === "room" ? `Skriv til ${currentRoom?.name || "rommet"}...` : "Skriv melding til alle..."}
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
