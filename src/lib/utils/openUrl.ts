import { invoke, isTauri } from "@tauri-apps/api/core";

/**
 * Åpner en ekstern URL (f.eks. FPL-profil, overganger) i brukerens standard nettleser på datamaskinen.
 * Støtter både Tauri v2 desktop og standard webvisning.
 */
export async function openExternalUrl(url?: string | null): Promise<void> {
  if (!url || typeof url !== "string" || !url.trim()) return;

  const targetUrl = url.trim();

  // 1. Hvis appen kjører inne i Tauri Desktop (v2)
  try {
    if (isTauri()) {
      // Prøv standard Tauri opener plugin URL-kommando
      try {
        await invoke("plugin:opener|open_url", { url: targetUrl });
        return;
      } catch (err1) {
        // Fallback til open_path hvis open_url feilet
        try {
          await invoke("plugin:opener|open_path", { path: targetUrl });
          return;
        } catch (err2) {
          console.warn("Tauri opener plugin feilet:", err1, err2);
        }
      }
    }
  } catch (err) {
    console.warn("Feil ved sjekk av Tauri-miljø:", err);
  }

  // 2. Fallback for nettlesermodus eller hvis Tauri ikke er tilgjengelig
  if (typeof window !== "undefined") {
    window.open(targetUrl, "_blank", "noopener,noreferrer");
  }
}
