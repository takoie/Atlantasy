<script lang="ts">
  import {
    X,
    Trophy,
    Crown,
    Shield,
    Users,
    Sparkles,
    Calendar,
    Flame,
    CheckCircle2,
    Clock,
    AlertCircle,
  } from "lucide-svelte";
  import { useQuery, useMutation } from "$lib/convex.svelte";
  import { api } from "../../../../convex/_generated/api";

  let {
    match = null,
    isOpen = false,
    currentUser = null,
    onClose = () => {},
    onAdvanceMatch = (_matchId: string, _winnerRoomId: string) => {},
    onOpenProfile = (_entryId: number) => {},
  }: {
    match: any;
    isOpen: boolean;
    currentUser?: any;
    onClose: () => void;
    onAdvanceMatch?: (matchId: string, winnerRoomId: string) => void;
    onOpenProfile?: (entryId: number) => void;
  } = $props();

  const allTeamsQuery = useQuery(api.rooms.getAllFplTeams);
  let allTeams = $derived(allTeamsQuery.data ?? []);

  let isAdmin = $derived(currentUser?.role === "admin");

  let room1Teams = $derived(
    match?.room1Id ? allTeams.filter((t) => t.roomId === match.room1Id) : []
  );

  let room2Teams = $derived(
    match?.room2Id ? allTeams.filter((t) => t.roomId === match.room2Id) : []
  );

  let isRoom1Winner = $derived(
    match?.winnerRoomId && match?.room1Id && match.winnerRoomId === match.room1Id
  );
  let isRoom2Winner = $derived(
    match?.winnerRoomId && match?.room2Id && match.winnerRoomId === match.room2Id
  );
</script>

