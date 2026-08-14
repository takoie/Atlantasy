<script lang="ts">
  import { Shield, Sparkles, Wifi } from "lucide-svelte";

  let { isConvexConnected = true }: { isConvexConnected?: boolean } = $props();
</script>

<header class="h-12 border-b border-slate-800 bg-[#0d1322]/90 backdrop-blur flex items-center justify-between px-4 select-none shrink-0 z-30">
  <div class="flex items-center gap-3">
    <div class="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-inner shadow-indigo-500/20">
      <Sparkles class="w-4 h-4 text-indigo-400 animate-pulse" />
    </div>
    <div>
      <div class="flex items-center gap-2">
        <span class="text-sm font-semibold text-white tracking-wide">Atlantasy Desktop</span>
        <span class="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60">Tauri v2 + Svelte 5</span>
      </div>
    </div>
  </div>

  <div class="flex items-center gap-4">
    <!-- Statusindikator -->
    <div class="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-xs">
      <span class="relative flex h-2 w-2">
        {#if isConvexConnected}
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        {:else}
          <span class="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
        {/if}
      </span>
      <span class="text-slate-300 text-[11px] font-medium flex items-center gap-1">
        <Wifi class="w-3 h-3 text-slate-400" />
        {isConvexConnected ? "Sanntid tilkoblet" : "Kobler til Convex..."}
      </span>
    </div>

    <div class="hidden sm:flex items-center gap-1 text-slate-400 text-xs bg-slate-900/50 px-2 py-1 rounded border border-slate-800/50">
      <Shield class="w-3.5 h-3.5 text-indigo-400" />
      <span>Convex Cloud</span>
    </div>
  </div>
</header>
