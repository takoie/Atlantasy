# Graph Report - .  (2026-08-14)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 155 nodes · 135 edges · 28 communities (19 shown, 9 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- compilerOptions
- devDependencies
- package.json
- tauri.conf.json
- App.svelte
- compilerOptions
- default.json
- icon
- include
- meldinger.ts
- lib.rs
- dataModel.d.ts
- action
- httpAction
- internalAction
- internalMutation
- internalQuery
- mutation
- query

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 18 edges
2. `compilerOptions` - 7 edges
3. `scripts` - 7 edges
4. `build` - 5 edges
5. `icon` - 5 edges
6. `include` - 5 edges
7. `bundle` - 4 edges
8. `lib` - 4 edges
9. `permissions` - 3 edges
10. `app` - 3 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (28 total, 9 thin omitted)

### Community 0 - "compilerOptions"
Cohesion: 0.09
Nodes (23): DOM, DOM.Iterable, ES2022, ./src/lib, compilerOptions, allowImportingTsExtensions, baseUrl, isolatedModules (+15 more)

### Community 1 - "devDependencies"
Cohesion: 0.10
Nodes (21): autoprefixer, devDependencies, autoprefixer, postcss, svelte, svelte-check, @sveltejs/vite-plugin-svelte, tailwindcss (+13 more)

### Community 2 - "package.json"
Cohesion: 0.10
Nodes (20): clsx, convex, dependencies, clsx, convex, lucide-svelte, tailwind-merge, lucide-svelte (+12 more)

### Community 3 - "tauri.conf.json"
Cohesion: 0.14
Nodes (13): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+5 more)

### Community 4 - "App.svelte"
Cohesion: 0.22
Nodes (6): ../convex/_generated/api, ../../../convex/_generated/dataModel, convexClient, useQuery(), app, target

### Community 5 - "compilerOptions"
Cohesion: 0.20
Nodes (9): compilerOptions, allowSyntheticDefaultImports, module, moduleResolution, skipLibCheck, strict, target, include (+1 more)

### Community 6 - "default.json"
Cohesion: 0.22
Nodes (8): core:default, main, opener:default, description, identifier, permissions, $schema, windows

### Community 7 - "icon"
Cohesion: 0.25
Nodes (8): icons/128x128@2x.png, icons/128x128.png, icons/32x32.png, icons/icon.ico, bundle, active, icon, targets

### Community 8 - "include"
Cohesion: 0.33
Nodes (5): src/**/*.d.ts, src/**/*.js, src/**/*.svelte, src/**/*.ts, include

### Community 9 - "meldinger.ts"
Cohesion: 0.40
Nodes (3): hentSisteMeldinger, sendMelding, slettMelding

## Knowledge Gaps
- **90 isolated node(s):** `Id`, `Doc`, `hentSisteMeldinger`, `sendMelding`, `slettMelding` (+85 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Why does `compilerOptions` connect `compilerOptions` to `include`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **What connects `Id`, `Doc`, `hentSisteMeldinger` to the rest of the system?**
  _90 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `tauri.conf.json` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._