# Atlantasy - FPL Bedriftsliga Desktop App (Tauri v2 + Svelte 5 + Convex)

En moderne, høytytende desktop-applikasjon for Windows bygget for en intern bedriftsliga i Fantasy Premier League (FPL).

- **Desktop runtime / Container:** [Tauri v2](https://v2.tauri.app/) (Rust + Frameless Windows Setup)
- **Frontend-rammeverk:** [Svelte 5](https://svelte.dev/) (med Runes: `$state`, `$derived`, `$effect`, `$props`)
- **Byggeverktøy:** [Vite](https://vitejs.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) + [Lucide-Svelte](https://lucide.dev/) (FPL Dark Neon Palette)
- **Backend / Sanntidsdatabase:** [Convex](https://www.convex.dev/) (Reaktiv sky-backend)

---

## 🚀 Én-kommando oppstart (Både Convex + Tauri)

For å starte både Convex sanntidsdatabasen og Tauri v2 desktop-appen parallelt med én enkel kommando:

```bash
npm start
```
*eller*
```powershell
.\dev.ps1
```

### Andre nyttige oppstartskommandoer:
- **Kjør kun webgrensesnitt + Convex (rask nettleserutvikling):**
  ```bash
  npm run dev:web
  ```
- **Kjør kun desktop med eksisterende Convex-instans:**
  ```bash
  npm run tauri dev
  ```
- **Kjør kun Convex dev:**
  ```bash
  npm run convex:dev
  ```

---

## 📁 Prosjektstruktur

```text
Atlantasy/
├── convex/                          # Convex sanntidsbackend
│   ├── schema.ts                    # Datamodell (users, rooms, fpl_teams, messages, etc.)
│   ├── rooms.ts                     # Romsnitt-algoritme (Topp 2 snitt) & ledertavle
│   ├── chat.ts                      # Sanntidschat (Banter & rom-kanaler)
│   ├── admin.ts                     # Admin-innstillinger, invitasjonskoder & månedskåringer
│   ├── auth.ts                      # Registrering & autentisering med invitasjonskoder
│   └── fpl.ts                       # FPL API-synkronisering & database seeding
├── src/                             # Svelte 5 Frontend (Runes)
│   ├── lib/
│   │   ├── components/
│   │   │   ├── TitleBar.svelte          # Frameless Windows tittelbar (min/max/lukk)
│   │   │   ├── NavigationSidebar.svelte # Venstre kolonne (Nav, Rom 1–12, Profil)
│   │   │   ├── WallOfFameBanner.svelte  # Pinned vinnerbanner ("Skrytevegg")
│   │   │   ├── Leaderboard.svelte       # Hovedvisning med live romsnitt & akkordeon
│   │   │   ├── ChatPanel.svelte         # Høyre kolonne (Sanntidschat)
│   │   │   ├── RoomDetailModal.svelte   # Detaljvisning for rom og spillere
│   │   │   ├── AdminModal.svelte        # PIN-beskyttet adminpanel (PIN: 1234)
│   │   │   └── RegisterModal.svelte     # Bli med med invitasjonskode
│   │   └── convex.svelte.ts             # Svelte 5 Runes hook (useQuery, useMutation)
│   ├── app.css                      # Globale stiler, drag region & scrollbar
│   ├── App.svelte                   # Hovedlayout (3-kolonners 1080p desktop)
│   └── main.ts                      # Mount point
├── src-tauri/                       # Tauri v2 Rust Container
│   ├── tauri.conf.json              # Frameless konfigurasjon (decorations: false)
│   └── Cargo.toml
├── dev.ps1                          # Enkel PowerShell oppstart
├── package.json
└── tailwind.config.js
```

---

## 🏗️ Bygg for produksjon (Windows `.exe` / `.msi`)

For å kompilere og pakke appen til en optimalisert Windows desktop-installasjonsfil:
```bash
npm run tauri build
```
Den ferdige installasjonsfilen vil ligge i: `src-tauri/target/release/bundle/`
