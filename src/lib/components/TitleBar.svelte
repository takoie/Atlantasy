<script lang="ts">
  import {
    Minus,
    Square,
    Copy,
    X,
    Trophy,
    Wifi,
    Radio,
    LogOut,
    LogIn,
    User,
  } from "lucide-svelte";
  import { onMount, onDestroy } from "svelte";
  import { getCurrentWindow } from "@tauri-apps/api/window";

  let {
    currentGw = 1,
    isConvexConnected = true,
    deadlineEpoch = null,
    deadlineLabel = "GW 1",
    currentUser = null,
    onLogin = () => {},
    onLogout = () => {},
  }: {
    currentGw?: number;
    isConvexConnected?: boolean;
    deadlineEpoch?: number | null;
    deadlineLabel?: string;
    currentUser?: any;
    onLogin?: () => void;
    onLogout?: () => void;
  } = $props();

  let isMaximized = $state(false);
  let appWindow: any = null;
  let headerElement: HTMLElement | null = $state(null);

  // Countdown state
  let targetDeadline = $derived(
    deadlineEpoch || (Date.now() + (6 * 24 + 18) * 3600 * 1000) // Standard neste fredag frist
  );

  let timeLeft = $state({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
  });

  let timerInterval: any = null;

  function updateCountdown() {
    const diff = targetDeadline - Date.now();
    if (diff <= 0) {
      timeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    timeLeft = { days, hours, minutes, seconds, isExpired: false };
  }

  async function syncWindowState() {
    try {
      const win = await getWin();
      if (win) {
        isMaximized = await win.isMaximized();
      }
    } catch {}
  }

  onMount(async () => {
    updateCountdown();
    timerInterval = setInterval(updateCountdown, 1000);

    try {
      appWindow = getCurrentWindow();
      if (appWindow) {
        await syncWindowState();
        await appWindow.onResized(syncWindowState);
      }
    } catch (err) {
      console.warn("Tauri API ikke tilgjengelig (kjører i nettleser):", err);
    }

    const handleDblClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target && !target.closest(".titlebar-no-drag")) {
        handleToggleMaximize();
      }
    };

    if (headerElement) {
      headerElement.addEventListener("dblclick", handleDblClick);
    }

    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === "F11") {
        e.preventDefault();
        try {
          const win = await getWin();
          if (win) {
            const isFs = await win.isFullscreen();
            await win.setFullscreen(!isFs);
            await syncWindowState();
          }
        } catch {}
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      if (headerElement) {
        headerElement.removeEventListener("dblclick", handleDblClick);
      }
      window.removeEventListener("keydown", handleKeyDown);
    };
  });

  onDestroy(() => {
    if (timerInterval) clearInterval(timerInterval);
  });

  async function getWin() {
    if (appWindow) return appWindow;
    try {
      appWindow = getCurrentWindow();
      return appWindow;
    } catch {
      return null;
    }
  }

  async function handleMinimize() {
    try {
      const win = await getWin();
      if (win) {
        await win.minimize();
      }
    } catch (err) {
      console.error("Kunne ikke minimere vindu:", err);
    }
  }

  async function handleToggleMaximize() {
    try {
      const win = await getWin();
      if (win) {
        if (await win.isFullscreen()) {
          await win.setFullscreen(false);
        }
        await win.toggleMaximize();
        await syncWindowState();
      }
    } catch (err) {
      console.error("Kunne ikke toggle maksimering:", err);
    }
  }

  async function handleClose() {
    try {
      const win = await getWin();
      if (win) {
        await win.close();
      }
    } catch (err) {
      console.error("Kunne ikke lukke vindu:", err);
    }
  }
</script>

<header
  bind:this={headerElement}
  class="relative h-11 w-full bg-[#191E24] border-b border-[#384252] flex items-center justify-between select-none shrink-0 z-40 titlebar-drag-region text-[#E2E8F0] font-sans px-3"
  data-tauri-drag-region
