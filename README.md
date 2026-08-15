# ⚽ Atlantasy Desktop

> Den ultimate skrivebordsappen for vår interne **Fantasy Premier League (FPL)**-liga! Følg rom-oppgjørene live, diskuter runden i sanntid, følg cup-sluttspillet og les ukens runderapporter.

[![Release](https://img.shields.io/github/v/release/takoie/Atlantasy?style=flat-square&color=70E1F8&label=Versjon)](https://github.com/takoie/Atlantasy/releases/latest)
[![Plattform](https://img.shields.io/badge/Plattform-Windows%2010%2F11-blue?style=flat-square)](https://github.com/takoie/Atlantasy/releases/latest)
[![Lisens](https://img.shields.io/badge/Lisens-MIT-green?style=flat-square)](#lisenser)

---

## 📥 Last ned og installer

Du kan laste ned den nyeste versjonen av installasjonsprogrammet direkte fra GitHub:

👉 **[Last ned Atlantasy Desktop for Windows (.exe)](https://github.com/takoie/Atlantasy/releases/latest)**

1. Last ned **`Atlantasy_..._x64-setup.exe`**.
2. Start installasjonsprogrammet og velg standard eller tilpasset installasjonsmappe.
3. Appen sjekker automatisk etter nye oppdateringer ved oppstart.

---

## ✨ Hovedfunksjoner

| Funksjon | Beskrivelse |
| :--- | :--- |
| 🏆 **Rom-oppgjør** | Følg poengsnittet og konkurransen mellom rommene live under hver serierunde. |
| 📊 **Individuell tabell** | Full oversikt over alle managere, poeng, lagverdi og klatregrafer. |
| ⚔️ **Cup & Sluttspill** | Eget cupsystem med seeding, innledende runder og nervepirrende sluttspill. |
| 💬 **Liga-chat & Banter** | Diskuter runden, transfers og chips i sanntidschatten. |
| 📰 **Nyheter & Avis** | Les og publiser ukens runderapporter, taktiske analyser og høydepunkter. |
| 🥇 **Hedersvegg & Trofeer** | Feiring av månedens managere, romvinnere og cupmestere med pokaloversikt. |
| 👤 **Managerprofiler** | Tilpass din avatar med ditt favorittlag fra Premier League eller egne bilder. |

---

## 💻 For utviklere

Dersom du ønsker å kjøre prosjektet lokalt fra kildekode:

```bash
# 1. Klon prosjektet og installer pakker
git clone https://github.com/takoie/Atlantasy.git
cd Atlantasy
npm install

# 2. Start appen og databasen i utviklermodus
npm start
```

### Bygge ny installasjonsfil:
```bash
npm run build:exe
```
Den ferdige installasjonsfilen (`.exe`) genereres under `src-tauri/target/release/bundle/nsis/`.

---

## 📜 Lisenser

Atlantasy er bygget på åpen kildekode og benytter moderne teknologier som Tauri, Svelte, Convex og Tailwind CSS. Full lisensoversikt er tilgjengelig direkte i appen via informasjonsikonet nederst i sidemenyen.
