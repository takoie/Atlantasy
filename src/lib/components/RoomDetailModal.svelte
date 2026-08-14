<script lang="ts">
  import { X, Users } from "lucide-svelte";

  let {
    room = null,
    isOpen = false,
    deductHits: _deductHits = true,
    onClose = () => {},
  }: {
    room?: any;
    isOpen?: boolean;
    deductHits?: boolean;
    onClose?: () => void;
  } = $props();
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
            class="w-4 h-4 rounded-full"
            style={`background-color: ${room.accentColor || "#00ff87"}`}
          ></span>
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-base font-bold text-white">{room.name}</h2>
              <span class="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                Rom #{room.roomNumber}
              </span>
            </div>
            <p class="text-xs text-slate-400 mt-0.5">
              {room.description || "Offisielt liga-rom"}
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
            <span class="text-xl font-black text-white font-mono">
              {room.seasonTotal ?? "--"} <span class="text-xs text-slate-400">pts</span>
            </span>
          </div>

          <div class="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
            <span class="text-[10px] text-slate-400 font-medium uppercase tracking-wider block mb-1">
              Antall Spillere
            </span>
            <span class="text-xl font-black text-indigo-400 font-mono">
              {room.teams?.length ?? 0}
            </span>
          </div>
        </div>

        <!-- Spillerstall -->
        <div>
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
            <Users class="w-3.5 h-3.5 text-fpl-cyan" />
            <span>Spillere & Resultater</span>
          </h3>

          <div class="space-y-2">
            {#each (room.teams || []) as team, idx (team.entryId)}
              <div class="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between gap-3">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="w-6 h-6 rounded bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-400 shrink-0">
                    #{idx + 1}
                  </div>
                  <div class="min-w-0">
                    <p class="font-bold text-xs text-white truncate">{team.teamName}</p>
                    <p class="text-[11px] text-slate-400 truncate">{team.managerName} (ID: {team.entryId})</p>
                  </div>
                </div>

                <div class="text-right shrink-0">
                  <div class="font-mono font-bold text-sm text-fpl-cyan">
                    {team.effectivePoints ?? team.currentGwPoints} pts
                  </div>
                  {#if team.currentGwTransfersCost > 0}
                    <div class="text-[10px] text-rose-400">
                      -{team.currentGwTransfersCost} hits ({team.currentGwPoints} brutto)
                    </div>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="p-4 border-t border-slate-800 bg-slate-950/60 flex justify-end">
        <button
          onclick={onClose}
          class="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
        >
          Lukk
        </button>
      </div>
    </div>
  </div>
{/if}
