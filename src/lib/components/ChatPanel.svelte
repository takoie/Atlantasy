<script lang="ts">
  import {
    Send,
    MessageSquare,
    Lock,
    Users,
  } from "lucide-svelte";
  import { tick } from "svelte";

  let {
    messages = [],
    currentUser: _currentUser = null,
    currentRoom = null,
    activeChannel = "banter", // "banter" | "room"
    onSelectChannel = (_channel: string) => {},
    onSendMessage = (_content: string, _channel: string, _roomId?: string) => {},
    onDeleteMessage: _onDeleteMessage = (_messageId: string) => {},
  }: {
    messages?: any[];
    currentUser?: any;
    currentRoom?: any;
    activeChannel?: string;
    onSelectChannel?: (channel: string) => void;
    onSendMessage?: (content: string, channel: string, roomId?: string) => void;
    onDeleteMessage?: (messageId: string) => void;
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

<aside
  class="w-80 lg:w-96 shrink-0 bg-[#090d17] border-l border-slate-800/80 flex flex-col justify-between select-none h-full overflow-hidden"
>
  <!-- Chat Topp: Faner -->
  <div class="p-3 border-b border-slate-800/80 shrink-0">
    <div class="flex items-center justify-between gap-2 mb-2">
      <h2 class="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
        <MessageSquare class="w-3.5 h-3.5 text-fpl-cyan" />
        <span>Liga-Chat & Banter</span>
      </h2>
    </div>

    <div class="grid grid-cols-2 gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800 text-xs">
      <!-- Felles Banter -->
      <button
        onclick={() => onSelectChannel("banter")}
        class={`py-1 px-2 rounded-md font-medium transition-colors flex items-center justify-center gap-1.5 ${
          activeChannel === "banter"
            ? "bg-fpl-cyan text-slate-950 font-bold shadow-glow-cyan"
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        <Users class="w-3.5 h-3.5" />
        <span>Banter (Felles)</span>
      </button>

      <!-- Mitt Rom -->
      <button
        onclick={() => onSelectChannel("room")}
        class={`py-1 px-2 rounded-md font-medium transition-colors flex items-center justify-center gap-1.5 ${
          activeChannel === "room"
            ? "bg-fpl-cyan text-slate-950 font-bold shadow-glow-cyan"
            : "text-slate-400 hover:text-slate-200"
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
    class="flex-1 overflow-y-auto p-3 space-y-3"
  >
    {#if messages.length === 0}
      <div class="h-full flex flex-col items-center justify-center text-center p-4 space-y-2 text-slate-500">
        <MessageSquare class="w-8 h-8 opacity-40 text-fpl-cyan" />
        <p class="text-xs font-medium text-slate-400">Ingen meldinger i denne kanalen enda.</p>
        <p class="text-[11px] text-slate-500">Vær den første til å fyre opp stemningen!</p>
      </div>
    {/if}

    {#each messages as msg (msg._id)}
      <div class="flex items-start gap-2.5 group">
        <!-- Sender Avatar -->
        <img
          src={msg.senderAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${msg.senderName}`}
          alt="Avatar"
          class="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 shrink-0 mt-0.5"
        />

        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-1">
            <div class="flex items-center gap-1.5 truncate">
              <span class="text-xs font-bold text-white truncate">
                {msg.senderName}
              </span>
              {#if msg.senderRole === "admin"}
                <span class="text-[9px] px-1 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60 font-bold uppercase">
                  Admin
                </span>
              {/if}
            </div>

            <span class="text-[10px] text-slate-500 shrink-0">
              {formatTime(msg.createdAt)}
            </span>
          </div>

          <!-- Meldingstekst -->
          <div
            class={`mt-1 p-2.5 rounded-lg text-xs leading-relaxed text-slate-200 break-words ${
              msg.type === "announcement"
                ? "bg-amber-950/30 border border-amber-500/30 text-amber-200"
                : "bg-slate-900/80 border border-slate-800/80"
            }`}
          >
            {msg.content}
          </div>
        </div>
      </div>
    {/each}
  </div>

  <!-- Chat Input Seksjon -->
  <div class="p-3 border-t border-slate-800/80 bg-slate-950/60 space-y-2 shrink-0">
    <!-- Raske Emojis -->
    <div class="flex items-center gap-1.5 px-1">
      {#each ["🔥", "🏆", "😂", "🚀", "👑", "👀", "⚽"] as emoji}
        <button
          onclick={() => insertEmoji(emoji)}
          class="text-xs hover:scale-125 transition-transform"
        >
          {emoji}
        </button>
      {/each}
    </div>

    <!-- Tekstfelt & Send-knapp -->
    <div class="flex items-center gap-2">
      <input
        type="text"
        bind:value={messageInput}
        onkeydown={handleKeydown}
        placeholder={activeChannel === "room" ? `Skriv i ${currentRoom?.name || "rommet"}...` : "Fyr opp litt banter..."}
        class="flex-1 px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-fpl-cyan transition-colors"
      />
      <button
        onclick={handleSend}
        disabled={!messageInput.trim()}
        class="p-2 rounded-lg bg-fpl-cyan text-slate-950 font-bold hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-glow-cyan"
      >
        <Send class="w-4 h-4" />
      </button>
    </div>
  </div>
</aside>
