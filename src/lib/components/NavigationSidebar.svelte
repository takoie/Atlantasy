<script lang="ts">
  import {
    LayoutDashboard,
    Trophy,
    Shield,
    KeyRound,
    ChevronRight,
    Sparkles,
  } from "lucide-svelte";

  let {
    rooms = [],
    selectedRoomId = null,
    activeView = "leaderboard", // "leaderboard" | "wall_of_fame" | "admin"
    currentUser = null,
    users = [],
    onSelectView = (_view: string) => {},
    onSelectRoom = (_roomId: string | null) => {},
    onOpenAdmin = () => {},
    onOpenRegister = () => {},
    onSwitchUser = (_userId: string) => {},
  }: {
    rooms?: any[];
    selectedRoomId?: string | null;
    activeView?: string;
    currentUser?: any;
    users?: any[];
    onSelectView?: (view: string) => void;
    onSelectRoom?: (roomId: string | null) => void;
    onOpenAdmin?: () => void;
    onOpenRegister?: () => void;
    onSwitchUser?: (userId: string) => void;
  } = $props();

  let isUserDropdownOpen = $state(false);
</script>

<aside
  class="w-64 shrink-0 bg-[#090d17] border-r border-slate-800/80 flex flex-col justify-between select-none overflow-hidden h-full"
>
  <!-- Toppseksjon: Hovednavigasjon -->
  <div class="flex-1 overflow-y-auto px-3 py-3 space-y-4">
    <!-- Hovedvisninger -->
    <div class="space-y-1">
      <div class="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
        Navigasjon
      </div>

      <!-- Ledertavle (Alle Rom) -->
      <button
        onclick={() => {
          onSelectRoom(null);
          onSelectView("leaderboard");
        }}
        class={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
          activeView === "leaderboard" && selectedRoomId === null
            ? "bg-gradient-to-r from-fpl-cyan/20 to-indigo-950/40 text-fpl-cyan border border-fpl-cyan/30 shadow-sm"
            : "text-slate-300 hover:text-white hover:bg-slate-800/50"
        }`}
      >
        <div class="flex items-center gap-2.5">
          <LayoutDashboard class="w-4 h-4 text-fpl-cyan" />
          <span>Ledertavle (Alle Rom)</span>
        </div>
        <span class="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 font-mono">
          12
        </span>
      </button>

      <!-- Wall of Fame -->
      <button
        onclick={() => {
          onSelectRoom(null);
          onSelectView("wall_of_fame");
        }}
        class={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
          activeView === "wall_of_fame"
            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
            : "text-slate-300 hover:text-white hover:bg-slate-800/50"
        }`}
      >
        <div class="flex items-center gap-2.5">
          <Trophy class="w-4 h-4 text-amber-400" />
          <span>Månedens Vinnere</span>
        </div>
        <Sparkles class="w-3 h-3 text-amber-400 animate-pulse" />
      </button>

      <!-- Registrer med invitasjonskode -->
      <button
        onclick={onOpenRegister}
        class="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 transition-colors"
      >
        <KeyRound class="w-4 h-4 text-indigo-400" />
        <span>Bli med (Invitasjonskode)</span>
      </button>
    </div>

    <!-- Rom 1–12 Liste -->
    <div class="space-y-1 pt-2 border-t border-slate-800/60">
      <div class="flex items-center justify-between px-2 pb-1">
        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Rommene (1–12)
        </span>
        <span class="text-[10px] text-slate-500 font-mono">Topp 2 snitt</span>
      </div>

      <div class="space-y-0.5 max-h-[380px] overflow-y-auto pr-1">
        {#each rooms as room (room._id)}
          <button
            onclick={() => {
              onSelectRoom(room._id);
              onSelectView("leaderboard");
            }}
            class={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all ${
              selectedRoomId === room._id
                ? "bg-slate-800 text-white font-semibold border border-slate-700 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
            }`}
          >
            <div class="flex items-center gap-2 truncate">
              <!-- Rom Fargeindikator -->
              <span
                class="w-2 h-2 rounded-full shrink-0"
                style={`background-color: ${room.accentColor || "#00ff87"}`}
              ></span>
              <span class="truncate text-[11px]">{room.name}</span>
            </div>

            <div class="flex items-center gap-1.5 shrink-0">
              <span class="text-[11px] font-mono font-bold text-slate-300">
                {room.liveAverage ?? "--"}
              </span>
              <ChevronRight class="w-3 h-3 text-slate-600" />
            </div>
          </button>
        {/each}
      </div>
    </div>
  </div>

  <!-- Bunnseksjon: Brukerprofil & Admin -->
  <div class="p-3 border-t border-slate-800/80 bg-slate-950/60 space-y-2">
    <!-- Admin Hurtigknapp -->
    <button
      onclick={onOpenAdmin}
      class="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg bg-indigo-950/40 border border-indigo-800/50 hover:bg-indigo-900/50 text-indigo-300 text-xs font-semibold transition-colors"
    >
      <Shield class="w-3.5 h-3.5 text-indigo-400" />
      <span>Admin Kontrollpanel</span>
    </button>

    <!-- Aktiv Bruker / Profilvelger -->
    <div class="relative">
      <button
        onclick={() => (isUserDropdownOpen = !isUserDropdownOpen)}
        class="w-full flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-slate-700 text-left transition-colors"
      >
        <div class="flex items-center gap-2.5 truncate">
          <img
            src={currentUser?.avatar || "https://api.dicebear.com/7.x/bottts/svg?seed=AtlantisUser"}
            alt="Avatar"
            class="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 shrink-0"
          />
          <div class="truncate">
            <div class="flex items-center gap-1.5 truncate">
              <span class="text-xs font-semibold text-white truncate">
                {currentUser?.username || "Gjestebruker"}
              </span>
              {#if currentUser?.role === "admin"}
                <span class="text-[9px] px-1 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60 font-bold uppercase">
                  Admin
                </span>
              {/if}
            </div>
            <p class="text-[10px] text-slate-400 truncate">
              {currentUser?.fplTeamName || "Ikke tilknyttet lag"}
            </p>
          </div>
        </div>
      </button>

      <!-- Bruker-switcher meny -->
      {#if isUserDropdownOpen}
        <div
          class="absolute bottom-full left-0 mb-1 w-full bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-1 z-50 space-y-1"
        >
          <div class="px-2 py-1 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
            Bytt aktiv profil
          </div>
          {#each users as u (u._id)}
            <button
              onclick={() => {
                onSwitchUser(u._id);
                isUserDropdownOpen = false;
              }}
              class={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs transition-colors ${
                currentUser?._id === u._id
                  ? "bg-indigo-600/30 text-indigo-200 font-semibold"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              <img src={u.avatar} alt="Avatar" class="w-5 h-5 rounded-full" />
              <span class="truncate">{u.username}</span>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</aside>