{#if isOpen && match}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 text-[#E2E8F0] font-sans"
    role="dialog"
    aria-modal="true"
  >
    <!-- Modal Container -->
    <div
      class="w-full max-w-4xl max-h-[90vh] bg-[#2A303C] border border-[#384252] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
    >
      <!-- Header -->
      <div class="px-5 py-4 border-b border-[#384252] bg-[#191E24] flex items-center justify-between shrink-0">
        <div class="flex items-center gap-3">
          <div
            class={`p-2.5 rounded-xl border ${
              match.bracketType === "grand_final"
                ? "bg-[#F4C152]/15 text-[#F4C152] border-[#F4C152]/30"
                : match.bracketType === "losers"
                ? "bg-[#FB6F84]/15 text-[#FB6F84] border-[#FB6F84]/30"
                : "bg-[#9FE88D]/15 text-[#9FE88D] border-[#9FE88D]/30"
            }`}
          >
            <Trophy class="w-5 h-5" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-base font-bold text-white">
                {match.roundTitle || "Cup-oppgjør"}
              </h2>
              <span
                class={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                  match.status === "completed"
                    ? "bg-[#9FE88D]/15 text-[#9FE88D] border-[#9FE88D]/30"
                    : match.status === "live"
                    ? "bg-[#70E1F8]/15 text-[#70E1F8] border-[#70E1F8]/30 animate-pulse"
                    : "bg-[#384252]/50 text-[#94A3B8] border-[#384252]"
                }`}
              >
                {match.status === "completed"
                  ? "Fullført"
                  : match.status === "live"
                  ? "Pågår nå (Live)"
                  : "Kommende"}
              </span>
            </div>
            <p class="text-xs text-[#94A3B8] flex items-center gap-2 mt-0.5">
              <span class="flex items-center gap-1">
                <Calendar class="w-3.5 h-3.5 text-[#F4C152]" />
                <span>Gameweek {match.gameweek}</span>
              </span>
              <span>•</span>
              <span>Snitt av de 2 beste spillerne avgjør vinneren</span>
            </p>
          </div>
        </div>

        <button
          onclick={onClose}
          class="p-2 rounded-xl bg-[#242B35] hover:bg-[#384252] text-[#94A3B8] hover:text-white transition-colors border border-[#384252]"
          aria-label="Lukk"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Innhold med H2H sammenligning -->
      <div class="p-5 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
        <!-- Romsnitt H2H Scoreboard Plakat -->
        <div class="grid grid-cols-1 md:grid-cols-11 gap-3 items-center bg-[#191E24] p-4 sm:p-5 rounded-2xl border border-[#384252] shadow-inner">
          <!-- Rom 1 -->
          <div
            class={`md:col-span-5 p-4 rounded-xl border transition-all ${
              isRoom1Winner
                ? "bg-[#9FE88D]/10 border-[#9FE88D]/50 shadow-md ring-1 ring-[#9FE88D]/30"
                : "bg-[#242B35] border-[#384252]"
            }`}
          >
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2.5">
                <div
                  class="w-8 h-8 rounded-xl font-black text-sm flex items-center justify-center border border-white/20 text-white shadow-sm"
                  style={`background-color: ${match.room1?.accentColor || "#1eb854"}`}
                >
                  {match.room1?.name?.substring(0, 3) || "R1"}
                </div>
                <div>
                  <h3 class="font-bold text-white text-base">
                    {match.room1?.name || "TBD (Avventer kamp)"}
                  </h3>
                  <span class="text-[11px] text-[#94A3B8]">
                    {room1Teams.length} spillere i rommet
                  </span>
                </div>
              </div>

              {#if isRoom1Winner}
                <span class="text-xs font-bold px-2 py-0.5 rounded-md bg-[#9FE88D]/20 text-[#9FE88D] border border-[#9FE88D]/40 flex items-center gap-1">
                  <Crown class="w-3 h-3" />
                  <span>Vinner</span>
                </span>
              {/if}
            </div>

            <div class="mt-3 pt-3 border-t border-[#384252]/60 flex items-baseline justify-between">
              <span class="text-xs text-[#94A3B8] uppercase font-bold tracking-wider">
                Gjennomsnitt (Topp 2):
              </span>
              <span
                class={`text-2xl font-black font-mono ${
                  isRoom1Winner ? "text-[#9FE88D]" : "text-white"
                }`}
              >
                {match.room1Score !== undefined ? `${match.room1Score} pts` : "-"}
              </span>
            </div>
          </div>

          <!-- VS Skillemerke -->
          <div class="md:col-span-1 flex flex-col items-center justify-center py-2">
            <span class="text-xs font-black text-[#F4C152] bg-[#242B35] px-2.5 py-1 rounded-full border border-[#384252] shadow-sm">
              VS
            </span>
          </div>

          <!-- Rom 2 -->
          <div
            class={`md:col-span-5 p-4 rounded-xl border transition-all ${
              isRoom2Winner
                ? "bg-[#9FE88D]/10 border-[#9FE88D]/50 shadow-md ring-1 ring-[#9FE88D]/30"
                : "bg-[#242B35] border-[#384252]"
            }`}
          >
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2.5">
                <div
                  class="w-8 h-8 rounded-xl font-black text-sm flex items-center justify-center border border-white/20 text-white shadow-sm"
                  style={`background-color: ${match.room2?.accentColor || "#38bdf8"}`}
                >
                  {match.room2?.name?.substring(0, 3) || "R2"}
                </div>
                <div>
                  <h3 class="font-bold text-white text-base">
                    {match.room2?.name || "TBD (Avventer kamp)"}
                  </h3>
                  <span class="text-[11px] text-[#94A3B8]">
                    {room2Teams.length} spillere i rommet
                  </span>
                </div>
              </div>

              {#if isRoom2Winner}
                <span class="text-xs font-bold px-2 py-0.5 rounded-md bg-[#9FE88D]/20 text-[#9FE88D] border border-[#9FE88D]/40 flex items-center gap-1">
                  <Crown class="w-3 h-3" />
                  <span>Vinner</span>
                </span>
              {/if}
            </div>

            <div class="mt-3 pt-3 border-t border-[#384252]/60 flex items-baseline justify-between">
              <span class="text-xs text-[#94A3B8] uppercase font-bold tracking-wider">
                Gjennomsnitt (Topp 2):
              </span>
              <span
                class={`text-2xl font-black font-mono ${
                  isRoom2Winner ? "text-[#9FE88D]" : "text-white"
                }`}
              >
                {match.room2Score !== undefined ? `${match.room2Score} pts` : "-"}
              </span>
            </div>
          </div>
        </div>

        <!-- Topp 2 Bidragsytere som telte for snittet -->
        {#if match.room1TopPlayers || match.room2TopPlayers}
          <div class="space-y-3">
            <div class="flex items-center gap-2">
              <Sparkles class="w-4 h-4 text-[#F4C152]" />
              <h4 class="text-xs font-bold uppercase tracking-wider text-white">
                Tellende Topp 2-spillere for denne runden
              </h4>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Rom 1 Toppspillere -->
              <div class="bg-[#191E24] p-3.5 rounded-xl border border-[#384252] space-y-2">
                <span class="text-xs font-bold text-[#94A3B8] block mb-1">
                  {match.room1?.name || "Rom 1"}:
                </span>
                {#if match.room1TopPlayers && match.room1TopPlayers.length > 0}
                  {#each match.room1TopPlayers as player, i}
                    <button
                      type="button"
                      class="w-full p-2.5 rounded-lg bg-[#242B35] border border-[#384252] flex items-center justify-between cursor-pointer hover:border-[#9FE88D]/50 transition-colors text-left"
                      onclick={() => onOpenProfile(player.entryId)}
                    >
                      <div class="flex items-center gap-2 min-w-0">
                        <span class="text-xs font-bold text-[#F4C152] bg-[#F4C152]/10 px-2 py-0.5 rounded">
                          #{i + 1}
                        </span>
                        <span class="text-xs font-bold text-white truncate">
                          {player.name}
                        </span>
                      </div>
                      <div class="flex items-center gap-2">
                        {#if player.hits && player.hits > 0}
                          <span class="text-[10px] text-[#FB6F84] font-mono font-bold">
                            (-{player.hits})
                          </span>
                        {/if}
                        <span class="text-xs font-mono font-bold text-[#9FE88D] bg-[#191E24] px-2 py-0.5 rounded border border-[#384252]">
                          {player.points} pts
                        </span>
                      </div>
                    </button>
                  {/each}
                {:else}
                  <p class="text-xs text-[#94A3B8] italic">Ingen registrerte poeng ennå for denne runden.</p>
                {/if}
              </div>

              <!-- Rom 2 Toppspillere -->
              <div class="bg-[#191E24] p-3.5 rounded-xl border border-[#384252] space-y-2">
                <span class="text-xs font-bold text-[#94A3B8] block mb-1">
                  {match.room2?.name || "Rom 2"}:
                </span>
                {#if match.room2TopPlayers && match.room2TopPlayers.length > 0}
                  {#each match.room2TopPlayers as player, i}
                    <button
                      type="button"
                      class="w-full p-2.5 rounded-lg bg-[#242B35] border border-[#384252] flex items-center justify-between cursor-pointer hover:border-[#9FE88D]/50 transition-colors text-left"
                      onclick={() => onOpenProfile(player.entryId)}
                    >
                      <div class="flex items-center gap-2 min-w-0">
                        <span class="text-xs font-bold text-[#F4C152] bg-[#F4C152]/10 px-2 py-0.5 rounded">
                          #{i + 1}
                        </span>
                        <span class="text-xs font-bold text-white truncate">
                          {player.name}
                        </span>
                      </div>
                      <div class="flex items-center gap-2">
                        {#if player.hits && player.hits > 0}
                          <span class="text-[10px] text-[#FB6F84] font-mono font-bold">
                            (-{player.hits})
                          </span>
                        {/if}
                        <span class="text-xs font-mono font-bold text-[#9FE88D] bg-[#191E24] px-2 py-0.5 rounded border border-[#384252]">
                          {player.points} pts
                        </span>
                      </div>
                    </button>
                  {/each}
                {:else}
                  <p class="text-xs text-[#94A3B8] italic">Ingen registrerte poeng ennå for denne runden.</p>
                {/if}
              </div>
            </div>
          </div>
        {/if}

        <!-- Spillerlister per rom -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Rom 1 Full Spillerstall -->
          <div class="space-y-2">
            <h4 class="text-xs font-bold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
              <Users class="w-3.5 h-3.5" />
              <span>Spillerstall {match.room1?.name || "Rom 1"}</span>
            </h4>
            <div class="bg-[#191E24] rounded-xl border border-[#384252] p-2 space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
              {#if room1Teams.length > 0}
                {#each room1Teams as t}
                  <button
                    type="button"
                    class="w-full p-2 rounded-lg bg-[#242B35] border border-[#384252]/60 flex items-center justify-between text-xs hover:border-[#9FE88D]/40 cursor-pointer transition-colors text-left"
                    onclick={() => onOpenProfile(t.entryId)}
                  >
                    <div class="min-w-0">
                      <p class="font-bold text-white truncate">{t.managerName}</p>
                      <p class="text-[11px] text-[#94A3B8] truncate">{t.teamName}</p>
                    </div>
                    <span class="font-mono text-xs font-bold text-[#E2E8F0]">
                      {t.currentGwPoints || 0} pts
                    </span>
                  </button>
                {/each}
              {:else}
                <p class="text-xs text-[#94A3B8] p-2 text-center">Ingen spillere funnet.</p>
              {/if}
            </div>
          </div>

          <!-- Rom 2 Full Spillerstall -->
          <div class="space-y-2">
            <h4 class="text-xs font-bold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
              <Users class="w-3.5 h-3.5" />
              <span>Spillerstall {match.room2?.name || "Rom 2"}</span>
            </h4>
            <div class="bg-[#191E24] rounded-xl border border-[#384252] p-2 space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
              {#if room2Teams.length > 0}
                {#each room2Teams as t}
                  <button
                    type="button"
                    class="w-full p-2 rounded-lg bg-[#242B35] border border-[#384252]/60 flex items-center justify-between text-xs hover:border-[#9FE88D]/40 cursor-pointer transition-colors text-left"
                    onclick={() => onOpenProfile(t.entryId)}
                  >
                    <div class="min-w-0">
                      <p class="font-bold text-white truncate">{t.managerName}</p>
                      <p class="text-[11px] text-[#94A3B8] truncate">{t.teamName}</p>
                    </div>
                    <span class="font-mono text-xs font-bold text-[#E2E8F0]">
                      {t.currentGwPoints || 0} pts
                    </span>
                  </button>
                {/each}
              {:else}
                <p class="text-xs text-[#94A3B8] p-2 text-center">Ingen spillere funnet.</p>
              {/if}
            </div>
          </div>
        </div>

        <!-- Admin Hurtig-overstyring (Hvem vant?) -->
        {#if isAdmin && match.room1Id && match.room2Id}
          <div class="p-4 rounded-xl bg-[#242B35] border border-[#F4C152]/30 space-y-3">
            <div class="flex items-center gap-2">
              <Shield class="w-4 h-4 text-[#F4C152]" />
              <h4 class="text-xs font-bold uppercase tracking-wider text-[#F4C152]">
                Admin Manuell Overstyring
              </h4>
            </div>
            <p class="text-xs text-[#94A3B8]">
              Dersom du ønsker å manuelt sette et rom som vinner og sende dem videre i turneringstreet umiddelbart:
            </p>
            <div class="grid grid-cols-2 gap-2">
              <button
                onclick={() => onAdvanceMatch(match._id, match.room1Id)}
                class="px-3 py-2 rounded-xl bg-[#191E24] hover:bg-[#9FE88D]/20 text-[#9FE88D] border border-[#9FE88D]/40 text-xs font-bold transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 class="w-4 h-4" />
                <span>Kår {match.room1?.name} som Vinner</span>
              </button>
              <button
                onclick={() => onAdvanceMatch(match._id, match.room2Id)}
                class="px-3 py-2 rounded-xl bg-[#191E24] hover:bg-[#9FE88D]/20 text-[#9FE88D] border border-[#9FE88D]/40 text-xs font-bold transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 class="w-4 h-4" />
                <span>Kår {match.room2?.name} som Vinner</span>
              </button>
            </div>
          </div>
        {/if}
      </div>

      <!-- Footer -->
      <div class="px-5 py-3 border-t border-[#384252] bg-[#191E24] flex items-center justify-end">
        <button
          onclick={onClose}
          class="px-4 py-2 rounded-xl bg-[#242B35] hover:bg-[#384252] text-[#E2E8F0] border border-[#384252] text-xs font-bold transition-colors"
        >
          Lukk detaljer
        </button>
      </div>
    </div>
  </div>
{/if}
