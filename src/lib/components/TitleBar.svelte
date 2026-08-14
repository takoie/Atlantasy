<script lang="ts">
  import {
    Minus,
    Square,
    X,
    Trophy,
    RefreshCw,
    Shield,
    MessageSquare,
    Wifi,
    Crown,
    Newspaper,
  } from "lucide-svelte";
  import { onMount } from "svelte";

  let {
    currentGw = 26,
    isConvexConnected = true,
    isSyncing = false,
    unreadCount = 0,
    activeView = "leaderboard",
    currentUser = null,
    onOpenAdmin = () => {},
    onRefreshFpl = () => {},
    onToggleChat = () => {},
    onToggleWallOfFame = () => {},
    onToggleNews = () => {},
  }: {
    currentGw?: number;
    isConvexConnected?: boolean;
    isSyncing?: boolean;
    unreadCount?: number;
    activeView?: string;
    currentUser?: any;
    onOpenAdmin?: () => void;
    onRefreshFpl?: () => void;
    onToggleChat?: () => void;
    onToggleWallOfFame?: () => void;
    onToggleNews?: () => void;
  } = $props();

  let isMaximized = $state(false);
  let tauriWindow = $state<any>(null);

  onMount(async () => {
    try {
      // Sjekk om appen kjører i Tauri Desktop
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      tauriWindow = getCurrentWindow();
      isMaximized = await tauriWindow.isMaximized();

      // Lytt på vindusendringer
      await tauriWindow.onResized(async () => {
        isMaximized = await tauriWindow.isMaximized();
      });
    } catch {
      // Nettlesermodus
    }
  });

  async function handleMinimize() {
    if (tauriWindow) {
      await tauriWindow.minimize();
    }
  }

  async function handleToggleMaximize() {
    if (tauriWindow) {
      await tauriWindow.toggleMaximize();
      isMaximized = await tauriWindow.isMaximized();
    }
  }

  async function handleClose() {
    if (tauriWindow) {
      await tauriWindow.close();
    }
  }
</script>

<header
  class="h-11 w-full bg-[#111827] border-b border-slate-800 flex items-center justify-between select-none shrink-0 z-40 titlebar-drag-region"
  data-tauri-drag-region
>
  <!-- Venstre: App Branding & Status -->
  <div class="flex items-center gap-3 px-3.5">
    <div class="flex items-center gap-2">
      <div
        class="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-slate-950 font-black shadow-sm"
      >
        <Trophy class="w-3.5 h-3.5 text-slate-950" />
      </div>
      <span class="font-bold text-xs tracking-wide text-white flex items-center gap-1.5">
        Atlantasy
        <span class="text-[9px] font-mono text-emerald-400 bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-800/40">
          Desktop
        </span>
      </span>
    </div>

    <!-- Gameweek Live Badge -->
    <div
      class="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-700/60 text-[11px]"
    >
      <span class="relative flex h-2 w-2">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
      </span>
      <span class="text-slate-300 font-medium">Gameweek {currentGw}</span>
      <span class="text-[10px] text-emerald-400 font-semibold lowercase">live</span>
    </div>
  </div>

  <!-- Midten: Navigasjon & Raske Handlinger -->
  <div class="flex items-center gap-1.5 titlebar-no-drag">
    <!-- Skrytevegg / Månedsvinnere knapp -->
    <button
      onclick={onToggleWallOfFame}
      class={`h-7 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
        activeView === "wall_of_fame"
          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
          : "text-slate-300 hover:text-white hover:bg-slate-800/60"
      }`}
    >
      <Crown class="w-3.5 h-3.5 text-amber-400" />
      <span class="hidden md:inline">Månedens vinnere</span>
    </button>

    <!-- Avisen og nyheter -->
    <button
      onclick={onToggleNews}
      class={`h-7 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
        activeView === "news"
          ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm"
          : "text-slate-300 hover:text-white hover:bg-slate-800/60"
      }`}
    >
      <Newspaper class="w-3.5 h-3.5 text-purple-400" />
      <span class="hidden md:inline">Avisen og nyheter</span>
    </button>

    <!-- Admin Panel (Alltid synlig i dev) -->
    <button
      onclick={onOpenAdmin}
      title="Åpne administratorpanel og rom-matching"
      class="h-7 px-2.5 rounded-lg text-xs font-semibold text-indigo-300 hover:text-indigo-200 bg-indigo-950/50 hover:bg-indigo-900/60 border border-indigo-700/50 transition-colors flex items-center gap-1.5 shadow-sm"
    >
      <Shield class="w-3.5 h-3.5 text-indigo-400" />
      <span class="hidden sm:inline">Admin</span>
    </button>

    <!-- Manuell FPL Refresh -->
    <button
      onclick={onRefreshFpl}
      disabled={isSyncing}
      title="Synkroniser FPL-poeng"
      class="h-7 px-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors flex items-center gap-1 text-xs"
    >
      <RefreshCw class={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-emerald-400" : ""}`} />
      {#if isSyncing}
        <span class="hidden sm:inline text-[11px] text-emerald-400">Synkroniserer...</span>
      {/if}
    </button>

    <!-- Chat Drawer Toggle -->
    <button
      onclick={onToggleChat}
      title="Åpne banter og rom-chat"
      class="h-7 px-2.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors flex items-center gap-1.5 relative"
    >
      <MessageSquare class="w-3.5 h-3.5 text-slate-300" />
      <span class="hidden md:inline">Chat</span>
      {#if unreadCount > 0}
        <span
          class="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center -ml-0.5"
        >
          {unreadCount}
        </span>
      {/if}
    </button>
  </div>

  <!-- Høyre: Brukerinfo, Forbindelse & Windows Vinduskontroller -->
  <div class="flex items-center gap-2 titlebar-no-drag">
    <!-- Brukerinfo -->
    {#if currentUser}
      <div class="hidden sm:flex items-center gap-2 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs">
        <img
          src={currentUser.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.username}`}
          alt="Avatar"
          class="w-4 h-4 rounded-full bg-slate-800"
        />
        <span class="font-semibold text-white truncate max-w-[100px]">{currentUser.username}</span>
      </div>
    {/if}

    <!-- Convex Status Indikator -->
    <div
      class="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-slate-400"
      title={isConvexConnected ? "Tilkoblet Convex sanntidsdatabase" : "Frakoblet"}
    >
      <Wifi class={`w-3 h-3 ${isConvexConnected ? "text-emerald-400" : "text-rose-500"}`} />
    </div>

    <!-- Windows Window Controls -->
    <div class="flex items-center">
      <button
        onclick={handleMinimize}
        title="Minimer"
        class="h-11 w-11 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
      >
        <Minus class="w-3.5 h-3.5" />
      </button>

      <button
        onclick={handleToggleMaximize}
        title={isMaximized ? "Gjenopprett" : "Maksimer"}
        class="h-11 w-11 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
      >
        <Square class="w-3 h-3" />
      </button>

      <button
        onclick={handleClose}
        title="Lukk"
        class="h-11 w-11 flex items-center justify-center text-slate-400 hover:text-white hover:bg-rose-600 transition-colors"
      >
        <X class="w-4 h-4" />
      </button>
    </div>
  </div>
</header>
