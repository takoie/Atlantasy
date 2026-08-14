<script lang="ts">
  import {
    Minus,
    Square,
    X,
    Trophy,
    RefreshCw,
    Shield,
    Sparkles,
    Wifi,
  } from "lucide-svelte";
  import { onMount } from "svelte";

  let {
    currentGw = 26,
    isConvexConnected = true,
    isSyncing = false,
    onOpenAdmin = () => {},
    onRefreshFpl = () => {},
  }: {
    currentGw?: number;
    isConvexConnected?: boolean;
    isSyncing?: boolean;
    onOpenAdmin?: () => void;
    onRefreshFpl?: () => void;
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

          // Lytt på vindusstørrelsesendringer
          unlisten = await tauriWindow.onResized(async () => {
            isMaximized = await tauriWindow.isMaximized();
          });
        }
      } catch {
        // Fallback for standard nettleser
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

<div
  class="h-10 w-full bg-[#0a0f1d] border-b border-slate-800/80 flex items-center justify-between select-none shrink-0 z-50 titlebar-drag-region"
  data-tauri-drag-region
>
  <!-- Venstre: App-branding & Status -->
  <div class="flex items-center gap-3 px-3">
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
      class="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-900/90 border border-slate-700/60 text-[11px]"
    >
      <span class="relative flex h-2 w-2">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-fpl-cyan opacity-75"></span>
        <span class="relative inline-flex rounded-full h-2 w-2 bg-fpl-cyan"></span>
      </span>
      <span class="text-slate-300 font-medium">Gameweek {currentGw}</span>
      <span class="text-[10px] text-fpl-cyan font-bold uppercase tracking-wider">Live</span>
    </div>
  </div>

  <!-- Midten: Subtil tittel / Drag indikator -->
  <div class="hidden lg:flex items-center gap-2 text-xs text-slate-400 font-medium opacity-80 pointer-events-none">
    <Sparkles class="w-3.5 h-3.5 text-fpl-cyan" />
    <span>Atlantis FPL Bedriftsliga • 12 Rom</span>
  </div>

  <!-- Høyre: Verktøy & Custom Windows Vinduskontroller -->
  <div class="flex items-center gap-1 titlebar-no-drag">
    <!-- Synkroniseringsknapp -->
    <button
      onclick={onRefreshFpl}
      title="Synkroniser live FPL-data"
      class="h-7 px-2 flex items-center gap-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 rounded transition-colors"
    >
      <RefreshCw class={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-fpl-cyan" : "text-slate-400"}`} />
      <span class="hidden sm:inline text-[11px] font-medium">Synk</span>
    </button>

    <!-- Admin Hurtigtilgang -->
    <button
      onclick={onOpenAdmin}
      title="Åpne Adminpanel"
      class="h-7 px-2 flex items-center gap-1.5 text-xs text-indigo-300 hover:text-indigo-200 hover:bg-indigo-950/50 rounded border border-indigo-800/40 transition-colors mr-1"
    >
      <Shield class="w-3.5 h-3.5 text-indigo-400" />
      <span class="hidden sm:inline text-[11px] font-medium">Admin</span>
    </button>

    <!-- Tilkoblingsstatus -->
    <div class="px-2 py-1 flex items-center gap-1 text-[11px] text-slate-400 border-r border-slate-800 mr-1">
      <Wifi class={`w-3 h-3 ${isConvexConnected ? "text-emerald-400" : "text-amber-400 animate-pulse"}`} />
    </div>

    <!-- Ekte Windows Frameless Controls -->
    <div class="flex items-center h-full">
      <!-- Minimer -->
      <button
        onclick={handleMinimize}
        title="Minimer"
        aria-label="Minimer vindu"
        class="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
      >
        <Minus class="w-3.5 h-3.5" />
      </button>

      <!-- Maksimer / Gjenopprett -->
      <button
        onclick={handleToggleMaximize}
        title={isMaximized ? "Gjenopprett" : "Maksimer"}
        aria-label="Maksimer vindu"
        class="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
      >
        <Square class="w-3 h-3" />
      </button>

      <!-- Lukk -->
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
</div>
