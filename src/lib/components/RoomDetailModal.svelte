<script lang="ts">
  import { X, Users, Edit2, Check } from "lucide-svelte";

  let {
    room = null,
    isOpen = false,
    deductHits: _deductHits = true,
    onClose = () => {},
    onUpdateRoomName = (_roomId: string, _newName: string) => {},
  }: {
    room?: any;
    isOpen?: boolean;
    deductHits?: boolean;
    onClose?: () => void;
    onUpdateRoomName?: (roomId: string, newName: string) => void;
  } = $props();

  let isEditingName = $state(false);
  let nicknameInput = $state("");

  $effect(() => {
    if (room) {
      // Trekk ut kallenavnet hvis det er i format "A1 - Kallenavn"
      const parts = room.name.split(" - ");
      nicknameInput = parts.length > 1 ? parts.slice(1).join(" - ") : room.name;
    }
  });

  function handleSaveNickname() {
    if (!room) return;
    const cleanNick = nicknameInput.trim();
    const finalName = cleanNick ? `A${room.roomNumber} - ${cleanNick}` : `A${room.roomNumber}`;
    onUpdateRoomName(room._id, finalName);
    isEditingName = false;
  }
</script>

{#if isOpen && room}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
    <div
      class="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-150"
    >
      <!-- Modal Header -->
      <div class="p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span
            class="w-4 h-4 rounded-full shrink-0"
            style={`background-color: ${room.accentColor || "#00ff87"}`}
          ></span>
          <div>
            {#if !isEditingName}
              <div class="flex items-center gap-2">
                <h2 class="text-base font-bold text-white">{room.name}</h2>
                <button
                  onclick={() => (isEditingName = true)}
                  title="Endre rommets kallenavn"
                  class="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-fpl-cyan transition-colors"
                >
                  <Edit2 class="w-3.5 h-3.5" />
                </button>
              </div>
            {:else}
              <!-- Kallenavn Redigering -->
              <div class="flex items-center gap-2">
                <span class="text-sm font-bold text-fpl-cyan font-mono">A{room.roomNumber} -</span>
                <input
                  type="text"
                  bind:value={nicknameInput}
                  onkeydown={(e) => e.key === "Enter" && handleSaveNickname()}
                  placeholder="Skriv kallenavn for rommet..."
                  class="px-2.5 py-1 text-xs rounded-lg bg-slate-950 border border-fpl-cyan text-white focus:outline-none w-48 font-semibold"
                />
                <button
                  onclick={handleSaveNickname}
                  class="p-1.5 rounded-lg bg-fpl-cyan text-slate-950 font-bold hover:bg-emerald-400 text-xs transition-colors flex items-center gap-1"
                >
                  <Check class="w-3.5 h-3.5" />
                </button>
              </div>
            {/if}

            <p class="text-xs text-slate-400 mt-0.5">
              Rom {room.roomNumber} • {room.description || "Offisielt liga-rom"}
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
          <div class="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
            <span class="text-[10px] text-slate-400 font-medium uppercase tracking-wider block mb-1">
              Live Rom-snitt
            </span>
            <span class="text-xl font-black text-fpl-cyan font-mono">
              {room.liveAverage ?? "--"} <span class="text-xs text-slate-400">pts</span>
            </span>
          </div>

          <div class="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
            <span class="text-[10px] text-slate-400 font-medium uppercase tracking-wider block mb-1">
              Sesong Totalt
            </span>
            <span class="text-xl font-black text-amber-400 font-mono">
              {room.seasonTotal ?? "--"} <span class="text-xs text-slate-400">pts</span>
            </span>
          </div>

          <div class="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
            <span class="text-[10px] text-slate-400 font-medium uppercase tracking-wider block mb-1">
              Antall Spillere
            </span>
            <span class="text-xl font-black text-indigo-300 font-mono">
              {room.teamCount ?? (room.teams?.length || 0)}
            </span>
          </div>
        </div>

        <!-- Spillerliste -->
        <div>
          <h3 class="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-2">
            <Users class="w-3.5 h-3.5 text-fpl-cyan" />
            <span>Spillere i dette rommet</span>
          </h3>

          {#if !room.teams || room.teams.length === 0}
            <div class="p-6 text-center bg-slate-950/40 rounded-xl border border-slate-800 text-slate-500 text-xs">
              Ingen spillere er registrert i dette rommet enda.
            </div>
          {:else}
            <div class="space-y-2">
              {#each room.teams as team, idx (team.entryId)}
                <div
                  class="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between hover:border-slate-700 transition-colors"
                >
                  <div class="flex items-center gap-3">
                    <div class="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400 font-mono">
                      #{idx + 1}
                    </div>
                    <div>
                      <h4 class="text-xs font-bold text-white">{team.teamName}</h4>
                      <p class="text-[11px] text-slate-400">{team.managerName}</p>
                    </div>
                  </div>

                  <div class="text-right">
                    <span class="text-sm font-black text-fpl-cyan font-mono">
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
