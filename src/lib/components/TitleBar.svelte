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
    KeyRound,
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
    onOpenRegister = () => {},
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
    onOpenRegister?: () => void;
  } = $props();

  let isMaximized = $state(false);
  let tauriWindow: any = null;

  onMount(() => {
    let unlisten: (() => void) | undefined;
    (async () => {
      try {
        if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
          const { getCurrentWindow } = await import("@tauri-apps/api/window");
          tauriWindow = getCurrentWindow();
          isMaximized = await tauriWindow.isMaximized();

          unlisten = await tauriWindow.onResized(async () => {
            isMaximized = await tauriWindow.isMaximized();
          });
        }
      } catch {
        // Fallback
      }
    })();

    return () => {
      if (unlisten) unlisten();
    };
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
  class="h-11 w-full bg-[#0a0f1d] border-b border-slate-800 flex items-center justify-between select-none shrink-0 z-40 titlebar-drag-region"
  data-tauri-drag-region
>
  <!-- Venstre: App Branding & Status -->
  <div class="flex items-center gap-3 px-3.5">
    <div class="flex items-center gap-2">
      <div
        class="w-6 h-6 rounded-md bg-gradient-to-br from-fpl-cyan to-emerald-500 flex items-center justify-center text-slate-950 font-black shadow-glow-cyan"
      >
        <Trophy class="w-3.5 h-3.5 text-[#070a12]" />
      </div>
      <span class="font-bold text-xs tracking-wider text-white uppercase flex items-center gap-1.5">
        Atlantasy
        <span class="text-[9px] font-mono text-fpl-cyan bg-fpl-cyan/10 px-1 py-0.2 rounded border border-fpl-cyan/30">
          DESKTOP
        </span>
      </span>
    </div>

    <!-- Gameweek Live Badge -->
    <div
      class="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-900/90 border border-slate-700/60 text-[11px]"
    >
      <span class="relative flex h-2 w-2">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-fpl-cyan opacity-75"></span>
        <span class="relative inline-flex rounded-full h-2 w-2 bg-fpl-cyan"></span>
      </span>
      <span class="text-slate-300 font-medium">Gameweek {currentGw}</span>
      <span class="text-[10px] text-fpl-cyan font-bold uppercase tracking-wider">Live</span>
    </div>
  </div>

  <!-- Midten: Navigasjon & Raske Handlinger -->
  <div class="flex items-center gap-1.5 titlebar-no-drag">
    <!-- Skrytevegg / Månedsvinnere knapp -->
    <button
      onclick={onToggleWallOfFame}
      class={`h-7 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
        activeView === "wall_of_fame"
          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
          : "text-slate-300 hover:text-white hover:bg-slate-800/60"
      }`}
    >
      <Crown class="w-3.5 h-3.5 text-amber-400" />
      <span class="hidden md:inline">Månedens Vinnere</span>
    </button>

    <!-- Avisen & Nyheter -->
    <button
      onclick={onToggleNews}
      class={`h-7 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
        activeView === "news"
          ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm"
          : "text-slate-300 hover:text-white hover:bg-slate-800/60"
      }`}
    >
      <Newspaper class="w-3.5 h-3.5 text-purple-400" />
      <span class="hidden md:inline">Avisen & Nyheter</span>
    </button>

    <!-- Registrer / Invitasjonskode -->
    <button
      onclick={onOpenRegister}
      title="Bli med med invitasjonskode"
      class="h-7 px-2.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors flex items-center gap-1.5"
    >
      <KeyRound class="w-3.5 h-3.5 text-indigo-400" />
      <span class="hidden md:inline">Bli med</span>
    </button>

    <!-- Admin Panel -->
    <button
      onclick={onOpenAdmin}
      title="Åpne Adminpanel & Rom-matching"
      class="h-7 px-2.5 rounded-lg text-xs font-semibold text-indigo-300 hover:text-indigo-200 bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-800/50 transition-colors flex items-center gap-1.5"
    >
      <Shield class="w-3.5 h-3.5 text-indigo-400" />
      <span>Admin</span>
    </button>
  </div>

  <!-- Høyre: Chat Drawer Trigger & Windows Kontroller -->
  <div class="flex items-center gap-1.5 titlebar-no-drag pr-0">
    <!-- FPL Synk -->
    <button
      onclick={onRefreshFpl}
      title="Synkroniser live FPL-data"
      class="h-7 px-2 flex items-center gap-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 rounded transition-colors"
    >
      <RefreshCw class={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-fpl-cyan" : "text-slate-400"}`} />
    </button>

    <!-- Chat Drawer Knapp (Med varsel-badge) -->
    <button
      onclick={onToggleChat}
      title="Åpne Sanntids-Chat Drawer"
      class="h-7 px-3 flex items-center gap-1.5 text-xs font-bold text-slate-950 bg-fpl-cyan hover:bg-emerald-400 rounded-lg transition-all shadow-glow-cyan"
    >
      <MessageSquare class="w-3.5 h-3.5" />
      <span>Chat</span>
      {#if unreadCount > 0}
        <span class="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
      {/if}
    </button>

    <!-- Brukerinfo -->
    <div class="hidden lg:flex items-center gap-2 px-2 py-0.5 border-l border-slate-800 ml-1">
      <img
        src={currentUser?.avatar || "https://api.dicebear.com/7.x/bottts/svg?seed=AtlantisUser"}
        alt="Avatar"
        class="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 shrink-0"
      />
      <span class="text-xs font-semibold text-slate-200 truncate max-w-[120px]">
        {currentUser?.username || "Admin"}
      </span>
    </div>

    <!-- Statusindikator -->
    <div class="px-2 py-1 flex items-center gap-1 text-[11px] text-slate-400 border-r border-slate-800 mr-1">
      <Wifi class={`w-3 h-3 ${isConvexConnected ? "text-emerald-400" : "text-amber-400 animate-pulse"}`} />
    </div>

    <!-- Windows Vinduskontroller -->
    <div class="flex items-center h-full">
      <button
        onclick={handleMinimize}
        title="Minimer"
        aria-label="Minimer vindu"
        class="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
      >
        <Minus class="w-3.5 h-3.5" />
      </button>

      <button
        onclick={handleToggleMaximize}
        title={isMaximized ? "Gjenopprett" : "Maksimer"}
        aria-label="Maksimer vindu"
        class="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
      >
        <Square class="w-3 h-3" />
      </button>

      <button
        onclick={handleClose}
        title="Lukk"
        aria-label="Lukk applikasjon"
        class="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-rose-600 transition-colors"
      >
        <X class="w-4 h-4" />
      </button>
    </div>
  </div>
</header>
