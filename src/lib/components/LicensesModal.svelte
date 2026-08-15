<script lang="ts">
  import {
    Info,
    X,
    ExternalLink,
    Search,
    ShieldCheck,
    Code2,
    Database,
    Layers,
    Copy,
    Check,
  } from "lucide-svelte";

  let {
    isOpen = $bindable(false),
  }: {
    isOpen?: boolean;
  } = $props();

  let searchQuery = $state("");
  let selectedCategory = $state<"all" | "desktop" | "frontend" | "backend" | "assets">("all");
  let expandedPackage = $state<string | null>(null);
  let copiedName = $state<string | null>(null);

  interface LicenseItem {
    name: string;
    version: string;
    license: string;
    category: "desktop" | "frontend" | "backend" | "assets";
    author: string;
    url: string;
    description: string;
    fullText?: string;
  }

  const licenses: LicenseItem[] = [
    {
      name: "Tauri v2",
      version: "2.0.0",
      license: "MIT / Apache-2.0",
      category: "desktop",
      author: "Tauri Programme within The Commons Conservancy",
      url: "https://tauri.app",
      description: "Sikker, kryssplattform desktop-runtime bygget på Rust og WebView2.",
      fullText: `MIT License / Apache License 2.0
Copyright (c) 2019-present Tauri Programme within The Commons Conservancy.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software...`,
    },
    {
      name: "Svelte 5",
      version: "5.20.2",
      license: "MIT",
      category: "frontend",
      author: "Rich Harris & Svelte Contributors",
      url: "https://svelte.dev",
      description: "Reaktivt frontend-rammeverk med neste generasjons Runes ($state, $derived, $effect).",
      fullText: `MIT License
Copyright (c) 2016–present Rich Harris and Svelte contributors

Permission is hereby granted, free of charge, to any person obtaining a copy of this software...`,
    },
    {
      name: "Convex",
      version: "1.19.4",
      license: "Apache-2.0",
      category: "backend",
      author: "Convex, Inc.",
      url: "https://convex.dev",
      description: "Reaktiv sanntids serverless database, TypeScript-skjemaer og WebSocket-synkronisering.",
      fullText: `Apache License, Version 2.0
Copyright 2022-present Convex, Inc.

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.`,
    },
    {
      name: "Vite",
      version: "6.1.0",
      license: "MIT",
      category: "frontend",
      author: "Evan You & Vite Contributors",
      url: "https://vite.dev",
      description: "Neste generasjons lynraske frontend-bygger og utviklingsserver.",
      fullText: `MIT License
Copyright (c) 2019-present, Yuxi (Evan) You and Vite contributors`,
    },
    {
      name: "Tailwind CSS",
      version: "3.4.17",
      license: "MIT",
      category: "frontend",
      author: "Tailwind Labs, Inc.",
      url: "https://tailwindcss.com",
      description: "Utility-first CSS-rammeverk for responsiv og moderne grensesnittdesign.",
      fullText: `MIT License
Copyright (c) Tailwind Labs, Inc.`,
    },
    {
      name: "Lucide Icons (lucide-svelte)",
      version: "0.475.0",
      license: "ISC",
      category: "assets",
      author: "Lucide Project Authors",
      url: "https://lucide.dev",
      description: "Vektorisert ikonbibliotek med konsistent og elegant formspråk.",
      fullText: `ISC License
Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part of Feather (MIT). All other copyright (c) 2022-present Lucide Contributors.`,
    },
    {
      name: "Rust Crates (Serde, Minisign)",
      version: "1.0 / 2.0",
      license: "MIT / Apache-2.0",
      category: "desktop",
      author: "Rust Community & Contributors",
      url: "https://crates.io",
      description: "Serialisering, datamodeller og kryptografisk Ed25519-verifisering i Rust.",
      fullText: `Dual licensed under MIT and Apache 2.0.`,
    },
    {
      name: "TypeScript",
      version: "5.7.3",
      license: "Apache-2.0",
      category: "frontend",
      author: "Microsoft Corporation",
      url: "https://www.typescriptlang.org",
      description: "Typesikkert JavaScript med streng kompilering og grensesnittkontrakter.",
      fullText: `Apache License 2.0
Copyright (c) Microsoft Corporation.`,
    },
    {
      name: "Google Fonts (Inter & Outfit)",
      version: "Latest",
      license: "OFL-1.1",
      category: "assets",
      author: "Rasmus Andersson, Rodrigo Fuenzalida",
      url: "https://fonts.google.com",
      description: "Typografi optimalisert for høy lesbarhet på digitale skjermer.",
      fullText: `SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007`,
    },
    {
      name: "DiceBear Avatars",
      version: "7.x",
      license: "CC0 1.0 (Public Domain)",
      category: "assets",
      author: "Florian Körner & Designers",
      url: "https://dicebear.com",
      description: "Deterministisk SVG-avatargenerator for bruker- og spillerepresentasjon.",
      fullText: `Creative Commons Zero v1.0 Universal - Public Domain Dedication.`,
    },
    {
      name: "Fantasy Premier League Data API",
      version: "2024/2025",
      license: "Fair Use (Non-commercial)",
      category: "backend",
      author: "The Football Association Premier League Ltd",
      url: "https://fantasy.premierleague.com",
      description: "Offisielle FPL ligastatistikker og runderesultater hentet for ikke-kommersiell ligabruk.",
      fullText: `Data leveres av Fantasy Premier League (FPL) for uavhengig og ikke-kommersiell underholdning og privat ligaoppfølging.`,
    },
  ];

  let filteredLicenses = $derived(
    licenses.filter((item) => {
      const matchesCategory =
        selectedCategory === "all" || item.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.license.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.author.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    })
  );

  function copyText(name: string, text?: string) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    copiedName = name;
    setTimeout(() => {
      if (copiedName === name) copiedName = null;
    }, 2000);
  }

  function toggleExpand(name: string) {
    expandedPackage = expandedPackage === name ? null : name;
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
    <div
      class="bg-[#242B35] border border-[#384252] rounded-3xl w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 font-sans text-[#E2E8F0] flex flex-col"
    >
      <!-- Header -->
      <div class="p-6 bg-[#191E24] border-b border-[#384252] flex items-start justify-between gap-4">
        <div class="flex items-center gap-3.5">
          <div class="w-12 h-12 rounded-2xl bg-[#70E1F8]/20 border border-[#70E1F8]/40 text-[#70E1F8] flex items-center justify-center shadow-inner shrink-0">
            <ShieldCheck class="w-6 h-6 text-[#70E1F8]" />
          </div>

          <div>
            <h3 class="text-lg font-black text-white leading-tight flex items-center gap-2">
              <span>Lisenser</span>
              <span class="text-xs px-2.5 py-0.5 rounded-full bg-[#2A303C] text-[#70E1F8] font-bold border border-[#384252]">
                {licenses.length} biblioteker
              </span>
            </h3>
            <p class="text-xs text-[#94A3B8] mt-0.5">
              Oversikt over åpen kildekode (Open Source) og tredjepartskomponenter brukt i Atlantasy.
            </p>
          </div>
        </div>

        <button
          type="button"
          onclick={() => (isOpen = false)}
          class="p-2 rounded-xl text-[#94A3B8] hover:text-white hover:bg-[#2A303C] transition-colors"
          title="Lukk"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Søk og Kategori-faner -->
      <div class="p-4 bg-[#1F252E] border-b border-[#384252] space-y-3 shrink-0">
        <div class="relative">
          <Search class="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            bind:value={searchQuery}
            placeholder="Søk etter pakke, lisens eller forfatter (f.eks. Svelte, MIT, Tauri)..."
            class="w-full pl-10 pr-4 py-2 rounded-xl bg-[#191E24] border border-[#384252] text-xs text-white placeholder-[#94A3B8] focus:border-[#70E1F8] focus:outline-none"
          />
        </div>

        <div class="flex items-center gap-1.5 flex-wrap text-xs">
          <button
            type="button"
            onclick={() => (selectedCategory = "all")}
            class={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
              selectedCategory === "all"
                ? "bg-[#70E1F8] text-black shadow-sm"
                : "bg-[#242B35] text-[#94A3B8] hover:text-white border border-[#384252]"
            }`}
          >
            Alle ({licenses.length})
          </button>
          <button
            type="button"
            onclick={() => (selectedCategory = "frontend")}
            class={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
              selectedCategory === "frontend"
                ? "bg-[#70E1F8] text-black shadow-sm"
                : "bg-[#242B35] text-[#94A3B8] hover:text-white border border-[#384252]"
            }`}
          >
            Frontend
          </button>
          <button
            type="button"
            onclick={() => (selectedCategory = "desktop")}
            class={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
              selectedCategory === "desktop"
                ? "bg-[#70E1F8] text-black shadow-sm"
                : "bg-[#242B35] text-[#94A3B8] hover:text-white border border-[#384252]"
            }`}
          >
            Desktop & Rust
          </button>
          <button
            type="button"
            onclick={() => (selectedCategory = "backend")}
            class={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
              selectedCategory === "backend"
                ? "bg-[#70E1F8] text-black shadow-sm"
                : "bg-[#242B35] text-[#94A3B8] hover:text-white border border-[#384252]"
            }`}
          >
            Backend
          </button>
          <button
            type="button"
            onclick={() => (selectedCategory = "assets")}
            class={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
              selectedCategory === "assets"
                ? "bg-[#70E1F8] text-black shadow-sm"
                : "bg-[#242B35] text-[#94A3B8] hover:text-white border border-[#384252]"
            }`}
          >
            Ikoner & Fonter
          </button>
        </div>
      </div>

      <!-- Lisensliste -->
      <div class="p-6 space-y-3 flex-1 overflow-y-auto custom-scrollbar">
        {#if filteredLicenses.length === 0}
          <div class="py-12 text-center text-[#94A3B8] space-y-2">
            <Info class="w-8 h-8 mx-auto text-[#94A3B8]" />
            <p class="text-sm font-bold text-white">Ingen biblioteker matchet søket ditt</p>
            <p class="text-xs">Prøv et annet søkeord eller velg en annen kategori.</p>
          </div>
        {:else}
          <div class="space-y-3">
            {#each filteredLicenses as item (item.name)}
              {@const isExpanded = expandedPackage === item.name}
              <div
                class={`p-4 rounded-2xl bg-[#191E24] border transition-all duration-200 ${
                  isExpanded ? "border-[#70E1F8]/60 shadow-md" : "border-[#384252] hover:border-[#70E1F8]/30"
                }`}
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="space-y-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="font-black text-white text-sm sm:text-base">
                        {item.name}
                      </span>
                      <span class="text-[11px] font-mono text-[#94A3B8]">
                        v{item.version}
                      </span>
                      <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-[#70E1F8]/15 text-[#70E1F8] border border-[#70E1F8]/30">
                        {item.license}
                      </span>
                    </div>

                    <p class="text-xs text-[#94A3B8]">
                      Utviklet av: <strong class="text-white">{item.author}</strong>
                    </p>

                    <p class="text-xs text-[#E2E8F0] leading-relaxed pt-0.5">
                      {item.description}
                    </p>
                  </div>

                  <div class="flex items-center gap-2 shrink-0">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      class="p-2 rounded-xl bg-[#242B35] hover:bg-[#384252] text-[#94A3B8] hover:text-white transition-colors border border-[#384252]"
                      title="Åpne offisiell nettside / kildekode"
                    >
                      <ExternalLink class="w-3.5 h-3.5" />
                    </a>

                    {#if item.fullText}
                      <button
                        type="button"
                        onclick={() => toggleExpand(item.name)}
                        class="px-3 py-1.5 rounded-xl bg-[#242B35] hover:bg-[#384252] text-xs font-bold text-[#E2E8F0] transition-colors border border-[#384252]"
                      >
                        {isExpanded ? "Skjul tekst" : "Vis lisens"}
                      </button>
                    {/if}
                  </div>
                </div>

                <!-- Utvidet lisenstekst -->
                {#if isExpanded && item.fullText}
                  <div class="mt-3 pt-3 border-t border-[#384252]/60 space-y-2 animate-in fade-in duration-150">
                    <div class="flex items-center justify-between text-[11px] text-[#94A3B8]">
                      <span>Full lisenstekst:</span>
                      <button
                        type="button"
                        onclick={() => copyText(item.name, item.fullText)}
                        class="flex items-center gap-1 text-[#70E1F8] hover:underline"
                      >
                        {#if copiedName === item.name}
                          <Check class="w-3 h-3 text-[#9FE88D]" />
                          <span class="text-[#9FE88D]">Kopiert!</span>
                        {:else}
                          <Copy class="w-3 h-3" />
                          <span>Kopier tekst</span>
                        {/if}
                      </button>
                    </div>

                    <pre class="p-3 rounded-xl bg-[#12161B] border border-[#384252] text-[11px] font-mono text-[#94A3B8] whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto custom-scrollbar">{item.fullText}</pre>
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Footer -->
      <div class="p-4 bg-[#191E24] border-t border-[#384252] flex items-center justify-between text-xs text-[#94A3B8] shrink-0">
        <span>Atlantasy er bygget med stolthet på åpen kildekode</span>
        <button
          type="button"
          onclick={() => (isOpen = false)}
          class="px-5 py-2.5 rounded-xl bg-[#70E1F8] hover:bg-[#5cd4ec] text-black font-bold text-xs transition-colors shadow-md"
        >
          Lukk
        </button>
      </div>
    </div>
  </div>
{/if}
