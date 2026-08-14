---
trigger: always_on
---

# Antigravity Agent Configuration

## Maintainer & Namespace
- **GitHub:** takoie


# Agent Configuration

## Active Skills
- **superpowers**: Lokalisert i `.agents/skills/superpowers`. Brukes for rigorøs testdrevet utvikling (TDD), systematisk feilsøking, trinnvis planlegging og verifisering av kode.
- **ui-ux-pro-max**: Lokalisert i `.agents/skills/ui-ux-pro-max`. Brukes for styling, Tailwind CSS, layout-hierarki og moderne UI/UX-komponenter.
- **`graphify`** (`takoie/graphify`): Brukes til systemarkitektur, Convex-skjemaer, datamodellering og flytdiagrammer.

## Retningslinjer for utførelse
Før større oppgaver starter:
1. Bruk `superpowers` til å bryte ned arkitektur og definere verifiseringstrinn.
2. Bruk `ui-ux-pro-max` til å fastsette komponentmønstre for Svelte 5.

## Teknologistakk
- **Desktop:** Tauri v2 (Rust + WebView2)
- **Frontend:** Svelte 5 (Runes: `$state`, `$derived`, `$effect`) + Vite + Tailwind CSS
- **Backend / Sanntid:** Convex


# Graphify Integration & Architecture Context

Dette prosjektet bruker **Graphify** til å opprette en strukturdrevet kunnskapsgraf av kodebasen. 

### 1. Bruk av Kunnskapsgrafen
Når du svarer på spørsmål om arkitektur, konsekvenser av endringer, feilsøking på tvers av moduler eller refakturering, skal du benytte kunnskapsgrafen som ligger i prosjektet:
* Les og referer til dataene i `graphify-out/GRAPH_REPORT.md` og `graphify-out/graph.json`.
* Bruk grafen til å forstå hvilke moduler, funksjoner og avhengigheter som blir berørt før du foreslår store endringer i koden.
* Dersom du blir forespurt via `/graphify`, skal du søke etter relevante noder og avhengighetsstier i `graphify-out/graph.json` for å gi presise, arkitekturkorrekte svar.

### 2. Vedlikehold av Grafen
Dersom du oppretter nye filer, sletter moduler eller gjør vesentlige endringer i koderelasjonene i prosjektet, skal du minne brukeren om (eller kjøre) følgende kommando i terminalen for å holde grafen oppdatert:

```powershell
graphify . --code-only; graphify cluster-only .