>
  <!-- Venstre: Usynlig avstandsholder -->
  <div class="w-8 shrink-0"></div>

  <!-- Midten: Nøyaktig sentrert "Atlantasy FPL" tittel med rullende fotball animasjon -->
  <div class="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
    <div class="relative flex items-center justify-center px-6 py-1">
      <!-- Rullende fotball som fader inn, ruller forbi og fader ut -->
      <span class="absolute text-sm rolling-football pointer-events-none select-none">
        ⚽
      </span>

      <span class="font-extrabold text-sm tracking-wider text-white flex items-center gap-1.5 drop-shadow-sm">
        <span>Atlantasy</span>
        <span class="text-[#9FE88D]">FPL</span>
      </span>
    </div>
  </div>

  <!-- Høyre: Brukerstatus, Convex Tilkobling & Windows Vinduskontroller -->
  <div class="flex items-center gap-2 titlebar-no-drag ml-auto">
    <!-- Brukerstatus & Logg inn / ut -->
    {#if currentUser}
      <div class="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-[#242B35] border border-[#384252] shadow-sm">
        <img
          src={currentUser.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.username}`}
          alt=""
          class="w-5 h-5 rounded-full bg-[#191E24] border border-[#384252]"
        />
        <div class="hidden sm:flex flex-col text-left">
          <span class="text-xs font-bold text-white leading-tight truncate max-w-[110px]">
            {currentUser.username}
          </span>
          <span class="text-[9px] font-mono text-[#94A3B8] uppercase leading-tight">
            {currentUser.role === "admin" ? "Admin" : (currentUser.fplTeamName || "Spiller")}
          </span>
        </div>
        <button
          type="button"
          onclick={onLogout}
          title="Logg ut av bruker"
          class="p-1 rounded-lg text-[#94A3B8] hover:text-[#FB6F84] hover:bg-[#384252] transition-colors ml-0.5"
        >
          <LogOut class="w-3.5 h-3.5" />
        </button>
      </div>
    {:else}
      <button
        type="button"
        onclick={onLogin}
        class="px-3 py-1 rounded-xl bg-[#9FE88D] hover:bg-[#8ce078] text-[#16380c] font-bold text-xs transition-all shadow-sm flex items-center gap-1.5"
      >
        <LogIn class="w-3.5 h-3.5" />
        <span>Logg inn</span>
      </button>
    {/if}

    <!-- Tilkoblingsstatus -->
    <div
      class="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded text-xs text-[#94A3B8]"
      title={isConvexConnected
        ? "Tilkoblet Convex sanntidsdatabase"
        : "Frakoblet / Prøver å koble til..."}
    >
      <Radio
        class={`w-3.5 h-3.5 ${
          isConvexConnected ? "text-[#9FE88D] animate-pulse" : "text-[#FB6F84]"
        }`}
      />
      <span class="text-[11px] font-mono">
        {isConvexConnected ? "Live" : "Offline"}
      </span>
    </div>

    <!-- Windows Vinduskontroller (Minimer, Maksimer/Gjenopprett, Lukk) -->
    <div class="flex items-center -mr-1">
      <button
        type="button"
        onclick={handleMinimize}
        class="h-8 w-9 flex items-center justify-center hover:bg-[#384252] text-[#94A3B8] hover:text-white transition-colors"
        title="Minimer"
      >
        <Minus class="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onclick={handleToggleMaximize}
        class="h-8 w-9 flex items-center justify-center hover:bg-[#384252] text-[#94A3B8] hover:text-white transition-colors"
        title={isMaximized ? "Gjenopprett" : "Maksimer"}
      >
        {#if isMaximized}
          <Copy class="w-3 h-3 rotate-180" />
        {:else}
          <Square class="w-3 h-3" />
        {/if}
      </button>
      <button
        type="button"
        onclick={handleClose}
        class="h-8 w-9 flex items-center justify-center hover:bg-[#FB6F84] text-[#94A3B8] hover:text-white transition-colors rounded-tr-lg"
        title="Lukk"
      >
        <X class="w-4 h-4" />
      </button>
    </div>
  </div>
</header>

<style>
  @keyframes rollPast {
    0% {
      opacity: 0;
      transform: translateX(-35px) rotate(0deg) scale(0.65);
    }
    8% {
      opacity: 0.9;
      transform: translateX(-15px) rotate(160deg) scale(1);
    }
    30% {
      opacity: 0.9;
      transform: translateX(120px) rotate(720deg) scale(1);
    }
    38% {
      opacity: 0;
      transform: translateX(145px) rotate(900deg) scale(0.65);
    }
    100% {
      opacity: 0;
      transform: translateX(145px) rotate(900deg) scale(0.65);
    }
  }

  .rolling-football {
    animation: rollPast 9s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
    left: 0;
    top: 50%;
    margin-top: -10px;
  }
</style>
