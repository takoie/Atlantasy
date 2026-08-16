<script lang="ts">
  import {
    Sparkles,
    Download,
    RefreshCw,
    CheckCircle2,
    AlertCircle,
    X,
    Clock,
    ArrowUpRight,
    ExternalLink,
    LogOut,
  } from "lucide-svelte";
  import { onMount } from "svelte";
  import { check, type Update } from "@tauri-apps/plugin-updater";
  import { relaunch, exit } from "@tauri-apps/plugin-process";

  let {
    isOpen = $bindable(false),
    currentVersion = "0.6.2",
    autoCheck = true,
  }: {
    isOpen?: boolean;
    currentVersion?: string;
    autoCheck?: boolean;
  } = $props();

  let isTauriEnv = $state(false);
  let isChecking = $state(false);
  let updateObj = $state<any>(null);
  let rawUpdateInstance = $state<Update | null>(null);
  let status = $state<"idle" | "available" | "downloading" | "installing" | "ready" | "manual_download" | "up_to_date" | "error">("idle");
  let errorMessage = $state("");
  let downloadedBytes = $state(0);
  let totalBytes = $state(0);

  let formattedTargetVersion = $derived.by(() => {
    if (!updateObj?.version) return "";
    return updateObj.version.startsWith("v") ? updateObj.version : `v${updateObj.version}`;
  });

  let formattedCurrentVersion = $derived.by(() => {
    return currentVersion.startsWith("v") ? currentVersion : `v${currentVersion}`;
  });

  let progressPercent = $derived.by(() => {
    if (totalBytes <= 0) return 0;
    return Math.min(100, Math.round((downloadedBytes / totalBytes) * 100));
  });

  let formattedProgress = $derived.by(() => {
    const dMb = (downloadedBytes / (1024 * 1024)).toFixed(1);
    const tMb = (totalBytes / (1024 * 1024)).toFixed(1);
    if (totalBytes > 0) {
      return `${dMb} MB / ${tMb} MB (${progressPercent}%)`;
    }
    return `${dMb} MB`;
  });

  export async function checkForUpdates(manual = false) {
    if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
      if (manual) {
        status = "error";
        errorMessage = "Oppdateringssjekk støttes kun i desktop-appen.";
        isOpen = true;
      }
      return;
    }

    isChecking = true;
    errorMessage = "";
    if (manual) {
      status = "idle";
      isOpen = true;
    }

    try {
      // 1. Sjekk via Tauri v2 updater plugin (hvis signert pakke finnes)
      try {
        const update = await check();
        if (update) {
          rawUpdateInstance = update;
          updateObj = {
            version: update.version,
            body: update.body,
            date: update.date,
          };
          status = "available";
          isOpen = true;
          return;
        }
      } catch (tauriErr) {
        console.warn("Tauri updater plugin feilet, prøver direkte GitHub API:", tauriErr);
      }

      // 2. Fallback: Sjekk direkte mot GitHub Releases API
      const res = await fetch("https://api.github.com/repos/takoie/Atlantasy/releases/latest", {
        headers: { Accept: "application/vnd.github.v3+json" },
      });

      if (res.ok) {
        const release = await res.json();
        const latestTag = (release.tag_name || "").replace(/^v/, "").trim();
        const currentClean = currentVersion.replace(/^v/, "").trim();

        // Sammenlign versjonsnumre (f.eks. 0.6.1 > 0.6.0)
        const isNewer = latestTag && latestTag !== currentClean;

        if (isNewer) {
          const exeAsset = (release.assets || []).find((a: any) =>
            a.name.toLowerCase().endsWith(".exe")
          );
          rawUpdateInstance = null;
          updateObj = {
            version: release.tag_name,
            body: release.body,
            date: release.published_at,
            downloadUrl: exeAsset?.browser_download_url || release.html_url,
            fileName: exeAsset?.name || "Atlantasy-setup.exe",
            htmlUrl: release.html_url,
          };
          status = "available";
          isOpen = true;
        } else {
          if (manual) {
            status = "up_to_date";
            isOpen = true;
          } else {
            status = "idle";
          }
        }
      } else {
        throw new Error(`GitHub returnerte HTTP status ${res.status}`);
      }
    } catch (err: any) {
      console.warn("Kunne ikke sjekke etter oppdateringer:", err);
      if (manual) {
        status = "error";
        errorMessage = "Kunne ikke kontakte GitHub for å hente oppdateringsinformasjon. Vennligst sjekk internettforbindelsen din.";
        isOpen = true;
      }
    } finally {
      isChecking = false;
    }
  }

  async function startDownloadAndInstall() {
    errorMessage = "";

    try {
      if (rawUpdateInstance) {
        // Offisiell Tauri updater in-app silent download & install med progress
        status = "downloading";
        downloadedBytes = 0;
        totalBytes = 0;

        await rawUpdateInstance.downloadAndInstall((event) => {
          if (event.event === "Started") {
            totalBytes = event.data.contentLength || 0;
            downloadedBytes = 0;
          } else if (event.event === "Progress") {
            downloadedBytes += event.data.chunkLength;
          } else if (event.event === "Finished") {
            status = "ready";
          }
        });
        status = "ready";
      } else if (updateObj?.downloadUrl) {
        // Fallback: Last ned installasjonsprogram direkte via nettleser
        window.open(updateObj.downloadUrl, "_blank");
        status = "manual_download";
      } else {
        throw new Error("Ingen nedlastingskilde tilgjengelig.");
      }
    } catch (err: any) {
      console.error("Feil ved nedlasting/installering:", err);
      status = "error";
      errorMessage = err?.message || String(err) || "Feil oppsto under nedlasting eller signaturverifisering.";
    }
  }

  async function triggerRelaunch() {
    try {
      await relaunch();
    } catch (err: any) {
      console.error("Kunne ikke restarte app via relaunch():", err);
      window.location.reload();
    }
  }

  async function exitApp() {
    try {
      await exit(0);
    } catch {
      window.close();
    }
  }

  function closeModal() {
    isOpen = false;
    if (status === "up_to_date" || status === "error" || status === "manual_download") {
      status = "idle";
    }
  }

  onMount(() => {
    isTauriEnv = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
    if (autoCheck && isTauriEnv) {
      setTimeout(() => {
        checkForUpdates(false);
      }, 4000);
    }
  });
