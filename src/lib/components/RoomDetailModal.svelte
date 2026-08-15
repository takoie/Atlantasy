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

  let canEditRoom = $derived(
    currentUser?.role === "admin" || (currentUser && currentUser.roomId === room?._id)
  );

  $effect(() => {
    if (room) {
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
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 text-[#E2E8F0] font-sans">
    <div
      class="w-full max-w-2xl bg-[#2A303C] border border-[#384252] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150"
    >
      <!-- Modal Header -->
      <div class="p-5 border-b border-[#384252] bg-[#191E24] flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span
            class="w-3.5 h-3.5 rounded-full shrink-0"
            style={`background-color: ${room.accentColor || "#9FE88D"}`}
          ></span>
          <div>
            {#if !isEditingName}
              <div class="flex items-center gap-2">
                <h2 class="text-base font-bold text-white">{room.name}</h2>
                {#if canEditRoom}
                  <button
                    onclick={() => (isEditingName = true)}
                    title="Endre rommets kallenavn"
                    class="p-1 rounded hover:bg-[#242B35] text-[#94A3B8] hover:text-[#9FE88D] transition-colors"
                  >
                    <Edit2 class="w-3.5 h-3.5" />
                  </button>
                {/if}
              </div>
            {:else}
              <div class="flex items-center gap-2">
                <span class="text-sm font-bold text-[#9FE88D] font-mono">A{room.roomNumber} -</span>
                <input
                  type="text"
                  bind:value={nicknameInput}
                  onkeydown={(e) => e.key === "Enter" && handleSaveNickname()}
                  placeholder="Skriv kallenavn for rommet..."
                  class="px-2.5 py-1 text-xs rounded-lg bg-[#191E24] border border-[#9FE88D] text-white focus:outline-none w-48 font-semibold"
                />
                <button
                  onclick={handleSaveNickname}
                  class="p-1.5 rounded-lg bg-[#9FE88D] text-[#16380c] font-bold hover:bg-[#8ce078] text-xs transition-colors flex items-center gap-1"
                >
                  <Check class="w-3.5 h-3.5" />
                </button>
              </div>
            {/if}

            <p class="text-xs text-[#94A3B8] mt-0.5">
              A{room.roomNumber} • {room.description || "Offisielt liga-rom"}
              {#if !canEditRoom}
                <span class="text-[10px] text-[#94A3B8]/70 ml-1.5 inline-flex items-center gap-1">
                  <Lock class="w-2.5 h-2.5" /> Kun rom-leder kan endre navn
                </span>
              {/if}
            </p>
          </div>
        </div>

        <button
          onclick={onClose}
          class="p-1.5 rounded-lg bg-[#242B35] hover:bg-[#384252] text-[#94A3B8] hover:text-white transition-colors"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Modal Body -->
      <div class="p-5 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
        <!-- Statistikk-bannere -->
        <div class="grid grid-cols-3 gap-3">
          <div class="p-3 rounded-xl bg-[#242B35] border border-[#384252] text-center">
            <span class="text-[10px] text-[#94A3B8] font-medium uppercase tracking-wider block mb-1">
              Live romsnitt
            </span>
            <span class="text-xl font-bold text-[#9FE88D] font-mono">
              {room.liveAverage ?? "--"} <span class="text-xs text-[#94A3B8]">pts</span>
            </span>
          </div>

          <div class="p-3 rounded-xl bg-[#242B35] border border-[#384252] text-center">
            <span class="text-[10px] text-[#94A3B8] font-medium uppercase tracking-wider block mb-1">
              Sesong totalt
            </span>
            <span class="text-xl font-bold text-[#F4C152] font-mono">
              {room.seasonTotal ?? "--"} <span class="text-xs text-[#94A3B8]">pts</span>
            </span>
          </div>

          <div class="p-3 rounded-xl bg-[#242B35] border border-[#384252] text-center">
            <span class="text-[10px] text-[#94A3B8] font-medium uppercase tracking-wider block mb-1">
              Antall spillere
            </span>
            <span class="text-xl font-bold text-[#E2E8F0] font-mono">
              {room.teamCount ?? (room.teams?.length || 0)}
            </span>
          </div>
        </div>

        <!-- Spillerliste -->
        <div>
          <div class="flex items-center justify-between mb-2.5">
            <h3 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Users class="w-3.5 h-3.5 text-[#9FE88D]" />
              <span>Spillere i dette rommet ({room.teams?.length || 0})</span>
            </h3>
            <span class="text-[11px] text-[#94A3B8]">
              Topp 2 spillere danner romsnittet
            </span>
          </div>

          {#if !room.teams || room.teams.length === 0}
            <div class="p-6 text-center bg-[#242B35] rounded-xl border border-[#384252] text-[#94A3B8] text-xs">
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
                  class={`p-3 rounded-xl bg-[#242B35] border transition-all cursor-pointer group shadow-sm flex items-center justify-between gap-3 ${
                    idx < 2
                      ? "border-[#9FE88D]/40 hover:border-[#9FE88D] bg-[#242B35]"
                      : "border-[#384252] hover:border-[#4B5563]"
                  }`}
                >
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="w-7 h-7 rounded-lg bg-[#191E24] border border-[#384252] flex items-center justify-center text-xs font-bold font-mono shrink-0">
                      {#if idx === 0}
                        <span>🥇</span>
                      {:else if idx === 1}
                        <span>🥈</span>
                      {:else}
                        <span class="text-[#94A3B8]">#{idx + 1}</span>
                      {/if}
                    </div>

                    <div class="min-w-0">
                      <div class="flex items-center gap-2">
                        <h4 class="text-xs font-bold text-white group-hover:text-[#9FE88D] transition-colors truncate">{team.managerName}</h4>
                        {#if idx < 2}
                          <span class="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#9FE88D]/15 text-[#9FE88D] border border-[#9FE88D]/30 uppercase font-mono shrink-0">
                            Teller i snitt
                          </span>
                        {/if}
                      </div>
                      <p class="text-[11px] text-[#94A3B8] truncate mt-0.5">{team.teamName}</p>
                    </div>
                  </div>

                  <div class="flex items-center gap-4 text-right shrink-0">
                    <div>
                      <div class="text-sm font-bold text-[#9FE88D] font-mono leading-tight">
                        {team.effectivePoints ?? team.currentGwPoints ?? 0} pts
                      </div>
                      <div class="text-[10px] text-[#94A3B8] font-mono leading-tight mt-0.5">
                        Totalt: {team.totalPoints ?? team.total ?? "--"}p
                      </div>
                    </div>

                    {#if team.currentGwTransfersCost > 0}
                      <span class="text-[10px] text-[#FB6F84] font-mono bg-[#FB6F84]/10 px-1.5 py-0.5 rounded border border-[#FB6F84]/20 shrink-0">
                        -{team.currentGwTransfersCost}p hit
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
