<script lang="ts">
  import {
    Trophy,
    Users,
    Swords,
    Sparkles,
    MessageSquare,
    Crown,
    Newspaper,
    Shield,
    RefreshCw,
    Timer,
    Info,
    Shirt,
  } from "lucide-svelte";
  import { onMount, onDestroy } from "svelte";

  let {
    activeView = "leaderboard",
    currentGw = 1,
    isSyncing = false,
    isConvexConnected = true,
    currentUser = null,
    deadlineEpoch = null,
    deadlineLabel = "GW 1",
    unreadChatCount = 0,
    onSelectView = (_view: string) => {},
    onOpenAdmin = () => {},
    onRefreshFpl = () => {},
    onOpenProfile = (_entryId?: number | null) => {},
    onOpenClaimTeam = () => {},
    onCheckForUpdates = () => {},
    onOpenLicenses = () => {},
  }: {
    activeView?: string;
    currentGw?: number;
    isSyncing?: boolean;
    isConvexConnected?: boolean;
    currentUser?: any;
    deadlineEpoch?: number | null;
    deadlineLabel?: string;
    unreadChatCount?: number;
    onSelectView?: (view: string) => void;
    onOpenAdmin?: () => void;
    onRefreshFpl?: () => void;
    onOpenProfile?: (entryId?: number | null) => void;
    onOpenClaimTeam?: () => void;
    onCheckForUpdates?: () => void;
    onOpenLicenses?: () => void;
  } = $props();

  // Norsk formatering av fristtidspunkt (f.eks. "Fredag 19:30")
  let formattedDeadlineTime = $derived.by(() => {
    if (!deadlineEpoch) return "Fredag 19:30";
    const d = new Date(deadlineEpoch);
    const days = ["Søndag", "Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag"];
    const dayName = days[d.getDay()];
    const hours = String(d.getHours()).padStart(2, "0");
    const mins = String(d.getMinutes()).padStart(2, "0");
    return `${dayName} ${hours}:${mins}`;
  });

  // Sikre at GW-teksten er "GW X" og aldri engelsk
  let cleanGwLabel = $derived.by(() => {
    if (deadlineLabel && deadlineLabel.toUpperCase().includes("GW")) {
      const match = deadlineLabel.match(/GW\s*(\d+)/i);
      if (match) return `GW ${match[1]}`;
    }
    return `GW ${currentGw}`;
  });

  // Countdown timer
  let targetDeadline = $derived(
    deadlineEpoch || (Date.now() + (6 * 24 + 18) * 3600 * 1000)
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

  onMount(() => {
    updateCountdown();
    timerInterval = setInterval(updateCountdown, 1000);
  });

  onDestroy(() => {
    if (timerInterval) clearInterval(timerInterval);
  });

  const navItems = [
    {
      id: "leaderboard",
      label: "Arbeidsrom",
      sublabel: "Rom vs. rom",
      icon: Trophy,
      color: "text-[#9FE88D]",
      badge: null,
    },
    {
      id: "individual",
      label: "Alle mot alle",
      sublabel: "Alle FPL-spillere",
      icon: Users,
      color: "text-[#70E1F8]",
      badge: null,
    },
    {
      id: "cup",
      label: "Cup",
      sublabel: "",
      icon: Swords,
      color: "text-[#F4C152]",
      badge: "Cup",
    },
    {
      id: "insights",
      label: "Ligainnsikt",
      sublabel: "Benk, klatrere & chips",
      icon: Sparkles,
      color: "text-[#F4C152]",
      badge: null,
    },
    {
      id: "chat",
      label: "Chat",
      sublabel: "Banter & romprat",
      icon: MessageSquare,
      color: "text-[#9FE88D]",
      badge: "Live",
    },
    {
      id: "wall_of_fame",
      label: "Skrytevegg",
      sublabel: "Månedens vinnere",
      icon: Crown,
      color: "text-[#F4C152]",
      badge: null,
    },
    {
      id: "news",
      label: "Nyheter",
      sublabel: "Rapporter & runder",
      icon: Newspaper,
      color: "text-[#F471B5]",
      badge: null,
    },
  ];
</script>

<aside class="w-64 sm:w-72 bg-[#1c2128] border-r border-[#384252] flex flex-col justify-between select-none shrink-0 z-30 font-sans">
  <div class="p-4 space-y-4 overflow-y-auto custom-scrollbar flex-1">
    <!-- Live Deadline Countdown Banner -->
    <div class="pb-3 border-b border-[#384252]">
      <!-- Frist & Countdown Boks -->
      <div class="p-3.5 rounded-xl bg-[#242B35] border border-[#384252] space-y-2 shadow-md">
        <div class="flex items-center justify-between text-xs font-bold">
          <span class="text-[#F4C152] flex items-center gap-1.5 text-xs">
            <Timer class="w-4 h-4 text-[#F4C152] animate-pulse" />
            <span>Frist {cleanGwLabel}:</span>
          </span>
          <span class="text-white font-mono text-xs font-bold bg-[#191E24] px-2.5 py-1 rounded-lg border border-[#384252] shadow-inner">
            {formattedDeadlineTime}
          </span>
        </div>

        {#if timeLeft.isExpired}
          <div class="text-xs font-mono font-bold text-[#FB6F84] text-center bg-[#FB6F84]/10 py-1.5 rounded-lg border border-[#FB6F84]/20">
            Fristen er passert! (Spilles nå)
          </div>
        {:else}
          <div class="flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg bg-[#191E24] border border-[#384252] font-mono font-bold text-sm sm:text-base text-white shadow-inner">
            {#if timeLeft.days > 0}
              <span class="text-[#9FE88D]">{timeLeft.days}d</span>
              <span class="text-[#94A3B8] text-xs">:</span>
            {/if}
            <span class="text-white">{String(timeLeft.hours).padStart(2, "0")}t</span>
            <span class="text-[#94A3B8] text-xs">:</span>
            <span class="text-white">{String(timeLeft.minutes).padStart(2, "0")}m</span>
            <span class="text-[#94A3B8] text-xs">:</span>
            <span class="text-[#F4C152]">{String(timeLeft.seconds).padStart(2, "0")}s</span>
          </div>
        {/if}
      </div>
    </div>

    <!-- Menyliste (DaisyUI Dim Design) -->
    <nav class="space-y-1.5">
      <span class="text-xs uppercase font-bold text-[#94A3B8] px-2.5 tracking-wider block text-center">
        Meny
      </span>

      <div class="space-y-1.5 pt-1">
        {#each navItems as item}
          {@const isActive = activeView === item.id}
          <button
            onclick={() => onSelectView(item.id)}
            class={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold transition-all group ${
              isActive
                ? "bg-[#2A303C] border border-[#9FE88D]/50 text-white shadow-sm"
                : "text-[#94A3B8] hover:bg-[#2A303C]/60 hover:text-white border border-transparent"
            }`}
          >
            <div class="flex items-center gap-3.5 min-w-0">
              <div
                class={`p-2 rounded-xl transition-colors ${
                  isActive
                    ? "bg-[#9FE88D]/20 text-[#9FE88D]"
                    : "bg-[#242B35] text-[#94A3B8] group-hover:text-white"
                }`}
              >
                <item.icon class="w-4 h-4" />
              </div>

              <div class="text-left min-w-0">
                <span class="block font-bold text-sm truncate leading-tight">
                  {item.label}
                </span>
                {#if item.sublabel}
                  <span class="text-xs text-[#94A3B8] block truncate leading-tight mt-0.5">
                    {item.sublabel}
                  </span>
                {/if}
              </div>
            </div>

            <div class="flex items-center gap-2">
              {#if item.id === "chat"}
                {#if unreadChatCount > 0}
                  <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-[#FB6F84] text-white border border-[#FB6F84]/50 shadow-sm animate-pulse flex items-center gap-1">
                    <span>+{unreadChatCount > 99 ? "99" : unreadChatCount}</span>
                    <span class="hidden sm:inline text-[10px]">nye</span>
                  </span>
                {:else}
                  <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-[#9FE88D]/20 text-[#9FE88D] border border-[#9FE88D]/40">
                    Live
                  </span>
                {/if}
              {:else if item.badge}
                <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-[#9FE88D]/20 text-[#9FE88D] border border-[#9FE88D]/40">
                  {item.badge}
                </span>
              {/if}
              {#if isActive}
                <div class="w-2 h-2 rounded-full bg-[#9FE88D]"></div>
              {/if}
            </div>
          </button>
        {/each}
      </div>
    </nav>
  </div>

  <!-- Bunnseksjon: Admin, Synkronisering & Brukerstatus -->
  <div class="p-4 border-t border-[#384252] space-y-3 bg-[#191E24]">
    <!-- Handlinger -->
    <div class={`grid ${currentUser?.role === "admin" ? "grid-cols-2" : "grid-cols-1"} gap-2`}>
      <button
        onclick={onRefreshFpl}
        disabled={isSyncing}
        class="px-3 py-2.5 rounded-xl bg-[#2A303C] hover:bg-[#384252] text-[#E2E8F0] border border-[#384252] text-xs font-bold transition-colors flex items-center justify-center gap-2"
        title="Oppdater og synkroniser runderesultater fra Fantasy Premier League"
      >
        <RefreshCw class={`w-4 h-4 text-[#9FE88D] ${isSyncing ? "animate-spin" : ""}`} />
        <span>{isSyncing ? "Synker..." : "Synk FPL"}</span>
      </button>

      {#if currentUser?.role === "admin"}
        <button
          onclick={onOpenAdmin}
          class="px-3 py-2.5 rounded-xl bg-[#2A303C] hover:bg-[#384252] text-[#E2E8F0] border border-[#384252] text-xs font-bold transition-colors flex items-center justify-center gap-2"
          title="Åpne administratorpanelet"
        >
          <Shield class="w-4 h-4 text-[#F4C152]" />
          <span>Admin</span>
        </button>
      {/if}
    </div>

    <!-- Varsel/Knapp om manglende FPL-lagtilknytning -->
    {#if currentUser && !currentUser.fplEntryId}
      <button
        type="button"
        onclick={onOpenClaimTeam}
        class="w-full py-2 px-3 rounded-xl bg-[#70E1F8]/15 hover:bg-[#70E1F8]/25 border border-[#70E1F8]/40 text-[#70E1F8] text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm group"
        title="Koble ditt Fantasy Premier League lag til profilen din"
      >
        <Shirt class="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
        <span>Koble FPL-lag nå</span>
      </button>
    {/if}

    <!-- Brukerprofil & Sanntidsstatus (Snarvei til Min Profil) -->
    <button
      type="button"
      onclick={() => onOpenProfile(currentUser?.fplEntryId)}
      title="Åpne min profil, troféer og avatar-innstillinger"
      class="w-full text-left p-3 rounded-xl bg-[#2A303C] hover:bg-[#323947] border border-[#384252] hover:border-[#9FE88D]/60 transition-all flex items-center justify-between group shadow-sm focus:outline-none focus:ring-1 focus:ring-[#9FE88D]"
    >
      <div class="flex items-center gap-2.5 min-w-0">
        {#if currentUser?.avatar}
          <img
            src={currentUser.avatar}
            alt="Avatar"
            class="w-8 h-8 rounded-xl border border-[#384252] group-hover:border-[#9FE88D] object-contain bg-[#191E24] p-0.5 shrink-0 transition-colors"
          />
        {:else}
          <div class="w-8 h-8 rounded-xl bg-[#9FE88D] text-[#16380c] font-black flex items-center justify-center text-sm shrink-0 shadow-sm">
            {currentUser?.username?.charAt(0) || "U"}
          </div>
        {/if}
        <div class="min-w-0">
          <p class="text-sm font-bold text-white group-hover:text-[#9FE88D] transition-colors truncate leading-tight">
            {currentUser?.username || "Gjest"}
          </p>
          <p class="text-xs text-[#94A3B8] truncate leading-tight mt-0.5">
            {currentUser?.role === "admin" ? "Administrator" : (currentUser?.fplTeamName || "Se min profil")}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-1.5 shrink-0">
        <span
          class={`w-2.5 h-2.5 rounded-full ${
            isConvexConnected ? "bg-[#9FE88D]" : "bg-[#FB6F84]"
          }`}
          title={isConvexConnected ? "Tilkoblet Convex sanntidsdatabase" : "Frakoblet"}
        ></span>
      </div>
    </button>

    <!-- Versjon, Lisenser & Oppdateringssjekk -->
    <div class="flex items-center justify-between px-1 text-[11px] text-[#94A3B8]">
      <div class="flex items-center gap-1.5">
        <span class="font-mono text-white/80">v0.5.0</span>
        <button
          type="button"
          onclick={onOpenLicenses}
          class="text-[#94A3B8] hover:text-[#70E1F8] transition-colors p-0.5 rounded hover:bg-[#2A303C] flex items-center justify-center"
          title="Vis åpne kildekodelisenser og rettigheter (Tauri, Svelte, Convex, m.m.)"
        >
          <Info class="w-3.5 h-3.5" />
        </button>
      </div>

      <button
        type="button"
        onclick={onCheckForUpdates}
        class="text-[#94A3B8] hover:text-[#9FE88D] transition-colors flex items-center gap-1 hover:underline"
        title="Søk etter nye oppdateringer på GitHub"
      >
        <Sparkles class="w-3 h-3 text-[#F4C152]" />
        <span>Søk etter oppdatering</span>
      </button>
    </div>
  </div>
</aside>
