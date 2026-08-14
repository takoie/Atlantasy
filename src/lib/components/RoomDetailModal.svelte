<script lang="ts">
  import { X, Users, Edit2, Check, Lock } from "lucide-svelte";

  let {
    room = null,
    isOpen = false,
    currentUser = null,
    deductHits: _deductHits = true,
    onClose = () => {},
    onUpdateRoomName = (_roomId: string, _newName: string) => {},
    onOpenProfile = (_entryId: number) => {},
  }: {
    room?: any;
    isOpen?: boolean;
    currentUser?: any;
    deductHits?: boolean;
    onClose?: () => void;
    onUpdateRoomName?: (roomId: string, newName: string) => void;
    onOpenProfile?: (entryId: number) => void;
  } = $props();

  let isEditingName = $state(false);
  let nicknameInput = $state("");

  // Kun administrator eller rom-medlemmer / rom-leder kan endre navnet på rommet sitt
  let canEditRoom = $derived(
    currentUser?.role === "admin" || (currentUser && currentUser.roomId === room?._id)
  );

  $effect(() => {
    if (room) {
      // Trekk ut kallenavnet hvis det er i format "A1 - Kallenavn"
      const parts = room.name.split(" - ");
      nicknameInput = parts.length > 1 ? parts.slice(1).join(" - ") : room.name;
    }
  });

  function handleSaveNickname() {
    if (!room || !canEditRoom) return;
    const cleanNick = nicknameInput.trim();
    const finalName = cleanNick ? `A${room.roomNumber} - ${cleanNick}` : `A${room.roomNumber}`;
    onUpdateRoomName(room._id, finalName);
    isEditingName = false;
  }
</script>

{#if isOpen && room}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
    <div
      class="w-full max-w-2xl bg-slate-900 border border-slate-750 rounded-2xl shadow-soft overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150"
    >
      <!-- Modal Header -->
      <div class="p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span
            class="w-3.5 h-3.5 rounded-full shrink-0"
            style={`background-color: ${room.accentColor || "#10b981"}`}
          ></span>
          <div>
            {#if !isEditingName}
              <div class="flex items-center gap-2">
                <h2 class="text-base font-bold text-white">{room.name}</h2>
                {#if canEditRoom}
                  <button
                    onclick={() => (isEditingName = true)}
                    title="Endre rommets kallenavn"
                    class="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-emerald-400 transition-colors"
                  >
                    <Edit2 class="w-3.5 h-3.5" />
                  </button>
                {/if}
              </div>
            {:else}
              <!-- Kallenavn Redigering -->
              <div class="flex items-center gap-2">
                <span class="text-sm font-bold text-emerald-400 font-mono">A{room.roomNumber} -</span>
                <input
                  type="text"
                  bind:value={nicknameInput}
                  onkeydown={(e) => e.key === "Enter" && handleSaveNickname()}
                  placeholder="Skriv kallenavn for rommet..."
                  class="px-2.5 py-1 text-xs rounded-lg bg-slate-900 border border-emerald-500 text-white focus:outline-none w-48 font-semibold"
                />
                <button
                  onclick={handleSaveNickname}
                  class="p-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 text-xs transition-colors flex items-center gap-1"
                >
                  <Check class="w-3.5 h-3.5" />
                </button>
              </div>
            {/if}

            <p class="text-xs text-slate-400 mt-0.5">
              Rom A{room.roomNumber} • {room.description || "Offisielt liga-rom"}
              {#if !canEditRoom}
                <span class="text-[10px] text-slate-500 ml-1.5 inline-flex items-center gap-1">
                  <Lock class="w-2.5 h-2.5" /> Kun rom-leder kan endre navn
                </span>
              {/if}
            </p>
          </div>
        </div>

        <button
          onclick={onClose}
          class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Modal Body -->
      <div class="p-5 overflow-y-auto space-y-4 flex-1">
        <!-- Statistikk-bannere -->
        <div class="grid grid-cols-3 gap-3">
          <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <span class="text-[10px] text-slate-400 font-medium uppercase tracking-wider block mb-1">
              Live romsnitt
            </span>
            <span class="text-xl font-black text-emerald-400 font-mono">
              {room.liveAverage ?? "--"} <span class="text-xs text-slate-400">pts</span>
            </span>
          </div>

          <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <span class="text-[10px] text-slate-400 font-medium uppercase tracking-wider block mb-1">
              Sesong totalt
            </span>
            <span class="text-xl font-black text-amber-400 font-mono">
              {room.seasonTotal ?? "--"} <span class="text-xs text-slate-400">pts</span>
            </span>
          </div>

          <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <span class="text-[10px] text-slate-400 font-medium uppercase tracking-wider block mb-1">
              Antall spillere
            </span>
            <span class="text-xl font-black text-indigo-300 font-mono">
              {room.teamCount ?? (room.teams?.length || 0)}
            </span>
          </div>
        </div>

        <!-- Spillerliste -->
        <div>
          <h3 class="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-2">
            <Users class="w-3.5 h-3.5 text-emerald-400" />
            <span>Spillere i dette rommet</span>
          </h3>

          {#if !room.teams || room.teams.length === 0}
            <div class="p-6 text-center bg-slate-950 rounded-xl border border-slate-800 text-slate-500 text-xs">
              Ingen spillere er registrert i dette rommet enda.
            </div>
          {:else}
            <div class="space-y-2">
              {#each room.teams as team, idx (team.entryId)}
                <div
                  role="button"
                  tabindex="0"
                  onclick={() => onOpenProfile(team.entryId)}
                  onkeydown={(e) => (e.key === "Enter" || e.key === " ") && onOpenProfile(team.entryId)}
                  class="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between hover:border-emerald-500/50 hover:bg-slate-900 transition-all cursor-pointer group"
                >
                  <div class="flex items-center gap-3">
                    <div class="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400 font-mono">
                      #{idx + 1}
                    </div>
                    <div>
                      <h4 class="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">{team.teamName}</h4>
                      <p class="text-[11px] text-slate-400">{team.managerName}</p>
                    </div>
                  </div>

                  <div class="text-right">
                    <span class="text-sm font-black text-emerald-400 font-mono">
                      {team.effectivePoints} pts
                    </span>
                    {#if team.currentGwTransfersCost > 0}
                      <span class="text-[10px] text-rose-400 block font-mono">
                        -{team.currentGwTransfersCost} hits
                      </span>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}