</script>

{#if isOpen}
  <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
    <div
      class="bg-[#242B35] border border-[#384252] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 font-sans text-[#E2E8F0] flex flex-col"
    >
      <!-- Header -->
      <div class="p-6 bg-[#191E24] border-b border-[#384252] flex items-start justify-between gap-4">
        <div class="flex items-center gap-3.5">
          <div class="w-12 h-12 rounded-2xl bg-[#9FE88D]/20 border border-[#9FE88D]/40 text-[#9FE88D] flex items-center justify-center shadow-inner shrink-0">
            {#if status === "ready"}
              <CheckCircle2 class="w-6 h-6 text-[#9FE88D]" />
            {:else if status === "manual_download"}
              <Download class="w-6 h-6 text-[#70E1F8]" />
            {:else if status === "error"}
              <AlertCircle class="w-6 h-6 text-[#FB6F84]" />
            {:else if status === "downloading" || status === "installing"}
              <RefreshCw class="w-6 h-6 text-[#70E1F8] animate-spin" />
            {:else if status === "up_to_date"}
              <CheckCircle2 class="w-6 h-6 text-[#9FE88D]" />
            {:else}
              <Sparkles class="w-6 h-6 text-[#F4C152]" />
            {/if}
          </div>

          <div>
            <h3 class="text-lg font-black text-white leading-tight">
              {#if status === "ready"}
                Oppdatering er klar!
              {:else if status === "manual_download"}
                Installasjonsfil lastes ned
              {:else if status === "downloading"}
                Laster ned oppdatering...
              {:else if status === "installing"}
                Installerer oppdatering...
              {:else if status === "up_to_date"}
                Du har nyeste versjon
              {:else if status === "error"}
                Oppdateringsfeil
              {:else}
                Ny versjon tilgjengelig!
              {/if}
            </h3>
            <p class="text-xs text-[#94A3B8] mt-0.5">
              {#if status === "available" && updateObj}
                Versjon {formattedTargetVersion} er nå tilgjengelig på GitHub
              {:else if status === "manual_download"}
                Kjør installasjonsfilen for å fullføre oppgraderingen
              {:else if status === "downloading" || status === "installing"}
                Vennligst vent mens filene klargjøres
              {:else if status === "up_to_date"}
                Atlantasy {formattedCurrentVersion} er fullt oppdatert
              {:else}
                Automatisk oppdateringssystem
              {/if}
            </p>
          </div>
        </div>

        {#if status !== "downloading" && status !== "installing"}
          <button
            onclick={closeModal}
            class="p-2 rounded-xl text-[#94A3B8] hover:text-white hover:bg-[#2A303C] transition-colors"
            title="Lukk"
          >
            <X class="w-5 h-5" />
          </button>
        {/if}
      </div>

      <!-- Innhold -->
      <div class="p-6 space-y-5 flex-1 overflow-y-auto custom-scrollbar">
        {#if status === "available" && updateObj}
          <!-- Versjonssammenligning -->
          <div class="flex items-center justify-between p-3.5 rounded-2xl bg-[#191E24] border border-[#384252]">
            <div>
              <span class="text-[11px] text-[#94A3B8] font-bold uppercase block">Nåværende</span>
              <span class="text-sm font-mono font-bold text-[#94A3B8]">{formattedCurrentVersion}</span>
            </div>

            <div class="w-8 h-8 rounded-full bg-[#2A303C] flex items-center justify-center text-[#9FE88D]">
              <ArrowUpRight class="w-4 h-4" />
            </div>

            <div class="text-right">
              <span class="text-[11px] text-[#9FE88D] font-bold uppercase block">Ny versjon</span>
              <span class="text-sm font-mono font-bold text-white bg-[#9FE88D]/20 px-2 py-0.5 rounded-lg border border-[#9FE88D]/40">
                {formattedTargetVersion}
              </span>
            </div>
          </div>

          <!-- Release Notes -->
          <div class="space-y-2">
            <div class="flex items-center justify-between text-xs font-bold text-white">
              <span>Hva er nytt i denne oppdateringen:</span>
              {#if updateObj.date}
                <span class="text-[11px] text-[#94A3B8] flex items-center gap-1 font-normal">
                  <Clock class="w-3 h-3" />
                  <span>{new Date(updateObj.date).toLocaleDateString("no-NO")}</span>
                </span>
              {/if}
            </div>

            <div class="p-4 rounded-2xl bg-[#191E24] border border-[#384252] text-xs text-[#E2E8F0] leading-relaxed max-h-48 overflow-y-auto custom-scrollbar space-y-2 font-sans">
              {#if updateObj.body}
                <div class="whitespace-pre-wrap">{updateObj.body}</div>
              {:else}
                <p class="text-[#94A3B8] italic">Mindre feilrettinger, sikkerhetsoptimaliseringer og ytelsesforbedringer.</p>
              {/if}
            </div>
          </div>
        {:else if status === "manual_download"}
          <!-- Instruksjoner for manuell installasjon -->
          <div class="space-y-4">
            <div class="p-4 rounded-2xl bg-[#70E1F8]/10 border border-[#70E1F8]/30 space-y-3">
              <div class="flex items-center gap-2 text-[#70E1F8] font-bold text-sm">
                <Download class="w-4 h-4" />
                <span>Installasjonsfilen lastes ned nå</span>
              </div>
              <p class="text-xs text-[#E2E8F0] leading-relaxed">
                Nettleseren din laster nå ned <strong class="text-white font-mono">{updateObj?.fileName || "Atlantasy-setup.exe"}</strong>.
              </p>
              <div class="p-3 rounded-xl bg-[#191E24] border border-[#384252] text-xs space-y-2">
                <p class="font-bold text-white">Følg disse to stegene:</p>
                <ol class="list-decimal list-inside space-y-1 text-[#94A3B8]">
                  <li>Lukk Atlantasy (bruk knappen under).</li>
                  <li>Kjør den nedlastede installasjonsfilen fra nedlastingsmappen din for å fullføre oppdateringen til <strong class="text-[#9FE88D]">{formattedTargetVersion}</strong>.</li>
                </ol>
              </div>
            </div>
          </div>
        {:else if status === "downloading" || status === "installing"}
          <!-- Nedlastingsfremdrift -->
          <div class="space-y-4 py-4 text-center">
            <div class="space-y-2">
              <div class="flex items-center justify-between text-xs font-mono font-bold">
                <span class="text-[#70E1F8]">
                  {status === "downloading" ? "Laster ned..." : "Verifiserer og installerer..."}
                </span>
                <span class="text-white">{formattedProgress}</span>
              </div>

              <!-- Fremdriftslinje -->
              <div class="w-full h-3.5 rounded-full bg-[#191E24] border border-[#384252] overflow-hidden p-0.5 shadow-inner">
                <div
                  class="h-full rounded-full bg-gradient-to-r from-[#70E1F8] to-[#9FE88D] transition-all duration-200"
                  style={`width: ${progressPercent || 100}%;`}
                ></div>
              </div>
            </div>

            <p class="text-xs text-[#94A3B8]">
              Ikke lukk programmet under nedlastingen.
            </p>
          </div>
        {:else if status === "ready"}
          <div class="p-4 rounded-2xl bg-[#9FE88D]/10 border border-[#9FE88D]/30 text-center space-y-2">
            <p class="text-sm font-bold text-white">Oppdateringen er installert og klar!</p>
            <p class="text-xs text-[#94A3B8]">
              Trykk på knappen under for å starte Atlantasy på nytt med den nye versjonen.
            </p>
          </div>
        {:else if status === "up_to_date"}
          <div class="p-6 rounded-2xl bg-[#191E24] border border-[#384252] text-center space-y-2">
            <CheckCircle2 class="w-8 h-8 text-[#9FE88D] mx-auto" />
            <p class="text-base font-bold text-white">Alt er oppdatert!</p>
            <p class="text-xs text-[#94A3B8]">
              Du kjører allerede den nyeste tilgjengelige versjonen av Atlantasy ({formattedCurrentVersion}).
            </p>
          </div>
        {:else if status === "error"}
          <div class="p-4 rounded-2xl bg-[#FB6F84]/10 border border-[#FB6F84]/30 space-y-2">
            <div class="flex items-center gap-2 text-[#FB6F84] font-bold text-sm">
              <AlertCircle class="w-4 h-4" />
              <span>Kunne ikke fullføre oppdateringen</span>
            </div>
            <p class="text-xs text-[#E2E8F0] leading-relaxed">
              {errorMessage || "Ukjent feil oppsto under sjekk etter nye versjoner."}
            </p>
          </div>
        {/if}
      </div>

      <!-- Footer / Handlinger -->
      <div class="p-4 bg-[#191E24] border-t border-[#384252] flex items-center justify-end gap-3 shrink-0">
        {#if status === "available"}
          <button
            type="button"
            onclick={closeModal}
            class="px-4 py-2.5 rounded-xl bg-[#2A303C] hover:bg-[#384252] text-xs font-semibold text-[#94A3B8] hover:text-white transition-colors"
          >
            Minn meg på det senere
          </button>

          <button
            type="button"
            onclick={startDownloadAndInstall}
            class="px-5 py-2.5 rounded-xl bg-[#9FE88D] hover:bg-[#8fd97e] text-[#16380c] font-bold text-xs transition-all shadow-md flex items-center gap-2"
          >
            <Download class="w-4 h-4" />
            <span>Last ned og oppdater</span>
          </button>
        {:else if status === "manual_download"}
          <button
            type="button"
            onclick={closeModal}
            class="px-4 py-2.5 rounded-xl bg-[#2A303C] hover:bg-[#384252] text-xs font-semibold text-[#94A3B8] hover:text-white transition-colors"
          >
            Lukk dette vinduet
          </button>

          <button
            type="button"
            onclick={exitApp}
            class="px-5 py-2.5 rounded-xl bg-[#FB6F84] hover:bg-[#e65b71] text-white font-bold text-xs transition-all shadow-md flex items-center gap-2"
          >
            <LogOut class="w-4 h-4" />
            <span>Lukk Atlantasy nå</span>
          </button>
        {:else if status === "ready"}
          <button
            type="button"
            onclick={triggerRelaunch}
            class="w-full px-5 py-3 rounded-xl bg-[#9FE88D] hover:bg-[#8fd97e] text-[#16380c] font-black text-sm transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <RefreshCw class="w-4 h-4" />
            <span>Start Atlantasy på nytt nå</span>
          </button>
        {:else if status === "error"}
          <button
            type="button"
            onclick={() => checkForUpdates(true)}
            class="px-4 py-2.5 rounded-xl bg-[#2A303C] hover:bg-[#384252] text-xs font-bold text-white transition-colors flex items-center gap-1.5"
          >
            <RefreshCw class="w-4 h-4" />
            <span>Prøv igjen</span>
          </button>
          <button
            type="button"
            onclick={closeModal}
            class="px-4 py-2.5 rounded-xl bg-[#9FE88D] text-[#16380c] text-xs font-bold"
          >
            Lukk
          </button>
        {:else if status === "up_to_date"}
          <button
            type="button"
            onclick={closeModal}
            class="px-5 py-2.5 rounded-xl bg-[#9FE88D] text-[#16380c] text-xs font-bold"
          >
            Ferdig
          </button>
        {/if}
      </div>
    </div>
  </div>
{/if}
