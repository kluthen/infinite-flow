---
id: module_jam_code_boundary
status: DRAFT
layer: ARCHITECTURE
version: 0.2
priority: 1
type: MODULE
human_name: Jam's Code Boundary
tags: [v3, release-v3.2, jam, performance, workspace]
parents:
  - [[rule_jam_code_loaded_on_demand]]
dependents: []
---

# Jam's Code Boundary

## INTENT
Keep Jam's code out of the app's first load and reachable from the rest of the app through one door, so session mode never pays for Jam.

## THE RULE / LOGIC
Jam's code lives under src/jam/: Jam's view and its Idle, the capture, what Jam derives from the doodle (its controls and its steering block, phrase 1's join), the path to phrase 1, Jam's settings, tap-in, the key and mode suggestion, and the doodle sections of the review and the exports. Outside it stay what Jam shares with the rest of the app: the data shapes (the quantized doodle under src/domain/doodle/, the generation request with its steering block and its carry-in, the kept-session codec), the generator's steering module inside the generation worker, and the session engine's generic way in under src/session/.

Jam's code loads through one memoized loader, the pattern the review panel's and the preset sheet's loaders follow: every caller shares one import, and a failed import clears the memo so the next attempt tries again, under a URL the browser has not failed, since it never fetches a failed import's URL again. Nothing outside src/jam/ but the loader imports a src/jam/ module statically, type-only imports aside, since they are erased from the build; a lint rule refuses it. The build's boundary check fails when any src/jam/ module is in the first load, the entry chunk or a chunk it imports statically, read from the build's module graph, so the first load holds the mode switch and nothing else of Jam's. Jam's view engraves its empty system through the app's own engraver, which stays outside Jam's code and is loaded on demand like every engraver, so Jam's chunk carries none.

Code outside src/jam/ reaches Jam's code only through the loader, or through ports Jam's code registers on the workspace when it loads (the notes the capture reads, the review's doodle section, the exports' doodle section); a caller that needs Jam's code before it has loaded waits for the load. Today Jam's code gives the workspace its view and its Idle note routing; the ports come with the parts of Jam that need them. Jam's chunks are precached by the service worker like every other file of the build, so once kept they open offline.

## TECHNICAL INTERFACE
src/components/workspace/load-jam-mode.ts, the one memoized loader of Jam's code: `loadJamMode()` imports Jam's code entry, src/jam/jam-mode.ts (`JamModeModule`: `JamWorkspace`, `createJamIdleNotes`), and after a failed import retries the built file the failure names (`failedModuleUrl`) under a fresh `?retry=n` query. eslint.config.js: `jamImportPattern`, a `@typescript-eslint/no-restricted-imports` rule refusing a static import of any src/jam/ module, the doodle quantizer (src/jam/doodle-quantizer.ts) among them, from every file outside src/jam/ but the loader, type-only imports allowed. scripts/module-graph-plugin.mjs, a build plugin (vite.config.ts), writes the build's module graph to dist/.vite/module-graph.json; scripts/verify-boundaries.mjs, run by `npm run verify:boundaries` after `npm run build`, fails on any src/jam/ module in the first load (`firstLoadJamViolations`) and reports Jam's chunks (`jamChunkFileNames`), beside its existing checks (the entry chunk's byte budget and every built file precached in dist/sw.js among them). Jam's empty system is engraved by src/notation/vexflow-empty-system-engraver.ts, reached from src/jam/empty-system-engraving.ts through the app's on-demand VexFlow loader.

## EXPECTATION
- The real build passes the boundary check; a build in which the entry chunk imports a src/jam/ module fails it.
- A static import of a src/jam/ module from outside src/jam/ and the loader fails the lint.
- Jam's code is fetched on the first opening of Jam mode in a visit and never before; a failed fetch is retried on the next attempt.
- Once the service worker has kept Jam's chunks, Jam mode opens offline.
