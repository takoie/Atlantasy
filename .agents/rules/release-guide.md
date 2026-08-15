# Release & Bygging av Atlantasy Desktop

Denne regelen definerer standardprosedyren for å bygge, signere og publisere nye versjoner (Releases) av Atlantasy Desktop til GitHub uten friksjon.

---

## 1. Sjekkliste før Release
Før en ny versjon bygges, sørg for at følgende filer er oppdatert med det nye versjonsnummeret (f.eks. `0.6.0`):

1. **`package.json`**: `"version": "0.6.0"`
2. **`src-tauri/tauri.conf.json`**: `"version": "0.6.0"`
3. **`src-tauri/Cargo.toml`**: `version = "0.6.0"`
4. **`src/lib/components/Sidebar.svelte`**: `<span class="font-mono text-white/80">v0.6.0</span>`
5. **`src/App.svelte`**: `<UpdateModal currentVersion="0.6.0" />`
6. **`src/lib/components/UpdateModal.svelte`**: `currentVersion = "0.6.0"`

---

## 2. Bygging av Installasjonsfiler (.exe og .msi)

Kjør følgende kommando i terminalen:

```powershell
npm run build:exe
```

Dette vil:
1. Bygge og optimalisere Svelte 5 frontend til `dist/`.
2. Kompilere Rust desktop-runtime i release-modus.
3. Generere NSIS `.exe` installer og `.msi` pakke under:
   - `src-tauri/target/release/bundle/nsis/Atlantasy_<VERSION>_x64-setup.exe`
   - `src-tauri/target/release/bundle/msi/Atlantasy_<VERSION>_x64_en-US.msi`

---

## 3. Git Commit, Tagging og Publisering til GitHub

Når bygget er fullført og testet:

```powershell
# 1. Commit alle versjonsendringer
git add .
git commit -m "release: v0.6.0"

# 2. Opprett ny versjonstag
git tag -a v0.6.0 -m "Atlantasy Desktop v0.6.0"

# 3. Push kode og tags til GitHub
git push origin main --tags

# 4. Publiser GitHub Release og last opp installasjonsfilene (via GitHub CLI)
gh release create v0.6.0 `
  "src-tauri/target/release/bundle/nsis/Atlantasy_0.6.0_x64-setup.exe" `
  "src-tauri/target/release/bundle/msi/Atlantasy_0.6.0_x64_en-US.msi" `
  --title "Atlantasy Desktop v0.6.0" `
  --notes "### 🚀 Endringslogg for Atlantasy Desktop v0.6.0"
```

---

## 4. Viktige regler for auto-updater
- **Public Key:** Oppdateringssjekken i appen sjekker mot Minisign-nøkkelen konfigurert i `src-tauri/tauri.conf.json` (`plugins.updater.pubkey`).
- **Lokale bygg:** For å unngå feilmeldinger om manglende private key under lokal kompilering, skal `"createUpdaterArtifacts"` **ikke** være satt til `true` i `src-tauri/tauri.conf.json` under vanlige bygg.
